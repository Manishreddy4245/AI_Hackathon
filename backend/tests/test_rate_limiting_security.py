import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.middleware.rate_limiter import check_rate_limit, rate_store

def test_sliding_window_rate_limiter_memory_store():
    """Verify memory rate store increments count and enforces limit threshold."""
    key = "test_limiter_key"
    limit = 3
    window = 60

    # Clean previous state
    rate_store.history.pop(key, None)

    # 3 allowed requests
    is_limited_1, _, rem_1 = rate_store.is_rate_limited(key, limit, window)
    is_limited_2, _, rem_2 = rate_store.is_rate_limited(key, limit, window)
    is_limited_3, _, rem_3 = rate_store.is_rate_limited(key, limit, window)

    assert is_limited_1 is False
    assert is_limited_2 is False
    assert is_limited_3 is False
    assert rem_3 == 0

    # 4th request exceeds limit
    is_limited_4, retry_after, _ = rate_store.is_rate_limited(key, limit, window)
    assert is_limited_4 is True
    assert retry_after > 0

@pytest.mark.anyio
async def test_endpoint_rate_limiting_http_429():
    """Verify HTTP 429 is returned with Retry-After header when rate limit is exceeded."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Trigger rate limit on login endpoint (limit=5/min)
        for i in range(5):
            await client.post("/api/auth/login", json={"email": f"user{i}@example.com", "password": "password123"})

        # 6th request triggers 429
        resp = await client.post("/api/auth/login", json={"email": "user6@example.com", "password": "password123"})
        
        assert resp.status_code == 429
        data = resp.json()
        assert data["error"] == "Too Many Requests"
        assert "Retry-After" in resp.headers

@pytest.mark.anyio
async def test_oversized_payload_http_413():
    """Verify JSON payloads exceeding 2 MB size limit are rejected with HTTP 413."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Content-Length": str(3 * 1024 * 1024)}  # 3 MB
        resp = await client.post("/api/drives", json={"data": "test"}, headers=headers)

        assert resp.status_code == 413
        assert resp.json()["error"] == "Payload Too Large"
