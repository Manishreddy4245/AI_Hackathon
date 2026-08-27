import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.schemas.form import FormCreate, FormSchema, FormSubmissionCreate, FormSubmissionSchema

logger = logging.getLogger("placemind.forms")
router = APIRouter(prefix="/api/forms", tags=["Placement Forms"])


@router.post("", response_model=FormSchema, status_code=status.HTTP_201_CREATED)
async def create_form(
    req: FormCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    role = current_user.get("role") or current_user.get("portalRole")
    if role not in ["placement_officer", "admin", "officer"]:
        raise HTTPException(status_code=403, detail="Only Placement Officers can create forms.")

    now_iso = datetime.now().isoformat()
    form_id = f"form-{uuid.uuid4().hex[:12]}"
    officer_id = current_user.get("id")
    officer_name = current_user.get("name", "Placement Officer")

    form_doc = {
        "id": form_id,
        "title": req.title,
        "description": req.description,
        "drive_id": req.drive_id,
        "created_by": officer_id,
        "created_by_name": officer_name,
        "fields": [f.model_dump() for f in req.fields],
        "is_published": req.is_published,
        "created_at": now_iso,
        "submission_count": 0,
        "community_post_id": None,
    }
    await db.forms.insert_one(form_doc)

    if req.is_published and req.drive_id:
        drive = await db.drives.find_one({"id": req.drive_id})

        # Create community announcement post for this form
        comm_msg_id = f"msg-form-{form_id}"
        comm_post = {
            "id": comm_msg_id,
            "community_id": f"comm-{req.drive_id}",
            "drive_id": req.drive_id,
            "author_id": officer_id,
            "author_name": officer_name,
            "author_role": "placement_officer",
            "message_type": "FORM",
            "content": (
                f"NEW FORM UPLOADED\n\n"
                f"Form: {req.title}\n"
                f"{req.description or ''}\n\n"
                f"Uploaded by: {officer_name} (Placement Office)\n"
                f"Click [FILL FORM] to open and complete the form."
            ),
            "action_type": "OPEN_FORM",
            "action_label": "Fill Form",
            "form_id": form_id,
            "form_schema": None,
            "created_at": now_iso,
        }
        await db.community_messages.insert_one(comm_post)

        # Update form with community post ID
        await db.forms.update_one(
            {"id": form_id},
            {"$set": {"community_post_id": comm_msg_id}}
        )

        # Notify all students about the new form
        all_students = await db.students.find({}, {"id": 1, "email": 1, "name": 1}).to_list(length=500)
        student_users = await db.users.find({"role": "student"}, {"id": 1, "email": 1, "name": 1}).to_list(length=500)

        seen_ids: set = set()
        all_recipients = []
        for st in all_students + student_users:
            st_id = st.get("id")
            if st_id and st_id not in seen_ids:
                seen_ids.add(st_id)
                all_recipients.append(st)

        company_name = drive.get("companyName", "") if drive else ""
        drive_label = f" for the {company_name} placement drive" if company_name else ""
        timestamp_ms = int(datetime.now().timestamp() * 1000)

        student_notifs = []
        for st in all_recipients:
            st_id = st.get("id")
            student_notifs.append({
                "id": f"notif-form-{form_id}-{st_id}-{timestamp_ms}",
                "title": f"New Form: {req.title}",
                "message": (
                    f"Placement Office just uploaded a new form{drive_label}: "
                    f"'{req.title}'. Click to view and fill the form."
                ),
                "timestamp": "Just now",
                "read": False,
                "important": True,
                "type": "FORM_UPLOADED",
                "recipientRole": "student",
                "recipientName": st.get("name", "Student"),
                "recipient_user_id": st_id,
                "created_at": now_iso,
                "drive_id": req.drive_id,
                "form_id": form_id,
                "company_name": company_name,
                "relatedRoute": f"/student/forms/{form_id}",
            })

        if student_notifs:
            await db.notifications.insert_many(student_notifs)

    created = await db.forms.find_one({"id": form_id}, {"_id": 0})
    sub_count = await db.form_submissions.count_documents({"form_id": form_id})
    created["submission_count"] = sub_count
    return FormSchema(**created)


@router.get("", response_model=List[FormSchema])
async def list_forms(
    drive_id: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}
    if drive_id:
        query["drive_id"] = drive_id

    role = (current_user.get("role") or current_user.get("portalRole")) if current_user else None
    if role not in ["placement_officer", "admin", "officer", "recruiter"]:
        query["is_published"] = True

    raw_forms = await db.forms.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)

    result = []
    for f in raw_forms:
        sub_count = await db.form_submissions.count_documents({"form_id": f.get("id")})
        f["submission_count"] = sub_count
        result.append(FormSchema(**f))
    return result


@router.get("/{form_id}", response_model=FormSchema)
async def get_form(
    form_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    form = await db.forms.find_one({"id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    sub_count = await db.form_submissions.count_documents({"form_id": form_id})
    form["submission_count"] = sub_count
    return FormSchema(**form)


@router.post("/{form_id}/submit", response_model=FormSubmissionSchema, status_code=status.HTTP_201_CREATED)
async def submit_form(
    form_id: str,
    req: FormSubmissionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    form = await db.forms.find_one({"id": form_id})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    # Duplicate prevention: one submission per student per form
    existing = await db.form_submissions.find_one({
        "form_id": form_id,
        "$or": [{"student_id": student_id}, {"student_email": student_email}]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this form.")

    now_iso = datetime.now().isoformat()
    submission_id = f"sub-{uuid.uuid4().hex[:12]}"

    # Fetch student profile for name/email
    student = await db.students.find_one({"$or": [{"id": student_id}, {"email": student_email}]}) or current_user
    student_name = student.get("name") or current_user.get("name", "Student")

    submission_doc = {
        "id": submission_id,
        "form_id": form_id,
        "drive_id": form.get("drive_id"),
        "student_id": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "answers": req.answers,
        "submitted_at": now_iso,
        "status": "SUBMITTED",
    }

    await db.form_submissions.insert_one(submission_doc)

    # Update submission count on form
    await db.forms.update_one(
        {"id": form_id},
        {"$inc": {"submission_count": 1}}
    )

    return FormSubmissionSchema(**submission_doc)


@router.get("/{form_id}/submissions", response_model=List[FormSubmissionSchema])
async def get_form_submissions(
    form_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    role = current_user.get("role") or current_user.get("portalRole")
    if role not in ["placement_officer", "admin", "officer", "recruiter"]:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    raw = await db.form_submissions.find({"form_id": form_id}, {"_id": 0}).sort("submitted_at", -1).to_list(length=500)
    return [FormSubmissionSchema(**s) for s in raw]


@router.get("/student/me/submissions", response_model=List[FormSubmissionSchema])
async def get_my_form_submissions(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    raw = await db.form_submissions.find(
        {"$or": [{"student_id": student_id}, {"student_email": student_email}]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=200)

    return [FormSubmissionSchema(**s) for s in raw]