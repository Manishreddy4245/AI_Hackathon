import uuid
import hmac
import hashlib
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from app.core.config import settings

# Configure production-grade Argon2id hasher
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16
)

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

def _get_jwt_secret() -> str:
    return settings.JWT_SECRET

def hash_password(password: str) -> str:
    """
    Hash plain password using Argon2id algorithm.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    return ph.hash(password)

def verify_password(plain_password: str, stored_hash: str) -> Tuple[bool, bool]:
    """
    Verify plain password against stored hash.
    Returns: (is_valid: bool, needs_rehash: bool)
    Supports Argon2id natively and provides backward compatibility for legacy SHA-256 hashes.
    """
    if not plain_password or not stored_hash:
        return False, False

    # 1. Native Argon2id hash verification
    if stored_hash.startswith("$argon2id$") or stored_hash.startswith("$argon2"):
        try:
            ph.verify(stored_hash, plain_password)
            needs_rehash = ph.check_needs_rehash(stored_hash)
            return True, needs_rehash
        except (VerifyMismatchError, InvalidHashError):
            return False, False

    # 2. Legacy SHA-256 fallback verification for backward compatibility
    try:
        salt = getattr(settings, "SECURITY_SALT", "") or "placemind_salt_2026"
        legacy_calc = hashlib.sha256((plain_password + salt).encode('utf-8')).hexdigest()
        if hmac.compare_digest(legacy_calc, stored_hash):
            return True, True  # Valid legacy password -> trigger automatic upgrade to Argon2id
    except Exception:
        pass

    return False, False

def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 900) -> str:
    """
    Generate short-lived PyJWT signed Access Token (default 15 minutes).
    """
    now = datetime.now(timezone.utc)
    to_encode = payload.copy()
    to_encode.update({
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp())
    })
    return jwt.encode(to_encode, _get_jwt_secret(), algorithm="HS256")

def create_refresh_token(user_id: str, session_id: Optional[str] = None) -> Tuple[str, str, str, int]:
    """
    Generate PyJWT signed Refresh Token (default 7 days).
    Returns: (token, jti, session_id, expires_at_timestamp)
    """
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    sess_id = session_id or str(uuid.uuid4())
    exp_dt = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    exp_ts = int(exp_dt.timestamp())

    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": jti,
        "session_id": sess_id,
        "iat": int(now.timestamp()),
        "exp": exp_ts
    }

    token = jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")
    return token, jti, sess_id, exp_ts

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify PyJWT access token.
    """
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None

def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify PyJWT refresh token.
    """
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        return payload
    except jwt.PyJWTError:
        return None
