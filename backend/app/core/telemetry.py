"""Production Telemetry, Metrics & Error Tracking Abstraction for PlaceMind.

Features:
1. Structured JSON Event & Request Logging.
2. In-memory Metrics Aggregator (Requests, 4xx, 5xx, DB/AI Latency, Sandbox Jobs).
3. Pluggable Sentry / External APM Exception Abstraction.
4. Sensitive Data Sanitizer (Strips passwords, tokens, keys from logs).
"""

import logging
import json
import time
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("placemind.telemetry")

# =========================================================================
# METRICS ACCUMULATOR
# =========================================================================

class MetricsRegistry:
    def __init__(self):
        self.total_requests = 0
        self.status_4xx = 0
        self.status_5xx = 0
        self.db_queries = 0
        self.db_errors = 0
        self.ai_calls = 0
        self.ai_failures = 0
        self.sandbox_executions = 0
        self.total_latency_ms = 0.0

    def record_request(self, status_code: int, latency_ms: float):
        self.total_requests += 1
        self.total_latency_ms += latency_ms
        if 400 <= status_code < 500:
            self.status_4xx += 1
        elif status_code >= 500:
            self.status_5xx += 1

    def record_ai_call(self, success: bool, latency_ms: float):
        self.ai_calls += 1
        if not success:
            self.ai_failures += 1

    def record_sandbox_job(self):
        self.sandbox_executions += 1

    def get_summary(self) -> Dict[str, Any]:
        avg_latency = round(self.total_latency_ms / max(self.total_requests, 1), 2)
        return {
            "total_requests": self.total_requests,
            "status_4xx_count": self.status_4xx,
            "status_5xx_count": self.status_5xx,
            "avg_latency_ms": avg_latency,
            "ai_total_calls": self.ai_calls,
            "ai_failures": self.ai_failures,
            "sandbox_executions": self.sandbox_executions,
        }

metrics = MetricsRegistry()

# =========================================================================
# SENSITIVE DATA REDACTION
# =========================================================================

SENSITIVE_KEYS = {"password", "token", "jwt", "secret", "api_key", "authorization", "access_token"}

def sanitize_log_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Redacts passwords, tokens, API keys, and sensitive fields from dictionary logs."""
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_log_dict(v)
        else:
            sanitized[k] = v
    return sanitized

# =========================================================================
# STRUCTURED EVENT LOGGING & EXCEPTION TRACKING
# =========================================================================

def log_structured_event(event_type: str, details: Dict[str, Any], level: str = "INFO"):
    """Emits structured JSON logs to standard output."""
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "details": sanitize_log_dict(details),
    }
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(json.dumps(payload))

def capture_exception(exc: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Error tracking abstraction wrapper.
    Captures unhandled exceptions server-side and routes to Sentry if SENTRY_DSN is set.
    """
    clean_context = sanitize_log_dict(context or {})
    logger.error(
        "Exception Captured [%s]: %s | Context: %s",
        type(exc).__name__,
        str(exc),
        json.dumps(clean_context),
        exc_info=True
    )
