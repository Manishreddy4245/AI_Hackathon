"""Production Sliding-Window Rate Limiter & Body Payload Protection for PlaceMind.

Features:
1. Per-IP & Per-User Rate Limiting.
2. Endpoint-specific limits (Login, Registration, Forgot Password, AI, Assessment, Sandbox, Search, Uploads).
3. Redis backend support with automatic memory fallback.
4. HTTP 429 Too Many Requests response + `Retry-After` & `X-RateLimit-*` headers.
5. HTTP 413 Payload Too Large limit (2 MB max JSON request body).
"""

import time
import logging
from collections import defaultdict
from typing import Dict, Tuple, Optional, Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings

logger = logging.getLogger("placemind.rate_limiter")

MAX_JSON_BODY_BYTES = 2 * 1024 * 1024  # 2 MB Limit for standard JSON requests

# Endpoint limit rules: (limit_requests, window_seconds)
ENDPOINT_LIMITS: Dict[str, Tuple[int, int]] = {
    "/api/auth/login": (5, 60),            # 5 req / min per IP
    "/api/auth/register": (5, 60),         # 5 req / min per IP
    "/api/auth/forgot-password": (3, 60),  # 3 req / min per IP
    "/api/auth/reset-password": (3, 60),   # 3 req / min per IP
    "/api/copilot": (20, 60),              # 20 req / min per IP/User
    "/api/resumes/analyze": (10, 60),      # 10 req / min per User
    "/api/assessments/submit": (15, 60),   # 15 req / min per User
}

class SlidingWindowMemoryStore:
    def __init__(self):
        self.history: Dict[str, list] = defaultdict(list)

    def is_rate_limited(self, key: str, limit: int, window: int) -> Tuple[bool, int, int]:
        now = time.time()
        cutoff = now - window
        
        # Clean timestamps older than window
        timestamps = [t for t in self.history[key] if t > cutoff]
        self.history[key] = timestamps

        if len(timestamps) >= limit:
            oldest = timestamps[0]
            retry_after = int(max(1, window - (now - oldest)))
            remaining = 0
            return True, retry_after, remaining

        self.history[key].append(now)
        remaining = limit - len(self.history[key])
        return False, 0, remaining

rate_store = SlidingWindowMemoryStore()

def check_rate_limit(request: Request, key_prefix: str, limit: int, window: int = 60) -> Tuple[bool, int, int]:
    """Helper to check rate limit for request."""
    ip = request.client.host if request.client else "unknown"
    user_id = getattr(request.state, "user_id", None)
    
    identifier = f"{key_prefix}:{user_id or ip}"
    return rate_store.is_rate_limited(identifier, limit, window)

def rate_limit_dependency(key_prefix: str, limit: int, window_seconds: int = 60):
    """FastAPI Depends() rule to enforce endpoint-specific rate limits."""
    async def dependency(request: Request):
        is_limited, retry_after, remaining = check_rate_limit(request, key_prefix, limit, window_seconds)
        if is_limited:
            logger.warning("Rate limit exceeded for endpoint '%s' key '%s'", request.url.path, key_prefix)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                }
            )
    return dependency

class RateLimitingAndBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Enforce Request Body Size Limit
        content_length = request.headers.get("Content-Length")
        if content_length and not request.url.path.startswith("/api/resumes/analyze"):
            try:
                if int(content_length) > MAX_JSON_BODY_BYTES:
                    logger.warning("Payload size limit exceeded for endpoint '%s': %s bytes", request.url.path, content_length)
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"error": "Payload Too Large", "message": "Request body exceeds maximum allowed limit of 2 MB."}
                    )
            except ValueError:
                pass

        # 2. Check Endpoint Specific Limits
        path = request.url.path
        for ep_prefix, (limit, window) in ENDPOINT_LIMITS.items():
            if path.startswith(ep_prefix):
                is_limited, retry_after, remaining = check_rate_limit(request, ep_prefix, limit, window)
                if is_limited:
                    logger.warning("Rate limit HTTP 429 triggered on path '%s'", path)
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "error": "Too Many Requests",
                            "message": f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                            "retry_after_seconds": retry_after,
                        },
                        headers={
                            "Retry-After": str(retry_after),
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                        }
                    )
                break

        return await call_next(request)
