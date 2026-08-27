from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user, get_current_user
from app.db.integrity import create_idempotent_notification
from app.schemas.interview import (
    InterviewSchema,
    InterviewCreate,
    InterviewRescheduleRequest,
    InterviewAvailabilityCreate,
    InterviewAvailabilityUpdate,
    InterviewAvailabilitySchema,
    InterviewStatusUpdateRequest,
)

from app.schemas.assessment import (
    MockInterviewChatRequest,
    MockInterviewChatResponse,
)
from app.services.assessment_ai_engine import generate_mock_interview_chat_reply

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])
singular_router = APIRouter(prefix="/api/interview", tags=["Interviews"])

@router.get("/eligible-candidates", response_model=List[Dict[str, Any]])
async def get_interview_eligible_candidates(
    drive_id: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Retrieve candidates eligible for HR / Interview scheduling.
    Filtered by drive_id (or company_name fallback).
    Only candidates who:
    1. belong to the selected drive
    2. qualified Technical round (technical_status == "QUALIFIED" or stage in TECHNICAL_QUALIFIED / HR_INTERVIEW_PENDING / HR_INTERVIEW_ALLOCATED / INTERVIEW_PENDING)
    3. are NOT rejected (status not in REJECTED, REJECTED_AT_APTITUDE, REJECTED_AT_TECHNICAL, REJECTED_AT_HR)
    4. have NOT already been scheduled or completed an interview
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}

    target_drive_id = drive_id
    if not target_drive_id and company_name:
        d_doc = await db.drives.find_one({"$or": [{"companyName": company_name}, {"company_name": company_name}]})
        if d_doc:
            target_drive_id = d_doc.get("id")

    if target_drive_id:
        query["$or"] = [{"drive_id": target_drive_id}, {"driveId": target_drive_id}]
    elif company_name:
        query["$or"] = [{"company_name": company_name}, {"companyName": company_name}]

    apps = await db.applications.find(query, {"_id": 0}).to_list(length=500)

    # Fetch interviews for THIS drive that are ACTUALLY SCHEDULED or COMPLETED with assigned time/venue
    scheduled_query: Dict[str, Any] = {
        "status": {"$in": ["SCHEDULED", "COMPLETED", "scheduled", "completed", "CONFIRMED", "confirmed"]}
    }
    if target_drive_id:
        scheduled_query["$or"] = [{"driveId": target_drive_id}, {"drive_id": target_drive_id}]

    scheduled_interviews = await db.interviews.find(scheduled_query, {"_id": 0}).to_list(length=500)

    scheduled_cand_ids = set()
    for s_int in scheduled_interviews:
        c_id = s_int.get("candidateId") or s_int.get("student_id") or s_int.get("studentId")
        d_id = s_int.get("driveId") or s_int.get("drive_id")
        if c_id:
            scheduled_cand_ids.add(f"{c_id}_{d_id}" if d_id else str(c_id))

    eligible_candidates = []
    for app in apps:
        app_id = app.get("id")
        student_id = app.get("student_id") or app.get("studentId")
        d_id = app.get("drive_id") or app.get("driveId")

        # 0. Drive Isolation
        if target_drive_id and d_id != target_drive_id:
            continue

        app_status = (app.get("status") or "").upper()
        app_stage = (app.get("stage") or app.get("pipeline_stage") or "").upper()
        apt_status = (app.get("aptitude_status") or "").upper()
        tech_status = (app.get("technical_status") or "").upper()
        hr_status = (app.get("hr_status") or "").upper()


        # 1. Exclude rejected candidates
        if app_status in [
            "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE",
            "REJECTED_AT_APTITUDE", "APTITUDE_FAILED",
            "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED",
            "REJECTED_AT_HR"
        ] or app_stage in [
            "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE",
            "REJECTED_AT_APTITUDE", "APTITUDE_FAILED",
            "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED",
            "REJECTED_AT_HR"
        ] or apt_status == "FAILED" or tech_status == "FAILED" or hr_status == "FAILED":
            continue

        # 2. Exclude non-technical-qualified candidates
        is_tech_qualified = (
            tech_status in ["QUALIFIED", "PASSED"] or
            app_status in ["TECHNICAL_QUALIFIED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED", "INTERVIEW_PENDING", "INTERVIEW_READY"] or
            app_stage in ["TECHNICAL_QUALIFIED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED", "INTERVIEW_PENDING", "INTERVIEW_READY"] or
            app.get("canAllocateHR") is True or
            hr_status == "ALLOCATED"
        )
        if not is_tech_qualified:
            continue

        # 3. Exclude candidates already scheduled or completed
        if app_status in ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "SELECTED", "PLACED"] or app_stage in ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "SELECTED", "PLACED"]:
            continue

        key = f"{student_id}_{d_id}" if d_id else str(student_id)
        if key in scheduled_cand_ids:
            continue

        # Fetch student details for name, email, rollNumber, branch
        student_doc = await db.students.find_one({"id": student_id}, {"_id": 0}) if student_id else None
        student_name = app.get("student_name") or app.get("candidateName") or (student_doc.get("name") if student_doc else "Candidate")
        student_email = app.get("student_email") or app.get("email") or (student_doc.get("email") if student_doc else "")
        roll_number = app.get("rollNumber") or (student_doc.get("rollNumber") if student_doc else "N/A")
        branch = app.get("branch") or (student_doc.get("branch") if student_doc else "CSE")
        cgpa = app.get("cgpa") or (student_doc.get("cgpa") if student_doc else 0.0)

        eligible_candidates.append({
            "id": student_id,
            "student_id": student_id,
            "application_id": app_id,
            "drive_id": d_id,
            "name": student_name,
            "student_name": student_name,
            "email": student_email,
            "rollNumber": roll_number,
            "branch": branch,
            "cgpa": cgpa,
            "current_stage": app_stage or app_status,
            "status": app_status
        })

    return eligible_candidates



