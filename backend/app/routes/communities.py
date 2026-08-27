"""Public Placement Communities, Officer Announcements, and Student Registrations API."""
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.schemas.community import (
    CommunitySchema,
    CommunityMessageCreate,
    CommunityMessageSchema,
    CommunityRegistrationRequest,
    CommunityResponseItem,
)

logger = logging.getLogger("placemind.communities")

router = APIRouter(prefix="/api/communities", tags=["Placement Communities"])

@router.get("", response_model=List[CommunitySchema])
async def list_communities(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """List all active public placement communities with live registration counts."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    raw_communities = await db.communities.find({"status": {"$in": ["active", "ACTIVE"]}}, {"_id": 0}).sort("created_at", -1).to_list(length=100)

    user_id = current_user.get("id") if current_user else None
    results = []

    for comm in raw_communities:
        drive_id = comm.get("drive_id")
        drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})
        
        # Calculate real-time registration count directly from applications
        reg_count = await db.applications.count_documents({
            "$or": [{"drive_id": drive_id}, {"driveId": drive_id}]
        })

        is_registered = False
        if user_id:
            user_email = (current_user.get("email") or "").lower()
            existing_app = await db.applications.find_one({
                "$and": [
                    {"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]},
                    {"$or": [{"student_id": user_id}, {"studentId": user_id}, {"student_email": user_email}]}
                ]
            })
            is_registered = existing_app is not None

        results.append(CommunitySchema(
            id=comm.get("id") or f"comm-{drive_id}",
            community_id=comm.get("community_id") or f"comm-{drive_id}",
            drive_id=drive_id,
            company_id=comm.get("company_id"),
            company_name=comm.get("company_name", drive.get("companyName", "Company") if drive else "Company"),
            role_title=comm.get("role_title", drive.get("roleTitle", "Role") if drive else "Role"),
            package_lpa=comm.get("package_lpa", drive.get("packageLpa") if drive else None),
            salary_text=comm.get("salary_text", drive.get("salary") if drive else None),
            location=comm.get("location", drive.get("location") if drive else None),
            status=comm.get("status", "ACTIVE"),
            registered_count=reg_count,
            is_registered=is_registered,
            created_at=comm.get("created_at", ""),
            drive=drive,
        ))

    return results

@router.get("/{drive_id}", response_model=CommunitySchema)
async def get_community(
    drive_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Retrieve details of a single placement community by driveId."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    comm = await db.communities.find_one({"$or": [{"drive_id": drive_id}, {"id": f"comm-{drive_id}"}]}, {"_id": 0})
    drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})

    if not comm and not drive:
        raise HTTPException(status_code=404, detail="Placement community not found")

    # If drive exists and is approved, ensure community record exists (self-healing canonical)
    if not comm and drive:
        now_iso = datetime.now().isoformat()
        comm = {
            "id": f"comm-{drive_id}",
            "community_id": f"comm-{drive_id}",
            "drive_id": drive_id,
            "company_id": drive.get("companyId"),
            "company_name": drive.get("companyName"),
            "role_title": drive.get("roleTitle"),
            "package_lpa": drive.get("packageLpa"),
            "salary_text": drive.get("salary"),
            "location": drive.get("location"),
            "status": "ACTIVE",
            "created_at": now_iso,
        }
        await db.communities.insert_one(dict(comm))

    reg_count = await db.applications.count_documents({
        "$or": [{"drive_id": drive_id}, {"driveId": drive_id}]
    })

    user_id = current_user.get("id") if current_user else None
    is_registered = False
    if user_id:
        user_email = (current_user.get("email") or "").lower()
        existing_app = await db.applications.find_one({
            "$and": [
                {"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]},
                {"$or": [{"student_id": user_id}, {"studentId": user_id}, {"student_email": user_email}]}
            ]
        })
        is_registered = existing_app is not None

    return CommunitySchema(
        id=comm.get("id") or f"comm-{drive_id}",
        community_id=comm.get("community_id") or f"comm-{drive_id}",
        drive_id=drive_id,
        company_id=comm.get("company_id"),
        company_name=comm.get("company_name", drive.get("companyName", "Company") if drive else "Company"),
        role_title=comm.get("role_title", drive.get("roleTitle", "Role") if drive else "Role"),
        package_lpa=comm.get("package_lpa", drive.get("packageLpa") if drive else None),
        salary_text=comm.get("salary_text", drive.get("salary") if drive else None),
        location=comm.get("location", drive.get("location") if drive else None),
        status=comm.get("status", "ACTIVE"),
        registered_count=reg_count,
        is_registered=is_registered,
        created_at=comm.get("created_at", ""),
        drive=drive,
    )

@router.get("/{drive_id}/messages", response_model=List[CommunityMessageSchema])
async def get_community_messages(drive_id: str):
    """Retrieve all Placement Officer announcements and forms for this community."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    raw_msgs = await db.community_messages.find({
        "$or": [{"drive_id": drive_id}, {"community_id": f"comm-{drive_id}"}]
    }, {"_id": 0}).sort("created_at", 1).to_list(length=100)

    # If empty, ensure default welcome announcement is present
    if not raw_msgs:
        drive = await db.drives.find_one({"id": drive_id})
        if drive:
            now_iso = datetime.now().isoformat()
            default_msg = {
                "id": f"msg-init-{drive_id}",
                "community_id": f"comm-{drive_id}",
                "drive_id": drive_id,
                "author_id": "officer-admin",
                "author_name": "Placement Officer",
                "author_role": "placement_officer",
                "message_type": "REGISTRATION",
                "content": f"Registration for the {drive.get('companyName')} ({drive.get('roleTitle')}) placement drive is now officially OPEN. Please complete the registration form below.",
                "action_type": "OPEN_FORM",
                "action_label": "Open Registration Form",
                "created_at": now_iso,
            }
            await db.community_messages.insert_one(dict(default_msg))
            raw_msgs = [default_msg]

    return raw_msgs

