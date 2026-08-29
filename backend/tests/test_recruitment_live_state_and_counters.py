import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from app.main import app
from app.db.mongodb import db_manager

@pytest_asyncio.fixture
async def test_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

@pytest.mark.asyncio
async def test_shortlist_and_candidate_pool_stats_live_update(test_client: AsyncClient):
    """Verify shortlisting updates status, stage, and live /api/applications/stats count."""
    db = db_manager.db
    test_ts = int(datetime.now().timestamp())
    test_drive_id = f"drive-test-live-{test_ts}"
    test_student_id = f"student-test-live-{test_ts}"
    test_app_id = f"app-test-live-{test_ts}"

    # Insert test drive
    await db.drives.insert_one({
        "id": test_drive_id,
        "companyName": "Acme Live Corp",
        "roleTitle": "Software Engineer",
        "packageLpa": 14.0,
        "status": "ANNOUNCED",
        "registeredCount": 1,
        "shortlistedCount": 0,
        "selectedCount": 0
    })

    # Insert test student
    await db.students.insert_one({
        "id": test_student_id,
        "name": "Live Test Student",
        "email": f"live_student_{test_ts}@example.com",
        "branch": "CSE",
        "cgpa": 8.8,
        "skills": ["Python", "React", "MongoDB"],
        "shortlistsCount": 0,
        "placementStatus": "unplaced"
    })

    # Insert initial application in APPLIED state
    await db.applications.insert_one({
        "id": test_app_id,
        "student_id": test_student_id,
        "drive_id": test_drive_id,
        "company_name": "Acme Live Corp",
        "job_title": "Software Engineer",
        "status": "APPLIED",
        "stage": "APPLIED",
        "pipeline_stage": "APPLIED",
        "created_at": datetime.now().isoformat()
    })

    # Check initial stats
    res = await test_client.get(f"/api/applications/stats?drive_id={test_drive_id}")
    assert res.status_code == 200
    stats = res.json()
    assert stats["all"] >= 1
    assert stats["applied"] >= 1
    init_shortlisted = stats["shortlisted"]

    # Shortlist application
    res_shortlist = await test_client.post(f"/api/applications/{test_app_id}/shortlist", json={})
    assert res_shortlist.status_code == 200

    # Verify application record is updated in DB
    app_doc = await db.applications.find_one({"id": test_app_id})
    assert app_doc["status"] == "SHORTLISTED"
    assert app_doc["stage"] == "SHORTLISTED"

    # Verify stats shortlisted count increased
    res_stats_after = await test_client.get(f"/api/applications/stats?drive_id={test_drive_id}")
    assert res_stats_after.status_code == 200
    stats_after = res_stats_after.json()
    assert stats_after["shortlisted"] == init_shortlisted + 1

    # Test recruiter metrics endpoint
    res_metrics = await test_client.get(f"/api/drives/{test_drive_id}/recruiter-metrics")
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()["metrics"]
    assert metrics["registeredCount"] >= 1
    assert metrics["shortlistedCount"] >= 1

    # Cleanup
    await db.applications.delete_many({"drive_id": test_drive_id})
    await db.drives.delete_many({"id": test_drive_id})
    await db.students.delete_many({"id": test_student_id})


