import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.anyio
async def test_aptitude_and_technical_step_c_suite():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Setup Officer, Student 1 (Passes Aptitude), Student 2 (Fails Aptitude)
    officer_id = f"officer-stepc-{timestamp_ms}"
    token_officer = create_access_token({"sub": officer_id, "id": officer_id, "role": "officer", "name": "Placement Officer"})
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    student_pass_id = f"stu-pass-{timestamp_ms}"
    student_pass_email = f"stu_pass_{timestamp_ms}@campus.edu"
    token_pass = create_access_token({"sub": student_pass_id, "id": student_pass_id, "role": "student", "name": "Passing Student", "email": student_pass_email})
    headers_pass = {"Authorization": f"Bearer {token_pass}"}

    student_fail_id = f"stu-fail-{timestamp_ms}"
    student_fail_email = f"stu_fail_{timestamp_ms}@campus.edu"
    token_fail = create_access_token({"sub": student_fail_id, "id": student_fail_id, "role": "student", "name": "Failing Student", "email": student_fail_email})
    headers_fail = {"Authorization": f"Bearer {token_fail}"}

    drive_id = f"drive-stepc-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_id,
        "companyName": "OmniCorp Systems",
        "roleTitle": "Systems Engineer",
        "minCgpa": 7.0,
        "eligibleBranches": ["CSE", "ECE"],
        "status": "ANNOUNCED"
    })

    # Application 1: Passing Student
    app_pass_id = f"app-pass-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_pass_id,
        "student_id": student_pass_id,
        "student_name": "Passing Student",
        "student_email": student_pass_email,
        "drive_id": drive_id,
        "company_name": "OmniCorp Systems",
        "job_title": "Systems Engineer",
        "status": "SHORTLISTED",
        "eligible": True
    })

    ass_pass_id = f"ass-pass-{timestamp_ms}"
    await db.assessments.insert_one({
        "id": ass_pass_id,
        "assessment_id": ass_pass_id,
        "drive_id": drive_id,
        "application_id": app_pass_id,
        "student_id": student_pass_id,
        "company": "OmniCorp Systems",
        "job_title": "Systems Engineer",
        "round_type": "APTITUDE",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    })

    # Application 2: Failing Student
    app_fail_id = f"app-fail-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_fail_id,
        "student_id": student_fail_id,
        "student_name": "Failing Student",
        "student_email": student_fail_email,
        "drive_id": drive_id,
        "company_name": "OmniCorp Systems",
        "job_title": "Systems Engineer",
        "status": "SHORTLISTED",
        "eligible": True
    })

    ass_fail_id = f"ass-fail-{timestamp_ms}"
    await db.assessments.insert_one({
        "id": ass_fail_id,
        "assessment_id": ass_fail_id,
        "drive_id": drive_id,
        "application_id": app_fail_id,
        "student_id": student_fail_id,
        "company": "OmniCorp Systems",
        "job_title": "Systems Engineer",
        "round_type": "APTITUDE",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # TEST 1: Passing Student starts test -> Application state becomes APTITUDE_IN_PROGRESS
        res1 = await client.post(f"/api/assessments/{ass_pass_id}/start", headers=headers_pass)
        assert res1.status_code == 200
        started_pass = res1.json()
        assert started_pass["status"] == "IN_PROGRESS"

        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] == "APTITUDE_IN_PROGRESS"

        # TEST 2: Failing Student starts test
        res2 = await client.post(f"/api/assessments/{ass_fail_id}/start", headers=headers_fail)
        assert res2.status_code == 200
        started_fail = res2.json()

        # TEST 3: Passing Student submits correct answers (score 100% >= 60%)
        ass_pass_db = await db.assessments.find_one({"id": ass_pass_id})
        pass_qs_full = ass_pass_db["questions"]
        pass_answers = [
            {"question_id": q["id"], "type": "aptitude", "selected_option": q["correct_answer"]}
            for q in pass_qs_full
        ]
        res3 = await client.post(f"/api/assessments/{ass_pass_id}/submit", json={
            "answers": pass_answers
        }, headers=headers_pass)
        assert res3.status_code == 200
        result_pass = res3.json()
        assert result_pass["percentage"] >= 60.0


        # Verify application status became APTITUDE_QUALIFIED
        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] == "APTITUDE_QUALIFIED"
        assert app_pass_db["aptitude_status"] == "QUALIFIED"

        # Verify APTITUDE_QUALIFIED notification exists
        notif_pass = await db.notifications.find_one({"recipient_user_id": student_pass_id, "type": "APTITUDE_QUALIFIED"})
        assert notif_pass is not None

        # TEST 4: Failing Student submits wrong answers (score 0% < 60%)
        fail_questions = started_fail["questions"]
        res4 = await client.post(f"/api/assessments/{ass_fail_id}/submit", json={
            "answers": [{"question_id": q["id"], "type": "aptitude", "selected_option": "Wrong Option Answer"} for q in fail_questions]
        }, headers=headers_fail)
        assert res4.status_code == 200

        # Verify application status became REJECTED_AT_APTITUDE
        app_fail_db = await db.applications.find_one({"id": app_fail_id})
        assert app_fail_db["status"] == "REJECTED_AT_APTITUDE"
        assert app_fail_db["aptitude_status"] == "FAILED"

        # Verify APTITUDE_FAILED notification exists
        notif_fail = await db.notifications.find_one({"recipient_user_id": student_fail_id, "type": "APTITUDE_FAILED"})
        assert notif_fail is not None

        # TEST 5: Officer CANNOT allocate Technical Round for REJECTED_AT_APTITUDE student (HTTP 400)
        res5 = await client.post(f"/api/applications/{app_fail_id}/allocate-technical", headers=headers_officer)
        assert res5.status_code == 400
        assert "failed the Aptitude Round" in res5.json()["detail"]

        # TEST 6: Officer CAN allocate Technical Round for APTITUDE_QUALIFIED student
        res6 = await client.post(f"/api/applications/{app_pass_id}/allocate-technical", headers=headers_officer)
        assert res6.status_code == 200
        alloc_res = res6.json()
        assert alloc_res["status"] == "TECHNICAL_ALLOCATED"

        # Verify db.assessments record for TECHNICAL round created
        tech_ass_db = await db.assessments.find_one({"application_id": app_pass_id, "round_type": "TECHNICAL"})
        assert tech_ass_db is not None
        assert tech_ass_db["status"] == "ALLOCATED"

        # Verify TECHNICAL_ALLOCATED student notification created
        notif_tech = await db.notifications.find_one({"recipient_user_id": student_pass_id, "type": "TECHNICAL_ALLOCATED"})
        assert notif_tech is not None

        # TEST 7: Duplicate Technical Round allocation is prevented (HTTP 409 Conflict)
        res7 = await client.post(f"/api/applications/{app_pass_id}/allocate-technical", headers=headers_officer)
        assert res7.status_code == 409

        # TEST 8: Passing Student Dashboard endpoint reflects TECHNICAL assessment
        res8 = await client.get("/api/assessments/student/me", headers=headers_pass)
        assert res8.status_code == 200
        stu_assessments = res8.json()
        assert any(item["round_type"] == "TECHNICAL" for item in stu_assessments)
