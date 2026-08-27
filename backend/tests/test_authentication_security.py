import time
import pytest
import jwt
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_access_token
from app.core.rate_limiter import auth_rate_limiter

client = TestClient(app)

def test_argon2id_password_hashing_and_verification():
    """Verify password hashing produces Argon2id hashes and validates correctly."""
    plain = "SecureTestPassword123!"
    argon_hash = hash_password(plain)
    
    assert argon_hash.startswith("$argon2id$") or argon_hash.startswith("$argon2")
    is_valid, needs_rehash = verify_password(plain, argon_hash)
    assert is_valid is True
    assert needs_rehash is False

    is_invalid, _ = verify_password("WrongPassword123!", argon_hash)
    assert is_invalid is False

def test_legacy_sha256_fallback_and_rehash_trigger():
    """Verify legacy SHA-256 hashes are recognized and trigger auto-rehash."""
    import hashlib
    salt = getattr(settings, "SECURITY_SALT", "") or "placemind_salt_2026"
    plain = "LegacyPass123!"
    legacy_hash = hashlib.sha256((plain + salt).encode('utf-8')).hexdigest()

    is_valid, needs_rehash = verify_password(plain, legacy_hash)
    assert is_valid is True
    assert needs_rehash is True

def test_expired_token_rejection():
    """Verify expired JWT tokens are rejected by decoder and dependency injector."""
    now_ts = int(time.time()) - 3600  # 1 hour in the past
    payload = {
        "sub": "usr-test-expired",
        "email": "expired@test.com",
        "role": "student",
        "type": "access",
        "exp": now_ts
    }
    expired_token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    
    decoded = decode_access_token(expired_token)
    assert decoded is None

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_login_rate_limiting_triggers_429():
    """Verify rate limiter blocks repeated failed authentication requests with HTTP 429."""
    rate_key = "login:127.0.0.1:brute_test@campus.edu"
    auth_rate_limiter.reset_attempts(rate_key)

    # Record 5 failed attempts
    for _ in range(5):
        auth_rate_limiter.record_attempt(rate_key)

    # 6th attempt must raise 429
    with pytest.raises(Exception) as exc_info:
        auth_rate_limiter.check_rate_limit(rate_key)
    
    assert "429" in str(exc_info.value) or "Too many failed attempts" in str(exc_info.value)
    auth_rate_limiter.reset_attempts(rate_key)

def test_forgot_password_enumeration_safety():
    """Verify forgot-password endpoint returns uniform messages without exposing account existence."""
    # Test non-existent email
    res1 = client.post("/api/auth/forgot-password", json={"email": "nonexistent_user_999@campus.edu"})
    assert res1.status_code == status.HTTP_200_OK
    assert "If an account matching" in res1.json()["message"]

def test_refresh_token_generation_and_decoding():
    """Verify refresh token generation, expiration, and payload claims."""
    user_id = "usr-test-refresh-101"
    token, jti, session_id, exp_ts = create_refresh_token(user_id)

    assert isinstance(token, str)
    assert len(jti) > 0
    assert len(session_id) > 0
    assert exp_ts > int(time.time())

    decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    assert decoded["sub"] == user_id
    assert decoded["type"] == "refresh"
    assert decoded["jti"] == jti
    assert decoded["session_id"] == session_id
