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

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "name": payload.get("name", "User"),
        "companyId": payload.get("companyId") or payload.get("company_id"),
        "company_id": payload.get("company_id") or payload.get("companyId"),
        "company": payload.get("company") or payload.get("company_name") or payload.get("companyName"),
        "company_name": payload.get("company_name") or payload.get("company") or payload.get("companyName"),
        "companyName": payload.get("companyName") or payload.get("company") or payload.get("company_name"),
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
    Supports role aliases (e.g. 'placement_officer', 'officer', 'admin').
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").lower().strip()
        normalized_allowed = [r.lower().strip() for r in allowed_roles]

        if "placement_officer" in normalized_allowed and user_role in ["placement_officer", "officer", "admin"]:
            return current_user
        if "recruiter" in normalized_allowed and user_role in ["recruiter", "admin"]:
            return current_user
        if "student" in normalized_allowed and user_role in ["student", "admin"]:
            return current_user
        if "panel_member" in normalized_allowed and user_role in ["panel_member", "panel", "placement_officer", "officer", "admin"]:
            return current_user
        if "admin" in normalized_allowed and user_role in ["admin", "placement_officer"]:
            return current_user

        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: You do not have permission to access this resource (Required role: {', '.join(allowed_roles)}, Your role: {user_role})."
            )
        return current_user

    return role_checker

# Callable FastAPI Dependencies
async def require_authenticated(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return current_user

async def require_student(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return await require_role(["student", "admin"])(current_user)

async def require_recruiter(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return await require_role(["recruiter", "admin"])(current_user)

async def require_placement_officer(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return await require_role(["placement_officer", "officer", "admin"])(current_user)

async def require_panel_member(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return await require_role(["panel_member", "panel", "placement_officer", "officer", "admin"])(current_user)

async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return await require_role(["admin", "placement_officer"])(current_user)

def check_drive_ownership(user: Dict[str, Any], drive: Dict[str, Any]) -> None:
    """
    Verify recruiter ownership for a drive resource.
    Placement officers and admins have global drive access.
    Recruiters can only access drives associated with their companyId or created by their userId.
    """
    role = (user.get("role") or "").lower()
    if role in ["placement_officer", "officer", "admin"]:
        return

    if role == "recruiter":
        user_company_id = user.get("companyId")
        drive_company_id = drive.get("companyId") or drive.get("company_id")
        created_by = drive.get("created_by") or drive.get("recruiter_id")

        if user_company_id and drive_company_id and user_company_id == drive_company_id:
            return
        if created_by and created_by == user.get("id"):
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: You do not have permission to modify or manage this drive resource."
    )

def check_student_resource_ownership(user: Dict[str, Any], target_student_id: str) -> None:
    """
    Verify student ownership for personal data (profile, applications, results).
    Placement officers, admins, and recruiters have authorized access.
    Students can only access their own studentId records.
    """
    role = (user.get("role") or "").lower()
    if role in ["placement_officer", "officer", "admin", "recruiter"]:
        return

    if role == "student":
        if user.get("id") == target_student_id:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: You cannot view or modify another student's confidential resources."
    )
