from typing import List, Optional, Dict, Any
from fastapi import Request, Header, HTTPException, status, Depends
from app.core.security import decode_access_token
from app.db.mongodb import db_manager

def _extract_raw_token(request: Request, authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Helper to extract token from Bearer header or HttpOnly access_token cookie."""
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    if request and hasattr(request, "cookies"):
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            return cookie_token
    return None

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract and validate JWT access token from Authorization header or HttpOnly cookie.
    Checks server-side session/revocation status in MongoDB.
    Returns the authenticated user dict.
    """
    token = _extract_raw_token(request, authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or malformed access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    db = db_manager.db
    if db is not None:
        # Check if access token JTI or session has been explicitly revoked
        jti = payload.get("jti")
        if jti:
            revoked = await db.revoked_tokens.find_one({"jti": jti})
            if revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been revoked or logged out. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"}
                )

        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        if user:
            if not user.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is deactivated."
                )
            return user

    # Fallback to payload data if DB lookup unavailable (e.g. mock DB initialization)
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "name": payload.get("name", "User"),
        "companyId": payload.get("companyId"),
    }

async def get_optional_current_user(request: Request, authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extract user if Bearer token or HttpOnly cookie present and valid, else return None."""
    token = _extract_raw_token(request, authorization)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if not payload:
            return None
        db = db_manager.db
        if db is not None:
            jti = payload.get("jti")
            if jti:
                revoked = await db.revoked_tokens.find_one({"jti": jti})
                if revoked:
                    return None
            user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
            if user:
                if not user.get("is_active", True):
                    return None
                return user
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "name": payload.get("name", "User"),
            "companyId": payload.get("companyId"),
        }
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    """
    FastAPI dependency factory enforcing strict role-based access control.
    Allowed authentication roles: 'student', 'recruiter', 'placement_officer'.
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: You do not have permission to access this portal resource (Required: {', '.join(allowed_roles)}, Your role: {user_role})."
            )
        return current_user

    return role_checker
