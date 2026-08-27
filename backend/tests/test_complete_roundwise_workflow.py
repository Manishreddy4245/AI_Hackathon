"""
Automated Integration Test Suite for Complete Round-Wise Placement Workflow.
Validates the complete candidate lifecycle:
APTITUDE (Allocate -> Test -> Evaluate -> APTITUDE_QUALIFIED)
  ↓
TECHNICAL (Allocate -> Test -> Evaluate -> TECHNICAL_QUALIFIED / HR_INTERVIEW_PENDING)
  ↓
HR / INTERVIEW (Allocate HR -> Panel + Room + Schedule -> INTERVIEW_SCHEDULED -> Complete -> INTERVIEW_COMPLETED -> Final Decision -> SELECTED / REJECTED)
"""

import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo

from app.core.security import create_access_token
from app.services.pipeline_engine import derive_recruitment_pipeline_stage


@pytest.mark.anyio
async def test_complete_roundwise_workflow_suite():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Clean up previous test interviews & notifications
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-rw"}})
    await db.notifications.delete_many({"recipient_user_id": {"$regex": "^stu-rw"}})

    # Setup Officers
    officer_id = f"officer-rw-{timestamp_ms}"
    token_officer = create_access_token({"sub": officer_id, "id": officer_id, "role": "officer", "name": "Placement Officer"})
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    # Setup Student 1 (Passes all rounds -> Selected)
    stu_pass_id = f"stu-rw-pass-{timestamp_ms}"
    stu_pass_email = f"stu_rw_pass_{timestamp_ms}@campus.edu"
    token_pass = create_access_token({"sub": stu_pass_id, "id": stu_pass_id, "role": "student", "name": "Workflow Student Pass", "email": stu_pass_email})
    headers_pass = {"Authorization": f"Bearer {token_pass}"}
    await db.students.insert_one({
        "id": stu_pass_id,
        "name": "Workflow Student Pass",
        "email": stu_pass_email,
        "cgpa": 9.0,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2026,
        "skills": ["Python", "Algorithms", "SQL"]
    })

    # Setup Student 2 (Fails Technical)
    stu_tech_fail_id = f"stu-rw-techfail-{timestamp_ms}"
    stu_tech_fail_email = f"stu_rw_tfail_{timestamp_ms}@campus.edu"
    token_tech_fail = create_access_token({"sub": stu_tech_fail_id, "id": stu_tech_fail_id, "role": "student", "name": "Workflow Tech Fail", "email": stu_tech_fail_email})
    headers_tech_fail = {"Authorization": f"Bearer {token_tech_fail}"}
    await db.students.insert_one({
        "id": stu_tech_fail_id,
        "name": "Workflow Tech Fail",
        "email": stu_tech_fail_email,
        "cgpa": 8.8,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2026,
        "skills": ["Python", "SQL"]
    })

    # Setup Drive & Applications
    drive_id = f"drive-rw-{timestamp_ms}"
    drive_doc = {
        "id": drive_id,
        "companyName": "Apex Technologies",
        "roleTitle": "Software Development Engineer",
        "minCgpa": 7.0,
        "allowedBranches": ["CSE", "ECE", "IT"],
        "maxBacklogs": 0,
        "status": "APPROVED",
        "rounds": [
            {"id": "r1-apt", "name": "Aptitude Round", "round_type": "APTITUDE", "order": 1},
            {"id": "r2-tech", "name": "Technical Round", "round_type": "TECHNICAL", "order": 2},
            {"id": "r3-hr", "name": "HR / Interview Round", "round_type": "HR", "order": 3, "is_final": True}
        ]
    }
    await db.drives.insert_one(drive_doc)

    app_pass_id = f"app-{stu_pass_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app_pass_id,
        "student_id": stu_pass_id,
        "student_name": "Workflow Student Pass",
        "student_email": stu_pass_email,
        "drive_id": drive_id,
        "company_name": "Apex Technologies",
        "job_title": "Software Development Engineer",
        "status": "SHORTLISTED",
        "stage": "SHORTLISTED",
        "eligible": True
    })

    app_tfail_id = f"app-{stu_tech_fail_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app_tfail_id,
        "student_id": stu_tech_fail_id,
        "student_name": "Workflow Tech Fail",
        "student_email": stu_tech_fail_email,
        "drive_id": drive_id,
        "company_name": "Apex Technologies",
        "job_title": "Software Development Engineer",
        "status": "SHORTLISTED",
        "stage": "SHORTLISTED",
        "eligible": True
    })

    # Setup Active Panel and Room for Interview Scheduling
    panel_id = f"panel-rw-{timestamp_ms}"
    await db.panels.insert_one({
        "id": panel_id,
        "name": f"Senior HR Panel {timestamp_ms}",
        "members": ["HR Director", "Lead Recruiter"],
        "isActive": True
    })

    room_id = f"room-rw-{timestamp_ms}"
    await db.rooms.insert_one({
        "id": room_id,
        "name": f"Executive Suite {timestamp_ms}",
        "block": "Block C",
        "room_number": "301",
        "is_available": True
    })

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # =============================================================
        # 1. APTITUDE ROUND
        # =============================================================

        # Step 1.1: Officer Allocates Aptitude to Student Pass
        res1 = await client.post(f"/api/applications/{app_pass_id}/allocate-aptitude", json={}, headers=headers_officer)
        assert res1.status_code == 200

        # Verify APTITUDE_ALLOCATED notification
        notif_apt = await db.notifications.find_one({"recipient_user_id": stu_pass_id, "type": "APTITUDE_ALLOCATED"})
        assert notif_apt is not None

        # Verify Student 1 starts Aptitude assessment
        ass_apt_doc = await db.assessments.find_one({"student_id": stu_pass_id, "round_type": "APTITUDE"})
        ass_apt_id = ass_apt_doc["id"]

        res_start_apt = await client.post(f"/api/assessments/{ass_apt_id}/start", headers=headers_pass)
        assert res_start_apt.status_code == 200

        # Step 1.2: Student Pass submits correct answers (Score >= 60%)
        ass_apt_doc = await db.assessments.find_one({"id": ass_apt_id})
        apt_answers = [{"question_id": q["id"], "type": "aptitude", "selected_option": q["correct_answer"]} for q in ass_apt_doc["questions"]]
        res_sub_apt = await client.post(f"/api/assessments/{ass_apt_id}/submit", json={"answers": apt_answers}, headers=headers_pass)
        assert res_sub_apt.status_code == 200

        # Verify application status became APTITUDE_QUALIFIED
        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] == "APTITUDE_QUALIFIED"
        assert app_pass_db["aptitude_status"] == "QUALIFIED"

        # Verify backend filtering: ?round_type=APTITUDE returns ONLY aptitude assessment
        res_flt_apt = await client.get("/api/assessments/student/me?round_type=APTITUDE", headers=headers_pass)
        assert res_flt_apt.status_code == 200
        for item in res_flt_apt.json():
            assert (item.get("round_type") or "APTITUDE") == "APTITUDE"

        # =============================================================
        # 2. TECHNICAL ROUND
        # =============================================================

        # Step 2.1: Officer Allocates Technical Round for Student Pass
        res_alloc_tech = await client.post(f"/api/applications/{app_pass_id}/allocate-technical", json={}, headers=headers_officer)
        assert res_alloc_tech.status_code == 200

        # Verify TECHNICAL_ALLOCATED notification
        notif_tech = await db.notifications.find_one({"recipient_user_id": stu_pass_id, "type": "TECHNICAL_ALLOCATED"})
        assert notif_tech is not None

        # Verify Student Pass starts Technical test
        ass_tech_doc = await db.assessments.find_one({"student_id": stu_pass_id, "round_type": "TECHNICAL"})
        ass_tech_id = ass_tech_doc["id"]

        res_start_tech = await client.post(f"/api/assessments/{ass_tech_id}/start", headers=headers_pass)
        assert res_start_tech.status_code == 200

        # Verify backend filtering: ?round_type=TECHNICAL returns ONLY technical assessment
        res_flt_tech = await client.get("/api/assessments/student/me?round_type=TECHNICAL", headers=headers_pass)
        assert res_flt_tech.status_code == 200
        for item in res_flt_tech.json():
            assert item.get("round_type") == "TECHNICAL"

        # Step 2.2: Student Pass submits correct Technical answers (Score >= 60%)
        ass_tech_doc = await db.assessments.find_one({"id": ass_tech_id})
        tech_answers = [{"question_id": q["id"], "type": "technical", "selected_option": q["correct_answer"]} for q in ass_tech_doc["questions"]]
        res_sub_tech = await client.post(f"/api/assessments/{ass_tech_id}/submit", json={"answers": tech_answers}, headers=headers_pass)
        assert res_sub_tech.status_code == 200

        # Verify application status became INTERVIEW_PENDING and technical_status == QUALIFIED
        app_pass_db = await db.applications.find_one({"id": app_pass_id})
        assert app_pass_db["status"] in ["HR_INTERVIEW_PENDING", "INTERVIEW_PENDING"]

        assert app_pass_db["technical_status"] == "QUALIFIED"

        # Step 2.3: Student 2 (Tech Fail) attempts & fails Technical
        await client.post(f"/api/applications/{app_tfail_id}/allocate-aptitude", json={}, headers=headers_officer)
        ass_tfail_apt = await db.assessments.find_one({"student_id": stu_tech_fail_id, "round_type": "APTITUDE"})
        await client.post(f"/api/assessments/{ass_tfail_apt['id']}/start", headers=headers_tech_fail)
        ass_tfail_apt = await db.assessments.find_one({"id": ass_tfail_apt["id"]})
        tfail_apt_answers = [{"question_id": q["id"], "type": "aptitude", "selected_option": q["correct_answer"]} for q in ass_tfail_apt["questions"]]
        await client.post(f"/api/assessments/{ass_tfail_apt['id']}/submit", json={"answers": tfail_apt_answers}, headers=headers_tech_fail)

        # Allocate Technical to Student 2 & submit wrong answers
        await client.post(f"/api/applications/{app_tfail_id}/allocate-technical", json={}, headers=headers_officer)
        ass_tfail_tech = await db.assessments.find_one({"student_id": stu_tech_fail_id, "round_type": "TECHNICAL"})
        await client.post(f"/api/assessments/{ass_tfail_tech['id']}/start", headers=headers_tech_fail)
        ass_tfail_tech = await db.assessments.find_one({"id": ass_tfail_tech["id"]})
        tfail_wrong_answers = [{"question_id": q["id"], "type": "technical", "selected_option": "Wrong Choice"} for q in ass_tfail_tech["questions"]]
        await client.post(f"/api/assessments/{ass_tfail_tech['id']}/submit", json={"answers": tfail_wrong_answers}, headers=headers_tech_fail)


        # Verify Student 2 application status became REJECTED_AT_TECHNICAL
        app_tfail_db = await db.applications.find_one({"id": app_tfail_id})
        assert app_tfail_db["status"] == "REJECTED_AT_TECHNICAL"

        # Verify Student 2 CANNOT receive HR Round Allocation (HTTP 400 Bad Request)
        res_hr_fail = await client.post(f"/api/applications/{app_tfail_id}/allocate-hr", json={}, headers=headers_officer)
        assert res_hr_fail.status_code == 400
        assert "failed the Technical Round" in res_hr_fail.json()["detail"]

        # =============================================================
        # 3. HR / INTERVIEW ROUND (HR IS THE INTERVIEW)
        # =============================================================

        # Step 3.1: Officer Allocates HR / Interview Round for Student Pass
        res_alloc_hr = await client.post(f"/api/applications/{app_pass_id}/allocate-hr", json={}, headers=headers_officer)
        assert res_alloc_hr.status_code == 200
        assert res_alloc_hr.json()["status"] == "HR_INTERVIEW_ALLOCATED"

        # Verify HR_INTERVIEW_ALLOCATED notification
        notif_hr = await db.notifications.find_one({"recipient_user_id": stu_pass_id, "type": "HR_INTERVIEW_ALLOCATED"})
        assert notif_hr is not None

        # Verify Interview document created with round="HR" and status="ALLOCATED"
        int_doc = await db.interviews.find_one({"candidateId": stu_pass_id, "driveId": drive_id})
        assert int_doc is not None
        assert int_doc["round"] == "HR"
        assert int_doc["status"] == "ALLOCATED"

        # =============================================================
        # 4. PANEL + ROOM + SCHEDULING
        # =============================================================

        date_val = "2026-09-20"
        time_slot = "02:00 PM - 02:30 PM"
        panel_name = f"Senior HR Panel {timestamp_ms}"
        room_name = f"Executive Suite {timestamp_ms}"

        # Step 4.1: Officer Schedules HR Interview with Panel + Room + Date + Time
        res_sched = await client.post("/api/interviews", json={
            "candidateId": stu_pass_id,
            "candidateName": "Workflow Student Pass",
            "companyName": "Apex Technologies",
            "roleTitle": "Software Development Engineer",
            "driveId": drive_id,
            "applicationId": app_pass_id,
            "date": date_val,
            "timeSlot": time_slot,
            "startTime": "02:00 PM",
            "endTime": "02:30 PM",
            "panelName": panel_name,
            "roomName": room_name
        }, headers=headers_officer)
        assert res_sched.status_code in [200, 201]

        # Verify application status became INTERVIEW_SCHEDULED
        app_sched_db = await db.applications.find_one({"id": app_pass_id})
        assert app_sched_db["status"] == "INTERVIEW_SCHEDULED"

        # Verify INTERVIEW_SCHEDULED notification
        notif_sched = await db.notifications.find_one({"recipient_user_id": stu_pass_id, "type": "INTERVIEW_SCHEDULED"})
        assert notif_sched is not None

        # Step 4.2: Conflict Detection Verification (Panel Conflict on Same Slot)
        res_conf = await client.post("/api/interviews", json={
            "candidateId": f"stu-conf-{timestamp_ms}",
            "candidateName": "Conflict Student",
            "companyName": "Apex Technologies",
            "roleTitle": "Software Development Engineer",
            "driveId": drive_id,
            "date": date_val,
            "timeSlot": time_slot,
            "startTime": "02:00 PM",
            "endTime": "02:30 PM",
            "panelName": panel_name,
            "roomName": f"Different Room {timestamp_ms}"
        }, headers=headers_officer)
        assert res_conf.status_code == 409
        assert "Panel Conflict" in res_conf.json()["detail"] or "Conflict" in res_conf.json()["detail"]

        # =============================================================
        # 5. INTERVIEW COMPLETION & FINAL DECISION
        # =============================================================

        int_sched_doc = await db.interviews.find_one({"candidateId": stu_pass_id, "driveId": drive_id})
        int_sched_id = int_sched_doc["id"]

        # Step 5.1: Officer Marks Interview Status as COMPLETED
        res_comp = await client.patch(f"/api/interviews/{int_sched_id}/status", json={"status": "COMPLETED"})
        assert res_comp.status_code == 200

        # Verify application status became INTERVIEW_COMPLETED
        app_comp_db = await db.applications.find_one({"id": app_pass_id})
        assert app_comp_db["status"] == "INTERVIEW_COMPLETED"
        assert app_comp_db["hr_status"] == "COMPLETED"

        # Verify pipeline stage calculation returns INTERVIEW_COMPLETED with canMakeFinalDecision: True
        stage_comp = derive_recruitment_pipeline_stage(
            {"id": stu_pass_id, "name": "Workflow Student Pass", "cgpa": 9.0, "branch": "CSE"},
            drive_doc,
            app_comp_db,
            int_sched_doc
        )
        assert stage_comp["stage"] == "INTERVIEW_COMPLETED"
        assert stage_comp["canMakeFinalDecision"] is True

        # Step 5.2: Officer Makes Final Decision -> SELECTED
        res_select = await client.patch(f"/api/interviews/{int_sched_id}/status", json={"status": "SELECTED"})
        assert res_select.status_code == 200

        # Verify final application status became SELECTED
        app_sel_db = await db.applications.find_one({"id": app_pass_id})
        assert app_sel_db["status"] == "SELECTED"

        # Verify FINAL_SELECTION notification
        notif_sel = await db.notifications.find_one({"recipient_user_id": stu_pass_id, "type": "FINAL_SELECTION"})
        assert notif_sel is not None
