import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import FileResponse

from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.services.resume_parser import parse_resume_document
from app.services.resume_ai_service import extract_resume_profile_ai
from app.services.file_security_service import (
    validate_uploaded_file,
    generate_secure_storage_path,
    delete_private_file,
)
from app.schemas.resume import ResumeUploadResponse, ExtractedProfileSchema

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

def calculate_readiness_score(profile: ExtractedProfileSchema) -> int:
    """Calculate transparent placement readiness score based on extracted profile completeness."""
    score = 40  # Base score for uploading readable resume

    # Skills weight (max +30)
    skill_count = len(getattr(profile, "raw_skills", []) or [])
    score += min(30, skill_count * 5)

    # CGPA weight (max +15)
    if profile.cgpa:
        if profile.cgpa >= 8.5:
            score += 15
        elif profile.cgpa >= 7.5:
            score += 10
        elif profile.cgpa >= 6.5:
            score += 5

    # Projects weight (max +10)
    if profile.projects:
        score += min(10, len(profile.projects) * 5)

    # Certifications weight (max +5)
    if profile.certifications:
        score += min(5, len(profile.certifications) * 5)

    return min(100, max(0, score))

@router.post("/analyze", response_model=ResumeUploadResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    student_id: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Accepts resume file (PDF/DOCX max 10MB), validates magic bytes & security signatures,
    saves file to private storage with server-side UUID filename, parses profile, and updates DB records.
    """
    target_student_id = (current_user.get("id") if current_user else None) or student_id or f"usr-{uuid.uuid4().hex[:8]}"
    target_email = (current_user.get("email") if current_user else None)
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    file_bytes = await file.read()

    # 1. Comprehensive File Security & Magic Bytes Signature Validation
    try:
        ext, file_type = validate_uploaded_file(file_bytes, file.filename, file.content_type or "")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    # 2. Extract plain text from validated document
    try:
        extracted_text, _ = parse_resume_document(file_bytes, file.filename, file.content_type or "")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to process resume document: {str(e)}")

    # 3. Store in Private Storage with Server-side UUID Filename (Prevents Path Traversal)
    secure_filename, storage_path = generate_secure_storage_path(target_student_id, ext)
    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    # 4. Extract profile using AI / heuristic service
    extracted_profile = await extract_resume_profile_ai(extracted_text)
    readiness_score = calculate_readiness_score(extracted_profile)

    resume_id = f"res-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now().isoformat()

    resume_doc = {
        "id": resume_id,
        "_id": resume_id,
        "student_id": target_student_id,
        "original_filename": file.filename,
        "secure_filename": secure_filename,
        "storage_path": storage_path,
        "file_type": file_type,
        "uploaded_at": now_iso,
        "analysis_status": "completed",
        "readiness_score": readiness_score,
        "extracted_profile": extracted_profile.model_dump(),
        "created_at": now_iso,
        "updated_at": now_iso
    }

    # Clean up old resumes and save new document in MongoDB
    old_resumes = await db.resumes.find({"student_id": target_student_id}).to_list(100)
    for old_r in old_resumes:
        if "storage_path" in old_r:
            delete_private_file(old_r["storage_path"])

    await db.resumes.delete_many({"student_id": target_student_id})
    await db.resumes.insert_one(resume_doc)

    # Update student profile record
    target_filter = {"$or": [{"id": target_student_id}]}
    if target_email:
        target_filter["$or"].append({"email": target_email})
    target_student = await db.students.find_one(target_filter)

    if target_student:
        update_data = {
            "readinessScore": readiness_score,
            "skills": extracted_profile.raw_skills if extracted_profile.raw_skills else target_student.get("skills", []),
            "projects": [p.model_dump() if hasattr(p, "model_dump") else p for p in extracted_profile.projects],
            "experience": [e.model_dump() if hasattr(e, "model_dump") else e for e in extracted_profile.experience],
            "certifications": [c.model_dump() if hasattr(c, "model_dump") else c for c in extracted_profile.certifications],
            "resumeUrl": f"/api/resumes/download/{resume_id}",
            "resumeId": resume_id,
            "profileCompletion": 100 if extracted_profile.raw_skills else 75,
            "isProfileComplete": bool(extracted_profile.raw_skills),
        }
        if extracted_profile.cgpa:
            update_data["cgpa"] = extracted_profile.cgpa
        if extracted_profile.branch:
            update_data["branch"] = extracted_profile.branch

        await db.students.update_one({"id": target_student.get("id")}, {"$set": update_data})

    return ResumeUploadResponse(
        resume_id=resume_id,
        student_id=target_student_id,
        profile=extracted_profile,
        extracted_profile=extracted_profile,
        readiness_score=readiness_score,
        filename=file.filename,
        file_type=file_type,
        uploaded_at=now_iso,
        summary="Resume successfully analyzed and stored in secure private storage."
    )

@router.get("/download/{resume_id}")
async def download_resume_private(
    resume_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Authorized private resume download.
    Enforces RBAC: Only the student owner or an authorized recruiter/officer can download.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    resume_doc = await db.resumes.find_one({"id": resume_id})
    if not resume_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume document not found")

    user_role = current_user.get("role", "").lower()
    user_id = current_user.get("id")

    # Authorization Check
    is_owner = (user_id == resume_doc.get("student_id"))
    is_admin_or_staff = user_role in ["recruiter", "placement_officer", "admin"]

    if not is_owner and not is_admin_or_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to candidate resume document.")

    storage_path = resume_doc.get("storage_path")
    if not storage_path or not os.path.exists(storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume binary file unavailable in private storage")

    return FileResponse(
        path=storage_path,
        filename=resume_doc.get("original_filename", "resume.pdf"),
        media_type="application/pdf" if resume_doc.get("file_type") == "pdf" else "application/octet-stream"
    )

@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Securely deletes a candidate resume from private storage and MongoDB."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    resume_doc = await db.resumes.find_one({"id": resume_id})
    if not resume_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume document not found")

    user_role = current_user.get("role", "").lower()
    user_id = current_user.get("id")

    if user_id != resume_doc.get("student_id") and user_role not in ["placement_officer", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cannot delete another candidate's resume.")

    if "storage_path" in resume_doc:
        delete_private_file(resume_doc["storage_path"])

    await db.resumes.delete_one({"id": resume_id})
    return {"message": "Resume successfully deleted from private storage", "resume_id": resume_id}
