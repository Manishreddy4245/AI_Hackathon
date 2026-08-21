import hashlib
import hmac
import json
import base64
import time
from typing import Optional

SECRET_KEY = "placemind-super-secret-jwt-key-change-in-production"

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt."""
    salt = "placemind_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash."""
    return hash_password(plain_password) == hashed_password

def create_access_token(payload: dict, expires_in_seconds: int = 86400) -> str:
    """Generate a lightweight HMAC-SHA256 signed JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    exp_payload = payload.copy()
    exp_payload["exp"] = int(time.time()) + expires_in_seconds

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(exp_payload).encode()).decode().rstrip("=")

    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{message}.{signature_b64}"

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify HMAC-SHA256 token signature."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        message = f"{header_b64}.{payload_b64}"

        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
        ).decode().rstrip("=")

        if expected_sig != signature_b64:
            return None

        # Add padding back if necessary
        padded_payload = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_payload).decode())

        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None
