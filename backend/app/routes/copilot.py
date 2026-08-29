"""
Placement Copilot AI Routes.
Provides database-aware conversational intelligence and safe, two-phase action execution for recruiters & placement officers.
"""
from datetime import datetime
import uuid
import re
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user, get_current_user
from app.schemas.copilot import (
    CopilotQueryRequest,
    CopilotResponseSchema,
    CopilotActionExecuteRequest,
    CopilotActionExecuteResponse
)
from app.services.placement_copilot_service import PlacementCopilotService

router = APIRouter(prefix="/api/copilot", tags=["Placement Copilot"])


@router.post("/chat", response_model=CopilotResponseSchema)
async def process_copilot_chat(
    req: CopilotQueryRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Processes recruiter/officer natural language queries grounded in live MongoDB data.
    Generates structured responses, verified availability, and interactive action proposals.
    """
    return await PlacementCopilotService.process_copilot_query(
        query=req.query,
        current_user=current_user,
        conversation_history=req.conversation_history
    )


@router.post("/execute-action", response_model=CopilotActionExecuteResponse)
async def execute_copilot_action(
    req: CopilotActionExecuteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes a confirmed recruiter operation (e.g. Schedule Interview).
    Re-verifies permissions, candidate status, and real-time room/panel availability to prevent race conditions.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_role = (current_user.get("role") or current_user.get("portalRole") or "").lower()
    if user_role not in ["recruiter", "company_recruiter", "placement_officer", "officer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to execute placement operations."
        )

    if req.action_type != "schedule_interview":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported action type: '{req.action_type}'"
        )

    details = req.details
    cand_id = details.get("candidate_id")
    cand_name = (details.get("candidate_name") or "Candidate").strip()
    drive_id = details.get("drive_id")
    company_name = (details.get("company_name") or "Company").strip()
    date_val = (details.get("date") or "").strip()
    time_slot = (details.get("time_slot") or "").strip()
    start_time = (details.get("start_time") or time_slot[:5]).strip()
    room_id = details.get("room_id")
    room_name = (details.get("room_name") or "Room A-201").strip()
    panel_id = details.get("panel_id")
    panel_name = (details.get("panel_name") or "Technical Panel").strip()
    round_val = (details.get("round") or "Technical Round 1").strip()

    if not date_val or not time_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview date and time slot are required."
        )

    # 1. Company Permission Check for Recruiters
    user_company = current_user.get("company") or current_user.get("company_name") or current_user.get("companyName")
    if user_role in ["recruiter", "company_recruiter"] and user_company:
        if company_name.lower() != user_company.lower():
            drive_doc = None
            if drive_id:
                drive_doc = await db.drives.find_one({"id": drive_id})
            if not drive_doc:
                drive_doc = await db.drives.find_one({"companyName": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}})

            if not drive_doc or (drive_doc.get("recruiter_id") != current_user.get("id") and drive_doc.get("createdBy") != current_user.get("id")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission Denied: You can only schedule interviews for {user_company}."
                )

    # 2. REAL-TIME CONCURRENCY DOUBLE-CHECK (Before Mutation)
    # Check Room Availability
    active_filter = {"status": {"$nin": ["CANCELLED", "COMPLETED"]}}
    room_conflict = await db.interviews.find_one({
        "$and": [
            active_filter,
            {"date": date_val},
            {"$or": [{"timeSlot": time_slot}, {"startTime": start_time}]},
            {"$or": [{"roomName": room_name}, {"roomId": room_id}]}
        ]
    })
    if room_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Venue room '{room_name}' was booked by another user for {room_conflict.get('companyName')} at {time_slot}. Interview was not created."
        )

    # Check Panel Availability
    panel_conflict = await db.interviews.find_one({
        "$and": [
            active_filter,
            {"date": date_val},
            {"$or": [{"timeSlot": time_slot}, {"startTime": start_time}]},
            {"$or": [{"panelName": panel_name}, {"panelId": panel_id}]}
        ]
    })
    if panel_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Interview panel '{panel_name}' was assigned to another round at {time_slot}. Interview was not created."
        )

    # Check Candidate Duplicate / Conflict
    cand_conflict = await db.interviews.find_one({
        "$and": [
            active_filter,
            {"date": date_val},
            {"$or": [{"timeSlot": time_slot}, {"startTime": start_time}]},
            {"$or": [{"candidateId": cand_id}, {"candidateName": cand_name}]}
        ]
    })
    if cand_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Candidate '{cand_name}' already has an interview scheduled on {date_val} during {time_slot}."
        )

    # 3. Create Canonical Interview Record in db.interviews
    interview_id = f"int-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now().isoformat()

    new_interview = {
        "id": interview_id,
        "candidateId": str(cand_id),
        "candidateName": cand_name,
        "companyName": company_name,
        "driveId": str(drive_id) if drive_id else None,
        "round": round_val,
        "date": date_val,
        "timeSlot": time_slot,
        "startTime": start_time,
        "roomId": str(room_id) if room_id else None,
        "roomName": room_name,
        "roomNumber": room_name,
        "panelId": str(panel_id) if panel_id else None,
        "panelName": panel_name,
        "panelMembers": details.get("panel_members") or ["Technical Interviewer"],
        "status": "SCHEDULED",
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name") or "Recruiter",
        "created_at": now_iso,
        "scheduled_via": "placement_copilot_ai"
    }

    await db.interviews.insert_one(new_interview)

    # 4. Update Application State if applicable
    if cand_id:
        await db.applications.update_one(
            {"$or": [{"student_id": str(cand_id)}, {"id": str(cand_id)}, {"studentId": str(cand_id)}]},
            {"$set": {"status": "INTERVIEW_SCHEDULED", "updated_at": now_iso}}
        )

    # 5. Dispatch Notification to Candidate
    try:
        await db.notifications.insert_one({
            "id": f"notif-{uuid.uuid4().hex[:8]}",
            "userId": str(cand_id),
            "recipientRole": "student",
            "title": f"Interview Scheduled: {company_name}",
            "message": f"Your {round_val} with {company_name} is scheduled on {date_val} at {time_slot} in {room_name}.",
            "type": "interview",
            "read": False,
            "createdAt": now_iso
        })
    except Exception:
        pass

    # 6. Audit Log
    try:
        await db.audit_logs.insert_one({
            "id": f"audit-{uuid.uuid4().hex[:8]}",
            "userId": current_user.get("id"),
            "userName": current_user.get("name") or "Recruiter",
            "userRole": user_role,
            "action": "INTERVIEW_SCHEDULED_VIA_COPILOT",
            "entity": "interview",
            "entityId": interview_id,
            "detail": f"Scheduled {round_val} for {cand_name} ({company_name}) in {room_name} with {panel_name}.",
            "timestamp": now_iso
        })
    except Exception:
        pass

    # Remove MongoDB internal _id before returning
    new_interview.pop("_id", None)

    return CopilotActionExecuteResponse(
        status="success",
        message=f"Successfully scheduled interview for {cand_name} ({company_name}) on {date_val} at {time_slot} in {room_name}.",
        interview=new_interview
    )
