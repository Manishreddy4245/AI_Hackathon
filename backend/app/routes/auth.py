import secrets
import hashlib
import time
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Response, Request, status, Depends
from pydantic import BaseModel, EmailStr

from app.db.mongodb import db_manager
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.core.rate_limiter import auth_rate_limiter
from app.services.email_service import email_service
from app.core.deps import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str
    portalRole: Optional[str] = None  # student, recruiter, placement_officer

class RegisterStudentRequest(BaseModel):
    name: str
    email: str
    password: str
    rollNumber: str
    branch: str
    college: Optional[str] = "Campus University"
    graduationYear: int = 2027
    cgpa: float = 8.0

class RegisterRecruiterRequest(BaseModel):
    name: str
    email: str
    password: str
    companyName: str
    designation: str
    phone: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str
    portalRole: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

class RefreshTokenRequest(BaseModel):
    refreshToken: Optional[str] = None

def get_role_display_name(role: str) -> str:
    mapping = {
        "student": "Student",
        "recruiter": "Company Recruiter",
        "placement_officer": "Placement Officer",
    }
    return mapping.get(role, role.capitalize())

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    is_prod = (settings.ENV in ["production", "staging"])
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=900,  # 15 mins
        samesite="lax",
        secure=is_prod
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=604800,  # 7 days
        samesite="lax",
        secure=is_prod
    )

def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    clean_input = req.email.strip()
    clean_email = clean_input.lower()
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"login:{client_ip}:{clean_email}"

    # Rate limiting protection
    auth_rate_limiter.check_rate_limit(rate_key)

    if not clean_input or not req.password:
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email/Roll ID and password are required.")

    # 1. Lookup user in DB
    user = await db.users.find_one({
        "$or": [
            {"email": clean_email},
            {"id": clean_input},
            {"email": clean_input}
        ]
    })

    if not user:
        student_doc = await db.students.find_one({
            "$or": [
                {"rollNumber": clean_input},
                {"rollNumber": clean_input.upper()},
                {"rollNumber": clean_input.lower()},
                {"id": clean_input.lower()},
                {"email": clean_email}
            ]
        })
        if student_doc:
            target_id = student_doc.get("id")
            target_email = student_doc.get("email", "").lower()
            user = await db.users.find_one({
                "$or": [
                    {"id": target_id},
                    {"email": target_email}
                ]
            })

    if not user:
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2. Verify password (Argon2id + SHA-256 legacy migration)
    stored_hash = user.get("password_hash", "")
    is_valid, needs_rehash = verify_password(req.password, stored_hash)
    if not is_valid:
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Automatic migration to Argon2id if legacy hash was used
    if needs_rehash:
        new_argon2_hash = hash_password(req.password)
        await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_argon2_hash}})

    user_role = user.get("role", "student")

    # 3. Cross-Portal Access Validation
    if req.portalRole and req.portalRole != user_role:
        auth_rate_limiter.record_attempt(rate_key)
        correct_portal_name = get_role_display_name(user_role)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account belongs to the {correct_portal_name} portal. Please use the {correct_portal_name} login."
        )

    # Reset rate limit counter on successful login
    auth_rate_limiter.reset_attempts(rate_key)

    # 4. Generate Short-Lived Access Token & Rotatable Refresh Token
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user_role,
        "name": user.get("name", "User"),
        "companyId": user.get("companyId"),
    }
    access_token = create_access_token(token_payload)
    refresh_token, jti, session_id, exp_ts = create_refresh_token(user["id"])

    # Store active session in MongoDB
    session_doc = {
        "id": session_id,
        "userId": user["id"],
        "refreshJti": jti,
        "expiresAt": exp_ts,
        "isRevoked": False,
        "createdAt": datetime.now().isoformat()
    }
    await db.sessions.insert_one(session_doc)

    # Set secure HttpOnly cookies
    _set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user.get("name", "User"),
            "email": user["email"],
            "role": user_role,
            "companyId": user.get("companyId"),
        }
    }

