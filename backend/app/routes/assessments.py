"""Assessment & PrepBot API Routes for PlaceMind."""
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentSessionResponse,
    SaveAnswerRequest,
    AptitudeAllocationRequest,

    AptitudeAllocationResponse,
    QuestionStudentView,
    RunCodeRequest,
    RunCodeResult,
    AssessmentSubmitRequest,
    AssessmentResultResponse,
    TopicPerformanceItem,
    PrepBotChatRequest,
    PrepBotChatResponse,
    AssessmentHistoryItem,
    ComplexityAnalysisRequest,
    ComplexityAnalysisResponse,
    HintRequest,
    HintResponse,
    AdaptiveEvaluationRequest,
    AdaptiveEvaluationResponse,
    SpacedRevisionResponse,
    MockInterviewChatRequest,
    MockInterviewChatResponse,
)

from app.services.code_sandbox_engine import execute_code_submission
from app.services.assessment_ai_engine import (
    generate_personalized_assessment_questions,
    generate_prepbot_chat_reply,
    analyze_code_complexity,
    generate_progressive_hint,
    generate_mock_interview_chat_reply,
)
from app.services.adaptive_engine import (
    evaluate_adaptive_submission,
    get_spaced_revision_summary,
)

logger = logging.getLogger("placemind.assessments")

router = APIRouter(prefix="/api/assessments", tags=["AI Placement Assessment"])

def _to_student_view(q: Dict[str, Any]) -> QuestionStudentView:
    """Strip correct answers, hidden test cases, and solutions for secure student payload."""
    sample_tcs = [
        {"input": tc.get("input"), "expected_output": tc.get("expected_output"), "is_sample": True}
        for tc in q.get("sample_test_cases", [])
        if tc.get("is_sample", True)
    ]
    return QuestionStudentView(
        id=q.get("id") or str(q.get("_id", "")),
        type=q.get("type", "coding"),
        topic=q.get("topic", "General"),
        difficulty=q.get("difficulty", "Medium"),
        question=q.get("question", ""),
        description=q.get("description"),
        input_format=q.get("input_format"),
        output_format=q.get("output_format"),
        constraints=q.get("constraints"),
        code_template=q.get("code_template"),
        sample_test_cases=sample_tcs,
        options=q.get("options"),
        points=q.get("points", 10),
    )