@router.post("/chat", response_model=MockInterviewChatResponse)
@singular_router.post("/chat", response_model=MockInterviewChatResponse)
async def process_mock_interview_chat(
    req: MockInterviewChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Real-time AI Mock Interviewer chat endpoint.
    Preserves conversation history, company, topics, and experience level.
    Invokes Gemini / OpenAI API with dynamic persona system prompt.
    """
    user_msg = req.userMessage or req.user_message or ""
    if not user_msg.strip():
        raise HTTPException(status_code=400, detail="userMessage parameter is required")

    company = req.company or req.companyName or "Amazon"
    topics = req.topics or req.selectedTopics or ["Arrays & Hashing", "Dynamic Programming"]
    exp_level = req.experienceLevel or req.experience_level or "SDE_1"
    fmt = req.format or "HYBRID"

    raw_history = []
    for item in req.history:
        role = item.role or ("user" if item.sender == "candidate" else "model")
        text = item.content or item.text or ""
        raw_history.append({"role": role, "content": text, "text": text})

    reply_text = await generate_mock_interview_chat_reply(
        history=raw_history,
        user_message=user_msg,
        company=company,
        topics=topics,
        experience_level=exp_level,
        format_type=fmt
    )

    return MockInterviewChatResponse(
        response=reply_text,
        reply=reply_text,
        company=company,
        experienceLevel=exp_level,
        experience_level=exp_level,
        status="success"
    )


# ==========================================
# INTERVIEW AVAILABILITY SLOTS MANAGEMENT
# ==========================================

@router.get("/availability", response_model=List[InterviewAvailabilitySchema])
async def list_interview_availability(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Retrieve all interview availability slots created by placement officers."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    slots = await db.interview_slots.find({}, {"_id": 0}).sort("date", 1).to_list(length=200)
    return slots

@router.get("/availability/available", response_model=List[InterviewAvailabilitySchema])
async def list_available_slots(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Retrieve only interview slots that are currently AVAILABLE for assignment."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    slots = await db.interview_slots.find({"status": "AVAILABLE"}, {"_id": 0}).sort("date", 1).to_list(length=100)
    return slots

@router.post("/availability", response_model=InterviewAvailabilitySchema, status_code=status.HTTP_201_CREATED)
async def create_interview_availability(
    slot_in: InterviewAvailabilityCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Create a new manual interview availability slot.
    Strictly prevents double booking (same panel at same date/time or same room at same date/time).
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # 1. Conflict Check: Panel double-booking
    panel_conflict = await db.interview_slots.find_one({
        "panel_name": slot_in.panel_name,
        "date": slot_in.date,
        "start_time": slot_in.start_time,
        "status": {"$ne": "UNAVAILABLE"}
    })
    if panel_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Scheduling Conflict: {slot_in.panel_name} is already scheduled on {slot_in.date} at {slot_in.start_time}."
        )

    # 2. Conflict Check: Room / Venue double-booking
    room_conflict = await db.interview_slots.find_one({
        "block": slot_in.block,
        "room_number": slot_in.room_number,
        "date": slot_in.date,
        "start_time": slot_in.start_time,
        "status": {"$ne": "UNAVAILABLE"}
    })
    if room_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Venue Conflict: Room {slot_in.room_number} ({slot_in.block}) is already booked on {slot_in.date} at {slot_in.start_time}."
        )

    now_iso = datetime.now().isoformat()
    count = await db.interview_slots.count_documents({})
    new_id = f"slot-{int(datetime.now().timestamp() * 1000)}"

    slot_doc = {
        "id": new_id,
        "panel_name": slot_in.panel_name,
        "panel_members": slot_in.panel_members,
        "date": slot_in.date,
        "start_time": slot_in.start_time,
        "end_time": slot_in.end_time,
        "block": slot_in.block,
        "room_number": slot_in.room_number,
        "status": slot_in.status or "AVAILABLE",
        "assigned_application_id": None,
        "assigned_student_id": None,
        "assigned_student_name": None,
        "assigned_company_name": None,
        "created_by": current_user.get("id") if current_user else "officer",
        "created_at": now_iso,
        "updated_at": now_iso
    }

    await db.interview_slots.insert_one(slot_doc)
    created = await db.interview_slots.find_one({"id": new_id}, {"_id": 0})
    return created

@router.put("/availability/{slot_id}", response_model=InterviewAvailabilitySchema)
@router.patch("/availability/{slot_id}", response_model=InterviewAvailabilitySchema)
async def update_interview_availability(
    slot_id: str,
    slot_up: InterviewAvailabilityUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Update a saved interview availability slot.
    Checks conflicts and prevents silent modification if slot is already ASSIGNED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.interview_slots.find_one({"id": slot_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview slot not found")

    up_data = {k: v for k, v in slot_up.model_dump().items() if v is not None}
    if not up_data:
        return existing

    check_panel = up_data.get("panel_name", existing.get("panel_name"))
    check_date = up_data.get("date", existing.get("date"))
    check_time = up_data.get("start_time", existing.get("start_time"))
    check_block = up_data.get("block", existing.get("block"))
    check_room = up_data.get("room_number", existing.get("room_number"))

    # Conflict check with other slots
    panel_conflict = await db.interview_slots.find_one({
        "id": {"$ne": slot_id},
        "panel_name": check_panel,
        "date": check_date,
        "start_time": check_time,
        "status": {"$ne": "UNAVAILABLE"}
    })
    if panel_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: {check_panel} is already assigned at {check_time} on {check_date}."
        )

    room_conflict = await db.interview_slots.find_one({
        "id": {"$ne": slot_id},
        "block": check_block,
        "room_number": check_room,
        "date": check_date,
        "start_time": check_time,
        "status": {"$ne": "UNAVAILABLE"}
    })
    if room_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Room {check_room} ({check_block}) is already booked at {check_time} on {check_date}."
        )

    up_data["updated_at"] = datetime.now().isoformat()
    await db.interview_slots.update_one({"id": slot_id}, {"$set": up_data})
    updated = await db.interview_slots.find_one({"id": slot_id}, {"_id": 0})
    return updated

@router.delete("/availability/{slot_id}")
async def delete_interview_availability(
    slot_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Delete an interview availability slot.
    Rejects deletion if the slot is currently assigned to a candidate.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.interview_slots.find_one({"id": slot_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview slot not found")

    if existing.get("status") == "ASSIGNED" or existing.get("assigned_student_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This interview slot is already assigned to a candidate. Reschedule or unassign the candidate before deleting."
        )

    await db.interview_slots.delete_one({"id": slot_id})
    return {"status": "ok", "message": "Interview availability slot deleted successfully"}

# ==========================================
# STANDARD INTERVIEW SLOTS / ASSIGNMENTS
# ==========================================

@router.get("/student/me")
@router.get("/my")
async def get_my_student_interviews(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieve all scheduled/assigned interviews belonging ONLY to the authenticated student.
    Backend query strictly uses authenticated student ID/email.
    Derives complete interview assignment data directly from MongoDB.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    # 1. Fetch direct interview records from db.interviews
    int_query = {
        "$or": [
            {"student_id": student_id},
            {"studentId": student_id},
            {"student_email": student_email},
            {"studentEmail": student_email},
            {"candidateId": student_id}
        ]
    }
    interviews = await db.interviews.find(int_query, {"_id": 0}).sort("date", 1).to_list(length=100)

    # 2. Also check db.applications for any shortlisted applications with interview data
    apps_with_interview = await db.applications.find({
        "$or": [
            {"student_id": student_id},
            {"studentId": student_id},
            {"student_email": student_email},
            {"studentEmail": student_email}
        ],
        "status": "SHORTLISTED",
        "interview": {"$ne": None}
    }, {"_id": 0}).to_list(length=50)

    seen_ids = set()
    result = []

    for item in interviews:
        int_id = item.get("id") or item.get("interview_id")
        if int_id:
            seen_ids.add(int_id)

        p_members = item.get("panel_members") or item.get("panelMembers") or []
        start_t = item.get("start_time") or item.get("startTime") or ""
        end_t = item.get("end_time") or item.get("endTime") or ""
        time_display = item.get("time") or item.get("timeSlot") or (f"{start_t} - {end_t}" if start_t and end_t else start_t)
        block = item.get("block") or ""
        room_no = item.get("room_number") or item.get("roomNumber") or ""
        room_disp = item.get("room_name") or item.get("roomName") or (f"{room_no} ({block})" if room_no and block else room_no)

        result.append({
            "id": int_id,
            "interview_id": int_id,
            "application_id": item.get("application_id"),
            "student_id": student_id,
            "candidateId": student_id,
            "candidateName": item.get("student_name") or item.get("studentName") or current_user.get("name"),
            "company_name": item.get("company_name") or item.get("companyName", "Company"),
            "companyName": item.get("company_name") or item.get("companyName", "Company"),
            "job_title": item.get("job_title") or item.get("roleTitle", "Software Engineer"),
            "roleTitle": item.get("job_title") or item.get("roleTitle", "Software Engineer"),
            "drive_id": item.get("drive_id") or item.get("driveId"),
            "panel_name": item.get("panel_name") or item.get("panelName", "Technical Panel"),
            "panelName": item.get("panel_name") or item.get("panelName", "Technical Panel"),
            "panel_members": p_members,
            "panelMembers": p_members,
            "block": block,
            "room_number": room_no,
            "roomNumber": room_no,
            "room_name": room_disp,
            "roomName": room_disp,
            "date": item.get("date", ""),
            "time": time_display,
            "timeSlot": time_display,
            "start_time": start_t,
            "startTime": start_t,
            "end_time": end_t,
            "endTime": end_t,
            "status": (item.get("status") or "SCHEDULED").upper(),
            "round": item.get("round", "Technical Interview Round 1"),
            "panelConfirmed": item.get("panelConfirmed", True),
            "updated_at": item.get("updated_at")
        })

    for app in apps_with_interview:
        app_id = app.get("id")
        int_id = f"int-{student_id}-{app.get('drive_id')}"
        if int_id in seen_ids:
            continue
        seen_ids.add(int_id)
        int_data = app.get("interview", {})
        p_members = int_data.get("panel_members", [])
        start_t = int_data.get("start_time", "")
        end_t = int_data.get("end_time", "")
        time_display = int_data.get("time") or (f"{start_t} - {end_t}" if start_t and end_t else start_t)
        block = int_data.get("block", "")
        room_no = int_data.get("room_number", "")
        room_disp = int_data.get("room_name") or (f"{room_no} ({block})" if room_no and block else room_no)

        result.append({
            "id": int_id,
            "interview_id": int_id,
            "application_id": app_id,
            "student_id": student_id,
            "candidateId": student_id,
            "candidateName": app.get("student_name") or app.get("studentName") or current_user.get("name"),
            "company_name": app.get("company_name") or app.get("companyName", "Company"),
            "companyName": app.get("company_name") or app.get("companyName", "Company"),
            "job_title": app.get("job_title") or app.get("roleTitle", "Software Engineer"),
            "roleTitle": app.get("job_title") or app.get("roleTitle", "Software Engineer"),
            "drive_id": app.get("drive_id") or app.get("driveId"),
            "panel_name": int_data.get("panel_name", "Technical Panel"),
            "panelName": int_data.get("panel_name", "Technical Panel"),
            "panel_members": p_members,
            "panelMembers": p_members,
            "block": block,
            "room_number": room_no,
            "roomNumber": room_no,
            "room_name": room_disp,
            "roomName": room_disp,
            "date": int_data.get("date", ""),
            "time": time_display,
            "timeSlot": time_display,
            "start_time": start_t,
            "startTime": start_t,
            "end_time": end_t,
            "endTime": end_t,
            "status": (app.get("status") if app.get("status") != "SHORTLISTED" else "SCHEDULED").upper(),
            "round": "Technical Interview Round 1",
            "panelConfirmed": True,
            "updated_at": app.get("updated_at")
        })

    return result

@router.get("", response_model=List[Dict[str, Any]])
async def list_interviews(
    drive_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}
    if drive_id:
        query = {"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]}

    interviews = await db.interviews.find(query, {"_id": 0}).to_list(length=200)
    # Ensure default fields for admin dashboard compatibility
    hydrated = []
    for item in interviews:
        hydrated.append({
            "id": item.get("id") or item.get("interview_id"),
            "drive_id": item.get("drive_id") or item.get("driveId"),
            "driveId": item.get("drive_id") or item.get("driveId"),
            "candidateId": item.get("student_id") or item.get("studentId") or item.get("candidateId"),
            "candidateName": item.get("student_name") or item.get("studentName") or item.get("candidateName") or "Candidate",
            "candidateRoll": item.get("candidateRoll") or item.get("rollNumber") or "N/A",
            "companyName": item.get("company_name") or item.get("companyName") or "Company",
            "roleTitle": item.get("job_title") or item.get("roleTitle") or "Software Engineer",
            "round": item.get("round") or "Technical Round 1",
            "timeSlot": item.get("timeSlot") or item.get("time") or "10:00 AM - 10:30 AM",
            "startTime": item.get("startTime") or item.get("start_time") or "10:00 AM",
            "endTime": item.get("endTime") or item.get("end_time") or "10:30 AM",
            "date": item.get("date") or "TBD",
            "panelId": item.get("panelId") or item.get("panel_id"),
            "panelName": item.get("panelName") or item.get("panel_name") or "Technical Panel",
            "panelMembers": item.get("panelMembers") or item.get("panel_members") or [],
            "roomId": item.get("roomId") or item.get("room_id"),
            "roomName": item.get("roomName") or item.get("room_name") or "B-204",
            "block": item.get("block"),
            "roomNumber": item.get("roomNumber") or item.get("room_number"),
            "status": (item.get("status") or "SCHEDULED").upper(),
            "panelConfirmed": item.get("panelConfirmed", True),
            "updated_at": item.get("updated_at")
        })
    return hydrated

from app.db.integrity import create_idempotent_notification
from app.schemas.interview import (
    InterviewSchema,
    InterviewCreate,
    InterviewRescheduleRequest,
    InterviewAvailabilityCreate,
    InterviewAvailabilityUpdate,
    InterviewAvailabilitySchema,
    InterviewStatusUpdateRequest,
)

@router.post("", response_model=InterviewSchema, status_code=status.HTTP_201_CREATED)
async def schedule_interview(int_in: InterviewCreate):
    """
    Schedule a new interview for a shortlisted candidate.
    Performs authoritative backend conflict check for Candidate, Panel, and Room.
    Dispatches notification to candidate and updates canonical application state.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cand_name = int_in.candidateName.strip()
    panel_name = int_in.panelName.strip()
    room_name = int_in.roomName.strip()
    time_slot = int_in.timeSlot.strip()
    date_val = int_in.date.strip()

    # 0. Authoritative Verification: Candidate must be shortlisted and eligible
    cand_id = int_in.candidateId
    drive_id = int_in.driveId

    app_doc = None
    if cand_id:
        app_doc = await db.applications.find_one({"$or": [{"id": cand_id}, {"_id": cand_id}, {"student_id": cand_id}, {"studentId": cand_id}]})

    if app_doc:
        student_id = app_doc.get("student_id") or app_doc.get("studentId")
        drive_id = drive_id or app_doc.get("drive_id") or app_doc.get("driveId")

        student_doc = await db.students.find_one({"id": student_id}) if student_id else None
        drive_doc = await db.drives.find_one({"id": drive_id}) if drive_id else None

        student_data = student_doc or app_doc
        drive_data = drive_doc or {}

        if drive_data:
            from app.services.eligibility_engine import evaluate_drive_eligibility
            is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive_data)
            if not is_eligible:
                reasons_str = "; ".join(reasons)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot schedule interview: Candidate '{cand_name}' is ineligible for drive '{int_in.companyName}'. Reasons: {reasons_str}"
                )

        app_status = (app_doc.get("status") or "").upper()
        apt_status = (app_doc.get("aptitude_status") or "").upper()

        if app_status in ["APPLIED", "INELIGIBLE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Candidate '{cand_name}' must be shortlisted before scheduling an interview."
            )

        tech_status = (app_doc.get("technical_status") or "").upper()

        if app_status in ["REJECTED", "NOT_SHORTLISTED", "APTITUDE_FAILED", "REJECTED_AT_APTITUDE", "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED"] or apt_status == "FAILED" or tech_status == "FAILED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot schedule interview: Candidate '{cand_name}' failed aptitude round or was rejected."
            )

        if apt_status not in ["QUALIFIED", "PASSED"] and app_status not in ["APTITUDE_QUALIFIED", "TECHNICAL_ALLOCATED", "TECHNICAL_IN_PROGRESS", "TECHNICAL_QUALIFIED", "INTERVIEW_PENDING", "INTERVIEW_READY", "INTERVIEW_SCHEDULED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot schedule interview: Candidate '{cand_name}' must qualify the aptitude round before interview scheduling."
            )




    active_filter = {"status": {"$nin": ["CANCELLED", "REJECTED", "UNAVAILABLE", "cancelled", "rejected", "unavailable"]}}




    # 1. Conflict Check: Candidate double booking
    if cand_name:
        cand_conflict = await db.interviews.find_one({
            "$and": [
                active_filter,
                {"date": date_val},
                {"timeSlot": time_slot},
                {"$or": [
                    {"candidateName": {"$regex": f"^{cand_name}$", "$options": "i"}},
                    {"candidate_name": {"$regex": f"^{cand_name}$", "$options": "i"}},
                    {"candidateId": int_in.candidateId} if int_in.candidateId else {"_id": None},
                    {"student_id": int_in.candidateId} if int_in.candidateId else {"_id": None}
                ]}
            ]
        })
        if cand_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Scheduling Conflict: Candidate {cand_name} is already scheduled for an interview on {date_val} during {time_slot}."
            )

    # 2. Conflict Check: Panel double booking
    if panel_name:
        panel_conflict = await db.interviews.find_one({
            "$and": [
                active_filter,
                {"date": date_val},
                {"timeSlot": time_slot},
                {"$or": [
                    {"panelName": {"$regex": f"^{panel_name}$", "$options": "i"}},
                    {"panel_name": {"$regex": f"^{panel_name}$", "$options": "i"}}
                ]}
            ]
        })
        if panel_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Scheduling Conflict: Panel '{panel_name}' is already assigned to another interview on {date_val} during {time_slot}."
            )

    # 3. Conflict Check: Room double booking
    if room_name:
        room_conflict = await db.interviews.find_one({
            "$and": [
                active_filter,
                {"date": date_val},
                {"timeSlot": time_slot},
                {"$or": [
                    {"roomName": {"$regex": f"^{room_name}$", "$options": "i"}},
                    {"room_name": {"$regex": f"^{room_name}$", "$options": "i"}}
                ]}
            ]
        })
        if room_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Venue Conflict: Room '{room_name}' is already occupied on {date_val} during {time_slot}."
            )

    timestamp_ms = int(datetime.now().timestamp() * 1000)
    count = await db.interviews.count_documents({})
    new_id = f"int-{timestamp_ms}-{count + 1}"
    now_iso = datetime.now().isoformat()

    app_id = int_in.applicationId or (f"app-{student_id}-{drive_id}" if student_id and drive_id else None)
    int_id = f"int-{student_id}-{drive_id}" if student_id and drive_id else new_id

    int_dict = int_in.model_dump()
    int_dict.update({
        "id": int_id,
        "interview_id": int_id,
        "status": "scheduled",
        "panelConfirmed": True,
        "created_at": now_iso,
        "updated_at": now_iso
    })

    if student_id and drive_id:
        await db.interviews.update_one(
            {"$or": [{"id": int_id}, {"candidateId": student_id, "driveId": drive_id}, {"student_id": student_id, "drive_id": drive_id}]},
            {"$set": int_dict},
            upsert=True
        )
    else:
        await db.interviews.insert_one(int_dict)

    created = await db.interviews.find_one({"$or": [{"id": int_id}, {"id": new_id}]}, {"_id": 0})


    # Update associated application record in db.applications
    student_id = int_in.candidateId
    drive_id = int_in.driveId
    app_id = int_in.applicationId or (f"app-{student_id}-{drive_id}" if student_id and drive_id else None)

    interview_link_data = {
        "date": date_val,
        "time": time_slot,
        "start_time": int_in.startTime or time_slot,
        "end_time": int_in.endTime or time_slot,
        "panel_name": panel_name,
        "panel_members": int_in.panelMembers or [],
        "block": int_in.block or "",
        "room_number": int_in.roomNumber or "",
        "room_name": room_name,
    }

    if app_id or (student_id and drive_id):
        app_query = {"$or": [{"id": app_id}, {"student_id": student_id, "drive_id": drive_id}]}
        await db.applications.update_one(
            app_query,
            {"$set": {
                "status": "INTERVIEW_SCHEDULED",
                "stage": "INTERVIEW_SCHEDULED",
                "pipeline_stage": "INTERVIEW_SCHEDULED",
                "interview": interview_link_data,
                "updated_at": now_iso
            }}
        )


    # Dispatch notification to student candidate
    if student_id:
        notif_id = f"notif-int-{student_id}-{timestamp_ms}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": student_id,
            "recipientRole": "student",
            "recipientName": cand_name,
            "type": "INTERVIEW_SCHEDULED",
            "title": "📅 Interview Scheduled!",
            "message": f"Your interview for {int_in.companyName} ({int_in.roleTitle}) is scheduled on {date_val} at {time_slot} in {room_name}.",
            "application_id": app_id,
            "student_id": student_id,
            "drive_id": drive_id,
            "company_name": int_in.companyName,
            "job_title": int_in.roleTitle,
            "interview_date": date_val,
            "interview_time": time_slot,
            "panel_name": panel_name,
            "room_name": room_name,
            "relatedRoute": "/student/interviews",
            "read": False,
            "important": True,
            "timestamp": "Just now",
            "created_at": now_iso
        })

    return created

