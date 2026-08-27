"""Observability & Request Tracing Middleware for FastAPI.

Features:
1. Generates / propagates unique `X-Request-ID` for every HTTP request.
2. Measures precise wall-clock latency (ms).
3. Logs structured JSON event with request_id, timestamp, endpoint, method, status, latency.
4. Redacts sensitive parameters automatically.
5. Updates real-time metrics accumulator.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.telemetry import log_structured_event, metrics

class RequestObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        
        # Extract or generate unique X-Request-ID
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id

        user_id = getattr(request.state, "user_id", None)
        user_role = getattr(request.state, "user_role", None)

        try:
            response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            
            # Attach X-Request-ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Record metrics & log event
            metrics.record_request(response.status_code, elapsed_ms)
            
            log_structured_event("HTTP_REQUEST", {
                "request_id": request_id,
                "method": request.method,
                "endpoint": request.url.path,
                "status": response.status_code,
                "latency_ms": elapsed_ms,
                "user_id": user_id,
                "role": user_role,
            })
            
            return response
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            metrics.record_request(500, elapsed_ms)
            
            log_structured_event("HTTP_REQUEST_ERROR", {
                "request_id": request_id,
                "method": request.method,
                "endpoint": request.url.path,
                "status": 500,
                "latency_ms": elapsed_ms,
                "error": type(exc).__name__,
                "message": str(exc),
            }, level="ERROR")
            raise exc