@router.post("/chat", response_model=PrepBotChatResponse)
async def chat_with_prepbot(
    req: PrepBotChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Conversational PrepBot endpoint analyzing student resume skills and recommending personalized tests."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # 1. Fetch Student Profile & Latest Resume
    student = await db.students.find_one({"$or": [{"id": user_id}, {"email": user_email}]}) or current_user
    latest_resume = await db.resumes.find_one({"$or": [{"student_id": user_id}, {"email": user_email}]})

    resume_skills = []
    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        resume_skills = prof.get("raw_skills") or [s.get("name") for s in prof.get("skills", []) if s.get("name")]
    if not resume_skills and student.get("skills"):
        resume_skills = student.get("skills")

    # 2. Fetch Recent Assessment if any
    recent_result = await db.assessment_results.find_one(
        {"$or": [{"student_id": user_id}, {"studentId": user_id}]},
        sort=[("completed_at", -1)]
    )

    reply = await generate_prepbot_chat_reply(
        student_profile=student,
        message=req.message,
        resume_skills=resume_skills,
        recent_assessment=recent_result
    )
    return reply

@router.post("/generate", response_model=AssessmentSessionResponse)
async def generate_assessment_session(
    req: AssessmentCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate a validated personalized assessment session based on student resume skills."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # 1. Fetch Student's extracted resume skills
    latest_resume = await db.resumes.find_one({"$or": [{"student_id": user_id}, {"email": user_email}]})
    resume_skills = []
    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        resume_skills = prof.get("raw_skills") or [s.get("name") for s in prof.get("skills", []) if s.get("name")]

    if not resume_skills:
        student = await db.students.find_one({"$or": [{"id": user_id}, {"email": user_email}]})
        if student and student.get("skills"):
            resume_skills = student.get("skills")

    # If drive_id is provided, incorporate target drive required/preferred skills
    drive_topics = list(req.topics or [])
    drive_doc = None
    if req.drive_id:
        drive_doc = await db.drives.find_one({"id": req.drive_id})
        if drive_doc:
            req_sk = drive_doc.get("requiredSkills") or drive_doc.get("required_skills") or []
            pref_sk = drive_doc.get("preferredSkills") or drive_doc.get("preferred_skills") or []
            combined_skills = list(set(resume_skills + req_sk + pref_sk))
            resume_skills = combined_skills
            if not drive_topics:
                drive_topics = req_sk[:3] + ["Quantitative Aptitude"]

    # 2. Generate questions
    raw_questions = await generate_personalized_assessment_questions(
        student_skills=resume_skills,
        assessment_type=req.type,
        difficulty=req.difficulty,
        topics=drive_topics if drive_topics else None,
        question_count=max(2, min(req.question_count, 20)),
    )

    if not raw_questions:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment generation is temporarily unavailable. Please try again."
        )

    assessment_id = f"asm-{uuid.uuid4().hex[:12]}"
    now = datetime.now()
    expires_at = now + timedelta(minutes=req.duration_minutes + 5)

    # Save full internal assessment document with answer keys
    assessment_doc = {
        "id": assessment_id,
        "assessment_id": assessment_id,
        "student_id": user_id,
        "studentId": user_id,
        "student_email": user_email,
        "drive_id": req.drive_id,
        "company_name": drive_doc.get("companyName") if drive_doc else None,
        "type": req.type,
        "difficulty": req.difficulty,
        "topics": drive_topics or ["Core DSA", "Quantitative Aptitude"],
        "question_count": len(raw_questions),
        "duration_minutes": req.duration_minutes,
        "status": "IN_PROGRESS",
        "questions": raw_questions,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }

    await db.assessments.insert_one(assessment_doc)

    # Return safe student view without answer keys
    student_questions = [_to_student_view(q) for q in raw_questions]

    return AssessmentSessionResponse(
        id=assessment_id,
        student_id=user_id,
        type=req.type,
        difficulty=req.difficulty,
        topics=assessment_doc["topics"],
        question_count=len(student_questions),
        duration_minutes=req.duration_minutes,
        status="IN_PROGRESS",
        questions=student_questions,
        created_at=assessment_doc["created_at"],
        expires_at=assessment_doc["expires_at"],
        drive_id=req.drive_id,
    )

@router.post("/allocate", response_model=AptitudeAllocationResponse, status_code=status.HTTP_201_CREATED)
async def allocate_aptitude_assessment(
    req: AptitudeAllocationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Placement Officer allocates an Aptitude Round Assessment to a shortlisted student.
    Validates application, drive, student, eligibility, status == SHORTLISTED, and idempotency.
    Persists assessment allocation, updates application status, and creates student notification.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app_id = req.application_id
    app = await db.applications.find_one({"$or": [{"id": app_id}, {"_id": app_id}]})
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    drive_id = req.drive_id or app.get("drive_id") or app.get("driveId")
    student_id = req.student_id or app.get("student_id") or app.get("studentId")

    if not drive_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive ID missing on application")

    drive_doc = await db.drives.find_one({"id": drive_id})
    if not drive_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found")

    student_doc = await db.students.find_one({"id": student_id}) if student_id else None
    student_data = student_doc or app

    from app.services.eligibility_engine import evaluate_drive_eligibility
    is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive_doc)
    if not is_eligible:
        reasons_str = "; ".join(reasons)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate is not eligible for this placement drive. Reasons: {reasons_str}"
        )

    raw_status = (app.get("status") or "").upper()
    if raw_status in ["APPLIED", "REGISTERED", "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate must be shortlisted before aptitude allocation. Current status is '{raw_status}'."
        )

    existing_ass = await db.assessments.find_one({
        "$or": [
            {"application_id": app_id, "round_type": "APTITUDE"},
            {"applicationId": app_id, "round_type": "APTITUDE"}
        ]
    })
    if existing_ass or raw_status in ["APTITUDE_ALLOCATED", "APTITUDE_ASSIGNED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Aptitude round has already been allocated."
        )

    timestamp_ms = int(datetime.now().timestamp() * 1000)
    ass_id = f"ass-apt-{timestamp_ms}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now().isoformat()

    company_name = drive_doc.get("companyName") or drive_doc.get("company_name") or app.get("company_name") or "Company"
    job_title = drive_doc.get("roleTitle") or drive_doc.get("job_title") or app.get("job_title") or "Placement Role"
    student_name = student_data.get("name") or student_data.get("student_name") or app.get("student_name") or "Student"
    student_email = student_data.get("email") or app.get("student_email") or ""

    officer_name = current_user.get("name") or "Placement Officer"
    officer_id = current_user.get("id") or "officer"

    assessment_doc = {
        "id": ass_id,
        "assessment_id": ass_id,
        "drive_id": drive_id,
        "driveId": drive_id,
        "application_id": app_id,
        "applicationId": app_id,
        "student_id": student_id,
        "studentId": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "company": company_name,
        "company_name": company_name,
        "job_title": job_title,
        "role_title": job_title,
        "round_type": "APTITUDE",
        "title": req.title or "Aptitude Assessment",
        "status": "ALLOCATED",
        "scheduled_at": req.scheduled_at,
        "deadline": req.deadline,
        "duration_minutes": req.duration_minutes or 30,
        "allocated_at": now_iso,
        "allocated_by": officer_name,
        "allocated_by_id": officer_id,
        "created_at": now_iso
    }
    await db.assessments.insert_one(assessment_doc)

    await db.applications.update_one(
        {"$or": [{"id": app_id}, {"_id": app_id}]},
        {"$set": {
            "status": "APTITUDE_ALLOCATED",
            "aptitude_status": "ALLOCATED",
            "aptitude_allocated": True,
            "aptitude_assessment_id": ass_id,
            "pipeline_stage": "APTITUDE_ALLOCATED",
            "updated_at": now_iso
        }}
    )

    notif_id = f"notif-apt-alloc-{student_id}-{app_id}"
    notification_doc = {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "students",
        "recipientName": student_name,
        "type": "APTITUDE_ALLOCATED",
        "title": "Aptitude Test Assigned",
        "message": f"Your aptitude round for {company_name} - {job_title} has been allocated.",
        "application_id": app_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "assessment_id": ass_id,
        "relatedRoute": f"/student/dashboard?assessment_id={ass_id}",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso
    }
    existing_notif = await db.notifications.find_one({"id": notif_id})
    if not existing_notif:
        await db.notifications.insert_one(notification_doc)

    return AptitudeAllocationResponse(
        id=ass_id,
        assessment_id=ass_id,
        drive_id=drive_id,
        application_id=app_id,
        student_id=student_id,
        company=company_name,
        job_title=job_title,
        round_type="APTITUDE",
        title=req.title or "Aptitude Assessment",
        status="ALLOCATED",
        scheduled_at=req.scheduled_at,
        deadline=req.deadline,
        duration_minutes=req.duration_minutes or 30,
        allocated_at=now_iso,
        allocated_by=officer_name
    )

