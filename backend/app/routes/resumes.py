import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user
from app.services.resume_parser import parse_resume_document
from app.services.resume_ai_service import extract_resume_profile_ai
from app.schemas.resume import ResumeUploadResponse, ExtractedProfileSchema

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

def calculate_readiness_score(profile: ExtractedProfileSchema) -> int:
    """Calculate transparent placement readiness score based on extracted profile completeness."""
    score = 40  # Base score for uploading readable resume

    # Skills weight (max +30)
    skill_count = len(profile.raw_skills) or len(profile.skills)
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
    Accepts resume file (PDF/DOCX max 10MB), extracts plain text, parses structured profile with AI/heuristics,
    stores analysis in MongoDB, and updates student profile records.
    """
    target_student_id = (current_user.get("id") if current_user else None) or student_id or "student-demo"
    target_email = (current_user.get("email") if current_user else None)
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    file_bytes = await file.read()

    try:
        extracted_text, file_type = parse_resume_document(file_bytes, file.filename, file.content_type or "")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to process resume document: {str(e)}")

    # Extract profile using AI / heuristic service
    extracted_profile = await extract_resume_profile_ai(extracted_text)
    readiness_score = calculate_readiness_score(extracted_profile)

    resume_id = f"res-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now().isoformat()

    resume_doc = {
        "id": resume_id,
        "_id": resume_id,
        "student_id": target_student_id,
        "filename": file.filename,
        "file_type": file_type,
        "uploaded_at": now_iso,
        "analysis_status": "completed",
        "readiness_score": readiness_score,
        "extracted_profile": extracted_profile.model_dump(),
        "created_at": now_iso,
        "updated_at": now_iso
    }

    # Store in MongoDB 'resumes' collection
    await db.resumes.delete_many({"student_id": target_student_id})
    await db.resumes.insert_one(resume_doc)

    # Update student record in MongoDB 'students' collection if exists
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
            "resumeUrl": file.filename,
            "resumeId": resume_id,
            "profileCompletion": 100 if extracted_profile.raw_skills else 75,
            "isProfileComplete": bool(extracted_profile.raw_skills),
        }
        if extracted_profile.cgpa:
            update_data["cgpa"] = extracted_profile.cgpa
        if extracted_profile.branch:
            update_data["branch"] = extracted_profile.branch

        await db.students.update_one({"id": target_student.get("id")}, {"$set": update_data})
    
    # Store in MongoDB 'student_profiles' collection as specified in Part 11
    profile_doc = {
        "student_id": target_student_id,
        "name": extracted_profile.name or (target_student.get("name") if target_student else "Student"),
        "email": extracted_profile.email or (target_student.get("email") if target_student else target_email),
        "branch": extracted_profile.branch,
        "cgpa": extracted_profile.cgpa,
        "skills": extracted_profile.raw_skills,
        "projects": [p.model_dump() if hasattr(p, "model_dump") else p for p in extracted_profile.projects],
        "experience": [e.model_dump() if hasattr(e, "model_dump") else e for e in extracted_profile.experience],
        "certifications": [c.model_dump() if hasattr(c, "model_dump") else c for c in extracted_profile.certifications],
        "readiness_score": readiness_score,
        "resume_id": resume_id,
        "updated_at": now_iso
    }
    await db.student_profiles.update_one({"student_id": target_student_id}, {"$set": profile_doc}, upsert=True)

    return ResumeUploadResponse(
        resume_id=resume_id,
        student_id=target_student_id,
        profile=extracted_profile,
        readiness_score=readiness_score,
        filename=file.filename,
        file_type=file_type,
        uploaded_at=now_iso
    )

@router.get("/latest/{student_id}", response_model=Optional[ResumeUploadResponse])
async def get_latest_resume(student_id: str):
    """Retrieve student's latest uploaded resume analysis if exists."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    resume_doc = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})
    if not resume_doc:
        return None

    return ResumeUploadResponse(
        resume_id=resume_doc["id"],
        student_id=resume_doc["student_id"],
        profile=ExtractedProfileSchema(**resume_doc["extracted_profile"]),
        readiness_score=resume_doc.get("readiness_score", 85),
        filename=resume_doc.get("filename", "resume.pdf"),
        file_type=resume_doc.get("file_type", "pdf"),
        uploaded_at=resume_doc.get("uploaded_at", datetime.now().isoformat())
    )