@router.post("/{drive_id}/messages", response_model=CommunityMessageSchema, status_code=status.HTTP_201_CREATED)
async def post_community_message(
    drive_id: str,
    req: CommunityMessageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Placement Officer publishes announcement or attached form inside community."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    role = current_user.get("role") or current_user.get("portalRole")
    if role not in ["placement_officer", "admin", "officer"]:
        raise HTTPException(status_code=403, detail="Only Placement Officers can post community announcements.")

    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    now_iso = datetime.now().isoformat()
    msg_id = f"msg-{uuid.uuid4().hex[:10]}"

    msg_doc = {
        "id": msg_id,
        "community_id": f"comm-{drive_id}",
        "drive_id": drive_id,
        "author_id": current_user.get("id"),
        "author_name": current_user.get("name", "Placement Officer"),
        "author_role": "placement_officer",
        "message_type": req.message_type,
        "content": req.content,
        "action_type": req.action_type,
        "action_label": req.action_label,
        "form_schema": req.form_schema,
        "created_at": now_iso,
    }

    await db.community_messages.insert_one(msg_doc)

    # If it's a critical announcement or form, dispatch notifications to all registered students
    if req.message_type in ["FORM", "REGISTRATION", "ASSESSMENT", "INTERVIEW_UPDATE"]:
        all_students = await db.students.find({}, {"id": 1, "email": 1, "name": 1}).to_list(length=200)
        notif_docs = []
        for st in all_students:
            st_id = st.get("id")
            notif_docs.append({
                "id": f"notif-comm-{uuid.uuid4().hex[:10]}",
                "title": f"Community Update: {drive.get('companyName')}",
                "message": f"{current_user.get('name', 'Placement Officer')} posted an update: '{req.content[:80]}...'",
                "timestamp": "Just now",
                "read": False,
                "important": True,
                "type": "ANNOUNCEMENT",
                "recipientRole": "student",
                "recipientName": st.get("name", "Student"),
                "recipient_user_id": st_id,
                "created_at": now_iso,
                "drive_id": drive_id,
                "company_name": drive.get("companyName"),
                "job_title": drive.get("roleTitle"),
                "relatedRoute": f"/student/community/{drive_id}",
            })
        if notif_docs:
            await db.notifications.insert_many(notif_docs)

    return CommunityMessageSchema(**msg_doc)

@router.post("/{drive_id}/register", status_code=status.HTTP_201_CREATED)
async def register_student_for_drive(
    drive_id: str,
    req: CommunityRegistrationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Student submits registration / application via the placement community form."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    # Enforce Unique Constraint: ONE student + ONE drive -> ONE registration
    existing = await db.applications.find_one({
        "$and": [
            {"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]},
            {"$or": [{"student_id": user_id}, {"studentId": user_id}, {"student_email": user_email}]}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You are already registered for this placement drive.")

    # Fetch latest student details from DB
    student = await db.students.find_one({"$or": [{"id": user_id}, {"email": user_email}]}) or current_user
    st_name = req.name or student.get("name") or "Student Candidate"
    st_roll = req.roll_number or student.get("rollNumber") or "N/A"
    st_branch = req.branch or student.get("branch") or "CSE"
    st_cgpa = req.cgpa if req.cgpa is not None else student.get("cgpa", 8.0)
    st_skills = student.get("skills", [])

    now_iso = datetime.now().isoformat()
    app_id = f"app-{uuid.uuid4().hex[:10]}"

    application_doc = {
        "id": app_id,
        "application_id": app_id,
        "student_id": user_id,
        "studentId": user_id,
        "student_name": st_name,
        "student_email": user_email,
        "roll_number": st_roll,
        "branch": st_branch,
        "cgpa": st_cgpa,
        "skills": st_skills,
        "drive_id": drive_id,
        "driveId": drive_id,
        "company_id": drive.get("companyId"),
        "company_name": drive.get("companyName"),
        "job_title": drive.get("roleTitle"),
        "status": "APPLIED",
        "applied_at": now_iso,
        "custom_answers": req.custom_answers or {},
    }

    # Store canonical application & community response
    await db.applications.insert_one(application_doc)
    await db.community_responses.insert_one(dict(application_doc))

    # Recalculate live registration count and update drive document
    live_count = await db.applications.count_documents({
        "$or": [{"drive_id": drive_id}, {"driveId": drive_id}]
    })
    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {"registeredCount": live_count, "pipeline.applied": live_count}}
    )

    # Dispatch notification to Placement Officer
    officer_notif = {
        "id": f"notif-reg-{uuid.uuid4().hex[:10]}",
        "title": f"New Registration: {st_name}",
        "message": f"{st_name} ({st_branch}, CGPA: {st_cgpa}) registered for {drive.get('companyName')} - {drive.get('roleTitle')}.",
        "timestamp": "Just now",
        "read": False,
        "important": False,
        "type": "APPLICATION_RECEIVED",
        "recipientRole": "placement_officer",
        "recipientName": "Placement Cell",
        "created_at": now_iso,
        "drive_id": drive_id,
        "student_id": user_id,
        "company_name": drive.get("companyName"),
        "job_title": drive.get("roleTitle"),
        "relatedRoute": f"/officer/community/{drive_id}",
    }
    await db.notifications.insert_one(officer_notif)

    return {
        "status": "SUCCESS",
        "message": "Your registration has been submitted successfully.",
        "application_id": app_id,
        "registered_count": live_count,
    }

@router.get("/{drive_id}/responses", response_model=List[CommunityResponseItem])
async def list_community_responses(
    drive_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Placement Officer views verified registered responses for this drive."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    role = current_user.get("role") or current_user.get("portalRole")
    if role not in ["placement_officer", "admin", "officer", "recruiter"]:
        raise HTTPException(status_code=403, detail="Unauthorized access to candidate responses.")

    raw_apps = await db.applications.find({
        "$or": [{"drive_id": drive_id}, {"driveId": drive_id}]
    }, {"_id": 0}).sort("applied_at", -1).to_list(length=200)

    responses = []
    for app in raw_apps:
        responses.append(CommunityResponseItem(
            id=app.get("id") or str(uuid.uuid4()),
            student_id=app.get("student_id") or app.get("studentId", ""),
            student_name=app.get("student_name", "Candidate"),
            student_email=app.get("student_email", ""),
            roll_number=app.get("roll_number"),
            branch=app.get("branch"),
            cgpa=app.get("cgpa"),
            skills=app.get("skills", []),
            registered_at=app.get("applied_at") or app.get("created_at", ""),
            status=app.get("status", "APPLIED"),
            custom_answers=app.get("custom_answers"),
        ))

    return responses