@router.get("/student/me")
async def get_my_assessment_history(
    round_type: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve all allocated and completed assessment records for the currently authenticated student."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    target_type = (round_type or type or "").upper().strip()

    query_filter: Dict[str, Any] = {
        "$or": [
            {"student_id": user_id},
            {"studentId": user_id},
            {"student_email": user_email}
        ]
    }

    allocations = await db.assessments.find(query_filter, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    raw_results = await db.assessment_results.find(query_filter, {"_id": 0}).sort("completed_at", -1).to_list(length=100)

    if target_type:
        allocations = [a for a in allocations if (a.get("round_type") or a.get("type") or "APTITUDE").upper() == target_type]
        raw_results = [r for r in raw_results if (r.get("round_type") or r.get("type") or "APTITUDE").upper() == target_type]


    history = []
    for a in allocations:
        history.append({
            "id": a.get("id") or a.get("assessment_id"),
            "assessment_id": a.get("assessment_id") or a.get("id"),
            "drive_id": a.get("drive_id") or a.get("driveId", ""),
            "application_id": a.get("application_id") or a.get("applicationId", ""),
            "student_id": a.get("student_id") or a.get("studentId", user_id),
            "company": a.get("company") or a.get("company_name", "Company"),
            "company_name": a.get("company_name") or a.get("company", "Company"),
            "job_title": a.get("job_title") or a.get("role_title", "Role"),
            "role_title": a.get("role_title") or a.get("job_title", "Role"),
            "round_type": a.get("round_type", "APTITUDE"),
            "title": a.get("title", "Aptitude Assessment"),
            "status": a.get("status", "ALLOCATED"),
            "scheduled_at": a.get("scheduled_at"),
            "deadline": a.get("deadline"),
            "duration_minutes": a.get("duration_minutes", 30),
            "allocated_at": a.get("allocated_at") or a.get("created_at", ""),
        })

    for r in raw_results:
        topics = [t["topic"] for t in r.get("topic_performance", [])] if r.get("topic_performance") else []
        history.append({
            "id": r.get("id") or str(uuid.uuid4()),
            "assessment_id": r.get("assessment_id", ""),
            "drive_id": r.get("drive_id", ""),
            "application_id": r.get("application_id", ""),
            "student_id": user_id,
            "company": r.get("company_name", "Company"),
            "job_title": r.get("job_title", "Role"),
            "type": r.get("type", "COMBINED"),
            "round_type": r.get("round_type", "COMBINED"),
            "difficulty": r.get("difficulty", "Medium"),
            "topics": topics,
            "total_score": r.get("total_score", 0),
            "percentage": r.get("percentage", 0),
            "status": "Completed",
            "completed_at": r.get("completed_at", ""),
            "allocated_at": r.get("completed_at", ""),
            "duration_minutes": int((r.get("time_taken_seconds", 1800)) / 60)
        })

    return history


@router.get("/student/analytics")
async def get_student_assessment_analytics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Aggregated assessment performance, topic strengths, and real skill readiness."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    results = await db.assessment_results.find({
        "$or": [
            {"student_id": user_id},
            {"studentId": user_id},
            {"student_email": user_email}
        ]
    }, {"_id": 0}).sort("completed_at", -1).to_list(length=100)

    if not results:
        return {
            "assessments_count": 0,
            "coding_average": None,
            "aptitude_average": None,
            "overall_average": None,
            "topics": [],
            "strengths": [],
            "weaknesses": [],
            "has_data": False
        }

    coding_scores = [r["coding_score"] for r in results if r.get("coding_score") is not None]
    aptitude_scores = [r["aptitude_score"] for r in results if r.get("aptitude_score") is not None]
    overall_scores = [r["percentage"] for r in results if r.get("percentage") is not None]

    avg_coding = round(sum(coding_scores) / len(coding_scores), 1) if coding_scores else 0.0
    avg_apt = round(sum(aptitude_scores) / len(aptitude_scores), 1) if aptitude_scores else 0.0
    avg_overall = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0.0

    all_topics: Dict[str, List[float]] = {}
    for r in results:
        for tp in r.get("topic_performance", []):
            top_name = tp.get("topic")
            pct = tp.get("percentage", 0)
            if top_name:
                all_topics.setdefault(top_name, []).append(pct)

    topic_summary = []
    strengths = []
    weaknesses = []
    for top, pcts in all_topics.items():
        avg_top = round(sum(pcts) / len(pcts), 1)
        st = "Strong" if avg_top >= 75 else ("Moderate" if avg_top >= 50 else "Needs Improvement")
        if avg_top >= 75:
            strengths.append(top)
        elif avg_top < 55:
            weaknesses.append(top)
        topic_summary.append({
            "topic": top,
            "average_percentage": avg_top,
            "status": st
        })

    return {
        "assessments_count": len(results),
        "coding_average": avg_coding,
        "aptitude_average": avg_apt,
        "overall_average": avg_overall,
        "topics": topic_summary,
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:4],
        "has_data": True
    }

