from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.db.mongodb import db_manager
from app.db.integrity import create_idempotent_notification
from app.core.deps import get_current_user, get_optional_current_user
from app.schemas.application import (
    ApplicationSchema,
    ApplicationCreate,
    ApplicationShortlistRequest,
    ApplicationRejectRequest,
)
from app.schemas.drive import RoundCandidateActionRequest

from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.pipeline_engine import derive_recruitment_pipeline_stage

router = APIRouter(prefix="/api/applications", tags=["Applications"])

async def _hydrate_application_doc(db, app: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to populate full student profile, resume, and interview details into an application record."""
    student_id = app.get("student_id") or app.get("studentId")
    student_email = (app.get("student_email") or app.get("studentEmail") or "").lower()

    applicant = app.get("applicant") or {}
    student_name = applicant.get("name") or app.get("student_name") or app.get("studentName") or "Student"
    mobile = applicant.get("mobile") or app.get("mobile") or "N/A"
    college_name = applicant.get("college_name") or app.get("college_name") or "Campus University"
    location = applicant.get("location") or app.get("location") or "Bengaluru"

    skills = app.get("skills") or app.get("matched_skills") or []
    projects = app.get("projects") or []
    experience = app.get("experience") or []
    certifications = app.get("certifications") or []
    readiness_score = app.get("readiness_score") or app.get("match_score") or 85
    interview = app.get("interview")

    drive_id = app.get("drive_id") or app.get("driveId")
    student_doc = await db.students.find_one({"id": student_id}) if student_id else None
    drive_doc = await db.drives.find_one({"id": drive_id}) if drive_id else None

    student_data = student_doc or app
    drive_data = drive_doc or {}

    if drive_data:
        is_eligible, eligibility_reasons, missing_requirements = evaluate_drive_eligibility(student_data, drive_data)
    else:
        is_eligible, eligibility_reasons, missing_requirements = True, [], []

    pipeline = derive_recruitment_pipeline_stage(
        student_data=student_data,
        drive_data=drive_data,
        app_data=app,
        interview_data=interview
    )

    return {
        "id": app.get("id") or f"app-{student_id}-{app.get('drive_id')}",
        "student_id": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "mobile": mobile,
        "college_name": college_name,
        "location": location,
        "applicant": {
            "name": student_name,
            "mobile": mobile,
            "college_name": college_name,
            "location": location,
        },
        "rollNumber": app.get("rollNumber") or student_data.get("rollNumber") or "N/A",
        "branch": app.get("branch") or student_data.get("branch") or "CSE",
        "cgpa": app.get("cgpa") if app.get("cgpa") is not None else student_data.get("cgpa", 8.5),
        "batch": app.get("batch") or "2027",
        "graduation_year": app.get("graduation_year") or student_data.get("graduationYear") or 2027,
        "activeBacklogs": student_data.get("activeBacklogs") if student_data.get("activeBacklogs") is not None else student_data.get("backlogs", 0),
        "skills": skills,
        "projects": projects,
        "experience": experience,
        "certifications": certifications,
        "readiness_score": readiness_score,
        "match_score": app.get("match_score") or readiness_score,
        "matched_skills": app.get("matched_skills") or skills,
        "skill_gaps": app.get("skill_gaps") or [],
        "eligible": is_eligible,
        "eligibility_reasons": eligibility_reasons,
        "missing_requirements": missing_requirements,
        "pipeline_stage": pipeline,
        "stage": pipeline["stage"],
        "stageLabel": pipeline["stageLabel"],
        "stageGroup": pipeline["stageGroup"],
        "canAllocateAptitude": pipeline["canAllocateAptitude"],
        "canAllocateTechnical": pipeline.get("canAllocateTechnical", False),
        "canAllocateHR": pipeline.get("canAllocateHR", False),
        "canScheduleInterview": pipeline["canScheduleInterview"],
        "nextAction": pipeline["nextAction"],
        "aptitude_status": app.get("aptitude_status") or ("QUALIFIED" if pipeline["stage"] == "APTITUDE_QUALIFIED" else ("ALLOCATED" if pipeline["stage"] in ["APTITUDE_ALLOCATED", "APTITUDE_ASSIGNED"] else None)),


        "aptitude_score": app.get("aptitude_score"),
        "resume_id": app.get("resume_id"),
        "resume_url": app.get("resume_url") or "#",
        "drive_id": drive_id,
        "company_id": app.get("company_id") or app.get("companyId"),
        "company_name": app.get("company_name") or app.get("companyName", "Company"),
        "job_title": app.get("job_title") or app.get("roleTitle", "Software Engineer"),
        "source": app.get("source", "college"),
        "application_type": app.get("application_type", "EXTERNAL" if app.get("source") == "external" else "COLLEGE"),
        "application_url": app.get("application_url"),
        "status": app.get("status", "APPLIED").upper(),
        "verification_type": app.get("verification_type"),
        "started_at": app.get("started_at"),
        "completed_at": app.get("completed_at"),
        "applied_at": app.get("applied_at") or app.get("appliedAt", "Recently"),
        "created_at": app.get("created_at"),
        "updated_at": app.get("updated_at"),
        "interview": interview
    }



@router.get("/pool", response_model=List[Dict[str, Any]])
async def get_candidate_pool(
    drive_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Retrieve candidate applications pool strictly for real applied students.
    Filtered by drive authorization for Placement Officers.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}
    if drive_id:
        query["$or"] = [{"drive_id": drive_id}, {"driveId": drive_id}]

    # Placement Officer drive filtering if recruiter/specific officer
    if current_user and current_user.get("role") in ["recruiter", "company_recruiter"]:
        user_company_id = current_user.get("company_id") or current_user.get("companyId")
        user_company_name = current_user.get("company_name") or current_user.get("companyName")
        comp_conditions = []
        if user_company_id:
            comp_conditions.extend([{"company_id": user_company_id}, {"companyId": user_company_id}])
        if user_company_name:
            comp_conditions.extend([{"company_name": user_company_name}, {"companyName": user_company_name}])
        if comp_conditions:
            if drive_id:
                query = {"$and": [{"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]}, {"$or": comp_conditions}]}
            else:
                query = {"$or": comp_conditions}

    raw_apps = await db.applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=300)

    hydrated_pool = []
    for app in raw_apps:
        hydrated_pool.append(await _hydrate_application_doc(db, app))

    return hydrated_pool

@router.get("/stats")
async def get_candidate_pool_stats(
    drive_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Get live statistics for Candidate Pool directly from MongoDB applications."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    base_query: Dict[str, Any] = {}
    if drive_id:
        base_query["$or"] = [{"drive_id": drive_id}, {"driveId": drive_id}]

    if current_user and current_user.get("role") in ["recruiter", "company_recruiter"]:
        user_company_id = current_user.get("company_id") or current_user.get("companyId")
        user_company_name = current_user.get("company_name") or current_user.get("companyName")
        comp_conditions = []
        if user_company_id:
            comp_conditions.extend([{"company_id": user_company_id}, {"companyId": user_company_id}])
        if user_company_name:
            comp_conditions.extend([{"company_name": user_company_name}, {"companyName": user_company_name}])
        if comp_conditions:
            if drive_id:
                base_query = {"$and": [{"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]}, {"$or": comp_conditions}]}
            else:
                base_query = {"$or": comp_conditions}

    total = await db.applications.count_documents(base_query)
    applied = await db.applications.count_documents({"$and": [base_query, {"status": "APPLIED"}]} if base_query else {"status": "APPLIED"})
    shortlisted = await db.applications.count_documents({"$and": [base_query, {"status": "SHORTLISTED"}]} if base_query else {"status": "SHORTLISTED"})
    not_shortlisted = await db.applications.count_documents({"$and": [base_query, {"status": {"$in": ["NOT_SHORTLISTED", "REJECTED"]}}]} if base_query else {"status": {"$in": ["NOT_SHORTLISTED", "REJECTED"]}})
    interview_scheduled = await db.applications.count_documents({"$and": [base_query, {"interview": {"$ne": None}}]} if base_query else {"interview": {"$ne": None}})

    return {
        "all": total,
        "applied": applied,
        "shortlisted": shortlisted,
        "not_shortlisted": not_shortlisted,
        "interview_scheduled": interview_scheduled
    }

@router.get("/me", response_model=List[Dict[str, Any]])
async def get_my_applications(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all college drive applications submitted by currently authenticated student."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    apps = await db.applications.find({
        "$or": [
            {"student_id": student_id},
            {"studentId": student_id},
            {"student_email": student_email},
            {"studentEmail": student_email}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(length=100)

    hydrated = []
    for a in apps:
        hydrated.append(await _hydrate_application_doc(db, a))
    return hydrated

@router.get("/{application_id}", response_model=Dict[str, Any])
async def get_application_detail(
    application_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Retrieve full application details by ID."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return await _hydrate_application_doc(db, app)

@router.post("/{application_id}/shortlist")
@router.patch("/{application_id}/shortlist")
async def shortlist_application(
    application_id: str,
    shortlist_req: Optional[ApplicationShortlistRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer shortlists a candidate application with optional interview scheduling
    and dispatches a rich notification with Date, Time, Panel, and Venue to the student.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    drive_id = app.get("drive_id") or app.get("driveId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")
    company_id = app.get("company_id") or app.get("companyId")
    student_name = app.get("student_name") or app.get("studentName", "Student")


    # SERVER-SIDE AUTHORITATIVE ELIGIBILITY VERIFICATION
    student_doc = await db.students.find_one({"id": student_id}) if student_id else None
    drive_doc = await db.drives.find_one({"id": drive_id}) if drive_id else None
    
    student_data = student_doc or app
    drive_data = drive_doc or {}

    if drive_data:
        is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive_data)
        if not is_eligible:
            reasons_str = "; ".join(reasons)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ineligible candidate: Cannot shortlist student '{student_name}' for drive '{company_name}'. Reasons: {reasons_str}"
            )

    interview_data = None

    if shortlist_req:
        # Check if saved availability slot_id is provided
        if shortlist_req.slot_id:
            slot = await db.interview_slots.find_one({"id": shortlist_req.slot_id})
            if not slot:
                raise HTTPException(status_code=404, detail="Interview availability slot not found")
            if slot.get("status") != "AVAILABLE":
                raise HTTPException(status_code=400, detail="Selected interview slot is no longer available.")

            p_members = slot.get("panel_members", [])
            time_display = f"{slot['start_time']} - {slot['end_time']}"
            room_display = f"{slot['room_number']} ({slot['block']})"

            interview_data = {
                "slot_id": slot["id"],
                "date": slot["date"],
                "time": time_display,
                "start_time": slot["start_time"],
                "end_time": slot["end_time"],
                "panel_id": slot.get("panel_id") or "panel-custom",
                "panel_name": slot["panel_name"],
                "panel_members": p_members,
                "block": slot["block"],
                "room_number": slot["room_number"],
                "room_id": slot.get("room_id") or "room-custom",
                "room_name": room_display,
            }

            # Atomically mark slot as ASSIGNED
            await db.interview_slots.update_one(
                {"id": shortlist_req.slot_id},
                {"$set": {
                    "status": "ASSIGNED",
                    "assigned_application_id": application_id,
                    "assigned_student_id": student_id,
                    "assigned_student_name": student_name,
                    "assigned_company_name": company_name,
                    "updated_at": datetime.now().isoformat()
                }}
            )
        elif shortlist_req.interview_date:
            time_display = shortlist_req.interview_time or "10:00 AM"
            room_display = shortlist_req.room_name or (f"{shortlist_req.room_number} ({shortlist_req.block})" if shortlist_req.room_number else "Seminar Hall 2")
            interview_data = {
                "date": shortlist_req.interview_date,
                "time": time_display,
                "start_time": shortlist_req.start_time or time_display,
                "end_time": shortlist_req.end_time or time_display,
                "panel_id": shortlist_req.panel_id or "panel-1",
                "panel_name": shortlist_req.panel_name or "Technical Panel A",
                "panel_members": shortlist_req.panel_members or [],
                "block": shortlist_req.block or "Block B",
                "room_number": shortlist_req.room_number or "B-204",
                "room_id": shortlist_req.room_id or "room-101",
                "room_name": room_display,
            }

        if interview_data:
            apt_status = (app.get("aptitude_status") or "").upper()
            curr_status = (app.get("status") or "").upper()
            if curr_status not in ["APTITUDE_QUALIFIED", "INTERVIEW_READY", "INTERVIEW_SCHEDULED"] and apt_status not in ["QUALIFIED", "PASSED"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Candidate must qualify the aptitude round before interview scheduling."
                )

            # Create or update interview document in db.interviews

            int_id = f"int-{student_id}-{drive_id}"
            await db.interviews.update_one(
                {"id": int_id},
                {"$set": {
                    "id": int_id,
                    "interview_id": int_id,
                    "application_id": application_id,
                    "student_id": student_id,
                    "studentId": student_id,
                    "student_name": student_name,
                    "studentName": student_name,
                    "student_email": app.get("student_email") or app.get("studentEmail"),
                    "company_id": company_id,
                    "companyId": company_id,
                    "company_name": company_name,
                    "companyName": company_name,
                    "job_title": job_title,
                    "roleTitle": job_title,
                    "drive_id": drive_id,
                    "driveId": drive_id,
                    "date": interview_data["date"],
                    "time": interview_data["time"],
                    "timeSlot": interview_data["time"],
                    "start_time": interview_data.get("start_time", interview_data["time"]),
                    "startTime": interview_data.get("start_time", interview_data["time"]),
                    "end_time": interview_data.get("end_time", interview_data["time"]),
                    "endTime": interview_data.get("end_time", interview_data["time"]),
                    "panel_id": interview_data.get("panel_id"),
                    "panelId": interview_data.get("panel_id"),
                    "panel_name": interview_data["panel_name"],
                    "panelName": interview_data["panel_name"],
                    "panel_members": interview_data.get("panel_members", []),
                    "panelMembers": interview_data.get("panel_members", []),
                    "room_name": interview_data["room_name"],
                    "roomName": interview_data["room_name"],
                    "block": interview_data.get("block"),
                    "room_number": interview_data.get("room_number"),
                    "roomNumber": interview_data.get("room_number"),
                    "status": "SCHEDULED",
                    "panelConfirmed": True,
                    "updated_at": datetime.now().isoformat()
                }},
                upsert=True
            )

    prev_status = (app.get("status") or "").upper()

    # Update application
    now_iso = datetime.now().isoformat()
    update_fields: Dict[str, Any] = {
        "status": "SHORTLISTED",
        "updated_at": now_iso
    }
    if interview_data:
        update_fields["interview"] = interview_data

    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": update_fields}
    )

    # Increment drive and student counters only if application was not already SHORTLISTED
    if prev_status != "SHORTLISTED":
        if student_id:
            await db.students.update_one(
                {"id": student_id},
                {"$inc": {"shortlistsCount": 1}}
            )

        if drive_id:
            await db.drives.update_one(
                {"id": drive_id},
                {"$inc": {"shortlistedCount": 1}}
            )


    # Build rich notification message
    notif_id = f"notif-shortlist-{student_id}-{int(datetime.now().timestamp())}"
    if interview_data:
        members_line = ""
        if interview_data.get("panel_members"):
            members_line = f"Panel Members: {', '.join(interview_data['panel_members'])}\n"

        block_line = f"🏢 Block: {interview_data.get('block', 'Main Block')}\n" if interview_data.get("block") else ""
        room_line = f"🚪 Room: {interview_data.get('room_number') or interview_data.get('room_name')}\n"

        msg = (
            f"🎉 You're Shortlisted!\n\n"
            f"Congratulations {student_name}!\n\n"
            f"You have been shortlisted for:\n"
            f"{company_name}\n"
            f"{job_title}\n\n"
            f"Interview Details:\n\n"
            f"📅 Date: {interview_data['date']}\n"
            f"⏰ Time: {interview_data['time']}\n"
            f"👥 Panel: {interview_data['panel_name']}\n"
            f"{members_line}"
            f"{block_line}"
            f"{room_line}\n"
            f"Please report to the venue on time."
        )
    else:
        msg = f"Congratulations {student_name}! You have been shortlisted for {job_title} at {company_name}."

    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "student",
        "recipientName": student_name,
        "type": "APPLICATION_SHORTLISTED",
        "title": "🎉 You're Shortlisted!",
        "message": msg,
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "company_id": company_id,
        "company_name": company_name,
        "job_title": job_title,
        "interview": interview_data,
        "interview_date": interview_data.get("date") if interview_data else None,
        "interview_time": interview_data.get("time") if interview_data else None,
        "panel_name": interview_data.get("panel_name") if interview_data else None,
        "room_name": interview_data.get("room_name") if interview_data else None,
        "relatedRoute": "/student/dashboard",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    return {
        "status": "ok",
        "message": "Candidate shortlisted successfully and notification dispatched",
        "applicationStatus": "SHORTLISTED",
        "interview": interview_data
    }

@router.post("/{application_id}/reject")
@router.patch("/{application_id}/reject")
async def reject_application(
    application_id: str,
    reject_req: Optional[ApplicationRejectRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Mark an application as NOT_SHORTLISTED."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    now_iso = datetime.now().isoformat()
    res = await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {"status": "NOT_SHORTLISTED", "updated_at": now_iso}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"status": "ok", "message": "Application marked as NOT_SHORTLISTED", "applicationStatus": "NOT_SHORTLISTED"}


@router.post("/{application_id}/round-action")
@router.patch("/{application_id}/round-action")
async def execute_round_action(
    application_id: str,
    action_req: RoundCandidateActionRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Evaluates candidate round action (PASS to Next Round, REJECT, FINAL_SELECT).
    Updates application round evaluations and status, increments drive selections,
    and dispatches student notifications.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    student_name = app.get("student_name") or app.get("studentName") or app.get("applicant", {}).get("name") or "Student"
    drive_id = app.get("drive_id") or app.get("driveId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")
    company_id = app.get("company_id") or app.get("companyId")

    # Fetch drive rounds to resolve target and next round
    from app.routes.drives import _get_or_init_drive_rounds
    rounds = await _get_or_init_drive_rounds(db, drive_id)
    rounds.sort(key=lambda r: r.get("order", 1))

    target_round = None
    if action_req.round_id:
        target_round = next((r for r in rounds if r["id"] == action_req.round_id), None)
    if not target_round and rounds:
        target_round = rounds[0]

    if not target_round:
        raise HTTPException(status_code=400, detail="No recruitment rounds configured for this drive.")

    target_round_id = target_round["id"]
    target_round_name = target_round.get("name", "Recruitment Round")
    is_final_round = target_round.get("is_final", False) or (rounds and rounds[-1]["id"] == target_round_id)

    now_iso = datetime.now().isoformat()
    round_evaluations = app.get("round_evaluations") or {}

    action_type = action_req.action.upper()
    new_app_status = "SHORTLISTED"
    notif_title = ""
    notif_msg = ""

    if action_type in ["PASS", "NEXT_ROUND"]:
        if is_final_round:
            # Passing final round equals final selection
            action_type = "FINAL_SELECT"
        else:
            round_evaluations[target_round_id] = {
                "status": "PASSED",
                "evaluated_at": now_iso,
                "notes": action_req.notes
            }
            # Advance to next round
            curr_idx = next((i for i, r in enumerate(rounds) if r["id"] == target_round_id), 0)
            next_round = rounds[curr_idx + 1] if curr_idx + 1 < len(rounds) else None
            if next_round:
                next_r_id = next_round["id"]
                if next_r_id not in round_evaluations or round_evaluations[next_r_id].get("status") != "PASSED":
                    round_evaluations[next_r_id] = {"status": "PENDING", "evaluated_at": None}

            new_app_status = "SHORTLISTED"
            next_round_name = next_round.get("name", "Next Round") if next_round else "Next Round"
            notif_title = f"🎉 Shortlisted for {next_round_name}"
            notif_msg = (
                f"Congratulations {student_name}!\n\n"
                f"You have passed {target_round_name} and been shortlisted for {next_round_name} "
                f"at {company_name} for the position of {job_title}."
            )

    if action_type in ["REJECT", "REJECTED"]:
        round_evaluations[target_round_id] = {
            "status": "REJECTED",
            "evaluated_at": now_iso,
            "notes": action_req.notes
        }
        new_app_status = "REJECTED"
        notif_title = f"Application Update — {company_name}"
        notif_msg = (
            f"Dear {student_name},\n\n"
            f"Thank you for participating in {target_round_name} for {job_title} at {company_name}. "
            f"Unfortunately, we are unable to advance your application to the next round."
        )

    if action_type in ["FINAL_SELECT", "SELECT", "SELECTED"]:
        round_evaluations[target_round_id] = {
            "status": "PASSED",
            "evaluated_at": now_iso,
            "notes": action_req.notes
        }
        new_app_status = "SELECTED"

        # Increment drive selected count
        await db.drives.update_one(
            {"id": drive_id},
            {"$inc": {"selectedCount": 1}}
        )

        # Update student placement status
        if student_id:
            await db.students.update_one(
                {"id": student_id},
                {"$set": {"placementStatus": "placed", "selectedCompany": company_name, "selectedRole": job_title}}
            )

        notif_title = f"🎉 Final Selection: {company_name}!"
        notif_msg = (
            f"🏆 CONGRATULATIONS {student_name}!\n\n"
            f"We are thrilled to inform you that you have been FINALLY SELECTED for:\n"
            f"🏢 Company: {company_name}\n"
            f"💼 Role: {job_title}\n\n"
            f"Check your student portal for offer details and next onboarding steps."
        )

    # Persist updated application record
    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {
            "status": new_app_status,
            "round_evaluations": round_evaluations,
            "current_round_id": target_round_id,
            "updated_at": now_iso
        }}
    )

    # Dispatch notification to student
    notif_id = f"notif-round-{student_id}-{int(datetime.now().timestamp())}"
    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "student",
        "recipientName": student_name,
        "type": "ROUND_EVALUATION_UPDATE",
        "title": notif_title,
        "message": notif_msg,
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "company_id": company_id,
        "company_name": company_name,
        "job_title": job_title,
        "relatedRoute": "/student/dashboard",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    return {
        "status": "ok",
        "message": f"Candidate round action ({action_type}) executed successfully",
        "application_status": new_app_status,
        "round_evaluations": round_evaluations
    }


@router.post("/{application_id}/allocate-aptitude")
async def allocate_aptitude_round(
    application_id: str,
    payload: Optional[Dict[str, Any]] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer allocates an Aptitude Round to a shortlisted candidate.
    Dispatches APTITUDE_ALLOCATED notification to student and advances stage to APTITUDE_ALLOCATED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    drive_id = app.get("drive_id") or app.get("driveId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")
    student_name = app.get("student_name") or app.get("studentName", "Student")
    student_email = app.get("student_email") or app.get("studentEmail", "")

    student_doc = await db.students.find_one({"id": student_id}) if student_id else None
    drive_doc = await db.drives.find_one({"id": drive_id}) if drive_id else None
    
    student_data = student_doc or app
    drive_data = drive_doc or {}

    if drive_data:
        is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive_data)
        if not is_eligible:
            reasons_str = "; ".join(reasons)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Candidate is not eligible for this placement drive. Reasons: {reasons_str}"
            )

    curr_status = (app.get("status") or "").upper()
    if curr_status in ["APPLIED", "REGISTERED", "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate must be shortlisted before aptitude allocation. Current status is '{curr_status}'."
        )

    # Check idempotency
    existing_ass = await db.assessments.find_one({
        "$or": [
            {"application_id": application_id, "round_type": "APTITUDE"},
            {"applicationId": application_id, "round_type": "APTITUDE"}
        ]
    })
    if existing_ass or curr_status in ["APTITUDE_ALLOCATED", "APTITUDE_ASSIGNED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Aptitude round has already been allocated."
        )

    payload_dict = payload or {}
    timestamp_ms = int(datetime.now().timestamp() * 1000)
    ass_id = f"ass-apt-{timestamp_ms}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now().isoformat()

    officer_name = current_user.get("name", "Placement Officer") if current_user else "Placement Officer"
    officer_id = current_user.get("id", "officer") if current_user else "officer"

    assessment_doc = {
        "id": ass_id,
        "assessment_id": ass_id,
        "drive_id": drive_id,
        "driveId": drive_id,
        "application_id": application_id,
        "applicationId": application_id,
        "student_id": student_id,
        "studentId": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "company": company_name,
        "company_name": company_name,
        "job_title": job_title,
        "role_title": job_title,
        "round_type": "APTITUDE",
        "title": payload_dict.get("title") or "Aptitude Assessment",
        "status": "ALLOCATED",
        "scheduled_at": payload_dict.get("scheduled_at"),
        "deadline": payload_dict.get("deadline"),
        "duration_minutes": payload_dict.get("duration_minutes") or 30,
        "allocated_at": now_iso,
        "allocated_by": officer_name,
        "allocated_by_id": officer_id,
        "created_at": now_iso
    }
    await db.assessments.insert_one(assessment_doc)

    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {
            "status": "APTITUDE_ALLOCATED",
            "aptitude_status": "ALLOCATED",
            "aptitude_allocated": True,
            "aptitude_assessment_id": ass_id,
            "pipeline_stage": "APTITUDE_ALLOCATED",
            "updated_at": now_iso
        }}
    )

    notif_id = f"notif-apt-alloc-{student_id}-{application_id}"
    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "students",
        "recipientName": student_name,
        "type": "APTITUDE_ALLOCATED",
        "title": "Aptitude Test Assigned",
        "message": f"Your aptitude round for {company_name} - {job_title} has been allocated.",
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "assessment_id": ass_id,
        "relatedRoute": f"/student/dashboard?assessment_id={ass_id}",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    updated = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    return await _hydrate_application_doc(db, updated)



@router.post("/{application_id}/evaluate-aptitude")
async def evaluate_aptitude_result(
    application_id: str,
    payload: Dict[str, Any],
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Evaluates aptitude round result for candidate (QUALIFIED or FAILED).
    Updates stage: APTITUDE_ASSIGNED -> APTITUDE_QUALIFIED or APTITUDE_FAILED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")
    drive_id = app.get("drive_id") or app.get("driveId")
    student_name = app.get("student_name") or app.get("studentName", "Student")

    passed = payload.get("passed", True)
    score = float(payload.get("score", 85.0))
    status_str = "APTITUDE_QUALIFIED" if passed else "APTITUDE_FAILED"
    apt_status = "QUALIFIED" if passed else "FAILED"

    now_iso = datetime.now().isoformat()
    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {
            "status": status_str,
            "aptitude_status": apt_status,
            "aptitude_score": score,
            "aptitude_evaluated_at": now_iso,
            "updated_at": now_iso
        }}
    )

    notif_id = f"notif-apt-eval-{student_id}-{int(datetime.now().timestamp())}"
    title = "Aptitude Round Qualified!" if passed else "Aptitude Round Evaluation"
    msg = f"Congratulations! You qualified the Aptitude Round for {company_name} ({job_title}) with score {score}%." if passed else f"Aptitude round evaluation completed for {company_name}."

    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "student",
        "recipientName": student_name,
        "type": "APTITUDE_RESULT",
        "title": title,
        "message": msg,
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "relatedRoute": "/student/dashboard",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    updated = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    return await _hydrate_application_doc(db, updated)


@router.post("/{application_id}/allocate-technical")
async def allocate_technical_round(
    application_id: str,
    payload: Optional[Dict[str, Any]] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer allocates Technical Round for an APTITUDE_QUALIFIED candidate.
    Validates eligibility, aptitude qualification, and prevents duplicate allocations or invalid stage transitions.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    student_name = app.get("student_name") or app.get("studentName", "Student")
    student_email = app.get("student_email") or app.get("email", "")
    drive_id = app.get("drive_id") or app.get("driveId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")

    officer_name = "Placement Officer"
    officer_id = "officer-admin"
    if current_user:
        officer_name = current_user.get("name") or current_user.get("full_name") or officer_name
        officer_id = current_user.get("id") or current_user.get("sub") or officer_id

    curr_status = (app.get("status") or "").upper()
    apt_status = (app.get("aptitude_status") or "").upper()

    # 1. Reject if candidate is ineligible or failed aptitude
    if curr_status == "INELIGIBLE" or app.get("eligible") is False:
        raise HTTPException(status_code=400, detail="Ineligible candidate: Cannot allocate Technical Round.")

    if curr_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED"] or apt_status == "FAILED":
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{student_name}' failed the Aptitude Round and cannot proceed to the Technical Round."
        )

    # 2. Reject if candidate has not completed & qualified Aptitude
    if curr_status not in ["APTITUDE_QUALIFIED", "TECHNICAL_PENDING"] and apt_status not in ["QUALIFIED", "PASSED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{student_name}' must be APTITUDE_QUALIFIED before allocating a Technical Round. Current status: '{curr_status}'."
        )

    # 3. Reject if already technical allocated
    if curr_status == "TECHNICAL_ALLOCATED" or app.get("technical_status") == "ALLOCATED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Technical round is already allocated for student '{student_name}'."
        )

    now_iso = datetime.now().isoformat()
    payload_dict = payload or {}

    ass_id = f"ass-tech-{student_id}-{application_id}"
    assessment_doc = {
        "id": ass_id,
        "assessment_id": ass_id,
        "drive_id": drive_id,
        "driveId": drive_id,
        "application_id": application_id,
        "applicationId": application_id,
        "student_id": student_id,
        "studentId": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "company": company_name,
        "company_name": company_name,
        "job_title": job_title,
        "role_title": job_title,
        "round_type": "TECHNICAL",
        "type": "TECHNICAL",
        "title": payload_dict.get("title") or "Technical Round Assessment",
        "status": "ALLOCATED",
        "scheduled_at": payload_dict.get("scheduled_at"),
        "deadline": payload_dict.get("deadline"),
        "duration_minutes": payload_dict.get("duration_minutes") or 45,
        "allocated_at": now_iso,
        "allocated_by": officer_name,
        "allocated_by_id": officer_id,
        "created_at": now_iso
    }
    await db.assessments.insert_one(assessment_doc)

    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {
            "status": "TECHNICAL_ALLOCATED",
            "stage": "TECHNICAL_ALLOCATED",
            "pipeline_stage": "TECHNICAL_ALLOCATED",
            "technical_status": "ALLOCATED",
            "technical_assessment_id": ass_id,
            "updated_at": now_iso
        }}
    )

    notif_id = f"notif-tech-alloc-{student_id}-{application_id}"
    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "student",
        "recipientName": student_name,
        "type": "TECHNICAL_ALLOCATED",
        "title": "Technical Round Allocated 💻",
        "message": f"Technical round has been allocated to you for {company_name} - {job_title}.",
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "assessment_id": ass_id,
        "relatedRoute": f"/student/dashboard?assessment_id={ass_id}",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    updated = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    return await _hydrate_application_doc(db, updated)


@router.post("/{application_id}/allocate-hr")
async def allocate_hr_round(
    application_id: str,
    payload: Optional[Dict[str, Any]] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer allocates HR / Interview Round for a TECHNICAL_QUALIFIED candidate.
    Validates eligibility, Aptitude qualification, Technical qualification, and prevents invalid stage transitions.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student_id = app.get("student_id") or app.get("studentId")
    student_name = app.get("student_name") or app.get("studentName", "Student")
    student_email = app.get("student_email") or app.get("email", "")
    drive_id = app.get("drive_id") or app.get("driveId")
    company_name = app.get("company_name") or app.get("companyName", "Company")
    job_title = app.get("job_title") or app.get("roleTitle", "Software Engineer")

    officer_name = "Placement Officer"
    officer_id = "officer-admin"
    if current_user:
        officer_name = current_user.get("name") or current_user.get("full_name") or officer_name
        officer_id = current_user.get("id") or current_user.get("sub") or officer_id

    curr_status = (app.get("status") or "").upper()
    apt_status = (app.get("aptitude_status") or "").upper()
    tech_status = (app.get("technical_status") or "").upper()

    # 1. Reject if candidate is ineligible or failed Aptitude / Technical
    if curr_status == "INELIGIBLE" or app.get("eligible") is False:
        raise HTTPException(status_code=400, detail="Ineligible candidate: Cannot allocate HR / Interview Round.")

    if curr_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED"] or apt_status == "FAILED":
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{student_name}' failed the Aptitude Round and cannot proceed to HR / Interview Round."
        )

    if curr_status in ["REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED"] or tech_status == "FAILED":
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{student_name}' failed the Technical Round and cannot proceed to HR / Interview Round."
        )

    # 2. Reject if candidate has not completed & qualified Technical
    if curr_status not in ["TECHNICAL_QUALIFIED", "INTERVIEW_PENDING", "HR_INTERVIEW_PENDING"] and tech_status not in ["QUALIFIED", "PASSED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{student_name}' must be TECHNICAL_QUALIFIED before allocating HR / Interview Round. Current status: '{curr_status}'."
        )

    # 3. Reject if already HR allocated or scheduled
    if curr_status in ["HR_INTERVIEW_ALLOCATED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] or app.get("hr_status") == "ALLOCATED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"HR / Interview round is already allocated or scheduled for candidate '{student_name}'."
        )

    now_iso = datetime.now().isoformat()
    int_id = f"int-{student_id}-{drive_id}"

    await db.interviews.update_one(
        {"$or": [{"id": int_id}, {"candidateId": student_id, "driveId": drive_id}]},
        {"$set": {
            "id": int_id,
            "interview_id": int_id,
            "candidateId": student_id,
            "candidate_id": student_id,
            "candidateName": student_name,
            "student_name": student_name,
            "candidateEmail": student_email,
            "student_email": student_email,
            "companyName": company_name,
            "company_name": company_name,
            "roleTitle": job_title,
            "job_title": job_title,
            "driveId": drive_id,
            "drive_id": drive_id,
            "applicationId": application_id,
            "application_id": application_id,
            "round": "HR",
            "status": "ALLOCATED",
            "allocated_by": officer_id,
            "allocated_by_name": officer_name,
            "allocated_at": now_iso,
            "created_at": now_iso,
            "updated_at": now_iso
        }},
        upsert=True
    )

    await db.applications.update_one(
        {"$or": [{"id": application_id}, {"_id": application_id}]},
        {"$set": {
            "status": "HR_INTERVIEW_ALLOCATED",
            "stage": "HR_INTERVIEW_ALLOCATED",
            "pipeline_stage": "HR_INTERVIEW_ALLOCATED",
            "hr_status": "ALLOCATED",
            "hr_interview_id": int_id,
            "updated_at": now_iso
        }}
    )

    notif_id = f"notif-hr-alloc-{student_id}-{application_id}"
    await create_idempotent_notification(db, {
        "id": notif_id,
        "recipient_user_id": student_id,
        "recipientRole": "student",
        "recipientName": student_name,
        "type": "HR_INTERVIEW_ALLOCATED",
        "title": "HR / Interview Round Allocated 👔🎉",
        "message": f"HR / Interview round has been allocated to you for {company_name} - {job_title}. Awaiting schedule.",
        "application_id": application_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "interview_id": int_id,
        "relatedRoute": "/student/dashboard",
        "read": False,
        "important": True,
        "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
        "created_at": now_iso,
    })

    updated = await db.applications.find_one({"$or": [{"id": application_id}, {"_id": application_id}]})
    return await _hydrate_application_doc(db, updated)




