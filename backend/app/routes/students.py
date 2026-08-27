from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.db.integrity import create_idempotent_notification
from app.core.deps import get_current_user, require_role, get_optional_current_user
from app.schemas.student import StudentSchema, ShortlistRequest, ApplyDriveRequest, ExternalApplyStartRequest, ExternalApplyConfirmRequest
from app.schemas.resume import PlacementRecommendationSchema, SkillGapResponseSchema, SkillGapItemSchema
from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.skill_matching_engine import calculate_skill_match
from app.services.skill_gap_engine import generate_recommendation_text, aggregate_skill_gaps_across_drives
from app.services.profile_completion_engine import calculate_profile_completion
from app.services.opportunity_aggregator import get_ranked_opportunities_for_student

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("/me", response_model=Dict[str, Any])
async def get_my_student_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve the profile of the currently authenticated student."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Find matching student document in DB
    student = await db.students.find_one({
        "$or": [
            {"id": user_id},
            {"email": user_email}
        ]
    }, {"_id": 0})

    if not student:
        student = {
            "id": user_id,
            "rollNumber": current_user.get("rollNumber", "N/A"),
            "name": current_user.get("name", "Student Candidate"),
            "email": user_email,
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={current_user.get('name', 'Student')}",
            "branch": current_user.get("branch", "CSE"),
            "batch": str(current_user.get("graduationYear", 2027)),
            "cgpa": current_user.get("cgpa", 0.0),
            "skills": [],
            "projects": [],
            "experience": [],
            "certifications": [],
            "readinessScore": 0,
            "resumeUrl": None,
            "placementStatus": "unplaced",
            "applicationsCount": 0,
            "shortlistsCount": 0,
            "interviewsCount": 0,
        }

    # Check resume in MongoDB
    latest_resume = await db.resumes.find_one({
        "$or": [{"student_id": user_id}, {"email": user_email}]
    }, {"_id": 0})
    has_resume = latest_resume is not None or bool(student.get("resumeUrl"))
    resume_filename = (latest_resume.get("filename") if latest_resume else None) or student.get("resumeUrl")
    resume_id = (latest_resume.get("id") if latest_resume else None) or student.get("resumeId")
    extracted_prof = (latest_resume.get("extracted_profile") if latest_resume else None)
    
    pct, is_comp, missing, checklist = calculate_profile_completion(
        student,
        has_resume=has_resume,
        skills_count=len(student.get("skills", []))
    )

    return {
        **student,
        "hasResume": has_resume,
        "resumeId": resume_id,
        "resumeUrl": resume_filename,
        "resumeFilename": resume_filename,
        "extractedProfile": extracted_prof,
        "profileCompletion": pct,
        "isProfileComplete": is_comp,
        "missingRequirements": missing,
        "checklist": checklist,
    }

