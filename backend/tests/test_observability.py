import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.telemetry import sanitize_log_dict, metrics

def test_sensitive_data_redaction():
    """Verify passwords, tokens, and API keys are redacted from logs."""
    raw_log = {
        "user_id": "user-123",
        "password": "super-secret-password",
        "access_token": "bearer-jwt-token",
        "api_key": "gemini-api-key-1234",
        "normal_field": "public-value"
    }

    sanitized = sanitize_log_dict(raw_log)

    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["access_token"] == "[REDACTED]"
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["normal_field"] == "public-value"

@pytest.mark.anyio
async def test_x_request_id_header_propagation():
    """Verify X-Request-ID header is generated and attached to response."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")

        assert resp.status_code == 200
        assert "X-Request-ID" in resp.headers
        assert len(resp.headers["X-Request-ID"]) > 0

@pytest.mark.anyio
async def test_readiness_and_metrics_endpoints():
    """Verify /api/readiness and /api/metrics endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_readiness = await client.get("/api/readiness")
        assert r_readiness.status_code in [200, 503]
        
        r_metrics = await client.get("/api/metrics")
        assert r_metrics.status_code == 200
        data = r_metrics.json()
        assert "total_requests" in data
        assert "avg_latency_ms" in data
