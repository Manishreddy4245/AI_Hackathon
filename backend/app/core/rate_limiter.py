import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status

class AuthRateLimiter:
    """
    In-memory sliding-window rate limiter for sensitive authentication endpoints.
    Protects against brute-force login attacks, password reset abuse, and enumeration scanning.
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.attempts: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, key: str) -> None:
        """
        Check if the key (IP or identifier) has exceeded rate limits.
        Raises 429 Too Many Requests if limit is breached.
        """
        now = time.time()
        # Filter attempts within current sliding window
        self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window_seconds]
        
        if len(self.attempts[key]) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - self.attempts[key][0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts or security requests. Please try again in {max(retry_after, 1)} seconds.",
                headers={"Retry-After": str(max(retry_after, 1))}
            )

    def record_attempt(self, key: str) -> None:
        """Record an attempt timestamp for the given key."""
        now = time.time()
        self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window_seconds]
        self.attempts[key].append(now)

    def reset_attempts(self, key: str) -> None:
        """Reset failed attempts counter on successful action."""
        if key in self.attempts:
            del self.attempts[key]

# Rate limiter instance: max 5 failed attempts per 5 minutes per key
auth_rate_limiter = AuthRateLimiter(max_requests=5, window_seconds=300)
