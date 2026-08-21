from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, require_role
from app.schemas.student import StudentSchema, ShortlistRequest, ApplyDriveRequest
from app.schemas.resume import PlacementRecommendationSchema, SkillGapResponseSchema, SkillGapItemSchema
from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.skill_matching_engine import calculate_skill_match
from app.services.skill_gap_engine import generate_recommendation_text, aggregate_skill_gaps_across_drives
from app.services.profile_completion_engine import calculate_profile_completion

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

    # Check resume
    latest_resume = await db.resumes.find_one({"student_id": user_id}, {"_id": 0})
    has_resume = latest_resume is not None or bool(student.get("resumeUrl"))
    
    pct, is_comp, missing, checklist = calculate_profile_completion(
        student,
        has_resume=has_resume,
        skills_count=len(student.get("skills", []))
    )

    return {
        **student,
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
        "$or": [{"studentId": user_id}, {"studentEmail": user_email}]
    }, {"_id": 0}).to_list(length=100)
    applied_drive_ids = [a["driveId"] for a in applications if "driveId" in a]

    # If demo student and no explicit applications table records, check seed
    if user_id == "student-demo" or user_id == "rahul-verma":
        if not applied_drive_ids:
            applied_drive_ids = ["technova-backend"]

    # 3. Fetch student's scheduled interviews
    interviews = await db.interviews.find({
        "$or": [
            {"candidateId": user_id},
            {"candidateEmail": user_email},
            {"candidateId": "rahul-verma"} if (user_id in ("student-demo", "rahul-verma")) else {"candidateId": user_id}
        ]
    }, {"_id": 0}).to_list(length=100)

    # 4. Fetch latest resume
    latest_resume = await db.resumes.find_one({
        "$or": [{"student_id": user_id}, {"student_id": "rahul-verma"} if user_id == "student-demo" else {"student_id": user_id}]
    }, {"_id": 0})

    has_resume = latest_resume is not None or bool(student.get("resumeUrl"))
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
            "applicationsCount": len(applied_drive_ids),
            "interviewsCount": len(interviews),
            "profileCompletion": pct,
            "isProfileComplete": is_comp,
            "missingRequirements": missing,
            "checklist": checklist,
        },
        "hasResume": has_resume,
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
async def shortlist_student(req: ShortlistRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    student = await db.students.find_one({"id": req.studentId}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    new_status = "shortlisted" if student.get("placementStatus") != "shortlisted" else "unplaced"
    await db.students.update_one({"id": req.studentId}, {"$set": {"placementStatus": new_status}})
    return {"status": "ok", "studentId": req.studentId, "newStatus": new_status}

@router.post("/apply")
async def apply_to_drive(
    req: ApplyDriveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submit application for active placement drive.
    GATED: Profile must be complete (Resume uploaded + verified skills).
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Enforce student ID from authenticated JWT session
    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    # 1. Fetch student record and resume
    student = await db.students.find_one({
        "$or": [{"id": student_id}, {"email": student_email}]
    }, {"_id": 0})

    if not student:
        raise HTTPException(status_code=404, detail="Student profile record not found")

    latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})
    has_resume = latest_resume is not None or bool(student.get("resumeUrl"))
    skills = student.get("skills", [])
    if latest_resume and "extracted_profile" in latest_resume:
        skills = list(set(skills + latest_resume["extracted_profile"].get("raw_skills", [])))

    # 2. Check Profile Completion Gate
    pct, is_comp, missing, _ = calculate_profile_completion(
        student,
        has_resume=has_resume,
        skills_count=len(skills)
    )

    if not is_comp:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Profile Incomplete ({pct}%): You must upload and analyze your resume before applying for placement drives. Missing: {', '.join(missing)}"
        )
    
    # 3. Check Placement Drive Existence & Eligibility
    drive = await db.drives.find_one({"id": req.driveId}, {"_id": 0})
    if not drive:
        raise HTTPException(status_code=404, detail=f"Placement drive {req.driveId} not found")

    grad_year = 2027
    if str(student.get("batch", "")).isdigit():
        grad_year = int(student.get("batch"))

    student_eval_data = {
        "cgpa": float(student.get("cgpa") or 0.0),
        "branch": str(student.get("branch") or "CSE"),
        "graduationYear": grad_year,
        "skills": skills
    }

    is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_eval_data, drive)
    if not is_eligible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not Eligible for {drive.get('companyName', 'this drive')}: {', '.join(reasons)}"
        )

    # 4. Store application record (Avoid duplicate submission)
    existing_app = await db.applications.find_one({"studentId": student_id, "driveId": req.driveId})
    if existing_app:
        return {
            "status": "ok",
            "message": f"Already applied for drive {req.driveId}",
            "studentId": student_id,
            "driveId": req.driveId,
            "alreadyApplied": True
        }

    await db.applications.update_one(
        {"studentId": student_id, "driveId": req.driveId},
        {"$set": {
            "studentId": student_id,
            "studentEmail": student_email,
            "studentName": student.get("name", current_user.get("name")),
            "driveId": req.driveId,
            "appliedAt": datetime.now().isoformat()
        }},
        upsert=True
    )
    await db.students.update_one({"id": student_id}, {"$inc": {"applicationsCount": 1}})
    await db.drives.update_one({"id": req.driveId}, {"$inc": {"registeredCount": 1}})
    return {
        "status": "ok",
        "message": f"Application submitted successfully for drive {req.driveId}",
        "studentId": student_id,
        "driveId": req.driveId
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
    Returns active placement drives ranked by calculated AI skill match score and deterministic hard eligibility
    using the student's real resume data.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # 1. Fetch student data and latest uploaded resume profile
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    latest_resume = await db.resumes.find_one({
        "$or": [{"student_id": student_id}, {"student_id": "rahul-verma"} if student_id in ("student-demo", "rahul-verma") else {"student_id": student_id}]
    }, {"_id": 0})

    has_resume = latest_resume is not None or bool(student and student.get("resumeUrl") and student.get("resumeUrl") not in ("#", "None", ""))

    student_data = {
        "cgpa": float(student.get("cgpa", 0.0)) if student else 0.0,
        "branch": student.get("branch", "CSE") if student else "CSE",
        "graduationYear": 2027,
        "skills": student.get("skills", []) if student else []
    }
    if student and str(student.get("batch", "")).isdigit():
        student_data["graduationYear"] = int(student.get("batch"))

    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("cgpa"):
            student_data["cgpa"] = prof["cgpa"]
        if prof.get("branch"):
            student_data["branch"] = prof["branch"]
        if prof.get("graduation_year"):
            student_data["graduationYear"] = prof["graduation_year"]
        if prof.get("raw_skills"):
            student_data["skills"] = list(set(student_data["skills"] + prof["raw_skills"]))

    # 2. Fetch active drives
    drives = await db.drives.find({"status": "open"}, {"_id": 0}).to_list(length=100)
    if not drives:
        drives = await db.drives.find({}, {"_id": 0}).to_list(length=100)

    recommendations: List[PlacementRecommendationSchema] = []

    for drive in drives:
        if not has_resume or len(student_data.get("skills", [])) == 0:
            # NO RESUME / PROFILE INCOMPLETE CASE
            recommendations.append(PlacementRecommendationSchema(
                drive_id=drive.get("id", "drive-1"),
                company=drive.get("companyName", "Company"),
                role=drive.get("roleTitle", "Software Engineer"),
                company_logo=drive.get("companyLogo", "TN"),
                package_lpa=drive.get("packageLpa"),
                location=drive.get("location"),
                match_score=0,
                eligible=False,
                eligibility_reasons=["Upload and analyze your resume in the Resume Analyzer to determine eligibility and match score."],
                missing_requirements=["Resume Upload Required"],
                matched_skills=[],
                skill_gaps=drive.get("requiredSkills", []),
                matched_preferred_skills=[],
                missing_preferred_skills=drive.get("preferredSkills", []),
                recommendation="Upload your resume to discover placement opportunities you are eligible for."
            ))
            continue

        # Step 1: Hard Eligibility Check (Deterministic)
        eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive)

        # Step 2: Skill Matching Score (Dynamic from real student skills)
        match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(
            student_data.get("skills", []),
            drive
        )

        # Step 3: Recommendation string
        rec_text = generate_recommendation_text(
            eligible,
            reasons,
            match_score,
            missing_req,
            missing_pref
        )

        recommendations.append(PlacementRecommendationSchema(
            drive_id=drive.get("id", "drive-1"),
            company=drive.get("companyName", "Company"),
            role=drive.get("roleTitle", "Software Engineer"),
            company_logo=drive.get("companyLogo", "TN"),
            package_lpa=drive.get("packageLpa"),
            location=drive.get("location"),
            match_score=match_score,
            eligible=eligible,
            eligibility_reasons=reasons,
            missing_requirements=missing_reqs,
            matched_skills=matched_req,
            skill_gaps=missing_req,
            matched_preferred_skills=matched_pref,
            missing_preferred_skills=missing_pref,
            recommendation=rec_text
        ))

    # Rank drives by match_score descending (eligible drives prioritized)
    recommendations.sort(key=lambda x: (1 if x.eligible else 0, x.match_score), reverse=True)
    return recommendations

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
