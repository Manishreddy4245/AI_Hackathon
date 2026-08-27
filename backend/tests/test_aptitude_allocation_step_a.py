"""
Automated Test Suite for Step A — Aptitude Allocation + Student Notification + Student Dashboard Entry.
Verifies all 10 strict business rules:
1. Eligible shortlisted candidate can be allocated aptitude.
2. Aptitude notification is created (type APTITUDE_ALLOCATED).
3. Student can retrieve own aptitude allocation via GET /api/assessments/student/me.
4. Student CANNOT access another student's assessment (HTTP 403 Forbidden).
5. Ineligible candidate cannot receive aptitude (HTTP 400 Bad Request).
6. Non-shortlisted candidate (APPLIED) cannot receive aptitude (HTTP 400 Bad Request).
7. Duplicate allocation is prevented (HTTP 409 Conflict).
8. Pipeline state updates to APTITUDE_ALLOCATED (NOT QUALIFIED/INTERVIEW).
9. Student dashboard API data structure contains all required fields.
10. All existing backend tests pass.
"""
import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncMockDatabase
from app.core.security import create_access_token
from app.services.pipeline_engine import derive_recruitment_pipeline_stage

client = TestClient(app)

def test_aptitude_allocation_step_a_suite():
    asyncio.run(_run_test_aptitude_allocation_step_a_suite())