@router.patch("/{interview_id}/reschedule")
async def reschedule_interview(interview_id: str, req: InterviewRescheduleRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    now_iso = datetime.now().isoformat()

    # If new_slot_id is passed, perform slot-based rescheduling
    if req.new_slot_id:
        new_slot = await db.interview_slots.find_one({"id": req.new_slot_id, "status": "AVAILABLE"})
        if not new_slot:
            raise HTTPException(status_code=400, detail="Requested new interview slot is no longer available.")

        # Release old slot
        await db.interview_slots.update_many(
            {"assigned_application_id": interview_id},
            {"$set": {"status": "AVAILABLE", "assigned_application_id": None, "assigned_student_id": None}}
        )

        # Mark new slot as ASSIGNED
        await db.interview_slots.update_one(
            {"id": req.new_slot_id},
            {"$set": {"status": "ASSIGNED", "assigned_application_id": interview_id}}
        )

        update_fields = {
            "date": new_slot["date"],
            "timeSlot": f"{new_slot['start_time']} - {new_slot['end_time']}",
            "startTime": new_slot["start_time"],
            "endTime": new_slot["end_time"],
            "panelName": new_slot["panel_name"],
            "roomName": f"{new_slot['room_number']} ({new_slot['block']})",
            "status": "scheduled",
            "updated_at": now_iso
        }
    else:
        update_fields = {
            "date": req.date,
            "timeSlot": req.timeSlot,
            "panelName": req.panelName,
            "roomName": req.roomName,
            "status": "scheduled",
            "updated_at": now_iso
        }

    res = await db.interviews.update_one(
        {"$or": [{"id": interview_id}, {"interview_id": interview_id}]},
        {"$set": update_fields, "$unset": {"conflictNote": ""}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview slot not found")

    # Notify student of rescheduled interview
    existing = await db.interviews.find_one({"$or": [{"id": interview_id}, {"interview_id": interview_id}]})
    if existing:
        student_id = existing.get("student_id") or existing.get("studentId")
        if student_id:
            notif_id = f"notif-resched-{student_id}-{int(datetime.now().timestamp())}"
            await create_idempotent_notification(db, {
                "id": notif_id,
                "recipient_user_id": student_id,
                "recipientRole": "student",
                "recipientName": existing.get("candidateName", "Student"),
                "type": "INTERVIEW_RESCHEDULED",
                "title": "📅 Interview Rescheduled",
                "message": f"Your interview for {existing.get('companyName', 'Company')} has been rescheduled to {update_fields.get('date')} at {update_fields.get('timeSlot')}.",
                "application_id": existing.get("application_id"),
                "student_id": student_id,
                "drive_id": existing.get("drive_id"),
                "company_name": existing.get("companyName"),
                "job_title": existing.get("roleTitle"),
                "relatedRoute": "/student/interviews",
                "read": False,
                "important": True,
                "timestamp": "Just now",
                "created_at": now_iso
            })

    return {"status": "ok", "message": "Interview slot rescheduled successfully"}

@router.patch("/{interview_id}/status")
async def update_interview_status(
    interview_id: str,
    body: Optional[InterviewStatusUpdateRequest] = None,
    status_val: Optional[str] = None
):
    """
    Update interview status.
    Accepts JSON body {"status": "COMPLETED"} OR query parameter ?status_val=COMPLETED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    target_status = None
    if body:
        target_status = body.status or body.status_val
    if not target_status and status_val:
        target_status = status_val

    if not target_status:
        raise HTTPException(status_code=400, detail="Field 'status' or 'status_val' is required in request body or query parameter.")

    now_iso = datetime.now().isoformat()
    res = await db.interviews.update_one(
        {"$or": [{"id": interview_id}, {"interview_id": interview_id}]},
        {"$set": {"status": target_status, "updated_at": now_iso}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview slot not found")

    # Update associated application status / embedded interview status if found
    interview_doc = await db.interviews.find_one({"$or": [{"id": interview_id}, {"interview_id": interview_id}]})
    if interview_doc:
        app_id = interview_doc.get("application_id") or interview_doc.get("applicationId")
        student_id = interview_doc.get("student_id") or interview_doc.get("studentId") or interview_doc.get("candidateId")
        drive_id = interview_doc.get("drive_id") or interview_doc.get("driveId")

        company_name = interview_doc.get("companyName") or interview_doc.get("company_name", "Company")
        role_title = interview_doc.get("roleTitle") or interview_doc.get("job_title", "Role")
        student_name = interview_doc.get("candidateName") or interview_doc.get("student_name", "Student")

        st_upper = target_status.upper()
        app_set_fields: Dict[str, Any] = {
            "interview.status": st_upper,
            "updated_at": now_iso
        }

        notif_type = None
        notif_title = None
        notif_msg = None

        if st_upper in ["COMPLETED", "INTERVIEW_COMPLETED"]:
            app_set_fields.update({
                "status": "INTERVIEW_COMPLETED",
                "stage": "INTERVIEW_COMPLETED",
                "pipeline_stage": "INTERVIEW_COMPLETED",
                "hr_status": "COMPLETED"
            })
            notif_type = "INTERVIEW_COMPLETED"
            notif_title = "Interview Completed 🤝"
            notif_msg = f"Your HR / Interview for {company_name} - {role_title} has been completed. Awaiting final decision."

        elif st_upper in ["SELECTED", "PLACED", "ACCEPTED"]:
            app_set_fields.update({
                "status": "SELECTED",
                "stage": "SELECTED",
                "pipeline_stage": "SELECTED",
                "hr_status": "SELECTED"
            })
            notif_type = "FINAL_SELECTION"
            notif_title = "Congratulations! You are Selected! 🎉🎊"
            notif_msg = f"Congratulations {student_name}! You have been selected for the {role_title} position at {company_name}!"

        elif st_upper in ["REJECTED", "REJECTED_AT_HR", "FAILED"]:
            app_set_fields.update({
                "status": "REJECTED_AT_HR",
                "stage": "REJECTED_AT_HR",
                "pipeline_stage": "REJECTED_AT_HR",
                "hr_status": "FAILED"
            })
            notif_type = "REJECTED_AT_HR"
            notif_title = "Placement Drive Outcome Update"
            notif_msg = f"Thank you for participating. You were not selected following the HR / Interview round for {company_name} - {role_title}."

        if app_id or (student_id and drive_id):
            app_query = {"$or": [{"id": app_id}, {"student_id": student_id, "drive_id": drive_id}]}
            await db.applications.update_one(app_query, {"$set": app_set_fields})

        if student_id and notif_type:
            notif_id = f"notif-int-{st_upper.lower()}-{student_id}-{app_id or drive_id}"
            await create_idempotent_notification(db, {
                "id": notif_id,
                "recipient_user_id": student_id,
                "recipientRole": "student",
                "recipientName": student_name,
                "type": notif_type,
                "title": notif_title,
                "message": notif_msg,
                "application_id": app_id,
                "student_id": student_id,
                "drive_id": drive_id,
                "relatedRoute": "/student/dashboard",
                "read": False,
                "important": True,
                "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
                "created_at": now_iso
            })

    return {"status": "ok", "message": f"Interview status updated to {target_status}"}


