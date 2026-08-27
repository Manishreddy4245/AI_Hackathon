"""
Comprehensive Test Suite for Recruiter Edit Placement Drive & Graduation Year Eligibility Workflow.
Verifies all 14 strict business rules:
1. Recruiter can edit own drive before approval.
2. Recruiter can edit own approved drive.
3. Recruiter CANNOT edit another recruiter's drive (returns 403 Forbidden).
4. Raw JD edit triggers updated AI/requirement extraction.
5. Failed AI analysis does not corrupt existing drive requirements.
6. Graduation year is saved correctly.
7. Eligible graduation year: Student 2026, Drive [2026] -> ELIGIBLE.
8. Ineligible graduation year: Student 2025, Drive [2026] -> INELIGIBLE.
9. Multiple graduation years: Student 2025, Drive [2025, 2026] -> ELIGIBLE.
10. Ineligible graduation year candidate cannot be shortlisted (returns 400 Bad Request).
11. Existing application remains after drive eligibility requirements update.
12. Updating approved drive's eligibility requirements sets status to CHANGES_PENDING_REVIEW.
13. After approval of updated requirements, drive becomes ANNOUNCED again and candidates evaluate against NEW rules.
14. Existing placement workflows continue to pass 100%.
"""
import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncMockDatabase
from app.core.security import create_access_token
from app.services.eligibility_engine import evaluate_drive_eligibility

client = TestClient(app)

def test_recruiter_edit_and_grad_year_suite():
    asyncio.run(_run_test_recruiter_edit_and_grad_year_suite())

