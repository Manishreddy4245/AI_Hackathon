"""
Focused E2E Test Suite for Technical Qualified -> HR / Interview Scheduling Flow.
Validates:
1. Create application
2. Allocate Technical
3. Complete Technical & Mark Result PASS
4. Verify application round_evaluations (TECHNICAL -> PASSED, HR -> PENDING)
5. Verify HR round becomes PENDING & current_round_id updated
6. Call HR eligible candidates API -> Verify candidate returned for selected drive
7. Technical FAIL -> Candidate NOT returned
8. Different drive -> Candidate NOT returned
9. Allocate HR / Interview
10. Schedule interview
11. Verify interview.status = SCHEDULED
12. Verify application stage = INTERVIEW_SCHEDULED & Already scheduled candidate NOT returned
"""

import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token
from app.services.pipeline_engine import derive_recruitment_pipeline_stage
from app.routes.drives import _get_or_init_drive_rounds


@pytest.mark.anyio
async def test_hr_interview_scheduling_flow_e2e_full():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Cleanup
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-e2e-hr"}})
    await db.assessments.delete_many({"student_id": {"$regex": "^stu-e2e-hr"}})
    await db.applications.delete_many({"student_id": {"$regex": "^stu-e2e-hr"}})
    await db.students.delete_many({"id": {"$regex": "^stu-e2e-hr"}})
    await db.drives.delete_many({"id": {"$regex": "^drive-e2e-hr"}})

    # Setup Drives
    drive_a_id = f"drive-e2e-hr-a-{timestamp_ms}"
    drive_b_id = f"drive-e2e-hr-b-{timestamp_ms}"

    await db.drives.insert_one({
        "id": drive_a_id,
        "companyName": "ByteXL",
        "roleTitle": "React Developer",
        "packageLpa": 12.0,
        "status": "APPROVED"
    })
    await db.drives.insert_one({
        "id": drive_b_id,
        "companyName": "OmniTech",
        "roleTitle": "Backend Engineer",
        "packageLpa": 14.0,
        "status": "APPROVED"
    })

    # Initialize drive rounds via canonical drive rounds function
    rounds_a = await _get_or_init_drive_rounds(db, drive_a_id)
    tech_round_a_id = rounds_a[1]["id"]
    hr_round_a_id = rounds_a[2]["id"]

    # 1. Create Application for Student A (ByteXL Drive)
    stu_a_id = f"stu-e2e-hr-a-{timestamp_ms}"
    app_a_id = f"app-{stu_a_id}-{drive_a_id}"

    await db.students.insert_one({
        "id": stu_a_id,
        "name": "Rahul Verma",
        "email": f"rahul_{timestamp_ms}@campus.edu",
        "rollNumber": "CS991",
        "branch": "CSE",
        "cgpa": 8.8,
        "graduationYear": 2027,
        "placementStatus": "unplaced",
        "status": "active"
    })
    await db.applications.insert_one({
        "id": app_a_id,
        "student_id": stu_a_id,
        "drive_id": drive_a_id,
        "company_name": "ByteXL",
        "job_title": "React Developer",
        "student_name": "Rahul Verma",
        "student_email": f"rahul_{timestamp_ms}@campus.edu",
        "status": "APTITUDE_QUALIFIED",
        "stage": "APTITUDE_QUALIFIED",
        "pipeline_stage": "APTITUDE_QUALIFIED",
        "aptitude_status": "QUALIFIED",
        "round_evaluations": {
            rounds_a[0]["id"]: {"status": "PASSED", "score": 90.0}
        }
    })

    # 2. Student B (Technical Fail on Drive A)
    stu_b_id = f"stu-e2e-hr-b-{timestamp_ms}"
    app_b_id = f"app-{stu_b_id}-{drive_a_id}"
    await db.students.insert_one({"id": stu_b_id, "name": "Failing Student", "email": f"fail_{timestamp_ms}@campus.edu", "rollNumber": "CS992", "branch": "CSE", "cgpa": 7.0, "placementStatus": "unplaced", "status": "active"})
    await db.applications.insert_one({
        "id": app_b_id,
        "student_id": stu_b_id,
        "drive_id": drive_a_id,
        "company_name": "ByteXL",
        "job_title": "React Developer",
        "student_name": "Failing Student",
        "status": "REJECTED_AT_TECHNICAL",
        "stage": "REJECTED_AT_TECHNICAL",
        "pipeline_stage": "REJECTED_AT_TECHNICAL",
        "aptitude_status": "QUALIFIED",
        "technical_status": "FAILED",
        "round_evaluations": {
            tech_round_a_id: {"status": "REJECTED", "score": 30.0}
        }
    })

    # 3. Student C (Technical Qualified on Drive B)
    stu_c_id = f"stu-e2e-hr-c-{timestamp_ms}"
    app_c_id = f"app-{stu_c_id}-{drive_b_id}"
    await db.students.insert_one({"id": stu_c_id, "name": "Other Drive Student", "email": f"other_{timestamp_ms}@campus.edu", "rollNumber": "CS993", "branch": "CSE", "cgpa": 8.5, "placementStatus": "unplaced", "status": "active"})
    await db.applications.insert_one({
        "id": app_c_id,
        "student_id": stu_c_id,
        "drive_id": drive_b_id,
        "company_name": "OmniTech",
        "job_title": "Backend Engineer",
        "student_name": "Other Drive Student",
        "status": "HR_INTERVIEW_PENDING",
        "stage": "HR_INTERVIEW_PENDING",
        "pipeline_stage": "HR_INTERVIEW_PENDING",
        "aptitude_status": "QUALIFIED",
        "technical_status": "QUALIFIED"
    })

    officer_token = create_access_token({"sub": "usr-admin-demo", "id": "usr-admin-demo", "role": "placement_officer", "name": "Placement Officer"})
    headers = {"Authorization": f"Bearer {officer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # Step 2: Allocate Technical to Student A
        res_alloc_tech = await client.post(f"/api/applications/{app_a_id}/allocate-technical", headers=headers)
        assert res_alloc_tech.status_code in [200, 201]

        # Step 3 & 4 & 5: Complete Technical test for Student A and submit passing score
        ass_doc = await db.assessments.find_one({"$or": [{"application_id": app_a_id}, {"applicationId": app_a_id}]})
        assert ass_doc is not None, "Technical assessment document should be created by allocate-technical"
        ass_id = ass_doc["id"]

        question_id = "q-tech-dsa-001"
        await db.assessments.update_one({"id": ass_id}, {"$set": {
            "questions": [{
                "id": question_id,
                "type": "technical",
                "topic": "Data Structures",
                "difficulty": "Easy",
                "question": "What is the time complexity of binary search?",
                "options": ["O(N)", "O(log N)", "O(N^2)", "O(1)"],
                "correct_answer": "O(log N)",
                "points": 10
            }]
        }})

        student_token = create_access_token({"sub": stu_a_id, "id": stu_a_id, "role": "student", "name": "Rahul Verma"})
        res_sub = await client.post(f"/api/assessments/{ass_id}/submit", json={
            "answers": [{
                "question_id": question_id,
                "type": "technical",
                "selected_option": "O(log N)"
            }],
            "time_taken_seconds": 120
        }, headers={"Authorization": f"Bearer {student_token}"})

        assert res_sub.status_code in [200, 201]


        # Verify application round_evaluations and stage transitions (Steps 4 & 5)
        app_doc_after_tech = await db.applications.find_one({"id": app_a_id}, {"_id": 0})
        print("ROUND EVALS AFTER TECH SUBMIT:", app_doc_after_tech.get("round_evaluations"))
        assert app_doc_after_tech["technical_status"] == "QUALIFIED"
        assert app_doc_after_tech["status"] in ["HR_INTERVIEW_PENDING", "INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED"]
        assert app_doc_after_tech["round_evaluations"][tech_round_a_id]["status"] == "PASSED"
        assert app_doc_after_tech["round_evaluations"][hr_round_a_id]["status"] == "PENDING"
        assert app_doc_after_tech["current_round_id"] == hr_round_a_id


        # Step 6, 7, 8: Call HR eligible candidates API for Drive A
        res_elig = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_a_id}", headers=headers)
        assert res_elig.status_code == 200
        cands = res_elig.json()
        cand_names = [c["name"] for c in cands]

        assert "Rahul Verma" in cand_names  # Step 6 PASSED
        assert "Failing Student" not in cand_names  # Step 7 PASSED (Technical FAIL excluded)
        assert "Other Drive Student" not in cand_names  # Step 8 PASSED (Different drive excluded)

        # Step 9: Allocate HR / Interview
        res_alloc_hr = await client.post(f"/api/applications/{app_a_id}/allocate-hr", headers=headers)
        assert res_alloc_hr.status_code in [200, 201]

        # Step 10: Schedule interview
        res_sched = await client.post("/api/interviews", json={
            "candidateId": stu_a_id,
            "candidateName": "Rahul Verma",
            "companyName": "ByteXL",
            "roleTitle": "React Developer",
            "driveId": drive_a_id,
            "applicationId": app_a_id,
            "round": "HR",
            "date": "2026-09-10",
            "timeSlot": "02:00 PM - 02:45 PM",
            "startTime": "02:00 PM",
            "endTime": "02:45 PM",
            "panelName": "ByteXL Panel 2",
            "roomName": "Room 303"
        }, headers=headers)

        assert res_sched.status_code in [200, 201]

        # Step 11 & 12: Verify interview.status == SCHEDULED and application.stage == INTERVIEW_SCHEDULED
        int_doc = await db.interviews.find_one({"candidateId": stu_a_id, "driveId": drive_a_id}, {"_id": 0})
        assert int_doc["status"].lower() == "scheduled"

        app_doc_final = await db.applications.find_one({"id": app_a_id}, {"_id": 0})
        assert app_doc_final["status"] == "INTERVIEW_SCHEDULED"
        assert app_doc_final["stage"] == "INTERVIEW_SCHEDULED"

        # Verify already scheduled candidate is no longer returned in eligible candidates list
        res_elig_final = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_a_id}", headers=headers)
        assert len(res_elig_final.json()) == 0