@router.post("/register/student", status_code=status.HTTP_201_CREATED)
async def register_student(req: RegisterStudentRequest, response: Response):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_email = req.email.strip().lower()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered in the platform.")

    user_id = f"usr-{req.rollNumber.lower().replace('/', '-')}"
    pass_hash = hash_password(req.password)  # Argon2id

    user_doc = {
        "id": user_id,
        "name": req.name,
        "email": clean_email,
        "password_hash": pass_hash,
        "role": "student",
        "is_active": True,
        "created_at": datetime.now().isoformat()
    }
    await db.users.insert_one(user_doc)

    student_doc = {
        "id": user_id,
        "rollNumber": req.rollNumber,
        "name": req.name,
        "email": clean_email,
        "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={req.name}",
        "branch": req.branch,
        "batch": str(req.graduationYear),
        "college": req.college or "Campus University",
        "cgpa": req.cgpa,
        "skills": [],
        "projects": [],
        "experience": [],
        "certifications": [],
        "readinessScore": 0,
        "resumeUrl": None,
        "resumeId": None,
        "profileCompletion": 0,
        "isProfileComplete": False,
        "placementStatus": "unplaced",
        "applicationsCount": 0,
        "shortlistsCount": 0,
        "interviewsCount": 0,
    }
    await db.students.insert_one(student_doc)

    token_payload = {"sub": user_id, "email": clean_email, "role": "student", "name": req.name}
    access_token = create_access_token(token_payload)
    refresh_token, jti, session_id, exp_ts = create_refresh_token(user_id)

    await db.sessions.insert_one({
        "id": session_id,
        "userId": user_id,
        "refreshJti": jti,
        "expiresAt": exp_ts,
        "isRevoked": False,
        "createdAt": datetime.now().isoformat()
    })

    _set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": clean_email,
            "role": "student",
        }
    }

@router.post("/register/recruiter", status_code=status.HTTP_201_CREATED)
async def register_recruiter(req: RegisterRecruiterRequest, response: Response):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_email = req.email.strip().lower()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="This corporate email is already registered.")

    comp_id = getattr(req, "companyId", None) or getattr(req, "company_id", None) or f"comp-{int(datetime.now().timestamp())}"
    user_id = f"usr-rec-{int(datetime.now().timestamp())}"
    pass_hash = hash_password(req.password)  # Argon2id

    new_company = {
        "id": comp_id,
        "name": req.companyName,
        "logo": "".join([w[0].upper() for w in req.companyName.split()[:2]]),
        "industry": "Technology / Software",
        "website": f"https://{req.companyName.lower().replace(' ', '')}.example.com",
        "location": "Bengaluru / Hybrid",
        "tier": "Tier 1",
        "contactPerson": req.name,
        "contactEmail": clean_email,
    }
    await db.companies.update_one({"id": comp_id}, {"$setOnInsert": new_company}, upsert=True)

    user_doc = {
        "id": user_id,
        "name": req.name,
        "email": clean_email,
        "password_hash": pass_hash,
        "role": "recruiter",
        "companyId": comp_id,
        "companyName": req.companyName,
        "is_active": True,
        "created_at": datetime.now().isoformat()
    }
    await db.users.insert_one(user_doc)

    token_payload = {"sub": user_id, "email": clean_email, "role": "recruiter", "name": req.name, "companyId": comp_id, "companyName": req.companyName}
    access_token = create_access_token(token_payload)
    refresh_token, jti, session_id, exp_ts = create_refresh_token(user_id)

    await db.sessions.insert_one({
        "id": session_id,
        "userId": user_id,
        "refreshJti": jti,
        "expiresAt": exp_ts,
        "isRevoked": False,
        "createdAt": datetime.now().isoformat()
    })

    _set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": clean_email,
            "role": "recruiter",
            "companyId": comp_id,
        }
    }

