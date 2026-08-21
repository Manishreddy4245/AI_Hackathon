from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db.mongodb import db_manager
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class RegisterStudentRequest(BaseModel):
    name: str
    email: str
    password: str
    rollNumber: str
    branch: str
    college: Optional[str] = "Campus University"
    graduationYear: int = 2027
    cgpa: float = 8.0

@router.post("/login")
async def login(req: LoginRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = None
    # 1. Search by email if provided
    if req.email and req.email.strip():
        user = await db.users.find_one({"email": req.email.strip().lower()}, {"_id": 0})
        if user and req.password:
            if not verify_password(req.password, user.get("password_hash", "")):
                raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2. Search by role if email failed or role passed directly
    if not user and req.role:
        role_map = {
            "placement_officer": "admin@placemind.local",
            "student": "student@placemind.local",
            "recruiter": "recruiter@placemind.local",
            "panel_member": "panel@placemind.local",
        }
        target_email = role_map.get(req.role, "admin@placemind.local")
        user = await db.users.find_one({"email": target_email}, {"_id": 0})

    if not user:
        # Fallback to default placement officer if none found
        user = {
            "id": "usr-admin",
            "name": "Placement Officer",
            "email": req.email or "admin@placemind.local",
            "role": req.role or "placement_officer"
        }

    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user.get("name", "User"),
            "email": user["email"],
            "role": user["role"],
            "companyId": user.get("companyId"),
        }
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_student(req: RegisterStudentRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_email = req.email.strip().lower()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"usr-{req.rollNumber.lower().replace('/', '-')}"
    pass_hash = hash_password(req.password)

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
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "branch": req.branch,
        "batch": str(req.graduationYear),
        "cgpa": req.cgpa,
        "skills": ["Python", "SQL", "Git"],
        "projects": [],
        "certifications": [],
        "readinessScore": 80,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 0,
        "shortlistsCount": 0,
        "interviewsCount": 0,
    }
    await db.students.insert_one(student_doc)

    # Log audit event
    audit_entry = {
        "id": f"aud-{int(datetime.now().timestamp())}",
        "userId": user_id,
        "userName": req.name,
        "userRole": "student",
        "action": "STUDENT_REGISTER",
        "entity": "Student",
        "entityId": user_id,
        "detail": f"New student registered: {req.name} ({req.rollNumber}, {req.branch})",
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
    }
    await db.audit_logs.insert_one(audit_entry)

    token = create_access_token({"sub": user_id, "email": clean_email, "role": "student"})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": clean_email,
            "role": "student",
        }
    }

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"id": "usr-admin", "name": "Placement Officer", "email": "admin@placemind.local", "role": "placement_officer"}

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = db_manager.db
    if db is None:
        return payload

    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        return payload
    return user

@router.post("/logout")
async def logout():
    return {"status": "ok", "message": "Logged out successfully"}