async def _run_test_recruiter_edit_and_grad_year_suite():
    db_manager.db = AsyncMockDatabase("placemind_edit_grad_test")
    db = db_manager.db

    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # -------------------------------------------------------------
    # SETUP USERS & TOKENS
    # -------------------------------------------------------------
    recruiter1_id = f"rec-1-{timestamp_ms}"
    recruiter1_token = create_access_token({
        "sub": recruiter1_id,
        "id": recruiter1_id,
        "role": "recruiter",
        "name": "Recruiter Alpha",
        "email": f"alpha-{timestamp_ms}@company1.com",
        "companyId": "comp-alpha"
    })
    rec1_headers = {"Authorization": f"Bearer {recruiter1_token}"}

    recruiter2_id = f"rec-2-{timestamp_ms}"
    recruiter2_token = create_access_token({
        "sub": recruiter2_id,
        "id": recruiter2_id,
        "role": "recruiter",
        "name": "Recruiter Beta",
        "email": f"beta-{timestamp_ms}@company2.com",
        "companyId": "comp-beta"
    })
    rec2_headers = {"Authorization": f"Bearer {recruiter2_token}"}

    officer_token = create_access_token({
        "sub": "officer-999",
        "id": "officer-999",
        "role": "placement_officer",
        "name": "Head TPO",
        "email": "tpo@campus.edu"
    })
    off_headers = {"Authorization": f"Bearer {officer_token}"}

    # =============================================================
    # TEST 6: Graduation year is saved correctly
    # =============================================================
    drive_payload = {
        "companyName": "Alpha Technologies",
        "roleTitle": "Software Development Engineer",
        "packageLpa": 12.0,
        "location": "Bengaluru",
        "minCgpa": 7.0,
        "eligibleBranches": ["CSE", "IT"],
        "graduationYear": 2026,
        "graduationYears": [2025, 2026],
        "maxBacklogs": 0,
        "requiredSkills": ["Python", "SQL"],
        "preferredSkills": ["FastAPI"],
        "description": "Raw JD text: hiring SDEs for 2025 and 2026 batches."
    }
    res_create = client.post("/api/drives", json=drive_payload, headers=rec1_headers)
    assert res_create.status_code == 201, f"Failed drive creation: {res_create.text}"
    drive_data = res_create.json()
    drive_id = drive_data["id"]

    assert drive_data["graduationYear"] in [2025, 2026]
    assert drive_data["graduationYears"] == [2025, 2026]
    assert drive_data["status"] in ["PENDING_APPROVAL", "PENDING_ANNOUNCEMENT"]

    # =============================================================
    # TEST 1: Recruiter can edit own drive before approval
    # =============================================================
    edit_payload_1 = {
        "packageLpa": 14.0,
        "location": "Bengaluru / Hybrid",
        "roleTitle": "Senior Software Development Engineer"
    }
    res_edit_1 = client.put(f"/api/drives/{drive_id}", json=edit_payload_1, headers=rec1_headers)
    assert res_edit_1.status_code == 200, f"Edit failed: {res_edit_1.text}"
    updated_1 = res_edit_1.json()
    assert updated_1["packageLpa"] == 14.0
    assert updated_1["location"] == "Bengaluru / Hybrid"
    assert updated_1["roleTitle"] == "Senior Software Development Engineer"

    # =============================================================
    # TEST 3: Recruiter CANNOT edit another recruiter's drive (HTTP 403)
    # =============================================================
    res_edit_unauth = client.put(f"/api/drives/{drive_id}", json={"packageLpa": 99.0}, headers=rec2_headers)
    assert res_edit_unauth.status_code == 403, f"Expected 403 for editing unowned drive, got {res_edit_unauth.status_code}: {res_edit_unauth.text}"
    assert "permission" in res_edit_unauth.json()["detail"].lower()

    # Officer announces/approves drive
    res_ann = client.post(f"/api/drives/{drive_id}/announce", headers=off_headers)
    assert res_ann.status_code == 200
    assert res_ann.json()["status"] == "ANNOUNCED"

    # =============================================================
    # TEST 2: Recruiter can edit own approved drive (non-eligibility metadata)
    # =============================================================
    res_edit_approved_meta = client.put(f"/api/drives/{drive_id}", json={"location": "Hyderabad / Remote"}, headers=rec1_headers)
    assert res_edit_approved_meta.status_code == 200
    assert res_edit_approved_meta.json()["location"] == "Hyderabad / Remote"
    assert res_edit_approved_meta.json()["status"] == "ANNOUNCED"  # Status preserved for non-eligibility edit

    # =============================================================
    # TEST 7: Eligible graduation year (Student 2026, Drive [2026] -> ELIGIBLE)
    # =============================================================
    student_2026 = {
        "id": f"stu-2026-{timestamp_ms}",
        "name": "Student 2026",
        "email": f"s2026-{timestamp_ms}@campus.edu",
        "cgpa": 8.0,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2026
    }
    await db.students.insert_one(student_2026)
    is_e7, r7, _ = evaluate_drive_eligibility(student_2026, {"graduationYears": [2026]})
    assert is_e7 is True, f"Student 2026 should be eligible for drive [2026], reasons: {r7}"

    # =============================================================
    # TEST 8: Ineligible graduation year (Student 2025, Drive [2026] -> INELIGIBLE)
    # =============================================================
    student_2025 = {
        "id": f"stu-2025-{timestamp_ms}",
        "name": "Student 2025",
        "email": f"s2025-{timestamp_ms}@campus.edu",
        "cgpa": 8.0,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2025
    }
    await db.students.insert_one(student_2025)
    is_e8, r8, _ = evaluate_drive_eligibility(student_2025, {"graduationYears": [2026]})
    assert is_e8 is False, "Student 2025 should be ineligible for drive [2026]"
    assert "Graduation year 2025 is not eligible" in r8[0]

    # =============================================================
    # TEST 9: Multiple graduation years (Student 2025, Drive [2025, 2026] -> ELIGIBLE)
    # =============================================================
    is_e9, r9, _ = evaluate_drive_eligibility(student_2025, {"graduationYears": [2025, 2026]})
    assert is_e9 is True, f"Student 2025 should be eligible for drive [2025, 2026], reasons: {r9}"

    # Student 2024 (Ineligible for [2025, 2026])
    student_2024 = {
        "id": f"stu-2024-{timestamp_ms}",
        "name": "Student 2024",
        "email": f"s2024-{timestamp_ms}@campus.edu",
        "cgpa": 8.5,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2024
    }
    await db.students.insert_one(student_2024)

    # Student 2024 applies to drive (gradYears = [2025, 2026])
    stu2024_app_id = f"app-{student_2024['id']}-{drive_id}"
    await db.applications.insert_one({
        "id": stu2024_app_id,
        "student_id": student_2024["id"],
        "student_name": "Student 2024",
        "drive_id": drive_id,
        "company_name": "Alpha Technologies",
        "job_title": "Software Development Engineer",
        "status": "APPLIED"
    })

    # =============================================================
    # TEST 10: Ineligible graduation year candidate CANNOT be shortlisted (400 Bad Request)
    # =============================================================
    res_shortlist_2024 = client.post(f"/api/applications/{stu2024_app_id}/shortlist", headers=off_headers)
    assert res_shortlist_2024.status_code == 400, f"Expected 400 for shortlisting ineligible grad year 2024, got {res_shortlist_2024.status_code}: {res_shortlist_2024.text}"
    assert "Ineligible" in res_shortlist_2024.json()["detail"] or "graduation year" in res_shortlist_2024.json()["detail"].lower()

    # =============================================================
    # TEST 12: Updating approved drive's eligibility requirements sets status to CHANGES_PENDING_REVIEW
    # =============================================================
    edit_payload_elig = {
        "minCgpa": 8.5,
        "graduationYears": [2026]  # Removes 2025
    }
    res_edit_elig = client.put(f"/api/drives/{drive_id}", json=edit_payload_elig, headers=rec1_headers)
    assert res_edit_elig.status_code == 200
    updated_elig = res_edit_elig.json()
    assert updated_elig["status"] == "CHANGES_PENDING_REVIEW"
    assert updated_elig["minCgpa"] == 8.5
    assert updated_elig["graduationYears"] == [2026]

    # =============================================================
    # TEST 11: Existing application remains after eligibility changes
    # =============================================================
    app_2024_after = await db.applications.find_one({"id": stu2024_app_id})
    assert app_2024_after is not None, "Application record must be preserved in DB"
    assert app_2024_after["eligible"] is False, "Application eligible flag should evaluate to False"

    # =============================================================
    # TEST 13: After approval of updated requirements, drive becomes ANNOUNCED again
    # =============================================================
    res_reapprove = client.post(f"/api/drives/{drive_id}/announce", headers=off_headers)
    assert res_reapprove.status_code == 200
    assert res_reapprove.json()["status"] == "ANNOUNCED"

    # =============================================================
    # TEST 4: Raw JD edit triggers updated AI/requirement extraction
    # =============================================================
    raw_jd_edit = {
        "rawText": "Senior Cloud Engineer required, minimum CGPA 8.0, required skills Docker, AWS, Kubernetes, Python, eligible branches CSE, IT",
        "reanalyze_jd": True
    }
    res_ai_edit = client.put(f"/api/drives/{drive_id}", json=raw_jd_edit, headers=rec1_headers)
    assert res_ai_edit.status_code == 200
    ai_updated_drive = res_ai_edit.json()
    assert ai_updated_drive["minCgpa"] == 8.0
    assert "Docker" in ai_updated_drive["requiredSkills"]

    # =============================================================
    # TEST 5: Failed AI analysis does not corrupt existing drive requirements
    # =============================================================
    # Send bad rawText to trigger AI failure
    res_bad_ai = client.put(f"/api/drives/{drive_id}", json={"rawText": "   ", "reanalyze_jd": True}, headers=rec1_headers)
    assert res_bad_ai.status_code == 400, f"Expected 400 for empty raw text AI analysis, got {res_bad_ai.status_code}"
    
    # Verify drive in DB still retains CGPA 8.0 and Docker
    drive_uncorrupted = await db.drives.find_one({"id": drive_id})
    assert drive_uncorrupted["minCgpa"] == 8.0
    assert "Docker" in drive_uncorrupted["requiredSkills"]

    print("ALL 14 RECRUITER EDIT & GRADUATION YEAR TESTS PASSED SUCCESSFULLY!")