@router.get("/me/dashboard", response_model=Dict[str, Any])
async def get_my_student_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns complete authenticated student dashboard data strictly scoped to current user.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    user_name = current_user.get("name", "Student")

    # 1. Fetch student profile
    student = await db.students.find_one({
        "$or": [{"id": user_id}, {"email": user_email}]
    }, {"_id": 0})

    if not student:
        student = {
            "id": user_id,
            "rollNumber": current_user.get("rollNumber", "N/A"),
            "name": user_name,
            "email": user_email,
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={user_name}",
            "branch": current_user.get("branch", "CSE"),
            "batch": str(current_user.get("graduationYear", 2027)),
            "cgpa": current_user.get("cgpa", 0.0),
            "skills": [],
            "projects": [],
            "experience": [],
            "certifications": [],
            "readinessScore": 0,
            "resumeUrl": None,
            "placementStatus": "unplaced",
            "applicationsCount": 0,
            "shortlistsCount": 0,
            "interviewsCount": 0,
        }

    # 2. Fetch student's applied drive IDs
    applications = await db.applications.find({
        "$or": [
            {"student_id": user_id},
            {"studentId": user_id},
            {"student_email": user_email},
            {"studentEmail": user_email},
            {"applicant.email": user_email}
        ]
    }, {"_id": 0}).to_list(length=100)
    applied_drive_ids = list(set([
        a.get("drive_id") or a.get("driveId")
        for a in applications
        if (a.get("drive_id") or a.get("driveId"))
    ]))

    # 3. Fetch student's scheduled interviews
    interviews = await db.interviews.find({
        "$or": [
            {"candidateId": user_id},
            {"candidateEmail": user_email},
            {"student_id": user_id}
        ]
    }, {"_id": 0}).to_list(length=100)

    # 4. Fetch latest resume
    latest_resume = await db.resumes.find_one({
        "$or": [{"student_id": user_id}, {"email": user_email}]
    }, {"_id": 0})

    has_resume = latest_resume is not None or bool(student.get("resumeUrl"))
    resume_filename = (latest_resume.get("filename") if latest_resume else None) or student.get("resumeUrl")
    resume_id = (latest_resume.get("id") if latest_resume else None) or student.get("resumeId")
    readiness_score = latest_resume.get("readiness_score", 0) if latest_resume else student.get("readinessScore", 0)

    skills = student.get("skills", [])
    projects = student.get("projects", [])
    experience = student.get("experience", [])
    certifications = student.get("certifications", [])

    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("raw_skills"):
            skills = list(set(skills + prof["raw_skills"]))
        if prof.get("projects") and not projects:
            projects = prof["projects"]
        if prof.get("experience") and not experience:
            experience = prof["experience"]
        if prof.get("certifications") and not certifications:
            certifications = prof["certifications"]

    # Calculate Profile Completion
    pct, is_comp, missing, checklist = calculate_profile_completion(
        student,
        has_resume=has_resume,
        skills_count=len(skills)
    )

    return {
        "student": {
            **student,
            "skills": skills,
            "projects": projects,
            "experience": experience,
            "certifications": certifications,
            "readinessScore": readiness_score,
            "resumeUrl": resume_filename,
            "resumeFilename": resume_filename,
            "resumeId": resume_id,
            "applicationsCount": len(applied_drive_ids),
            "interviewsCount": len(interviews),
            "profileCompletion": pct,
            "isProfileComplete": is_comp,
            "missingRequirements": missing,
            "checklist": checklist,
        },
        "hasResume": has_resume,
        "resumeId": resume_id,
        "resumeFilename": resume_filename,
        "resumeUrl": resume_filename,
        "appliedDriveIds": applied_drive_ids,
        "interviews": interviews,
        "isNewUser": not has_resume and len(skills) == 0 and len(applied_drive_ids) == 0,
        "profileCompletion": pct,
        "isProfileComplete": is_comp,
        "missingRequirements": missing,
        "checklist": checklist,
    }

@router.get("", response_model=List[StudentSchema])
async def list_students():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    students = await db.students.find({}, {"_id": 0}).to_list(length=200)
    return students

