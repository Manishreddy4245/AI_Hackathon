import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime

from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token, hash_password


@pytest_asyncio.fixture
async def workflow_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_full_master_recruitment_pipeline_workflow(workflow_client: AsyncClient):
    """
    Comprehensive End-to-End Test for the Master Recruitment Pipeline:
    1. Recruiter registers and creates a Placement Drive in DRAFT mode.
    2. Verified draft is invisible to students.
    3. Recruiter submits the drive to the Placement Officer (SUBMITTED_TO_OFFICER).
    4. Placement Officer receives notification of submitted drive.
    5. Unauthorized student attempting to approve drive receives HTTP 403.
    6. Placement Officer approves drive -> status ACTIVE / ANNOUNCED, student notifications created.
    7. Students browse drives and see the live drive.
    8. Ineligible student (low CGPA, wrong branch) attempts to apply -> HTTP 400 rejection.
    9. Eligible student applies -> Application created (APPLIED), registered count incremented.
    10. Duplicate application rejected -> HTTP 400.
    11. Placement Officer inspects candidate pool -> Candidate listed with verified eligibility.
    12. Placement Officer shortlists candidate -> Application becomes SHORTLISTED, student receives notification.
    13. Placement Officer rejects second candidate -> Application becomes NOT_SHORTLISTED, student receives notification.
    """
    db = db_manager.db
    assert db is not None

    now_ts = int(datetime.now().timestamp())
    recruiter_id = f"usr-rec-{now_ts}"
    officer_id = f"usr-off-{now_ts}"
    eligible_student_id = f"usr-stu-elig-{now_ts}"
    ineligible_student_id = f"usr-stu-inelig-{now_ts}"

    # Setup User Documents in DB
    await db.users.insert_many([
        {
            "id": recruiter_id,
            "email": f"recruiter_{now_ts}@techcorp.com",
            "name": "Jane Recruiter",
            "role": "recruiter",
            "companyId": f"comp-{now_ts}",
            "companyName": "TechCorp Global",
            "is_active": True,
            "password_hash": hash_password("Password123")
        },
        {
            "id": officer_id,
            "email": f"officer_{now_ts}@campus.edu",
            "name": "Dr. Placement Officer",
            "role": "placement_officer",
            "is_active": True,
            "password_hash": hash_password("Password123")
        },
        {
            "id": eligible_student_id,
            "email": f"eligible_{now_ts}@campus.edu",
            "name": "Alice Eligible",
            "role": "student",
            "cgpa": 8.8,
            "branch": "CSE",
            "graduationYear": 2026,
            "activeBacklogs": 0,
            "is_active": True,
            "password_hash": hash_password("Password123")
        },
        {
            "id": ineligible_student_id,
            "email": f"ineligible_{now_ts}@campus.edu",
            "name": "Bob Ineligible",
            "role": "student",
            "cgpa": 5.5,  # below 7.5 min
            "branch": "CIVIL",  # not in CSE/IT
            "graduationYear": 2029,
            "activeBacklogs": 3,
            "is_active": True,
            "password_hash": hash_password("Password123")
        }
    ])

    # Setup Student Profiles
    await db.students.insert_many([
        {
            "id": eligible_student_id,
            "name": "Alice Eligible",
            "email": f"eligible_{now_ts}@campus.edu",
            "rollNumber": f"CS-{now_ts}",
            "branch": "CSE",
            "batch": "2026",
            "graduationYear": 2026,
            "cgpa": 8.8,
            "activeBacklogs": 0,
            "skills": ["Python", "FastAPI", "React", "MongoDB"],
            "applicationsCount": 0,
            "shortlistsCount": 0,
            "interviewsCount": 0,
            "placementStatus": "unplaced",
            "resumeUrl": "alice_resume.pdf"
        },
        {
            "id": ineligible_student_id,
            "name": "Bob Ineligible",
            "email": f"ineligible_{now_ts}@campus.edu",
            "rollNumber": f"CE-{now_ts}",
            "branch": "CIVIL",
            "batch": "2029",
            "graduationYear": 2029,
            "cgpa": 5.5,
            "activeBacklogs": 3,
            "skills": ["Surveying", "AutoCAD"],
            "applicationsCount": 0,
            "shortlistsCount": 0,
            "interviewsCount": 0,
            "placementStatus": "unplaced",
            "resumeUrl": "bob_resume.pdf"
        }
    ])

    # Generate Auth Tokens
    recruiter_token = create_access_token({"sub": recruiter_id, "email": f"recruiter_{now_ts}@techcorp.com", "role": "recruiter", "name": "Jane Recruiter", "companyId": f"comp-{now_ts}"})
    officer_token = create_access_token({"sub": officer_id, "email": f"officer_{now_ts}@campus.edu", "role": "placement_officer", "name": "Dr. Placement Officer"})
    eligible_student_token = create_access_token({"sub": eligible_student_id, "email": f"eligible_{now_ts}@campus.edu", "role": "student", "name": "Alice Eligible"})
    ineligible_student_token = create_access_token({"sub": ineligible_student_id, "email": f"ineligible_{now_ts}@campus.edu", "role": "student", "name": "Bob Ineligible"})

    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    officer_headers = {"Authorization": f"Bearer {officer_token}"}
    eligible_student_headers = {"Authorization": f"Bearer {eligible_student_token}"}
    ineligible_student_headers = {"Authorization": f"Bearer {ineligible_student_token}"}

    # =========================================================================
    # STEP 1: Recruiter creates a placement drive in DRAFT state
    # =========================================================================
    create_payload = {
        "companyName": "TechCorp Global",
        "companyId": f"comp-{now_ts}",
        "roleTitle": "Software Development Engineer",
        "packageLpa": 16.5,
        "location": "Bengaluru / Hybrid",
        "employmentType": "Full Time",
        "eligibleBranches": ["CSE", "IT"],
        "minCgpa": 7.5,
        "graduationYears": [2026],
        "maxBacklogs": 0,
        "deadline": "2026-12-31",
        "driveDate": "2026-12-31",
        "description": "TechCorp is looking for top talent in Python and React development.",
        "requiredSkills": ["Python", "FastAPI", "React"],
        "status": "DRAFT"
    }

    create_res = await workflow_client.post("/api/drives", json=create_payload, headers=recruiter_headers)
    assert create_res.status_code == 201
    drive_data = create_res.json()
    drive_id = drive_data["id"]
    assert drive_data["status"] == "DRAFT"
    assert drive_data["companyName"] == "TechCorp Global"

    # =========================================================================
    # STEP 2: Verify draft drive is NOT visible to students
    # =========================================================================
    student_drives_res = await workflow_client.get("/api/drives", headers=eligible_student_headers)
    assert student_drives_res.status_code == 200
    student_visible_ids = [d["id"] for d in student_drives_res.json()]
    assert drive_id not in student_visible_ids

    # =========================================================================
    # STEP 3: Recruiter submits drive to Placement Officer
    # =========================================================================
    submit_res = await workflow_client.post(f"/api/drives/{drive_id}/submit", headers=recruiter_headers)
    assert submit_res.status_code == 200
    submitted_drive = submit_res.json()
    assert submitted_drive["status"] == "SUBMITTED_TO_OFFICER"

    # Verify Placement Officer received notification
    officer_notif = await db.notifications.find_one({
        "recipient_user_id": officer_id,
        "drive_id": drive_id,
        "type": "CAMPUS_DRIVE_PENDING"
    })
    assert officer_notif is not None
    assert "TechCorp Global" in officer_notif["title"]

    # =========================================================================
    # STEP 4: Security - Unauthorized student cannot approve drive
    # =========================================================================
    unauth_res = await workflow_client.post(f"/api/drives/{drive_id}/approve", headers=eligible_student_headers)
    assert unauth_res.status_code == 403

    # =========================================================================
    # STEP 5: Placement Officer approves drive -> ACTIVE / ANNOUNCED
    # =========================================================================
    approve_res = await workflow_client.post(f"/api/drives/{drive_id}/approve", headers=officer_headers)
    assert approve_res.status_code == 200
    approved_drive = approve_res.json()
    assert approved_drive["status"] == "ACTIVE"

    # Verify Student received notification about new drive
    student_notif = await db.notifications.find_one({
        "recipient_user_id": eligible_student_id,
        "drive_id": drive_id,
        "type": "NEW_DRIVE_AVAILABLE"
    })
    assert student_notif is not None

    # Verify drive is now visible to students
    student_drives_res2 = await workflow_client.get("/api/drives", headers=eligible_student_headers)
    assert student_drives_res2.status_code == 200
    student_visible_ids2 = [d["id"] for d in student_drives_res2.json()]
    assert drive_id in student_visible_ids2

    # =========================================================================
    # STEP 6: Ineligible student attempts to apply -> Rejection (HTTP 400)
    # =========================================================================
    inelig_apply_res = await workflow_client.post(
        "/api/students/apply",
        json={"driveId": drive_id},
        headers=ineligible_student_headers
    )
    assert inelig_apply_res.status_code == 400
    inelig_detail = inelig_apply_res.json()["detail"]
    assert "Ineligible candidate" in inelig_detail or "CGPA" in inelig_detail or "branch" in inelig_detail

    # =========================================================================
    # STEP 7: Eligible student applies -> Application created (APPLIED)
    # =========================================================================
    elig_apply_res = await workflow_client.post(
        "/api/students/apply",
        json={"driveId": drive_id},
        headers=eligible_student_headers
    )
    assert elig_apply_res.status_code == 200
    apply_data = elig_apply_res.json()
    assert apply_data["status"] == "ok"
    application_id = apply_data["applicationId"]

    # Verify drive registeredCount incremented
    refreshed_drive = await db.drives.find_one({"id": drive_id})
    assert refreshed_drive["registeredCount"] >= 1

    # =========================================================================
    # STEP 8: Duplicate application attempt -> HTTP 400
    # =========================================================================
    dup_apply_res = await workflow_client.post(
        "/api/students/apply",
        json={"driveId": drive_id},
        headers=eligible_student_headers
    )
    assert dup_apply_res.status_code == 400
    assert "already applied" in dup_apply_res.json()["detail"].lower()

    # =========================================================================
    # STEP 9: Placement Officer inspects Candidate Pool & Stats
    # =========================================================================
    pool_res = await workflow_client.get(f"/api/applications/pool?drive_id={drive_id}", headers=officer_headers)
    assert pool_res.status_code == 200
    pool_candidates = pool_res.json()
    assert len(pool_candidates) >= 1
    target_cand = next(c for c in pool_candidates if c["id"] == application_id or c.get("student_id") == eligible_student_id)
    assert target_cand["eligible"] is True
    assert target_cand["status"] == "APPLIED"

    stats_res = await workflow_client.get(f"/api/applications/stats?drive_id={drive_id}", headers=officer_headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert stats_data["all"] >= 1
    assert stats_data["applied"] >= 1

    # =========================================================================
    # STEP 10: Placement Officer Shortlists Candidate -> Status SHORTLISTED
    # =========================================================================
    shortlist_res = await workflow_client.post(
        f"/api/applications/{application_id}/shortlist",
        json={},
        headers=officer_headers
    )
    assert shortlist_res.status_code == 200
    assert shortlist_res.json()["applicationStatus"] == "SHORTLISTED"

    # Verify student received shortlist notification
    shortlist_notif = await db.notifications.find_one({
        "recipient_user_id": eligible_student_id,
        "application_id": application_id,
        "type": "APPLICATION_SHORTLISTED"
    })
    assert shortlist_notif is not None
    assert "Shortlisted" in shortlist_notif["title"]

    # =========================================================================
    # STEP 11: Placement Officer Rejects another Candidate Application
    # =========================================================================
    second_student_id = f"usr-stu-2-{now_ts}"
    app_reject_id = f"app-test-reject-{now_ts}"
    await db.applications.insert_one({
        "id": app_reject_id,
        "student_id": second_student_id,
        "student_name": "Charlie Candidate",
        "drive_id": drive_id,
        "company_name": "TechCorp Global",
        "job_title": "Software Development Engineer",
        "status": "APPLIED",
        "created_at": datetime.now().isoformat()
    })

    reject_res = await workflow_client.post(
        f"/api/applications/{app_reject_id}/reject",
        json={"reason": "Candidate withdrew application."},
        headers=officer_headers
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["applicationStatus"] == "NOT_SHORTLISTED"

    # =========================================================================
    # STEP 12: Placement Officer Requests Changes on another Drive
    # =========================================================================
    drive_chg_id = f"drive-chg-test-{now_ts}"
    await db.drives.insert_one({
        "id": drive_chg_id,
        "companyName": "InnoSoft",
        "roleTitle": "Data Engineer",
        "recruiter_id": recruiter_id,
        "status": "SUBMITTED_TO_OFFICER",
        "created_at": datetime.now().isoformat()
    })

    chg_res = await workflow_client.post(
        f"/api/drives/{drive_chg_id}/request-changes",
        json={"feedback": "Please increase the CTC package to meet tier-1 standards."},
        headers=officer_headers
    )
    assert chg_res.status_code == 200
    assert chg_res.json()["status"] == "CHANGES_REQUESTED"

    # Recruiter receives changes requested notification
    chg_notif = await db.notifications.find_one({"drive_id": drive_chg_id, "type": "important_update"})
    assert chg_notif is not None
    assert "Changes Requested" in chg_notif["title"]