@router.post("/refresh")
async def refresh_tokens(request: Request, response: Response, body: Optional[RefreshTokenRequest] = None):
    """
    Refresh Token Rotation Endpoint.
    Validates current refresh token, revokes old session, issues new access + refresh pair.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    raw_token = (body and body.refreshToken) or request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    payload = decode_refresh_token(raw_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user_id = payload.get("sub")
    session_id = payload.get("session_id")
    jti = payload.get("jti")

    # Look up session in DB
    session = await db.sessions.find_one({"id": session_id, "isRevoked": False})
    if not session or session.get("refreshJti") != jti:
        # Possible token reuse attack! Revoke all sessions for this user.
        if session_id:
            await db.sessions.update_many({"userId": user_id}, {"$set": {"isRevoked": True}})
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked or invalid refresh token")

    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("is_active", True):
        await db.sessions.update_one({"id": session_id}, {"$set": {"isRevoked": True}})
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account inactive or not found")

    # 1. Revoke current refresh token session
    await db.sessions.update_one({"id": session_id}, {"$set": {"isRevoked": True}})

    # 2. Issue NEW Access & Refresh Token (Rotation)
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "student"),
        "name": user.get("name", "User"),
        "companyId": user.get("companyId"),
    }
    new_access_token = create_access_token(token_payload)
    new_refresh_token, new_jti, new_session_id, exp_ts = create_refresh_token(user["id"])

    # Create new session record
    await db.sessions.insert_one({
        "id": new_session_id,
        "userId": user["id"],
        "refreshJti": new_jti,
        "expiresAt": exp_ts,
        "isRevoked": False,
        "createdAt": datetime.now().isoformat()
    })

    _set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(request: Request, response: Response, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """
    Server-side Session & Token Revocation Logout.
    """
    db = db_manager.db
    if db is not None and current_user:
        user_id = current_user.get("id")
        await db.sessions.update_many({"userId": user_id}, {"$set": {"isRevoked": True}})

    _clear_auth_cookies(response)
    return {"status": "ok", "message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Role-aware & enumeration-safe password reset request.
    Dispatches secure, hashed reset token and reset link via email service.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    clean_email = req.email.strip().lower()
    rate_key = f"forgot:{client_ip}:{clean_email}"

    auth_rate_limiter.check_rate_limit(rate_key)
    auth_rate_limiter.record_attempt(rate_key)

    db = db_manager.db
    if db is not None:
        user = await db.users.find_one({"email": clean_email})
        if user:
            # Generate unhashed secure token for reset link
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

            # Store token hash in DB
            reset_doc = {
                "id": f"rst-{secrets.token_hex(8)}",
                "userId": user["id"],
                "email": clean_email,
                "tokenHash": token_hash,
                "expiresAt": int(time.time()) + 900,  # 15 mins
                "used": False,
                "createdAt": datetime.now().isoformat()
            }
            await db.password_resets.insert_one(reset_doc)

            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
            await email_service.send_password_reset_email(clean_email, reset_link, user.get("name", "User"))

    # Always return 200 OK with uniform response message to prevent account enumeration
    return {
        "status": "ok",
        "message": f"If an account matching '{clean_email}' exists in this portal, secure password reset instructions have been dispatched."
    }

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request):
    """
    Password reset endpoint using one-time token.
    Validates token hash, updates user password with Argon2id, and invalidates active sessions.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"reset:{client_ip}"
    auth_rate_limiter.check_rate_limit(rate_key)

    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    raw_token = req.token.strip()
    if not raw_token or not req.newPassword:
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(status_code=400, detail="Token and new password are required")

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    reset_doc = await db.password_resets.find_one({"tokenHash": token_hash, "used": False})

    if not reset_doc:
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    if reset_doc.get("expiresAt", 0) < int(time.time()):
        auth_rate_limiter.record_attempt(rate_key)
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    user_id = reset_doc["userId"]
    new_hash = hash_password(req.newPassword)  # Argon2id

    # 1. Update user password
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})

    # 2. Mark reset token as used (one-time use enforcement)
    await db.password_resets.update_one({"_id": reset_doc["_id"]}, {"$set": {"used": True}})

    # 3. Revoke all active user sessions on password change
    await db.sessions.update_many({"userId": user_id}, {"$set": {"isRevoked": True}})

    return {
        "status": "ok",
        "message": "Password has been successfully reset. Please sign in with your new credentials."
    }

@router.get("/me")
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return current_user