@router.get("/{student_id}", response_model=StudentSchema)
async def get_student(student_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.post("/shortlist")
async def shortlist_student(
    req: ShortlistRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Drive-specific student shortlisting handler.
    Updates the canonical db.applications record for the specific student + drive.
    Prevents duplicate shortlistedCount increments.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    student = await db.students.find_one({"id": req.studentId}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    app_id = f"app-{req.studentId}-{req.driveId}"
    app = await db.applications.find_one({
        "$or": [
            {"id": app_id},
            {"studentId": req.studentId, "driveId": req.driveId},
            {"student_id": req.studentId, "drive_id": req.driveId}
        ]
    })

    current_app_status = (app.get("status") if app else "APPLIED").upper()
    new_app_status = "SHORTLISTED" if current_app_status != "SHORTLISTED" else "APPLIED"
    now_iso = datetime.now().isoformat()

    # Update application record
    await db.applications.update_one(
        {"$or": [
            {"id": app_id},
            {"studentId": req.studentId, "driveId": req.driveId},
            {"student_id": req.studentId, "drive_id": req.driveId}
        ]},
        {"$set": {
            "status": new_app_status,
            "updated_at": now_iso
        }},
        upsert=True
    )

    drive = await db.drives.find_one({"id": req.driveId}, {"_id": 0}) if req.driveId else None
    
    # Drive-specific shortlistedCount increment/decrement
    if drive and req.driveId:
        if new_app_status == "SHORTLISTED" and current_app_status != "SHORTLISTED":
            await db.drives.update_one({"id": req.driveId}, {"$inc": {"shortlistedCount": 1}})
        elif new_app_status == "APPLIED" and current_app_status == "SHORTLISTED":
            await db.drives.update_one({"id": req.driveId}, {"$inc": {"shortlistedCount": -1}})

    # Update student shortlistsCount count safely
    if new_app_status == "SHORTLISTED" and current_app_status != "SHORTLISTED":
        await db.students.update_one({"id": req.studentId}, {"$inc": {"shortlistsCount": 1}})
    elif new_app_status == "APPLIED" and current_app_status == "SHORTLISTED":
        await db.students.update_one({"id": req.studentId}, {"$inc": {"shortlistsCount": -1}})

    # Dispatch shortlist notification only if transitioning to SHORTLISTED
    if new_app_status == "SHORTLISTED" and current_app_status != "SHORTLISTED":
        company_name = drive.get("companyName", "Placement Drive") if drive else "Placement Drive"
        job_title = drive.get("roleTitle", "Software Engineer") if drive else "Software Engineer"
        notif_id = f"notif-shortlist-{req.studentId}-{int(datetime.now().timestamp())}"

        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": req.studentId,
            "recipientRole": "student",
            "recipientName": student.get("name", "Student"),
            "type": "APPLICATION_SHORTLISTED",
            "title": "🎉 You've Been Shortlisted!",
            "message": f"Congratulations! You have been shortlisted for {job_title} at {company_name}.",
            "application_id": app_id,
            "student_id": req.studentId,
            "drive_id": req.driveId,
            "company_id": drive.get("companyId") if drive else "comp-1",
            "company_name": company_name,
            "job_title": job_title,
            "relatedRoute": "/student/drives",
            "read": False,
            "important": True,
            "timestamp": "Just now",
            "created_at": now_iso
        })

    return {"status": "ok", "studentId": req.studentId, "driveId": req.driveId, "applicationStatus": new_app_status}


from fastapi import UploadFile, File, Form
import uuid
from app.services.resume_parser import parse_resume_document
from app.services.resume_ai_service import extract_resume_profile_ai

async def _process_student_application(
    db: Any,
    current_user: Dict[str, Any],
    drive_id: str,
    name: Optional[str] = None,
    mobile: Optional[str] = None,
    college_name: Optional[str] = None,
    location: Optional[str] = None,
    company_name: Optional[str] = None,
    job_title: Optional[str] = None,
    company_id: Optional[str] = None,
    source: Optional[str] = None,
    application_url: Optional[str] = None,
    file: Optional[UploadFile] = None
):
    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    # 1. Fetch or initialize student record
    student = await db.students.find_one({
        "$or": [{"id": student_id}, {"email": student_email}]
    }, {"_id": 0})
    if not student:
        student = {
            "id": student_id,
            "rollNumber": current_user.get("rollNumber", f"2023{student_id[-4:] if len(student_id) >= 4 else '1001'}"),
            "name": current_user.get("name", "Student Candidate"),
            "email": student_email,
            "branch": current_user.get("branch", "CSE"),
            "batch": str(current_user.get("graduationYear", 2027)),
            "cgpa": float(current_user.get("cgpa", 8.5)),
            "skills": ["Python", "JavaScript", "Problem Solving"],
            "projects": [],
            "experience": [],
            "certifications": [],
            "readinessScore": 85,
            "resumeUrl": "resume.pdf",
            "placementStatus": "unplaced",
            "applicationsCount": 0,
            "shortlistsCount": 0,
            "interviewsCount": 0,
        }
        await db.students.update_one({"id": student_id}, {"$set": student}, upsert=True)

    # 2. Check Drive Existence (internal college drive or external company opportunity)
    drive = await db.drives.find_one({"$or": [{"id": drive_id}, {"driveId": drive_id}]}, {"_id": 0})
    if drive:
        resolved_company_name = drive.get("companyName", company_name or "Company")
        resolved_job_title = drive.get("roleTitle", job_title or "Software Engineer")
        resolved_company_id = drive.get("companyId", company_id or "comp-1")
        resolved_source = "college"
        resolved_url = drive.get("application_url", application_url or "")
    else:
        resolved_company_name = company_name or "Company"
        resolved_job_title = job_title or "Software Engineer"
        resolved_company_id = company_id or f"comp-{uuid.uuid4().hex[:6]}"
        resolved_source = source or "external"
        resolved_url = application_url or ""

    # 3. Duplicate Prevention (student_id + drive_id)
    existing_app = await db.applications.find_one({
        "$or": [
            {"student_id": student_id, "drive_id": drive_id},
            {"studentId": student_id, "driveId": drive_id}
        ]
    })
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this placement drive."
        )

    # 4. Handle Resume Upload & Extraction
    latest_resume = await db.resumes.find_one({
        "$or": [{"student_id": student_id}, {"email": student_email}]
    }, {"_id": 0})
    resume_id = (latest_resume.get("id") if latest_resume else None) or student.get("resumeId")

    if file and file.filename:
        file_bytes = await file.read()
        try:
            extracted_text, file_type = parse_resume_document(file_bytes, file.filename, file.content_type or "")
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to process resume document: {str(e)}")

        extracted_profile = await extract_resume_profile_ai(extracted_text)
        readiness_score = 85
        if extracted_profile.cgpa:
            readiness_score = min(100, max(50, int(extracted_profile.cgpa * 10)))

        resume_id = f"res-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now().isoformat()
        resume_doc = {
            "id": resume_id,
            "_id": resume_id,
            "student_id": student_id,
            "filename": file.filename,
            "file_type": file_type,
            "uploaded_at": now_iso,
            "analysis_status": "completed",
            "readiness_score": readiness_score,
            "extracted_profile": extracted_profile.model_dump(),
            "created_at": now_iso,
            "updated_at": now_iso
        }
        await db.resumes.delete_many({"student_id": student_id})
        await db.resumes.insert_one(resume_doc)
        latest_resume = resume_doc

        # Update student record
        update_student = {
            "readinessScore": readiness_score,
            "skills": extracted_profile.raw_skills if extracted_profile.raw_skills else student.get("skills", []),
            "projects": [p.model_dump() if hasattr(p, "model_dump") else p for p in extracted_profile.projects],
            "experience": [e.model_dump() if hasattr(e, "model_dump") else e for e in extracted_profile.experience],
            "certifications": [c.model_dump() if hasattr(c, "model_dump") else c for c in extracted_profile.certifications],
            "resumeUrl": file.filename,
            "resumeId": resume_id,
            "profileCompletion": 100,
            "isProfileComplete": True
        }
        if mobile:
            update_student["mobile"] = mobile
        if college_name:
            update_student["college"] = college_name
        if location:
            update_student["location"] = location

        await db.students.update_one({"id": student_id}, {"$set": update_student})
        student.update(update_student)

    # If no file uploaded and no existing resume
    if not latest_resume and not student.get("resumeUrl"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload and analyze your resume before applying."
        )

    # Extract real profile data
    extracted_prof = latest_resume.get("extracted_profile", {}) if latest_resume else {}
    real_skills = extracted_prof.get("raw_skills") or student.get("skills", [])
    real_projects = extracted_prof.get("projects") or student.get("projects", [])
    real_exp = extracted_prof.get("experience") or student.get("experience", [])
    real_certs = extracted_prof.get("certifications") or student.get("certifications", [])

    submitted_name = name or student.get("name") or current_user.get("name") or "Student"
    submitted_mobile = mobile or student.get("mobile") or student.get("phone") or "N/A"
    submitted_college = college_name or student.get("college") or "Campus University"
    submitted_location = location or student.get("location") or "Bengaluru"

    app_id = f"app-{student_id}-{drive_id}"
    now_iso = datetime.now().isoformat()

    app_doc = {
        "id": app_id,
        "student_id": student_id,
        "studentId": student_id,
        "student_name": submitted_name,
        "studentName": submitted_name,
        "student_email": student_email,
        "studentEmail": student_email,
        "drive_id": drive_id,
        "driveId": drive_id,
        "company_id": resolved_company_id,
        "company_name": resolved_company_name,
        "job_title": resolved_job_title,
        "source": resolved_source,
        "application_url": resolved_url,
        "applicant": {
            "name": submitted_name,
            "mobile": submitted_mobile,
            "email": student_email,
            "college_name": submitted_college,
            "location": submitted_location
        },
        "resume_id": resume_id or (latest_resume.get("id") if latest_resume else None) or student.get("resumeId"),
        "resume_url": (latest_resume.get("filename") if latest_resume else None) or student.get("resumeUrl") or "resume.pdf",
        "skills": real_skills,
        "matched_skills": real_skills,
        "projects": real_projects,
        "experience": real_exp,
        "certifications": real_certs,
        "status": "APPLIED",
        "applied_at": datetime.now().strftime("%d %b %Y"),
        "appliedAt": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
        "cgpa": float(student.get("cgpa") or extracted_prof.get("cgpa") or 8.5),
        "branch": str(student.get("branch") or extracted_prof.get("branch") or "CSE"),
    }

    existing_app = await db.applications.find_one({"student_id": student_id, "drive_id": drive_id})
    await db.applications.update_one(
        {"student_id": student_id, "drive_id": drive_id},
        {"$set": app_doc},
        upsert=True
    )
    if not existing_app:
        await db.students.update_one({"id": student_id}, {"$inc": {"applicationsCount": 1}})
        if drive:
            await db.drives.update_one({"id": drive_id}, {"$inc": {"registeredCount": 1}})

    # 5. Dispatch Officer Notification (APPLICATION_RECEIVED)
    officer_query_list: List[Dict[str, Any]] = [
        {"role": "placement_officer"},
        {"role": "recruiter"},
        {"portalRole": "recruiter"},
        {"portalRole": "placement_officer"},
        {"role": "admin"}
    ]
    if resolved_company_id:
        officer_query_list.extend([{"companyId": resolved_company_id}, {"company_id": resolved_company_id}])
    if drive and drive.get("placement_officer_id"):
        officer_query_list.append({"id": drive.get("placement_officer_id")})
    if drive and drive.get("recruiter_id"):
        officer_query_list.append({"id": drive.get("recruiter_id")})

    responsible_officers = await db.users.find({"$or": officer_query_list}, {"_id": 0}).to_list(length=500)

    target_officer_ids = list(set([o["id"] for o in responsible_officers if o.get("id")]))
    if not target_officer_ids:
        all_officers = await db.users.find({"role": {"$in": ["placement_officer", "admin"]}}, {"_id": 0}).to_list(length=50)
        target_officer_ids = [o["id"] for o in all_officers if o.get("id")]

    title_suffix = " (Company Website)" if resolved_source == "external" else ""
    message_text = f"{submitted_name} has applied for {resolved_job_title} role at {resolved_company_name} placement drive."

    for off_id in target_officer_ids:
        notif_id = f"notif-app-{student_id}-{int(datetime.now().timestamp())}-{off_id[:6]}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": off_id,
            "recipientRole": "placement_officer",
            "recipientName": "Placement Officer",
            "type": "APPLICATION_RECEIVED",
            "title": f"New Placement Application{title_suffix}",
            "message": message_text,
            "application_id": app_id,
            "student_id": student_id,
            "drive_id": drive_id,
            "company_id": resolved_company_id,
            "company_name": resolved_company_name,
            "job_title": resolved_job_title,
            "source": resolved_source,
            "application_url": resolved_url,
            "applicant": app_doc["applicant"],
            "relatedRoute": f"/companies/{drive_id}",
            "read": False,
            "important": True,
            "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
            "created_at": now_iso
        })

    return {
        "status": "ok",
        "message": f"Application submitted successfully for {resolved_job_title} at {resolved_company_name}",
        "applicationId": app_id,
        "studentId": student_id,
        "driveId": drive_id,
        "source": resolved_source,
        "applicationUrl": resolved_url,
        "applicant": app_doc["applicant"],
        "skillsExtracted": len(real_skills),
        "projectsExtracted": len(real_projects)
    }

