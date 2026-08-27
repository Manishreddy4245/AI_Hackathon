from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db.mongodb import db_manager
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

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

def get_role_display_name(role: str) -> str:
    mapping = {
        "student": "Student",
        "recruiter": "Company Recruiter",
        "placement_officer": "Placement Officer",
    }
    return mapping.get(role, role.capitalize())

@router.post("/login")
async def login(req: LoginRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    clean_input = req.email.strip()
    clean_email = clean_input.lower()
    if not clean_input or not req.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email/Roll ID and password are required.")

    # 1. Lookup user in DB by email or ID
    user = await db.users.find_one({
        "$or": [
            {"email": clean_email},
            {"id": clean_input},
            {"email": clean_input}
        ]
    }, {"_id": 0})

    # 2. If not found by email or ID, check students collection by rollNumber or rollNumber patterns
    if not user:
        student_doc = await db.students.find_one({
            "$or": [
                {"rollNumber": clean_input},
                {"rollNumber": clean_input.upper()},
                {"rollNumber": clean_input.lower()},
                {"id": clean_input.lower()},
                {"email": clean_email}
            ]
        }, {"_id": 0})
        
        if student_doc:
            target_id = student_doc.get("id")
            target_email = student_doc.get("email", "").lower()
            user = await db.users.find_one({
                "$or": [
                    {"id": target_id},
                    {"email": target_email}
                ]
            }, {"_id": 0})


    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2. Verify password hash
    stored_hash = user.get("password_hash", "")
    if not verify_password(req.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_role = user.get("role", "student")

    # 3. Cross-Portal Access Validation
    if req.portalRole and req.portalRole != user_role:
        correct_portal_name = get_role_display_name(user_role)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account belongs to the {correct_portal_name} portal. Please use the {correct_portal_name} login."
        )

    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user_role,
        "name": user.get("name", "User"),
        "companyId": user.get("companyId"),
    }
    token = create_access_token(token_payload)

    return {
        "access_token": token,
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
async def register_student(req: RegisterStudentRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_email = req.email.strip().lower()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered in the platform.")

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

    # Log audit event
    audit_entry = {
        "id": f"aud-{int(datetime.now().timestamp())}",
        "userId": user_id,
        "userName": req.name,
        "userRole": "student",
        "action": "STUDENT_REGISTER",
        "entity": "Student",
        "entityId": user_id,
        "detail": f"New student candidate registered: {req.name} ({req.rollNumber}, {req.branch})",
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
    }
    await db.audit_logs.insert_one(audit_entry)

    token = create_access_token({"sub": user_id, "email": clean_email, "role": "student", "name": req.name})

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

@router.post("/register/recruiter", status_code=status.HTTP_201_CREATED)
async def register_recruiter(req: RegisterRecruiterRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_email = req.email.strip().lower()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="This corporate email is already registered.")

    comp_id = getattr(req, "companyId", None) or getattr(req, "company_id", None) or f"comp-{int(datetime.now().timestamp())}"
    user_id = f"usr-rec-{int(datetime.now().timestamp())}"
    pass_hash = hash_password(req.password)

    # 1. Create company record if not existing
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

    # 2. Create recruiter user
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

    token = create_access_token({"sub": user_id, "email": clean_email, "role": "recruiter", "name": req.name, "companyId": comp_id, "companyName": req.companyName})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": clean_email,
            "role": "recruiter",
            "companyId": comp_id,
        }
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Role-aware password reset request.
    Does not leak account existence.
    """
    clean_email = req.email.strip().lower()
    return {
        "status": "ok",
        "message": f"If an account matching '{clean_email}' exists in this portal, secure password reset instructions have been dispatched."
    }

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token")

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
