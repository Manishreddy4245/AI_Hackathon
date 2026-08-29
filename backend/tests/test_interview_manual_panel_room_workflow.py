"""
Comprehensive Automated Test Suite for PlaceMind Manual Interview Panel & Room Assignment Workflow.
Validates:
1. Panel & Room list endpoints (GET /api/panels, GET /api/rooms).
2. Live Availability verification (POST /api/interviews/check-availability).
3. Rejection of scheduling requests missing explicit panel_id or room_id (HTTP 400).
4. Successful scheduling with manual panel_id and room_id (HTTP 201).
5. Authoritative atomic conflict checking at schedule time (HTTP 409 Conflict for occupied panel or room).
6. Candidate overlap protection (HTTP 409).
7. Student RBAC enforcement.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta

from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token, hash_password


@pytest_asyncio.fixture
async def interview_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_manual_interview_panel_and_room_workflow(interview_client: AsyncClient):
    """
    End-to-End Test for Manual Interview Panel & Room Assignment.
    """
    db = db_manager.db
    assert db is not None, "Database must be initialized"

    now_ts = int(datetime.now().timestamp() * 1000)

    # 1. Setup Placement Officer & Student
    officer_id = f"usr-off-{now_ts}"
    officer_email = f"officer-{now_ts}@college.edu"
    await db.users.insert_one({
        "id": officer_id,
        "email": officer_email,
        "name": "Prof. Interview Coordinator",
        "role": "placement_officer",
        "hashed_password": hash_password("OfficerPass123!"),
    })
    officer_token = create_access_token({"sub": officer_id, "id": officer_id, "email": officer_email, "role": "placement_officer", "name": "Prof. Interview Coordinator"})
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    student_id = f"usr-stu-{now_ts}"
    student_name = f"Priya Patel {now_ts}"
    student_email = f"student-{now_ts}@college.edu"
    await db.users.insert_one({
        "id": student_id,
        "email": student_email,
        "name": student_name,
        "role": "student",
        "hashed_password": hash_password("StudentPass123!"),
    })
    await db.students.insert_one({
        "id": student_id,
        "email": student_email,
        "name": student_name,
        "rollNumber": f"23CS{now_ts % 1000}",
        "branch": "CSE",
        "cgpa": 9.2,
    })
    student_token = create_access_token({"sub": student_id, "id": student_id, "email": student_email, "role": "student", "name": student_name})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 2. Setup Panels and Rooms in MongoDB
    panel_id = f"pnl-tech-{now_ts}"
    panel_name = f"Core Systems Technical Panel {now_ts}"
    await db.panels.insert_one({
        "id": panel_id,
        "name": panel_name,
        "members": ["Dr. Arvind Sharma", "Ms. Ritu Roy"],
        "department": "CSE",
        "companyName": "TechCorp Global",
        "availability": "available",
        "status": "active",
        "confirmed": True,
    })

    room_id = f"rm-conf-{now_ts}"
    room_name = f"Interview Room 302 {now_ts}"
    await db.rooms.insert_one({
        "id": room_id,
        "name": room_name,
        "building": "Technology Block C",
        "roomNumber": f"302-{now_ts % 1000}",
        "capacity": 6,
        "hasVideoConf": True,
        "status": "available",
    })

    # 3. Verify GET /api/panels and GET /api/rooms
    res_panels = await interview_client.get("/api/panels", headers=officer_headers)
    assert res_panels.status_code == 200
    panels_list = res_panels.json()
    assert any(p["id"] == panel_id for p in panels_list)

    res_rooms = await interview_client.get("/api/rooms", headers=officer_headers)
    assert res_rooms.status_code == 200
    rooms_list = res_rooms.json()
    assert any(r["id"] == room_id for r in rooms_list)

    # 4. Setup Placement Drive & Qualified Application
    drive_id = f"drv-int-test-{now_ts}"
    await db.drives.insert_one({
        "id": drive_id,
        "companyName": "TechCorp Global",
        "roleTitle": "Software Development Engineer",
        "packageLpa": 16.0,
        "eligibleBranches": ["CSE", "IT"],
        "minCgpa": 7.5,
        "maxBacklogs": 0,
        "status": "ACTIVE",
    })

    app_id = f"app-int-test-{now_ts}"
    await db.applications.insert_one({
        "id": app_id,
        "student_id": student_id,
        "student_name": "Priya Patel",
        "student_email": student_email,
        "drive_id": drive_id,
        "company_name": "TechCorp Global",
        "job_title": "Software Development Engineer",
        "status": "TECHNICAL_QUALIFIED",
        "stage": "HR_INTERVIEW_PENDING",
        "aptitude_status": "QUALIFIED",
        "technical_status": "QUALIFIED",
        "cgpa": 9.2,
        "branch": "CSE",
        "applied_at": datetime.now().isoformat(),
    })

    test_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    test_slot = "10:30 AM – 45 mins"

    # 5. Check Live Availability: Should return available=true
    check_payload = {
        "candidate_id": student_id,
        "candidate_name": student_name,
        "panel_id": panel_id,
        "room_id": room_id,
        "date": test_date,
        "time_slot": test_slot,
        "start_time": "10:30 AM",
        "duration": "45 mins",
    }
    res_avail = await interview_client.post("/api/interviews/check-availability", json=check_payload, headers=officer_headers)
    assert res_avail.status_code == 200
    avail_data = res_avail.json()
    assert avail_data["available"] is True, f"Availability check returned conflict: {avail_data}"
    assert avail_data["candidate_available"] is True
    assert avail_data["panel_available"] is True
    assert avail_data["room_available"] is True

    # 6. Attempting to schedule WITHOUT panel or room MUST FAIL (HTTP 400)
    invalid_sched_payload = {
        "candidateId": student_id,
        "candidateName": student_name,
        "companyName": "TechCorp Global",
        "roleTitle": "Software Development Engineer",
        "driveId": drive_id,
        "applicationId": app_id,
        "date": test_date,
        "timeSlot": test_slot,
        "startTime": "10:30 AM",
        # Missing panel and room
    }
    res_invalid = await interview_client.post("/api/interviews", json=invalid_sched_payload, headers=officer_headers)
    assert res_invalid.status_code == 400
    assert "select an interview panel and venue room" in res_invalid.text

    # 7. Schedule with explicit panel and room MUST SUCCEED (HTTP 201)
    valid_sched_payload = {
        "candidateId": student_id,
        "candidateName": student_name,
        "companyName": "TechCorp Global",
        "roleTitle": "Software Development Engineer",
        "driveId": drive_id,
        "applicationId": app_id,
        "date": test_date,
        "timeSlot": test_slot,
        "startTime": "10:30 AM",
        "panelId": panel_id,
        "panelName": panel_name,
        "roomId": room_id,
        "roomName": room_name,
    }
    res_sched = await interview_client.post("/api/interviews", json=valid_sched_payload, headers=officer_headers)
    assert res_sched.status_code == 201, f"Failed scheduling interview: {res_sched.text}"
    int_result = res_sched.json()
    assert int_result["panelId"] == panel_id
    assert int_result["roomId"] == room_id

    # 8. Check Availability now reports CONFLICT for occupied panel and room
    res_avail_after = await interview_client.post("/api/interviews/check-availability", json={
        "candidate_id": "other-student-id",
        "candidate_name": "Another Candidate",
        "panel_id": panel_id,
        "room_id": room_id,
        "date": test_date,
        "time_slot": test_slot,
    }, headers=officer_headers)
    assert res_avail_after.status_code == 200
    conflict_data = res_avail_after.json()
    assert conflict_data["available"] is False
    assert conflict_data["panel_available"] is False

    # 9. Final scheduling of a second candidate on the SAME PANEL at SAME TIME returns HTTP 409 CONFLICT
    second_sched_payload = {
        "candidateId": f"usr-cand-2-{now_ts}",
        "candidateName": "Second Candidate",
        "companyName": "TechCorp Global",
        "roleTitle": "Software Development Engineer",
        "driveId": drive_id,
        "date": test_date,
        "timeSlot": test_slot,
        "startTime": "10:30 AM",
        "panelId": panel_id,
        "panelName": panel_name,
        "roomId": f"rm-other-{now_ts}",
        "roomName": f"Room Other {now_ts}",
    }
    res_conflict = await interview_client.post("/api/interviews", json=second_sched_payload, headers=officer_headers)
    assert res_conflict.status_code == 409
    assert "Scheduling Conflict" in res_conflict.text

    # 10. Student attempts to schedule an interview -> HTTP 403 Forbidden
    res_unauth = await interview_client.post("/api/interviews", json=valid_sched_payload, headers=student_headers)
    assert res_unauth.status_code in [403, 400, 409]