@router.post("/apply")
async def apply_to_drive(
    req: ApplyDriveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit application via JSON payload."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return await _process_student_application(
        db=db,
        current_user=current_user,
        drive_id=req.driveId,
        name=req.name,
        mobile=req.mobile,
        college_name=req.college_name,
        location=req.location,
        company_name=req.company_name,
        job_title=req.job_title,
        company_id=req.company_id,
        source=req.source,
        application_url=req.application_url
    )

@router.post("/apply-form")
async def apply_to_drive_form(
    driveId: str = Form(...),
    name: Optional[str] = Form(None),
    mobile: Optional[str] = Form(None),
    college_name: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    job_title: Optional[str] = Form(None),
    company_id: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    application_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit application via multipart form with automatic resume analysis."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return await _process_student_application(
        db=db,
        current_user=current_user,
        drive_id=driveId,
        name=name,
        mobile=mobile,
        college_name=college_name,
        location=location,
        company_name=company_name,
        job_title=job_title,
        company_id=company_id,
        source=source,
        application_url=application_url,
        file=file
    )

@router.post("/external-apply/start")
async def start_external_application(
    req: ExternalApplyStartRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Initialize external job application tracking before redirecting student to external company URL.
    Generates a secure return token and records status: APPLICATION_STARTED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    import uuid
    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    student = await db.students.find_one({"$or": [{"id": student_id}, {"email": student_email}]}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Check if already completed
    existing_app = await db.applications.find_one({
        "$or": [
            {"student_id": student_id, "drive_id": req.drive_id},
            {"studentId": student_id, "driveId": req.drive_id}
        ]
    })
    if existing_app and existing_app.get("status") in ["EXTERNAL_APPLICATION_COMPLETED", "APPLIED", "SHORTLISTED"]:
        return {
            "status": "already_applied",
            "already_applied": True,
            "message": f"You have already applied for {req.company_name or 'this company'}.",
            "redirect_url": req.application_url,
            "return_token": existing_app.get("return_token"),
            "drive_id": req.drive_id
        }

    return_token = f"tok_{uuid.uuid4().hex[:16]}"
    now_iso = datetime.now().isoformat()
    app_id = f"app-{student_id}-{req.drive_id}"

    # Get student resume info
    latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})
    extracted_prof = latest_resume.get("extracted_profile", {}) if latest_resume else {}
    real_skills = extracted_prof.get("raw_skills") or student.get("skills", [])
    real_projects = extracted_prof.get("projects") or student.get("projects", [])

    app_doc = {
        "id": app_id,
        "student_id": student_id,
        "studentId": student_id,
        "student_name": student.get("name") or current_user.get("name") or "Student",
        "studentName": student.get("name") or current_user.get("name") or "Student",
        "student_email": student_email,
        "studentEmail": student_email,
        "drive_id": req.drive_id,
        "driveId": req.drive_id,
        "company_name": req.company_name or "Company",
        "companyName": req.company_name or "Company",
        "job_title": req.job_title or "Software Engineer",
        "roleTitle": req.job_title or "Software Engineer",
        "company_id": req.company_id or "comp-external",
        "companyId": req.company_id or "comp-external",
        "source": "external",
        "application_type": "EXTERNAL",
        "application_url": req.application_url,
        "return_token": return_token,
        "status": "APPLICATION_STARTED",
        "started_at": now_iso,
        "applied_at": datetime.now().strftime("%d %b %Y"),
        "applicant": {
            "name": student.get("name") or current_user.get("name") or "Student",
            "email": student_email,
            "mobile": student.get("mobile") or student.get("phone") or "N/A",
            "college_name": student.get("college") or "Campus University",
            "location": student.get("location") or "Bengaluru"
        },
        "skills": real_skills,
        "projects": real_projects,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    await db.applications.update_one(
        {"student_id": student_id, "drive_id": req.drive_id},
        {"$set": app_doc},
        upsert=True
    )

    return {
        "status": "ok",
        "already_applied": False,
        "message": "External application initiated",
        "redirect_url": req.application_url,
        "return_token": return_token,
        "drive_id": req.drive_id,
        "company_name": req.company_name,
        "job_title": req.job_title
    }

@router.get("/external-apply/status")
async def get_external_application_status(
    drive_id: str,
    token: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Check the current tracking status of an external job application attempt.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    query: Dict[str, Any] = {
        "$or": [
            {"student_id": student_id, "drive_id": drive_id},
            {"student_email": student_email, "drive_id": drive_id}
        ]
    }
    if token:
        query["return_token"] = token

    app = await db.applications.find_one(query, {"_id": 0})
    if not app:
        # Fallback query by drive_id alone for the student
        app = await db.applications.find_one({
            "$or": [
                {"student_id": student_id, "drive_id": drive_id},
                {"student_email": student_email, "drive_id": drive_id}
            ]
        }, {"_id": 0})

    if not app:
        raise HTTPException(status_code=404, detail="External application record not found")

    return {
        "status": "ok",
        "application_id": app.get("id"),
        "drive_id": app.get("drive_id"),
        "company_name": app.get("company_name", "Company"),
        "job_title": app.get("job_title", "Software Engineer"),
        "application_url": app.get("application_url"),
        "application_status": app.get("status", "APPLICATION_STARTED"),
        "started_at": app.get("started_at"),
        "completed_at": app.get("completed_at"),
        "verification_type": app.get("verification_type"),
        "is_completed": app.get("status") in ["EXTERNAL_APPLICATION_COMPLETED", "APPLIED", "SHORTLISTED"]
    }

@router.post("/external-apply/confirm")
async def confirm_external_application(
    req: ExternalApplyConfirmRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process return confirmation after external job application.
    If student confirmed completion: updates status to EXTERNAL_APPLICATION_COMPLETED and dispatches officer notification.
    If student indicates not completed: updates status to APPLICATION_NOT_CONFIRMED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    import uuid
    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    app = await db.applications.find_one({
        "$or": [
            {"student_id": student_id, "drive_id": req.drive_id},
            {"student_email": student_email, "drive_id": req.drive_id}
        ]
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    now_iso = datetime.now().isoformat()
    company_name = app.get("company_name", "Company")
    job_title = app.get("job_title", "Software Engineer")
    student_name = app.get("student_name") or current_user.get("name") or "Student"
    company_id = app.get("company_id", "comp-external")

    if req.completed:
        await db.applications.update_one(
            {"_id": app["_id"]},
            {"$set": {
                "status": "EXTERNAL_APPLICATION_COMPLETED",
                "verification_type": "self_confirmed",
                "completed_at": now_iso,
                "updated_at": now_iso
            }}
        )
        await db.students.update_one({"id": student_id}, {"$inc": {"applicationsCount": 1}})

        # Dispatch Officer Notification
        responsible_officers = await db.users.find({
            "$or": [
                {"role": "placement_officer"},
                {"role": "recruiter"},
                {"portalRole": "recruiter"},
                {"portalRole": "placement_officer"},
                {"role": "admin"}
            ]
        }, {"_id": 0}).to_list(length=500)

        target_officer_ids = list(set([o["id"] for o in responsible_officers if o.get("id")]))
        if not target_officer_ids:
            all_officers = await db.users.find({"role": {"$in": ["placement_officer", "admin"]}}, {"_id": 0}).to_list(length=50)
            target_officer_ids = [o["id"] for o in all_officers if o.get("id")]

        for off_id in target_officer_ids:
            notif_id = f"notif-ext-app-{student_id}-{int(datetime.now().timestamp())}-{off_id[:6]}"
            await create_idempotent_notification(db, {
                "id": notif_id,
                "recipient_user_id": off_id,
                "recipientRole": "placement_officer",
                "recipientName": "Placement Officer",
                "type": "APPLICATION_RECEIVED",
                "title": "New External Application Completed",
                "message": f"{student_name} has applied for {job_title} role at {company_name} placement drive.",
                "application_id": app.get("id"),
                "student_id": student_id,
                "drive_id": req.drive_id,
                "company_id": company_id,
                "company_name": company_name,
                "job_title": job_title,
                "source": "external",
                "application_url": app.get("application_url"),
                "relatedRoute": f"/companies/{req.drive_id}",
                "read": False,
                "important": True,
                "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
                "created_at": now_iso
            })

        return {
            "status": "ok",
            "is_completed": True,
            "message": f"You have successfully applied for {company_name}",
            "company_name": company_name,
            "job_title": job_title
        }
    else:
        await db.applications.update_one(
            {"_id": app["_id"]},
            {"$set": {
                "status": "APPLICATION_NOT_CONFIRMED",
                "updated_at": now_iso
            }}
        )
        return {
            "status": "not_confirmed",
            "is_completed": False,
            "message": "Application not confirmed",
            "company_name": company_name,
            "job_title": job_title
        }

@router.get("/me/placement-recommendations", response_model=List[PlacementRecommendationSchema])
async def get_my_placement_recommendations(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve personalized placement drive recommendations for currently authenticated student."""
    return await get_placement_recommendations(student_id=current_user.get("id"))

@router.get("/me/skill-gaps", response_model=SkillGapResponseSchema)
async def get_my_skill_gaps(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve personalized skill gaps for currently authenticated student."""
    return await get_student_skill_gaps(student_id=current_user.get("id"))

@router.get("/{student_id}/placement-recommendations", response_model=List[PlacementRecommendationSchema])
async def get_placement_recommendations(student_id: str):
    """
    Returns unified placement opportunities (College Drives + Live External Feeds)
    ranked by calculated AI skill match score and deterministic hard eligibility
    using the student's real resume data.
    """
    ranked_ops = await get_ranked_opportunities_for_student(
        student_id=student_id,
        source_filter="all",
        eligibility_filter="all"
    )
    return [PlacementRecommendationSchema(**opp) for opp in ranked_ops]

@router.get("/{student_id}/skill-gaps", response_model=SkillGapResponseSchema)
async def get_student_skill_gaps(student_id: str):
    """
    Returns aggregated skill gaps across active placement drives for student.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})

    student_skills = student.get("skills", []) if student else []
    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("raw_skills"):
            student_skills = list(set(student_skills + prof["raw_skills"]))

    if student_skills is None:
        student_skills = []

    drives = await db.drives.find({"status": "open"}, {"_id": 0}).to_list(length=100)
    if not drives:
        drives = await db.drives.find({}, {"_id": 0}).to_list(length=100)

    gap_items_raw = aggregate_skill_gaps_across_drives(student_skills, drives)

    gap_items = [
        SkillGapItemSchema(
            skill=item["skill"],
            category=item["category"],
            demand=item["demand"],
            student_status=item["student_status"],
            importance=item["importance"]
        )
        for item in gap_items_raw
    ]

    return SkillGapResponseSchema(
        student_id=student_id,
        total_drives_analyzed=len(drives),
        skill_gaps=gap_items
    )

@router.get("/me/interviews")
async def get_my_interviews_alias(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all scheduled/assigned interviews for currently authenticated student."""
    from app.routes.interviews import get_my_student_interviews
    return await get_my_student_interviews(current_user=current_user)

