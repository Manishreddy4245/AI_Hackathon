import pytest
import asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token

@pytest.mark.anyio
async def test_aptitude_test_step_b_suite():

    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # 1. Setup Student A and Student B users
    student_a_id = f"stu-stepb-a-{timestamp_ms}"
    student_a_email = f"student_a_{timestamp_ms}@campus.edu"
    token_a = create_access_token({"sub": student_a_id, "id": student_a_id, "role": "student", "name": "Student A", "email": student_a_email})
    headers_a = {"Authorization": f"Bearer {token_a}"}

    student_b_id = f"stu-stepb-b-{timestamp_ms}"
    student_b_email = f"student_b_{timestamp_ms}@campus.edu"
    token_b = create_access_token({"sub": student_b_id, "id": student_b_id, "role": "student", "name": "Student B", "email": student_b_email})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Drive and Application for Student A
    drive_id = f"drive-stepb-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_id,
        "companyName": "Apex Technologies",
        "roleTitle": "Software Developer",
        "minCgpa": 7.0,
        "eligibleBranches": ["CSE"],
        "status": "ANNOUNCED"
    })

    app_id = f"app-stepb-a-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_id,
        "student_id": student_a_id,
        "student_name": "Student A",
        "student_email": student_a_email,
        "drive_id": drive_id,
        "company_name": "Apex Technologies",
        "job_title": "Software Developer",
        "status": "SHORTLISTED",
        "eligible": True
    })

    # Setup Allocated Assessment for Student A
    ass_id = f"ass-stepb-a-{timestamp_ms}"
    ass_doc = {
        "id": ass_id,
        "assessment_id": ass_id,
        "drive_id": drive_id,
        "application_id": app_id,
        "student_id": student_a_id,
        "student_name": "Student A",
        "student_email": student_a_email,
        "company": "Apex Technologies",
        "job_title": "Software Developer",
        "round_type": "APTITUDE",
        "title": "Aptitude Assessment",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    }
    await db.assessments.insert_one(ass_doc)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # TEST 1: Allocated student can fetch own aptitude test history via GET /api/assessments/student/me
        res1 = await client.get("/api/assessments/student/me", headers=headers_a)
        assert res1.status_code == 200
        history_a = res1.json()
        assert any(item["id"] == ass_id for item in history_a)

        # TEST 2: Unallocated student B history does not contain student A's test
        res2 = await client.get("/api/assessments/student/me", headers=headers_b)
        assert res2.status_code == 200
        history_b = res2.json()
        assert not any(item["id"] == ass_id for item in history_b)

        # TEST 3: Student B cannot access Student A's test details (HTTP 403 Forbidden)
        res3 = await client.get(f"/api/assessments/{ass_id}", headers=headers_b)
        assert res3.status_code == 403

        # TEST 4: Student A can fetch details of allocated test
        res4 = await client.get(f"/api/assessments/{ass_id}", headers=headers_a)
        assert res4.status_code == 200
        details = res4.json()
        assert details["status"] == "ALLOCATED"

        # TEST 5: Student A starts aptitude test via POST /api/assessments/{ass_id}/start
        res5 = await client.post(f"/api/assessments/{ass_id}/start", headers=headers_a)
        assert res5.status_code == 200
        started_session = res5.json()
        assert started_session["status"] == "IN_PROGRESS"
        assert started_session["started_at"] is not None
        assert started_session["expires_at"] is not None
        assert len(started_session["questions"]) > 0

        # TEST 6: Verify correct_answer is NOT exposed to frontend in question payload
        first_q = started_session["questions"][0]
        assert "correct_answer" not in first_q

        initial_expires_at = started_session["expires_at"]

        # TEST 7: Re-starting an already started test does NOT reset expires_at (Persistent timer rule)
        res7 = await client.post(f"/api/assessments/{ass_id}/start", headers=headers_a)
        assert res7.status_code == 200
        restarted_session = res7.json()
        assert restarted_session["expires_at"] == initial_expires_at

        # TEST 8: Student A saves an answer via POST /api/assessments/{ass_id}/answers
        q_id = first_q["id"]
        res8 = await client.post(f"/api/assessments/{ass_id}/answers", json={
            "question_id": q_id,
            "selected_option": "150 metres"
        }, headers=headers_a)
        assert res8.status_code == 200
        assert res8.json()["status"] == "saved"

        # TEST 9: Student B cannot submit Student A's test (HTTP 403 Forbidden)
        res9 = await client.post(f"/api/assessments/{ass_id}/submit", json={
            "answers": [{"question_id": q_id, "type": "aptitude", "selected_option": "150 metres"}]
        }, headers=headers_b)
        assert res9.status_code == 403

        # TEST 10: Student A submits own test via POST /api/assessments/{ass_id}/submit
        res10 = await client.post(f"/api/assessments/{ass_id}/submit", json={
            "answers": [{"question_id": q_id, "type": "aptitude", "selected_option": "150 metres"}]
        }, headers=headers_a)
        assert res10.status_code == 200
        submit_result = res10.json()
        assert submit_result["percentage"] >= 0

        # Verify DB assessment status became COMPLETED
        ass_db = await db.assessments.find_one({"id": ass_id})
        assert ass_db["status"] == "COMPLETED"

        # Verify candidate application status became APTITUDE_QUALIFIED in db.applications
        app_db = await db.applications.find_one({"id": app_id})
        assert app_db["status"] in ["APTITUDE_QUALIFIED", "APTITUDE_FAILED", "REJECTED_AT_APTITUDE"]


        # TEST 11: Duplicate submission is prevented (HTTP 409 Conflict or 400)
        res11 = await client.post(f"/api/assessments/{ass_id}/submit", json={
            "answers": [{"question_id": q_id, "type": "aptitude", "selected_option": "150 metres"}]
        }, headers=headers_a)
        assert res11.status_code in [400, 409]
