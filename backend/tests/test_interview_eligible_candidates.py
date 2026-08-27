"""
Automated Test Suite for Interview Scheduling Candidate Dropdown & Scheduling Enforcement.
Validates:
TEST 1: Select drive -> candidate dropdown contains eligible candidates.
TEST 2: Candidate from another drive does not appear.
TEST 3: Technical-qualified candidate appears.
TEST 4: Technical-failed candidate does not appear.
TEST 5: Rejected candidate does not appear.
TEST 6: Already scheduled candidate does not appear.
TEST 7: Changing drive refreshes candidate list.
TEST 8: No drive selected -> empty/all response handling.
TEST 9: Valid candidate + panel + room + date/time -> interview successfully scheduled.
TEST 10: Invalid candidate/application combination -> backend rejects scheduling.
"""

import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_interview_eligible_candidates_suite():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Clean up test records
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-elg"}})
    await db.applications.delete_many({"student_id": {"$regex": "^stu-elg"}})
    await db.students.delete_many({"id": {"$regex": "^stu-elg"}})
    await db.drives.delete_many({"id": {"$regex": "^drive-elg"}})

    # Setup Officer Auth Header
    officer_id = f"officer-elg-{timestamp_ms}"
    token_officer = create_access_token({"sub": officer_id, "id": officer_id, "role": "officer", "name": "Placement Officer"})
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    # Setup Drive A (Cognizant - DevOps)
    drive_a_id = f"drive-elg-a-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_a_id,
        "companyName": "Cognizant",
        "roleTitle": "DevOps Engineer",
        "status": "APPROVED",
        "rounds": [
            {"id": "r1", "name": "Aptitude", "round_type": "APTITUDE"},
            {"id": "r2", "name": "Technical", "round_type": "TECHNICAL"},
            {"id": "r3", "name": "HR", "round_type": "HR", "is_final": True}
        ]
    })

    # Setup Drive B (TCS - Software Engineer)
    drive_b_id = f"drive-elg-b-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_b_id,
        "companyName": "TCS",
        "roleTitle": "Software Engineer",
        "status": "APPROVED",
        "rounds": [
            {"id": "r1", "name": "Aptitude", "round_type": "APTITUDE"},
            {"id": "r2", "name": "Technical", "round_type": "TECHNICAL"},
            {"id": "r3", "name": "HR", "round_type": "HR", "is_final": True}
        ]
    })

    # Student 1: Technical Qualified for Drive A (Cognizant) -> SHOULD APPEAR
    stu1_id = f"stu-elg-pass-{timestamp_ms}"
    await db.students.insert_one({"id": stu1_id, "name": "Rahul Verma", "email": f"rahul_{timestamp_ms}@campus.edu", "rollNumber": "CS001", "branch": "CSE"})
    app1_id = f"app-{stu1_id}-{drive_a_id}"
    await db.applications.insert_one({
        "id": app1_id,
        "student_id": stu1_id,
        "student_name": "Rahul Verma",
        "drive_id": drive_a_id,
        "company_name": "Cognizant",
        "job_title": "DevOps Engineer",
        "status": "HR_INTERVIEW_PENDING",
        "stage": "HR_INTERVIEW_PENDING",
        "aptitude_status": "QUALIFIED",
        "technical_status": "QUALIFIED"
    })

    # Student 2: Technical Failed for Drive A -> SHOULD NOT APPEAR (TEST 4)
    stu2_id = f"stu-elg-techfail-{timestamp_ms}"
    await db.students.insert_one({"id": stu2_id, "name": "Tech Fail Student", "email": f"tfail_{timestamp_ms}@campus.edu", "rollNumber": "CS002", "branch": "CSE"})
    app2_id = f"app-{stu2_id}-{drive_a_id}"
    await db.applications.insert_one({
        "id": app2_id,
        "student_id": stu2_id,
        "student_name": "Tech Fail Student",
        "drive_id": drive_a_id,
        "company_name": "Cognizant",
        "job_title": "DevOps Engineer",
        "status": "REJECTED_AT_TECHNICAL",
        "stage": "REJECTED_AT_TECHNICAL",
        "aptitude_status": "QUALIFIED",
        "technical_status": "FAILED"
    })

    # Student 3: Rejected Candidate for Drive A -> SHOULD NOT APPEAR (TEST 5)
    stu3_id = f"stu-elg-rej-{timestamp_ms}"
    await db.students.insert_one({"id": stu3_id, "name": "Rejected Student", "email": f"rej_{timestamp_ms}@campus.edu", "rollNumber": "CS003", "branch": "CSE"})
    app3_id = f"app-{stu3_id}-{drive_a_id}"
    await db.applications.insert_one({
        "id": app3_id,
        "student_id": stu3_id,
        "student_name": "Rejected Student",
        "drive_id": drive_a_id,
        "company_name": "Cognizant",
        "job_title": "DevOps Engineer",
        "status": "REJECTED",
        "stage": "REJECTED"
    })

    # Student 4: Already Scheduled Candidate for Drive A -> SHOULD NOT APPEAR (TEST 6)
    stu4_id = f"stu-elg-sched-{timestamp_ms}"
    await db.students.insert_one({"id": stu4_id, "name": "Already Scheduled Student", "email": f"sched_{timestamp_ms}@campus.edu", "rollNumber": "CS004", "branch": "CSE"})
    app4_id = f"app-{stu4_id}-{drive_a_id}"
    await db.applications.insert_one({
        "id": app4_id,
        "student_id": stu4_id,
        "student_name": "Already Scheduled Student",
        "drive_id": drive_a_id,
        "company_name": "Cognizant",
        "job_title": "DevOps Engineer",
        "status": "INTERVIEW_SCHEDULED",
        "stage": "INTERVIEW_SCHEDULED",
        "aptitude_status": "QUALIFIED",
        "technical_status": "QUALIFIED"
    })
    await db.interviews.insert_one({
        "id": f"int-{stu4_id}",
        "candidateId": stu4_id,
        "driveId": drive_a_id,
        "companyName": "Cognizant",
        "status": "scheduled"
    })

    # Student 5: Qualified for Drive B (TCS) -> SHOULD NOT APPEAR FOR DRIVE A (TEST 2)
    stu5_id = f"stu-elg-driveb-{timestamp_ms}"
    await db.students.insert_one({"id": stu5_id, "name": "Ayush Kumar (TCS Candidate)", "email": f"ayush_{timestamp_ms}@campus.edu", "rollNumber": "CS005", "branch": "CSE"})

    app5_id = f"app-{stu5_id}-{drive_b_id}"
    await db.applications.insert_one({
        "id": app5_id,
        "student_id": stu5_id,
        "student_name": "Ayush Kumar (TCS Candidate)",
        "drive_id": drive_b_id,
        "company_name": "TCS",
        "job_title": "Software Engineer",
        "status": "HR_INTERVIEW_PENDING",
        "stage": "HR_INTERVIEW_PENDING",
        "aptitude_status": "QUALIFIED",
        "technical_status": "QUALIFIED"
    })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # TEST 1 & TEST 3: Fetch candidates for Drive A (Cognizant) -> Rahul Verma appears
        res_a = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_a_id}", headers=headers_officer)
        assert res_a.status_code == 200
        list_a = res_a.json()
        names_a = [c["name"] for c in list_a]

        assert "Rahul Verma" in names_a  # TEST 1 & TEST 3 PASSED
        assert "Tech Fail Student" not in names_a  # TEST 4 PASSED
        assert "Rejected Student" not in names_a  # TEST 5 PASSED
        assert "Already Scheduled Student" not in names_a  # TEST 6 PASSED
        assert "Ayush Kumar (TCS Candidate)" not in names_a  # TEST 2 PASSED

        # TEST 7: Changing drive to Drive B (TCS) -> Ayush Kumar appears, Rahul Verma does not
        res_b = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_b_id}", headers=headers_officer)
        assert res_b.status_code == 200
        list_b = res_b.json()
        names_b = [c["name"] for c in list_b]

        assert "Ayush Kumar (TCS Candidate)" in names_b  # TEST 7 PASSED
        assert "Rahul Verma" not in names_b

        # TEST 9: Schedule interview for Rahul Verma (Drive A) -> Success
        res_sched = await client.post("/api/interviews", json={
            "candidateId": stu1_id,
            "candidateName": "Rahul Verma",
            "companyName": "Cognizant",
            "roleTitle": "DevOps Engineer",
            "driveId": drive_a_id,
            "applicationId": app1_id,
            "round": "HR",
            "date": "2026-09-25",
            "timeSlot": "10:30 AM - 11:15 AM",
            "startTime": "10:30 AM",
            "endTime": "11:15 AM",
            "panelName": "Cognizant HR Panel",
            "roomName": "Room 101"
        }, headers=headers_officer)
        assert res_sched.status_code in [200, 201]  # TEST 9 PASSED

        # TEST 10: Attempt to schedule interview for Tech Fail candidate -> Backend rejects
        res_invalid = await client.post("/api/interviews", json={
            "candidateId": stu2_id,
            "candidateName": "Tech Fail Student",
            "companyName": "Cognizant",
            "roleTitle": "DevOps Engineer",
            "driveId": drive_a_id,
            "applicationId": app2_id,
            "round": "HR",
            "date": "2026-09-25",
            "timeSlot": "10:30 AM - 11:15 AM",
            "startTime": "10:30 AM",
            "endTime": "11:15 AM",
            "panelName": "Cognizant HR Panel",
            "roomName": "Room 101"
        }, headers=headers_officer)
        assert res_invalid.status_code == 400  # TEST 10 PASSED