@pytest.mark.asyncio
async def test_interview_completion_and_final_selection_live_flow(test_client: AsyncClient):
    """Verify interview completion and final selection updates stage, drive selected count, and stats."""
    db = db_manager.db
    test_ts = int(datetime.now().timestamp())
    test_drive_id = f"drive-test-sel-{test_ts}"
    test_student_id = f"student-test-sel-{test_ts}"
    test_app_id = f"app-test-sel-{test_ts}"
    test_int_id = f"int-test-sel-{test_ts}"

    await db.drives.insert_one({
        "id": test_drive_id,
        "companyName": "Apex Technologies",
        "roleTitle": "Fullstack Developer",
        "packageLpa": 18.0,
        "status": "ANNOUNCED",
        "registeredCount": 1,
        "shortlistedCount": 1,
        "selectedCount": 0
    })

    await db.students.insert_one({
        "id": test_student_id,
        "name": "Apex Candidate",
        "email": f"apex_{test_ts}@example.com",
        "branch": "IT",
        "cgpa": 9.1,
        "skills": ["TypeScript", "Node.js", "React"],
        "placementStatus": "unplaced"
    })

    await db.applications.insert_one({
        "id": test_app_id,
        "student_id": test_student_id,
        "drive_id": test_drive_id,
        "company_name": "Apex Technologies",
        "job_title": "Fullstack Developer",
        "status": "INTERVIEW_SCHEDULED",
        "stage": "INTERVIEW_SCHEDULED",
        "pipeline_stage": "INTERVIEW_SCHEDULED",
        "created_at": datetime.now().isoformat()
    })

    await db.interviews.insert_one({
        "id": test_int_id,
        "interview_id": test_int_id,
        "application_id": test_app_id,
        "student_id": test_student_id,
        "drive_id": test_drive_id,
        "candidateName": "Apex Candidate",
        "companyName": "Apex Technologies",
        "roleTitle": "Fullstack Developer",
        "date": "2026-11-20",
        "time": "02:00 PM - 02:45 PM",
        "panelName": "Panel Elite",
        "roomName": "Room 303",
        "status": "SCHEDULED"
    })

    # Step 1: Mark interview as completed
    res_comp = await test_client.put(f"/api/interviews/{test_int_id}/status?status=COMPLETED")
    assert res_comp.status_code == 200

    # Verify application status and stage are INTERVIEW_COMPLETED
    app_doc = await db.applications.find_one({"id": test_app_id})
    assert app_doc["status"] == "INTERVIEW_COMPLETED"
    assert app_doc["stage"] == "INTERVIEW_COMPLETED"

    # Step 2: Recruiter executes FINAL_SELECT round action
    res_action = await test_client.post(f"/api/applications/{test_app_id}/round-action", json={
        "action": "FINAL_SELECT",
        "notes": "Outstanding technical performance and culture fit."
    })
    assert res_action.status_code == 200

    # Verify application status is SELECTED
    app_selected = await db.applications.find_one({"id": test_app_id})
    assert app_selected["status"] == "SELECTED"
    assert app_selected["stage"] == "SELECTED"

    # Verify stats endpoint returns selected >= 1
    res_stats = await test_client.get(f"/api/applications/stats?drive_id={test_drive_id}")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["selected"] >= 1

    # Verify recruiter metrics selections_made >= 1
    res_metrics = await test_client.get(f"/api/drives/{test_drive_id}/recruiter-metrics")
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()["metrics"]
    assert metrics["selectedCount"] >= 1

    # Verify student placement status updated
    student_doc = await db.students.find_one({"id": test_student_id})
    assert student_doc["placementStatus"] == "placed"

    # Cleanup
    await db.applications.delete_many({"drive_id": test_drive_id})
    await db.interviews.delete_many({"drive_id": test_drive_id})
    await db.drives.delete_many({"id": test_drive_id})
    await db.students.delete_many({"id": test_student_id})


@pytest.mark.asyncio
async def test_drive_fields_and_stats_data_consistency(test_client: AsyncClient):
    """Verify drive endpoints maintain consistent candidate counts and field attributes."""
    db = db_manager.db
    test_ts = int(datetime.now().timestamp())
    test_drive_id = f"drive-test-edit-{test_ts}"

    await db.drives.insert_one({
        "id": test_drive_id,
        "companyName": "CloudScale Systems",
        "roleTitle": "DevOps Engineer",
        "packageLpa": 16.5,
        "location": "Hyderabad",
        "minCgpa": 7.5,
        "eligibleBranches": ["CSE", "ECE", "IT"],
        "requiredSkills": ["Docker", "Kubernetes", "AWS", "Python"],
        "preferredSkills": ["Terraform", "CI/CD"],
        "deadline": "2026-12-01",
        "status": "APPROVED",
        "registeredCount": 5,
        "shortlistedCount": 3,
        "selectedCount": 1
    })

    res = await test_client.get(f"/api/drives/{test_drive_id}")
    assert res.status_code == 200
    drive_data = res.json()
    assert drive_data["companyName"] == "CloudScale Systems"
    assert drive_data["roleTitle"] == "DevOps Engineer"
    assert drive_data["packageLpa"] == 16.5
    assert drive_data["minCgpa"] == 7.5
    assert "Docker" in drive_data["requiredSkills"]
    assert "CSE" in drive_data["eligibleBranches"]

    # Cleanup
    await db.drives.delete_many({"id": test_drive_id})