@router.get("/{assessment_id}", response_model=AssessmentSessionResponse)
async def get_assessment_session(
    assessment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve active assessment session (safe student payload)."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Verify ownership
    owner_id = assessment.get("student_id") or assessment.get("studentId")
    owner_email = (assessment.get("student_email") or "").lower()
    if owner_id != user_id and (not owner_email or owner_email != user_email):
        raise HTTPException(status_code=403, detail="Unauthorized access to this assessment")

    round_type = (assessment.get("round_type") or assessment.get("type") or "APTITUDE").upper()
    if round_type == "TECHNICAL":
        app_id = assessment.get("application_id") or assessment.get("applicationId")
        if app_id:
            app_doc = await db.applications.find_one({"$or": [{"id": app_id}, {"_id": app_id}]})
            if app_doc:
                apt_status = (app_doc.get("aptitude_status") or "").upper()
                app_status = (app_doc.get("status") or "").upper()
                if app_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED"] or apt_status == "FAILED":
                    raise HTTPException(status_code=400, detail="Cannot access Technical Test: Candidate failed the Aptitude Round.")
                if apt_status not in ["QUALIFIED", "PASSED"] and app_status not in ["APTITUDE_QUALIFIED", "TECHNICAL_ALLOCATED", "TECHNICAL_IN_PROGRESS", "TECHNICAL_COMPLETED", "TECHNICAL_QUALIFIED", "TECHNICAL_FAILED", "INTERVIEW_PENDING"]:
                    raise HTTPException(status_code=400, detail="Cannot access Technical Test: Aptitude round qualification required.")

    student_questions = [_to_student_view(q) for q in assessment.get("questions", [])]

    return AssessmentSessionResponse(
        id=assessment.get("id") or assessment_id,
        student_id=user_id,
        type=assessment.get("type") or assessment.get("round_type") or "APTITUDE",
        difficulty=assessment.get("difficulty", "Medium"),
        topics=assessment.get("topics", ["Data Structures & Algorithms", "SQL", "OOP", "System Architecture"] if round_type == "TECHNICAL" else ["Quantitative Aptitude", "Logical Reasoning"]),
        question_count=len(student_questions),
        duration_minutes=assessment.get("duration_minutes", 30),
        status=assessment.get("status", "ALLOCATED"),
        questions=student_questions,
        created_at=assessment.get("created_at") or "",
        started_at=assessment.get("started_at"),
        expires_at=assessment.get("expires_at"),
        drive_id=assessment.get("drive_id") or assessment.get("driveId"),
        application_id=assessment.get("application_id") or assessment.get("applicationId"),
        company=assessment.get("company") or assessment.get("company_name", "Company"),
        job_title=assessment.get("job_title") or assessment.get("role_title", "Placement Role"),
        saved_answers=assessment.get("saved_answers") or {}
    )

@router.post("/{assessment_id}/start", response_model=AssessmentSessionResponse)
async def start_assessment_session(
    assessment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Student starts their allocated assessment session (Aptitude or Technical).
    Sets started_at, calculates expires_at, sets status = IN_PROGRESS.
    Persistent: If already IN_PROGRESS, returns existing timer/state without resetting expires_at.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Ownership check
    owner_id = assessment.get("student_id") or assessment.get("studentId")
    owner_email = (assessment.get("student_email") or "").lower()
    if owner_id != user_id and (not owner_email or owner_email != user_email):
        raise HTTPException(status_code=403, detail="Unauthorized access to this assessment")

    round_type = (assessment.get("round_type") or assessment.get("type") or "APTITUDE").upper()

    # Access control verification for Technical test
    if round_type == "TECHNICAL":
        app_id = assessment.get("application_id") or assessment.get("applicationId")
        if app_id:
            app_doc = await db.applications.find_one({"$or": [{"id": app_id}, {"_id": app_id}]})
            if app_doc:
                apt_status = (app_doc.get("aptitude_status") or "").upper()
                app_status = (app_doc.get("status") or "").upper()
                if app_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED"] or apt_status == "FAILED":
                    raise HTTPException(status_code=400, detail="Cannot access Technical Test: Candidate failed the Aptitude Round.")
                if apt_status not in ["QUALIFIED", "PASSED"] and app_status not in ["APTITUDE_QUALIFIED", "TECHNICAL_ALLOCATED", "TECHNICAL_IN_PROGRESS", "TECHNICAL_COMPLETED", "TECHNICAL_QUALIFIED", "TECHNICAL_FAILED", "INTERVIEW_PENDING"]:
                    raise HTTPException(status_code=400, detail="Cannot access Technical Test: Aptitude round qualification required.")

    curr_status = (assessment.get("status") or "ALLOCATED").upper()

    if curr_status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assessment is already completed.")

    from app.services.assessment_ai_engine import CURATED_QUESTIONS_BANK

    now = datetime.now()
    duration_mins = assessment.get("duration_minutes") or 30

    # Ensure questions array is populated with corresponding MCQs
    questions = assessment.get("questions") or []
    if not questions:
        if round_type == "TECHNICAL":
            tech_qs = [q for q in CURATED_QUESTIONS_BANK if q.get("type") == "technical"]
            questions = tech_qs[:10]
        else:
            aptitude_qs = [q for q in CURATED_QUESTIONS_BANK if q.get("type") == "aptitude"]
            questions = aptitude_qs[:10]

    if curr_status == "ALLOCATED" or not assessment.get("started_at"):
        started_at = now.isoformat()
        expires_at = (now + timedelta(minutes=duration_mins)).isoformat()
        status_val = "IN_PROGRESS"

        await db.assessments.update_one(
            {"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]},
            {"$set": {
                "started_at": started_at,
                "expires_at": expires_at,
                "status": status_val,
                "duration_minutes": duration_mins,
                "questions": questions,
                "updated_at": started_at
            }}
        )
        assessment["started_at"] = started_at
        assessment["expires_at"] = expires_at
        assessment["status"] = status_val
        assessment["questions"] = questions

        app_id = assessment.get("application_id") or assessment.get("applicationId")
        if app_id:
            new_app_stage = "TECHNICAL_IN_PROGRESS" if round_type == "TECHNICAL" else "APTITUDE_IN_PROGRESS"
            await db.applications.update_one(
                {"$or": [{"id": app_id}, {"_id": app_id}]},
                {"$set": {
                    "status": new_app_stage,
                    "stage": new_app_stage,
                    "pipeline_stage": new_app_stage,
                    "updated_at": started_at
                }}
            )


    else:
        # Check if expired
        expires_str = assessment.get("expires_at")
        if expires_str:
            try:
                exp_dt = datetime.fromisoformat(expires_str)
                if now > exp_dt + timedelta(minutes=2): # 2 min grace period
                    await db.assessments.update_one(
                        {"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]},
                        {"$set": {"status": "EXPIRED"}}
                    )
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment duration has expired.")
            except ValueError:
                pass

    student_questions = [_to_student_view(q) for q in questions]

    return AssessmentSessionResponse(
        id=assessment.get("id") or assessment_id,
        student_id=user_id,
        type=assessment.get("type") or assessment.get("round_type") or "APTITUDE",
        difficulty=assessment.get("difficulty", "Medium"),
        topics=assessment.get("topics", ["Quantitative Aptitude", "Logical Reasoning"]),
        question_count=len(student_questions),
        duration_minutes=duration_mins,
        status=assessment.get("status", "IN_PROGRESS"),
        questions=student_questions,
        created_at=assessment.get("created_at") or "",
        started_at=assessment.get("started_at"),
        expires_at=assessment.get("expires_at"),
        drive_id=assessment.get("drive_id") or assessment.get("driveId"),
        application_id=assessment.get("application_id") or assessment.get("applicationId"),
        company=assessment.get("company") or assessment.get("company_name", "Company"),
        job_title=assessment.get("job_title") or assessment.get("role_title", "Placement Role"),
        saved_answers=assessment.get("saved_answers") or {}
    )

@router.post("/{assessment_id}/answers")
async def save_assessment_answer(
    assessment_id: str,
    req: SaveAnswerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Save student answer asynchronously during test progress."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    owner_id = assessment.get("student_id") or assessment.get("studentId")
    owner_email = (assessment.get("student_email") or "").lower()
    if owner_id != user_id and (not owner_email or owner_email != user_email):
        raise HTTPException(status_code=403, detail="Unauthorized access to this assessment")

    if assessment.get("status") == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot modify answers for a completed assessment.")

    update_field = f"saved_answers.{req.question_id}"
    await db.assessments.update_one(
        {"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]},
        {"$set": {update_field: req.selected_option or req.code or ""}}
    )
    return {"status": "saved", "question_id": req.question_id}


@router.post("/{assessment_id}/run-code", response_model=RunCodeResult)
async def run_code_in_sandbox(
    assessment_id: str,
    req: RunCodeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Run code against sample test cases in isolated sandbox."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Find the target coding question
    target_q = None
    for q in assessment.get("questions", []):
        if q.get("id") == req.question_id:
            target_q = q
            break

    if not target_q:
        raise HTTPException(status_code=404, detail="Question not found in assessment")

    # Extract sample test cases
    sample_cases = [tc for tc in target_q.get("sample_test_cases", []) if tc.get("is_sample", True)]
    if not sample_cases and target_q.get("sample_test_cases"):
        sample_cases = target_q.get("sample_test_cases")[:2]

    exec_result = execute_code_submission(
        code=req.code,
        language=req.language,
        test_cases=sample_cases,
        custom_input=req.custom_input
    )

    return RunCodeResult(
        status=exec_result["status"],
        stdout=exec_result["stdout"],
        stderr=exec_result["stderr"],
        execution_time_ms=exec_result["execution_time_ms"],
        passed_sample_cases=exec_result["passed_sample_cases"],
        total_sample_cases=exec_result["total_sample_cases"],
        test_results=exec_result["test_results"]
    )

@router.post("/{assessment_id}/submit", response_model=AssessmentResultResponse)
async def submit_assessment(
    assessment_id: str,
    req: AssessmentSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Authoritative server-side evaluation of student answers and code."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if assessment.get("student_id") != user_id and assessment.get("studentId") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this assessment")

    if assessment.get("status") == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assessment is already completed.")

    existing_res = await db.assessment_results.find_one({"assessment_id": assessment_id})
    if existing_res:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assessment result already recorded.")


    # Authoritative Evaluation
    questions = assessment.get("questions", [])
    q_map = {q.get("id"): q for q in questions}

    total_possible_points = 0
    total_earned_points = 0
    coding_possible = 0
    coding_earned = 0
    aptitude_possible = 0
    aptitude_earned = 0

    topic_stats: Dict[str, Dict[str, int]] = {}
    review_list: List[Dict[str, Any]] = []

    # Map user answers
    answers_map = {ans.question_id: ans for ans in req.answers}

    for q in questions:
        qid = q.get("id")
        q_type = q.get("type", "coding")
        topic = q.get("topic", "General")
        q_points = q.get("points", 10 if q_type == "aptitude" else 20)

        total_possible_points += q_points
        if topic not in topic_stats:
            topic_stats[topic] = {"earned": 0, "total": 0}
        topic_stats[topic]["total"] += q_points

        student_ans = answers_map.get(qid)
        is_correct = False
        earned = 0
        details = {}

        if q_type in ["aptitude", "technical", "mcq"]:
            aptitude_possible += q_points
            expected_opt = (q.get("correct_answer") or "").strip()
            selected_opt = (student_ans.selected_option or "").strip() if student_ans else ""
            is_correct = bool(expected_opt and selected_opt and expected_opt.lower() == selected_opt.lower())
            if is_correct:
                earned = q_points
                aptitude_earned += q_points

            details = {
                "question_id": qid,
                "type": q_type,
                "question": q.get("question"),
                "selected_option": selected_opt,
                "correct_answer": expected_opt,
                "is_correct": is_correct,
                "explanation": q.get("explanation"),
                "points_earned": earned,
                "points_possible": q_points,
            }


        elif q_type == "coding":
            coding_possible += q_points
            code_text = student_ans.code if student_ans and student_ans.code else ""
            lang = student_ans.language if student_ans else "python"
            all_test_cases = q.get("sample_test_cases", [])

            if code_text and all_test_cases:
                exec_res = execute_code_submission(code_text, lang, all_test_cases)
                passed_tc = exec_res["passed_sample_cases"]
                total_tc = exec_res["total_sample_cases"]
                pass_ratio = passed_tc / max(total_tc, 1)
                earned = int(q_points * pass_ratio)
                coding_earned += earned
                is_correct = (pass_ratio >= 0.75)
                details = {
                    "question_id": qid,
                    "type": "coding",
                    "question": q.get("question"),
                    "submitted_code": code_text,
                    "language": lang,
                    "passed_test_cases": passed_tc,
                    "total_test_cases": total_tc,
                    "is_correct": is_correct,
                    "points_earned": earned,
                    "points_possible": q_points,
                }
            else:
                details = {
                    "question_id": qid,
                    "type": "coding",
                    "question": q.get("question"),
                    "submitted_code": "",
                    "is_correct": False,
                    "points_earned": 0,
                    "points_possible": q_points,
                }

        total_earned_points += earned
        topic_stats[topic]["earned"] += earned
        review_list.append(details)

    # Calculate percentages
    overall_pct = round((total_earned_points / max(total_possible_points, 1)) * 100, 1)
    coding_pct = round((coding_earned / max(coding_possible, 1)) * 100, 1) if coding_possible > 0 else 0.0
    aptitude_pct = round((aptitude_earned / max(aptitude_possible, 1)) * 100, 1) if aptitude_possible > 0 else 0.0

    # Build Topic Performance
    topic_perf: List[TopicPerformanceItem] = []
    strengths = []
    weaknesses = []

    for top, stat in topic_stats.items():
        top_pct = round((stat["earned"] / max(stat["total"], 1)) * 100, 1)
        if top_pct >= 75:
            st = "Strong"
            strengths.append(top)
        elif top_pct >= 50:
            st = "Moderate"
        else:
            st = "Needs Improvement"
            weaknesses.append(top)

        topic_perf.append(TopicPerformanceItem(
            topic=top,
            score=stat["earned"],
            total=stat["total"],
            percentage=top_pct,
            status=st
        ))

    # Recommendations
    recs = []
    if weaknesses:
        recs.append(f"Focus on practicing core concepts in: {', '.join(weaknesses[:3])}.")
    if coding_pct < 70 and coding_possible > 0:
        recs.append("Practice 5 daily DSA problems on Arrays, Strings, and Time Complexity optimization.")
    if aptitude_pct < 70 and aptitude_possible > 0:
        recs.append("Review speed mathematics and logical deduction shortcuts for aptitude tests.")
    if not recs:
        recs.append("Excellent performance! You are well-prepared for technical and aptitude rounds.")

    result_id = f"res-{uuid.uuid4().hex[:12]}"
    from app.core.config import settings
    from app.db.integrity import create_idempotent_notification

    total_q_cnt = len(questions)
    attempted_cnt = len(req.answers)
    correct_cnt = sum(1 for r in review_list if r.get("is_correct"))
    incorrect_cnt = max(0, total_q_cnt - correct_cnt)
    round_type = (assessment.get("round_type") or assessment.get("type") or "APTITUDE").upper()
    pass_threshold = settings.TECHNICAL_PASS_PERCENTAGE if round_type == "TECHNICAL" else settings.APTITUDE_PASS_PERCENTAGE
    is_passed = overall_pct >= pass_threshold
    now_iso = datetime.now().isoformat()

    result_doc = {

        "id": result_id,
        "assessment_id": assessment_id,
        "student_id": user_id,
        "studentId": user_id,
        "student_email": user_email,

        "type": assessment.get("type", "COMBINED"),
        "difficulty": assessment.get("difficulty", "Medium"),
        "coding_score": coding_pct,
        "aptitude_score": aptitude_pct,
        "total_score": total_earned_points,
        "total_questions": total_q_cnt,
        "attempted_questions": attempted_cnt,
        "correct_answers": correct_cnt,
        "incorrect_answers": incorrect_cnt,
        "percentage": overall_pct,
        "passing_percentage": pass_threshold,
        "result": "QUALIFIED" if is_passed else "FAILED",
        "passed": is_passed,
        "evaluated_at": now_iso,
        "topic_performance": [t.dict() for t in topic_perf],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recs,
        "time_taken_seconds": req.time_taken_seconds,
        "completed_at": now_iso,
        "questions_review": review_list,
    }

    # Store in MongoDB
    await db.assessment_results.insert_one(result_doc)
    await db.assessments.update_one(
        {"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]},
        {"$set": {
            "status": "COMPLETED",
            "completed_at": now_iso,
            "score": overall_pct,
            "passing_percentage": pass_threshold,
            "result": "QUALIFIED" if is_passed else "FAILED",
            "evaluated_at": now_iso
        }}
    )

    app_id = assessment.get("application_id") or assessment.get("applicationId")
    if app_id:
        company_name = assessment.get("company") or assessment.get("company_name", "Company")
        job_title = assessment.get("job_title") or assessment.get("role_title", "Software Engineer")
        drive_id = assessment.get("drive_id") or assessment.get("driveId")

        if round_type == "TECHNICAL":
            from app.routes.drives import _get_or_init_drive_rounds
            drive_rounds = await _get_or_init_drive_rounds(db, drive_id) if drive_id else []

            tech_round = next((r for r in drive_rounds if (r.get("round_type") or "").upper() == "TECHNICAL" or "TECHNICAL" in (r.get("name") or "").upper()), None)
            hr_round = next((r for r in drive_rounds if (r.get("round_type") or "").upper() == "HR" or "HR" in (r.get("name") or "").upper()), None)
            if not hr_round and tech_round:
                tech_order = tech_round.get("order", 2)
                hr_round = next((r for r in drive_rounds if r.get("order", 0) > tech_order), None)

            tech_round_id = tech_round.get("id") if tech_round else None
            hr_round_id = hr_round.get("id") if hr_round else None


            new_stage = "HR_INTERVIEW_PENDING" if is_passed else "REJECTED_AT_TECHNICAL"
            new_tech_status = "QUALIFIED" if is_passed else "FAILED"

            set_fields = {
                "status": new_stage,
                "stage": new_stage,
                "pipeline_stage": new_stage,
                "technical_status": new_tech_status,
                "technical_score": overall_pct,
                "technical_completed_at": now_iso,
                "updated_at": now_iso
            }

            if is_passed:
                if tech_round_id:
                    set_fields[f"round_evaluations.{tech_round_id}"] = {
                        "status": "PASSED",
                        "score": overall_pct,
                        "notes": f"Scored {overall_pct}% (Threshold: {pass_threshold}%)",
                        "evaluated_at": now_iso
                    }
                if hr_round_id:
                    set_fields[f"round_evaluations.{hr_round_id}"] = {
                        "status": "PENDING",
                        "evaluated_at": None
                    }
                    set_fields["current_round_id"] = hr_round_id
            else:
                if tech_round_id:
                    set_fields[f"round_evaluations.{tech_round_id}"] = {
                        "status": "REJECTED",
                        "score": overall_pct,
                        "notes": f"Scored {overall_pct}% (Threshold: {pass_threshold}%)",
                        "evaluated_at": now_iso
                    }

            print("TECH EVAL SET FIELDS:", set_fields)
            await db.applications.update_one(
                {"$or": [{"id": app_id}, {"_id": app_id}]},
                {"$set": set_fields}
            )



            notif_type = "TECHNICAL_QUALIFIED" if is_passed else "TECHNICAL_FAILED"
            notif_title = "Technical Round Qualified! 💻🎉" if is_passed else "Technical Round Result Update"
            notif_msg = (
                f"Congratulations! You scored {overall_pct}% in your Technical Test for {company_name} - {job_title} and qualified for the Interview stage."
                if is_passed
                else f"Thank you for participating. Your Technical test score for {company_name} - {job_title} was {overall_pct}%. You did not meet the required passing threshold ({pass_threshold}%)."
            )

            notif_id = f"notif-tech-eval-{user_id}-{app_id}"
            await create_idempotent_notification(db, {
                "id": notif_id,
                "recipient_user_id": user_id,
                "recipientRole": "student",
                "type": notif_type,
                "title": notif_title,
                "message": notif_msg,
                "application_id": app_id,
                "student_id": user_id,
                "drive_id": drive_id,
                "assessment_id": assessment_id,
                "read": False,
                "important": is_passed,
                "created_at": now_iso,
            })
        else:
            from app.routes.drives import _get_or_init_drive_rounds
            drive_rounds = await _get_or_init_drive_rounds(db, drive_id) if drive_id else []

            new_stage = "APTITUDE_QUALIFIED" if is_passed else "REJECTED_AT_APTITUDE"
            new_apt_status = "QUALIFIED" if is_passed else "FAILED"
            pipe_stage = "TECHNICAL_ROUND_PENDING" if is_passed else "REJECTED_AT_APTITUDE"

            apt_round = next((r for r in drive_rounds if "APTITUDE" in (r.get("round_type") or "").upper() or "APTITUDE" in (r.get("name") or "").upper()), None)
            tech_round = next((r for r in drive_rounds if "TECHNICAL" in (r.get("round_type") or "").upper() or "TECHNICAL" in (r.get("name") or "").upper()), None)

            apt_round_id = apt_round.get("id") if apt_round else None
            tech_round_id = tech_round.get("id") if tech_round else None

            set_fields = {
                "status": new_stage,
                "stage": new_stage,
                "pipeline_stage": pipe_stage,
                "aptitude_status": new_apt_status,
                "aptitude_score": overall_pct,
                "aptitude_completed_at": now_iso,
                "updated_at": now_iso
            }
            if is_passed:
                if apt_round_id:
                    set_fields[f"round_evaluations.{apt_round_id}"] = {
                        "status": "PASSED",
                        "score": overall_pct,
                        "notes": f"Scored {overall_pct}% (Threshold: {pass_threshold}%)",
                        "evaluated_at": now_iso
                    }
                if tech_round_id:
                    set_fields[f"round_evaluations.{tech_round_id}"] = {
                        "status": "PENDING",
                        "evaluated_at": None
                    }
                    set_fields["current_round_id"] = tech_round_id
            else:
                if apt_round_id:
                    set_fields[f"round_evaluations.{apt_round_id}"] = {
                        "status": "REJECTED",
                        "score": overall_pct,
                        "notes": f"Scored {overall_pct}% (Threshold: {pass_threshold}%)",
                        "evaluated_at": now_iso
                    }


            await db.applications.update_one(
                {"$or": [{"id": app_id}, {"_id": app_id}]},
                {"$set": set_fields}
            )


            notif_type = "APTITUDE_QUALIFIED" if is_passed else "APTITUDE_FAILED"
            notif_title = "Aptitude Round Qualified! 🎉" if is_passed else "Aptitude Round Result Update"
            notif_msg = (
                f"Congratulations! You scored {overall_pct}% in your Aptitude Test for {company_name} - {job_title} and qualified for the Technical Round."
                if is_passed
                else f"Thank you for participating. Your Aptitude score for {company_name} - {job_title} was {overall_pct}%. You did not meet the required passing threshold ({pass_threshold}%)."
            )

            notif_id = f"notif-apt-eval-{user_id}-{app_id}"
            await create_idempotent_notification(db, {
                "id": notif_id,
                "recipient_user_id": user_id,
                "recipientRole": "student",
                "type": notif_type,
                "title": notif_title,
                "message": notif_msg,
                "application_id": app_id,
                "student_id": user_id,
                "drive_id": drive_id,
                "assessment_id": assessment_id,
                "read": False,
                "important": is_passed,
                "created_at": now_iso,
            })





    # Update Student Profile Placement Readiness Score dynamically
    # Readiness = 40% Profile Completeness + 35% Assessment Overall + 25% CGPA scaling
    student = await db.students.find_one({"$or": [{"id": user_id}, {"email": user_email}]})
    cgpa = student.get("cgpa", 8.0) if student else 8.0
    new_readiness = int(min(100, max(30, (overall_pct * 0.5) + (cgpa * 5.0))))

    await db.students.update_one(
        {"$or": [{"id": user_id}, {"email": user_email}]},
        {"$set": {
            "readinessScore": new_readiness,
            "lastAssessmentScore": overall_pct,
            "lastAssessmentDate": now_iso
        }}
    )

    return AssessmentResultResponse(
        id=result_id,
        assessment_id=assessment_id,
        student_id=user_id,
        type=assessment.get("type", "COMBINED"),
        difficulty=assessment.get("difficulty", "Medium"),
        coding_score=coding_pct,
        aptitude_score=aptitude_pct,
        total_score=total_earned_points,
        percentage=overall_pct,
        passed=overall_pct >= 60.0,
        topic_performance=topic_perf,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recs,
        time_taken_seconds=req.time_taken_seconds,
        completed_at=now_iso,
        questions_review=review_list,
    )

@router.get("/{assessment_id}/results", response_model=AssessmentResultResponse)
async def get_assessment_result(
    assessment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve verified evaluation results and topic breakdown."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")

    res = await db.assessment_results.find_one(
        {"$or": [{"assessment_id": assessment_id}, {"id": assessment_id}]},
        {"_id": 0}
    )
    if not res:
        raise HTTPException(status_code=404, detail="Assessment results not found")

    if res.get("student_id") != user_id and res.get("studentId") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this result")

    return res

@router.post("/{assessment_id}/analyze-complexity", response_model=ComplexityAnalysisResponse)
async def analyze_submission_complexity(
    assessment_id: str,
    req: ComplexityAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Analyze time and space complexity of student's code solution using Gemini AI."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    q_title = "Coding Problem"
    q_desc = "Analyze submitted solution"
    
    if assessment:
        q_doc = next((q for q in assessment.get("questions", []) if q.get("id") == req.question_id), None)
        if q_doc:
            q_title = q_doc.get("question", "Coding Problem")
            q_desc = q_doc.get("description", "")

    return await analyze_code_complexity(
        question_title=q_title,
        question_desc=q_desc,
        code=req.code,
        language=req.language
    )

@router.post("/{assessment_id}/hint", response_model=HintResponse)
async def get_assessment_hint(
    assessment_id: str,
    req: HintRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve progressive Socratic hints for an assessment question."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    assessment = await db.assessments.find_one({"$or": [{"id": assessment_id}, {"assessment_id": assessment_id}]})
    q_title = "Coding Problem"
    q_desc = "Provide hint for current question"
    
    if assessment:
        q_doc = next((q for q in assessment.get("questions", []) if q.get("id") == req.question_id), None)
        if q_doc:
            q_title = q_doc.get("question", "Coding Problem")
            q_desc = q_doc.get("description", "")

    return await generate_progressive_hint(
        question_title=q_title,
        question_desc=q_desc,
        code=req.code,
        language=req.language,
        hint_level=req.hint_level
    )

@router.post("/adaptive/evaluate", response_model=AdaptiveEvaluationResponse)
async def evaluate_adaptive_attempt(
    req: AdaptiveEvaluationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Evaluate submission score, update difficulty state machine, SM-2 repetition queue, and topic mastery."""
    student_id = current_user.get("id") or "student-demo"
    return await evaluate_adaptive_submission(student_id, req)

@router.get("/adaptive/spaced-revision", response_model=SpacedRevisionResponse)
async def get_spaced_revision_data(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve due spaced repetition items and full topic mastery index for current student."""
    student_id = current_user.get("id") or "student-demo"
    return await get_spaced_revision_summary(student_id)


