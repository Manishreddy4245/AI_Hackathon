from typing import List, Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from app.core.security import decode_access_token
from app.db.mongodb import db_manager

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract and validate JWT token from Authorization header.
    Returns the authenticated user dict from MongoDB or token payload.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or malformed Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    db = db_manager.db
    if db is not None:
        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        if user:
            return user

    # Fallback to payload data if user lookup unavailable
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "name": payload.get("name", "User"),
        "companyId": payload.get("companyId"),
    }

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