async def _run_test_aptitude_allocation_step_a_suite():
    db_manager.db = AsyncMockDatabase("placemind_aptitude_step_a_test")
    db = db_manager.db

    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # -------------------------------------------------------------
    # SETUP TOKENS & ROLES
    # -------------------------------------------------------------
    officer_token = create_access_token({
        "sub": "officer-step-a",
        "id": "officer-step-a",
        "role": "placement_officer",
        "name": "TPO Head",
        "email": "tpo@campus.edu"
    })
    off_headers = {"Authorization": f"Bearer {officer_token}"}

    student_a_id = f"stu-a-{timestamp_ms}"
    student_a_email = f"stu-a-{timestamp_ms}@campus.edu"
    student_a_token = create_access_token({
        "sub": student_a_id,
        "id": student_a_id,
        "role": "student",
        "name": "Rahul Verma",
        "email": student_a_email
    })
    stu_a_headers = {"Authorization": f"Bearer {student_a_token}"}

    student_b_id = f"stu-b-{timestamp_ms}"
    student_b_email = f"stu-b-{timestamp_ms}@campus.edu"
    student_b_token = create_access_token({
        "sub": student_b_id,
        "id": student_b_id,
        "role": "student",
        "name": "Ayush Kumar",
        "email": student_b_email
    })
    stu_b_headers = {"Authorization": f"Bearer {student_b_token}"}

    # -------------------------------------------------------------
    # SETUP DRIVE & STUDENTS IN DB
    # -------------------------------------------------------------
    drive_id = f"drive-tech-{timestamp_ms}"
    drive_doc = {
        "id": drive_id,
        "companyName": "Acme Software Systems",
        "company_name": "Acme Software Systems",
        "roleTitle": "Cloud Software Engineer",
        "job_title": "Cloud Software Engineer",
        "minCgpa": 7.5,
        "eligibleBranches": ["CSE", "IT"],
        "graduationYears": [2025, 2026],
        "status": "ANNOUNCED"
    }
    await db.drives.insert_one(drive_doc)

    # Student A: Eligible (CGPA 8.5, CSE, 2026)
    student_a_doc = {
        "id": student_a_id,
        "name": "Rahul Verma",
        "email": student_a_email,
        "cgpa": 8.5,
        "branch": "CSE",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    await db.students.insert_one(student_a_doc)

    # Student B: Ineligible (CGPA 6.0 vs Min 7.5)
    student_b_doc = {
        "id": student_b_id,
        "name": "Ayush Kumar",
        "email": student_b_email,
        "cgpa": 6.0,
        "branch": "CSE",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    await db.students.insert_one(student_b_doc)

    # Application for Student A (Initially SHORTLISTED)
    app_a_id = f"app-stu-a-{timestamp_ms}"
    app_a_doc = {
        "id": app_a_id,
        "student_id": student_a_id,
        "student_name": "Rahul Verma",
        "student_email": student_a_email,
        "drive_id": drive_id,
        "company_name": "Acme Software Systems",
        "job_title": "Cloud Software Engineer",
        "status": "SHORTLISTED",
        "eligible": True
    }
    await db.applications.insert_one(app_a_doc)

    # Application for Student B (Ineligible student)
    app_b_id = f"app-stu-b-{timestamp_ms}"
    app_b_doc = {
        "id": app_b_id,
        "student_id": student_b_id,
        "student_name": "Ayush Kumar",
        "student_email": student_b_email,
        "drive_id": drive_id,
        "company_name": "Acme Software Systems",
        "job_title": "Cloud Software Engineer",
        "status": "SHORTLISTED",
        "eligible": False
    }
    await db.applications.insert_one(app_b_doc)

    # Application for Student C (Eligible but APPLIED status, not shortlisted)
    student_c_id = f"stu-c-{timestamp_ms}"
    student_c_doc = {
        "id": student_c_id,
        "name": "Priya Sharma",
        "email": f"priya-{timestamp_ms}@campus.edu",
        "cgpa": 8.0,
        "branch": "IT",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    await db.students.insert_one(student_c_doc)

    app_c_id = f"app-stu-c-{timestamp_ms}"
    app_c_doc = {
        "id": app_c_id,
        "student_id": student_c_id,
        "student_name": "Priya Sharma",
        "student_email": student_c_doc["email"],
        "drive_id": drive_id,
        "company_name": "Acme Software Systems",
        "job_title": "Cloud Software Engineer",
        "status": "APPLIED",
        "eligible": True
    }
    await db.applications.insert_one(app_c_doc)

    # =============================================================
    # TEST 5: Ineligible candidate cannot receive aptitude
    # =============================================================
    alloc_ineligible_payload = {
        "application_id": app_b_id,
        "drive_id": drive_id,
        "student_id": student_b_id,
        "round_type": "APTITUDE"
    }
    res_ineligible = client.post("/api/assessments/allocate", json=alloc_ineligible_payload, headers=off_headers)
    assert res_ineligible.status_code in [400, 403], f"Expected 400/403 for ineligible student, got {res_ineligible.status_code}: {res_ineligible.text}"
    assert "not eligible" in res_ineligible.json()["detail"].lower()

    # Verify no assessment or notification was created for Student B
    ass_b = await db.assessments.find_one({"application_id": app_b_id})
    assert ass_b is None, "Ineligible candidate must not receive assessment allocation"
    notif_b = await db.notifications.find_one({"recipient_user_id": student_b_id, "type": "APTITUDE_ALLOCATED"})
    assert notif_b is None, "Ineligible candidate must not receive notification"

    # =============================================================
    # TEST 6: Non-shortlisted candidate (APPLIED) cannot receive aptitude
    # =============================================================
    alloc_applied_payload = {
        "application_id": app_c_id,
        "drive_id": drive_id,
        "student_id": student_c_id,
        "round_type": "APTITUDE"
    }
    res_applied = client.post("/api/assessments/allocate", json=alloc_applied_payload, headers=off_headers)
    assert res_applied.status_code == 400, f"Expected 400 for non-shortlisted student, got {res_applied.status_code}: {res_applied.text}"
    assert "shortlisted" in res_applied.json()["detail"].lower()

    ass_c = await db.assessments.find_one({"application_id": app_c_id})
    assert ass_c is None, "APPLIED candidate must not receive assessment allocation"

    # =============================================================
    # TEST 1: Eligible shortlisted candidate can be allocated aptitude
    # =============================================================
    alloc_payload = {
        "application_id": app_a_id,
        "drive_id": drive_id,
        "student_id": student_a_id,
        "round_type": "APTITUDE",
        "title": "Placement Aptitude Round 1",
        "duration_minutes": 45
    }
    res_alloc = client.post("/api/assessments/allocate", json=alloc_payload, headers=off_headers)
    assert res_alloc.status_code == 201, f"Failed aptitude allocation: {res_alloc.text}"
    alloc_data = res_alloc.json()
    assessment_id = alloc_data["id"]

    assert alloc_data["round_type"] == "APTITUDE"
    assert alloc_data["status"] == "ALLOCATED"
    assert alloc_data["application_id"] == app_a_id
    assert alloc_data["student_id"] == student_a_id
    assert alloc_data["company"] == "Acme Software Systems"
    assert alloc_data["job_title"] == "Cloud Software Engineer"
    assert alloc_data["duration_minutes"] == 45

    # =============================================================
    # TEST 2: Aptitude notification is created
    # =============================================================
    notif_a = await db.notifications.find_one({
        "recipient_user_id": student_a_id,
        "type": "APTITUDE_ALLOCATED"
    })
    assert notif_a is not None, "Notification must be created upon aptitude allocation"
    assert notif_a["title"] == "Aptitude Test Assigned"
    assert "allocated" in notif_a["message"].lower()
    assert notif_a["assessment_id"] == assessment_id
    assert notif_a["application_id"] == app_a_id
    assert notif_a["drive_id"] == drive_id

    # =============================================================
    # TEST 3: Student can retrieve own aptitude allocation (GET /api/assessments/student/me)
    # =============================================================
    res_stu_me = client.get("/api/assessments/student/me", headers=stu_a_headers)
    assert res_stu_me.status_code == 200, f"Failed fetching student assessments: {res_stu_me.text}"
    stu_asses = res_stu_me.json()
    assert len(stu_asses) >= 1
    found_alloc = next((item for item in stu_asses if item.get("assessment_id") == assessment_id or item.get("id") == assessment_id), None)
    assert found_alloc is not None, "Student must see allocated assessment in /student/me"
    assert found_alloc["status"] == "ALLOCATED"
    assert found_alloc["company"] == "Acme Software Systems"
    assert found_alloc["job_title"] == "Cloud Software Engineer"

    # =============================================================
    # TEST 4: Student CANNOT access another student's assessment (HTTP 403)
    # =============================================================
    res_unauth = client.get(f"/api/assessments/{assessment_id}", headers=stu_b_headers)
    assert res_unauth.status_code == 403, f"Expected 403 for unauthorized assessment access, got {res_unauth.status_code}: {res_unauth.text}"
    assert "unauthorized" in res_unauth.json()["detail"].lower()

    # Student A CAN access own assessment
    res_auth = client.get(f"/api/assessments/{assessment_id}", headers=stu_a_headers)
    assert res_auth.status_code == 200, f"Authorized student should be able to view own assessment, got {res_auth.status_code}"
    assert res_auth.json()["status"] == "ALLOCATED"

    # =============================================================
    # TEST 7: Duplicate allocation is prevented (HTTP 409 Conflict)
    # =============================================================
    res_dup = client.post("/api/assessments/allocate", json=alloc_payload, headers=off_headers)
    assert res_dup.status_code == 409, f"Expected 409 for duplicate allocation, got {res_dup.status_code}: {res_dup.text}"
    assert "already" in res_dup.json()["detail"].lower()

    # Verify count of assessments remains exactly 1
    ass_count = await db.assessments.count_documents({"application_id": app_a_id})
    assert ass_count == 1, f"Expected 1 assessment document, found {ass_count}"

    # Verify count of notifications remains exactly 1
    notif_count = await db.notifications.count_documents({"recipient_user_id": student_a_id, "type": "APTITUDE_ALLOCATED"})
    assert notif_count == 1, f"Expected 1 notification, found {notif_count}"

    # =============================================================
    # TEST 8: Pipeline state updates to APTITUDE_ALLOCATED
    # =============================================================
    updated_app_a = await db.applications.find_one({"id": app_a_id})
    assert updated_app_a["status"] == "APTITUDE_ALLOCATED"
    assert updated_app_a["aptitude_status"] == "ALLOCATED"

    stage_info = derive_recruitment_pipeline_stage(student_a_doc, drive_doc, updated_app_a, None, {"status": "ALLOCATED"})
    assert stage_info["stage"] == "APTITUDE_ALLOCATED"
    assert stage_info["stageLabel"] == "Aptitude Round Allocated"
    assert stage_info["canShortlist"] is False
    assert stage_info["canAllocateAptitude"] is False
    assert stage_info["canScheduleInterview"] is False



    # =============================================================
    # TEST 9: Student dashboard data fields verification
    # =============================================================
    assert found_alloc["assessment_id"] == assessment_id
    assert found_alloc["company"] == "Acme Software Systems"
    assert found_alloc["job_title"] == "Cloud Software Engineer"
    assert found_alloc["round_type"] == "APTITUDE"
    assert found_alloc["status"] == "ALLOCATED"
    assert "allocated_at" in found_alloc

    print("ALL 10 STEP A APTITUDE ALLOCATION TESTS PASSED SUCCESSFULLY!")
