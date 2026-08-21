from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.mongodb import db_manager
from app.schemas.student import StudentSchema, ShortlistRequest, ApplyDriveRequest
from app.schemas.resume import PlacementRecommendationSchema, SkillGapResponseSchema, SkillGapItemSchema
from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.skill_matching_engine import calculate_skill_match
from app.services.skill_gap_engine import generate_recommendation_text, aggregate_skill_gaps_across_drives

router = APIRouter(prefix="/api/students", tags=["Students"])

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
async def apply_to_drive(req: ApplyDriveRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    await db.students.update_one({"id": req.studentId}, {"$inc": {"applicationsCount": 1}})
    await db.drives.update_one({"id": req.driveId}, {"$inc": {"registeredCount": 1}})
    return {"status": "ok", "message": f"Student {req.studentId} applied for drive {req.driveId}"}

@router.get("/{student_id}/placement-recommendations", response_model=List[PlacementRecommendationSchema])
async def get_placement_recommendations(student_id: str):
    """
    Returns active placement drives ranked by calculated AI skill match score and deterministic hard eligibility.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # 1. Fetch student data or latest uploaded resume profile
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})

    student_data = {}
    if student:
        student_data = {
            "cgpa": student.get("cgpa", 8.5),
            "branch": student.get("branch", "CSE"),
            "graduationYear": student.get("batch", 2027),
            "skills": student.get("skills", [])
        }
    
    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("cgpa"):
            student_data["cgpa"] = prof["cgpa"]
        if prof.get("branch"):
            student_data["branch"] = prof["branch"]
        if prof.get("graduation_year"):
            student_data["graduationYear"] = prof["graduation_year"]
        if prof.get("raw_skills"):
            student_data["skills"] = list(set(student_data.get("skills", []) + prof["raw_skills"]))

    if not student_data:
        student_data = {
            "cgpa": 8.9,
            "branch": "CSE",
            "graduationYear": 2027,
            "skills": ["Python", "FastAPI", "SQL", "Docker", "REST APIs", "Git"]
        }

    # 2. Fetch active drives
    drives = await db.drives.find({"status": "open"}, {"_id": 0}).to_list(length=100)
    if not drives:
        drives = await db.drives.find({}, {"_id": 0}).to_list(length=100)

    recommendations: List[PlacementRecommendationSchema] = []

    for drive in drives:
        # Step 1: Hard Eligibility Check (Deterministic)
        eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive)

        # Step 2: Skill Matching Score (Dynamic)
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

    # Rank drives by match_score descending (eligible drives first)
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

    if not student_skills:
        student_skills = ["Python", "FastAPI", "SQL", "Docker", "REST APIs", "Git"]

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
