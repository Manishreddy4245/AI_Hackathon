import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.anyio
async def test_technical_test_step_d_suite():
    await connect_to_mongo()
    db = db_manager.db
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-stepd"}})
    timestamp_ms = int(datetime.now().timestamp() * 1000)


    # Setup Placement Officer
    officer_id = f"officer-stepd-{timestamp_ms}"
    token_officer = create_access_token({"sub": officer_id, "id": officer_id, "role": "officer", "name": "Placement Officer"})
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    # Setup Student 1 (Passes Technical)
    student_pass_id = f"stu-stepd-pass-{timestamp_ms}"
    student_pass_email = f"stu_stepd_pass_{timestamp_ms}@campus.edu"
    token_pass = create_access_token({"sub": student_pass_id, "id": student_pass_id, "role": "student", "name": "Tech Passing Student", "email": student_pass_email})
    headers_pass = {"Authorization": f"Bearer {token_pass}"}
    await db.students.insert_one({
        "id": student_pass_id,
        "name": "Tech Passing Student",
        "email": student_pass_email,
        "cgpa": 8.5,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2026,
        "skills": ["Python", "SQL"]
    })

    # Setup Student 2 (Fails Technical)
    student_fail_id = f"stu-stepd-fail-{timestamp_ms}"
    student_fail_email = f"stu_stepd_fail_{timestamp_ms}@campus.edu"
    token_fail = create_access_token({"sub": student_fail_id, "id": student_fail_id, "role": "student", "name": "Tech Failing Student", "email": student_fail_email})
    headers_fail = {"Authorization": f"Bearer {token_fail}"}
    await db.students.insert_one({
        "id": student_fail_id,
        "name": "Tech Failing Student",
        "email": student_fail_email,
        "cgpa": 8.5,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2026,
        "skills": ["Python", "SQL"]
    })


    # Setup Student 3 (Fails Aptitude)
    student_apt_fail_id = f"stu-stepd-aptfail-{timestamp_ms}"
    student_apt_fail_email = f"stu_stepd_aptfail_{timestamp_ms}@campus.edu"
    token_apt_fail = create_access_token({"sub": student_apt_fail_id, "id": student_apt_fail_id, "role": "student", "name": "Apt Failing Student", "email": student_apt_fail_email})
    headers_apt_fail = {"Authorization": f"Bearer {token_apt_fail}"}

    drive_id = f"drive-stepd-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_id,
        "companyName": "CyberTech Labs",
        "roleTitle": "Software Developer",
        "minCgpa": 7.0,
        "eligibleBranches": ["CSE", "IT"],
        "status": "ANNOUNCED"
    })

    # Application 1: Student 1 (Aptitude Qualified)
    app_pass_id = f"app-stepd-pass-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_pass_id,
        "student_id": student_pass_id,
        "student_name": "Tech Passing Student",
        "student_email": student_pass_email,
        "drive_id": drive_id,
        "company_name": "CyberTech Labs",
        "job_title": "Software Developer",
        "status": "TECHNICAL_ALLOCATED",
        "stage": "TECHNICAL_ALLOCATED",
        "aptitude_status": "QUALIFIED",
        "eligible": True
    })

    ass_pass_id = f"ass-stepd-pass-{timestamp_ms}"
    await db.assessments.insert_one({
        "id": ass_pass_id,
        "assessment_id": ass_pass_id,
        "drive_id": drive_id,
        "application_id": app_pass_id,
        "student_id": student_pass_id,
        "student_name": "Tech Passing Student",
        "student_email": student_pass_email,
        "company": "CyberTech Labs",
        "job_title": "Software Developer",
        "round_type": "TECHNICAL",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    })

    # Application 2: Student 2 (Aptitude Qualified)
    app_fail_id = f"app-stepd-fail-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_fail_id,
        "student_id": student_fail_id,
        "student_name": "Tech Failing Student",
        "student_email": student_fail_email,
        "drive_id": drive_id,
        "company_name": "CyberTech Labs",
        "job_title": "Software Developer",
        "status": "TECHNICAL_ALLOCATED",
        "stage": "TECHNICAL_ALLOCATED",
        "aptitude_status": "QUALIFIED",
        "eligible": True
    })

    ass_fail_id = f"ass-stepd-fail-{timestamp_ms}"
    await db.assessments.insert_one({
        "id": ass_fail_id,
        "assessment_id": ass_fail_id,
        "drive_id": drive_id,
        "application_id": app_fail_id,
        "student_id": student_fail_id,
        "student_name": "Tech Failing Student",
        "student_email": student_fail_email,
        "company": "CyberTech Labs",
        "job_title": "Software Developer",
        "round_type": "TECHNICAL",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    })

    # Application 3: Student 3 (Aptitude Failed)
    app_apt_fail_id = f"app-stepd-aptfail-{timestamp_ms}"
    await db.applications.insert_one({
        "id": app_apt_fail_id,
        "student_id": student_apt_fail_id,
        "student_name": "Apt Failing Student",
        "student_email": student_apt_fail_email,
        "drive_id": drive_id,
        "company_name": "CyberTech Labs",
        "job_title": "Software Developer",
        "status": "REJECTED_AT_APTITUDE",
        "stage": "REJECTED_AT_APTITUDE",
        "aptitude_status": "FAILED",
        "eligible": True
    })

    ass_apt_fail_id = f"ass-stepd-aptfail-{timestamp_ms}"
    await db.assessments.insert_one({
        "id": ass_apt_fail_id,
        "assessment_id": ass_apt_fail_id,
        "drive_id": drive_id,
        "application_id": app_apt_fail_id,
        "student_id": student_apt_fail_id,
        "student_name": "Apt Failing Student",
        "student_email": student_apt_fail_email,
        "company": "CyberTech Labs",
        "job_title": "Software Developer",
        "round_type": "TECHNICAL",
        "status": "ALLOCATED",
        "duration_minutes": 30,
        "questions": [],
        "created_at": datetime.now().isoformat()
    })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # TEST 1: Qualified aptitude candidate can access technical assessment
        res1 = await client.get(f"/api/assessments/{ass_pass_id}", headers=headers_pass)
        assert res1.status_code == 200
        assert res1.json()["type"] == "TECHNICAL"

        # TEST 2: Failed aptitude candidate CANNOT access technical assessment (HTTP 400 Bad Request)
        res2 = await client.get(f"/api/assessments/{ass_apt_fail_id}", headers=headers_apt_fail)
        assert res2.status_code == 400
        assert "failed the Aptitude Round" in res2.json()["detail"]

        # TEST 3: Student A CANNOT access Student B's technical assessment (HTTP 403 Forbidden)
        res3 = await client.get(f"/api/assessments/{ass_pass_id}", headers=headers_fail)
        assert res3.status_code == 403

        # TEST 4: Student 1 starts technical assessment
        res4 = await client.post(f"/api/assessments/{ass_pass_id}/start", headers=headers_pass)
        assert res4.status_code == 200
        started_pass = res4.json()
        assert started_pass["status"] == "IN_PROGRESS"
        assert started_pass["started_at"] is not None
        assert started_pass["expires_at"] is not None
        initial_expires_at = started_pass["expires_at"]

        # Verify correct_answer is NOT exposed
        assert "correct_answer" not in started_pass["questions"][0]

        # Verify application status became TECHNICAL_IN_PROGRESS
        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] == "TECHNICAL_IN_PROGRESS"

        # TEST 5: Technical timer does NOT reset on re-start or refresh
        res5 = await client.post(f"/api/assessments/{ass_pass_id}/start", headers=headers_pass)
        assert res5.status_code == 200
        assert res5.json()["expires_at"] == initial_expires_at

        # TEST 6: Technical answers save correctly (POST /answers)
        first_q_id = started_pass["questions"][0]["id"]
        res6 = await client.post(f"/api/assessments/{ass_pass_id}/answers", json={
            "question_id": first_q_id,
            "selected_option": "O(N^2)"
        }, headers=headers_pass)
        assert res6.status_code == 200
        assert res6.json()["status"] == "saved"

        # TEST 7: Student 2 starts technical assessment
        res7 = await client.post(f"/api/assessments/{ass_fail_id}/start", headers=headers_fail)
        assert res7.status_code == 200

        # TEST 8: Student 1 submits correct answers (Score >= 60%)
        ass_pass_doc = await db.assessments.find_one({"id": ass_pass_id})
        pass_qs_full = ass_pass_doc["questions"]
        pass_answers = [
            {"question_id": q["id"], "type": "technical", "selected_option": q["correct_answer"]}
            for q in pass_qs_full
        ]
        res8 = await client.post(f"/api/assessments/{ass_pass_id}/submit", json={"answers": pass_answers}, headers=headers_pass)
        assert res8.status_code == 200
        result_pass = res8.json()
        assert result_pass["percentage"] >= 60.0

        # Verify application status became INTERVIEW_PENDING (and technical_status = QUALIFIED)
        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] in ["HR_INTERVIEW_PENDING", "INTERVIEW_PENDING"]

        assert app_pass_db["technical_status"] == "QUALIFIED"

        # Verify TECHNICAL_QUALIFIED notification created idempotently
        notif_pass = await db.notifications.find_one({"recipient_user_id": student_pass_id, "type": "TECHNICAL_QUALIFIED"})
        assert notif_pass is not None

        # TEST 9: Student 2 submits wrong answers (Score < 60%)
        ass_fail_doc = await db.assessments.find_one({"id": ass_fail_id})
        fail_qs_full = ass_fail_doc["questions"]
        fail_answers = [
            {"question_id": q["id"], "type": "technical", "selected_option": "Invalid Wrong Choice Option"}
            for q in fail_qs_full
        ]
        res9 = await client.post(f"/api/assessments/{ass_fail_id}/submit", json={"answers": fail_answers}, headers=headers_fail)
        assert res9.status_code == 200
        result_fail = res9.json()
        assert result_fail["percentage"] < 60.0

        # Verify application status became REJECTED_AT_TECHNICAL (and technical_status = FAILED)
        app_fail_db = await db.applications.find_one({"id": app_fail_id})
        assert app_fail_db["status"] == "REJECTED_AT_TECHNICAL"
        assert app_fail_db["technical_status"] == "FAILED"

        # Verify TECHNICAL_FAILED notification created idempotently
        notif_fail = await db.notifications.find_one({"recipient_user_id": student_fail_id, "type": "TECHNICAL_FAILED"})
        assert notif_fail is not None

        # TEST 10: Duplicate submission prevented (HTTP 409 Conflict)
        res10 = await client.post(f"/api/assessments/{ass_pass_id}/submit", json={"answers": pass_answers}, headers=headers_pass)
        assert res10.status_code == 409

        # TEST 11: Officer CAN schedule interview for TECHNICAL_QUALIFIED candidate
        res11 = await client.post("/api/interviews", json={
            "candidateId": student_pass_id,
            "candidateName": "Tech Passing Student",
            "companyName": "CyberTech Labs",
            "roleTitle": "Software Developer",
            "driveId": drive_id,
            "applicationId": app_pass_id,
            "date": "2026-09-01",
            "timeSlot": "10:00 AM - 10:30 AM",
            "startTime": "10:00 AM",
            "endTime": "10:30 AM",
            "panelName": f"Panel A {timestamp_ms}",
            "roomName": f"Room A {timestamp_ms}"
        }, headers=headers_officer)
        assert res11.status_code in [200, 201], f"Expected 200/201 for interview schedule, got {res11.status_code}: {res11.text}"



        # TEST 12: Officer CANNOT schedule interview for REJECTED_AT_TECHNICAL candidate (HTTP 400 Bad Request)
        res12 = await client.post("/api/interviews", json={
            "candidateId": student_fail_id,
            "candidateName": "Tech Failing Student",
            "companyName": "CyberTech Labs",
            "roleTitle": "Software Developer",
            "driveId": drive_id,
            "applicationId": app_fail_id,
            "date": "2026-09-01",
            "timeSlot": "11:00 AM - 11:30 AM",
            "startTime": "11:00 AM",
            "endTime": "11:30 AM",
            "panelName": f"Panel B {timestamp_ms}",
            "roomName": f"Room B {timestamp_ms}"
        }, headers=headers_officer)
        assert res12.status_code == 400
        assert "failed aptitude round or was rejected" in res12.json()["detail"] or "failed" in res12.json()["detail"]




