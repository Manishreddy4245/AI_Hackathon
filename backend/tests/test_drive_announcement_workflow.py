import sys
import os
import pytest

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.db.mongodb import db_manager, AsyncMockDatabase
from app.schemas.drive import PlacementDriveCreate
from app.routes.drives import create_drive, announce_drive_to_students
from app.schemas.form import FormCreate, FormSubmissionCreate
from app.routes.forms import create_form, get_form, submit_form, get_form_submissions


@pytest.mark.anyio
async def test_drive_announcement_and_forms_workflow():
    db_manager.db = AsyncMockDatabase("placemind_test")
    db = db_manager.db
    assert db is not None


    # 1. Recruiter creates campus drive -> PENDING_ANNOUNCEMENT
    recruiter = {"id": "rec-test-wf", "name": "Google Recruiter", "email": "recruiter@google.com", "role": "recruiter"}
    drive_in = PlacementDriveCreate(
        companyName="Alphabet Core",
        roleTitle="Software Engineer II",
        packageLpa=32.0,
        location="Hyderabad / Hybrid",
        deadline="2026-11-30",
        requiredSkills=["Python", "Go", "Distributed Systems"]
    )
    drive = await create_drive(drive_in, current_user=recruiter)
    drive_id = drive["id"] if isinstance(drive, dict) else drive.id
    drive_status = drive["status"] if isinstance(drive, dict) else drive.status
    assert drive_status == "PENDING_ANNOUNCEMENT"

    # Officer notification exists, student notifications = 0
    officer_notif = await db.notifications.find_one({"drive_id": drive_id, "type": "CAMPUS_DRIVE_PENDING"})
    assert officer_notif is not None
    assert await db.notifications.count_documents({"drive_id": drive_id, "type": "NEW_DRIVE_AVAILABLE"}) == 0

    # 2. Placement Officer announces drive -> ANNOUNCED
    officer = {"id": "officer-test-wf", "name": "Dean TPO", "email": "dean@college.edu", "role": "placement_officer"}
    announced = await announce_drive_to_students(drive_id, current_user=officer)
    announced_status = announced["status"] if isinstance(announced, dict) else announced.status
    assert announced_status == "ANNOUNCED"

    # Deduplication test: re-announcing should return existing without re-triggering
    re_announced = await announce_drive_to_students(drive_id, current_user=officer)
    assert (re_announced["status"] if isinstance(re_announced, dict) else re_announced.status) == "ANNOUNCED"

    # Community post created
    comm_post = await db.community_messages.find_one({"drive_id": drive_id, "message_type": "CAMPUS_DRIVE_ANNOUNCEMENT"})
    assert comm_post is not None

    # 3. Officer creates form
    form_in = FormCreate(
        title="Alphabet Core Coding Assessment Slot Selection",
        description="Select your preferred test slot and confirm github profile",
        drive_id=drive_id,
        is_published=True
    )
    form = await create_form(form_in, current_user=officer)
    assert form.id is not None

    # Community post for form exists
    form_post = await db.community_messages.find_one({"form_id": form.id})
    assert form_post is not None

    # 4. Student submits form
    student = {"id": "st-wf-1", "name": "Kavya Sharma", "email": "kavya@student.edu", "role": "student"}
    sub_in = FormSubmissionCreate(answers={"full_name": "Kavya Sharma", "slot": "Slot 1 (10 AM)", "cgpa": 9.5})
    sub = await submit_form(form.id, sub_in, current_user=student)
    assert sub.status == "SUBMITTED"

    # 5. Duplicate submission prevention
    with pytest.raises(Exception):
        await submit_form(form.id, sub_in, current_user=student)

    # 6. Officer checks submissions
    subs = await get_form_submissions(form.id, current_user=officer)
    assert len(subs) >= 1

    # Cleanup
    await db.drives.delete_one({"id": drive_id})
    await db.notifications.delete_many({"drive_id": drive_id})
    await db.community_messages.delete_many({"drive_id": drive_id})
    await db.forms.delete_one({"id": form.id})
    await db.form_submissions.delete_many({"form_id": form.id})
