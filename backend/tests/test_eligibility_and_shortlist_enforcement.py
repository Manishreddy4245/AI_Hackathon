"""
Comprehensive Test Suite for Placement Eligibility & Shortlisting Enforcement.
Verifies all 7 strict business-logic rules:
TEST 1: Eligible student appears eligible and can be shortlisted.
TEST 2: Ineligible because of CGPA -> appears INELIGIBLE and cannot be shortlisted.
TEST 3: Ineligible because of Branch -> appears INELIGIBLE and cannot be shortlisted.
TEST 4: Ineligible because of Backlogs -> appears INELIGIBLE and cannot be shortlisted.
TEST 5: Ineligible student manually applies -> application stored as APPLIED but marked INELIGIBLE.
TEST 6: Direct API call to shortlist ineligible application -> rejected with HTTP 400.
TEST 7: Attempt to schedule interview for ineligible or non-shortlisted student -> rejected with HTTP 400.
"""
import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncMockDatabase
from app.services.eligibility_engine import evaluate_drive_eligibility

client = TestClient(app)

def test_eligibility_and_shortlist_enforcement_suite():
    asyncio.run(_run_test_eligibility_suite())

async def _run_test_eligibility_suite():
    db_manager.db = AsyncMockDatabase("placemind_eligibility_test")
    db = db_manager.db

    # 1. Setup Drive with requirements: CGPA >= 8.0, Branch CSE, Backlogs <= 0
    drive_id = "drive-strict-eligibility-101"
    drive_doc = {
        "id": drive_id,
        "companyName": "TechTitan Corp",
        "roleTitle": "Cloud Architect",
        "minCgpa": 8.0,
        "eligibleBranches": ["CSE"],
        "maxBacklogs": 0,
        "graduationYear": 2027,
        "requiredSkills": ["Docker", "AWS"],
        "status": "ANNOUNCED",
        "shortlistedCount": 0
    }
    await db.drives.insert_one(drive_doc)

    # -------------------------------------------------------------
    # TEST 1: Eligible Student (CGPA 8.5, CSE, 0 Backlogs, 2027)
    # -------------------------------------------------------------
    stu1_id = "stu-eligible-1"
    stu1_doc = {
        "id": stu1_id,
        "name": "Alice Eligible",
        "email": "alice@campus.edu",
        "cgpa": 8.5,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Docker", "AWS", "Python"]
    }
    await db.students.insert_one(stu1_doc)

    is_e1, reasons1, _ = evaluate_drive_eligibility(stu1_doc, drive_doc)
    assert is_e1 is True, f"Eligible student should evaluate to True, got {reasons1}"

    app1_id = f"app-{stu1_id}-{drive_id}"
    app1_doc = {
        "id": app1_id,
        "student_id": stu1_id,
        "student_name": "Alice Eligible",
        "drive_id": drive_id,
        "company_name": "TechTitan Corp",
        "job_title": "Cloud Architect",
        "status": "APPLIED",
        "applied_at": "Today"
    }
    await db.applications.insert_one(app1_doc)

    # Shortlist eligible student via API
    res1 = client.post(f"/api/applications/{app1_id}/shortlist", json={})
    assert res1.status_code == 200, f"Expected 200 OK for eligible student, got {res1.status_code}: {res1.text}"
    updated_app1 = await db.applications.find_one({"id": app1_id})
    assert updated_app1["status"] == "SHORTLISTED"

    # -------------------------------------------------------------
    # TEST 2: Ineligible because of CGPA (CGPA 7.2 < 8.0)
    # -------------------------------------------------------------
    stu2_id = "stu-low-cgpa-2"
    stu2_doc = {
        "id": stu2_id,
        "name": "Bob LowCGPA",
        "email": "bob@campus.edu",
        "cgpa": 7.2,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Docker", "AWS"]
    }
    await db.students.insert_one(stu2_doc)

    is_e2, reasons2, _ = evaluate_drive_eligibility(stu2_doc, drive_doc)
    assert is_e2 is False, "Student with CGPA 7.2 < 8.0 must evaluate as ineligible"
    assert any("CGPA" in r for r in reasons2)

    app2_id = f"app-{stu2_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app2_id,
        "student_id": stu2_id,
        "student_name": "Bob LowCGPA",
        "drive_id": drive_id,
        "company_name": "TechTitan Corp",
        "status": "APPLIED"
    })

    # Direct API shortlist attempt MUST fail with HTTP 400
    res2 = client.post(f"/api/applications/{app2_id}/shortlist", json={})
    assert res2.status_code == 400, f"Expected 400 Bad Request for low CGPA, got {res2.status_code}: {res2.text}"
    assert "Ineligible" in res2.json()["detail"]
    app2_db = await db.applications.find_one({"id": app2_id})
    assert app2_db["status"] == "APPLIED", "Status must remain APPLIED for rejected shortlist request"

    # -------------------------------------------------------------
    # TEST 3: Ineligible because of Branch (ECE not in [CSE])
    # -------------------------------------------------------------
    stu3_id = "stu-wrong-branch-3"
    stu3_doc = {
        "id": stu3_id,
        "name": "Charlie ECE",
        "email": "charlie@campus.edu",
        "cgpa": 8.8,
        "branch": "ECE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Docker", "AWS"]
    }
    await db.students.insert_one(stu3_doc)

    is_e3, reasons3, _ = evaluate_drive_eligibility(stu3_doc, drive_doc)
    assert is_e3 is False, "Student with branch ECE must evaluate as ineligible"
    assert any("branch" in r.lower() for r in reasons3)

    app3_id = f"app-{stu3_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app3_id,
        "student_id": stu3_id,
        "student_name": "Charlie ECE",
        "drive_id": drive_id,
        "company_name": "TechTitan Corp",
        "status": "APPLIED"
    })

    res3 = client.post(f"/api/applications/{app3_id}/shortlist", json={})
    assert res3.status_code == 400, f"Expected 400 Bad Request for wrong branch, got {res3.status_code}: {res3.text}"
    assert "Ineligible" in res3.json()["detail"]

    # -------------------------------------------------------------
    # TEST 4: Ineligible because of Backlogs (2 Backlogs > 0 allowed)
    # -------------------------------------------------------------
    stu4_id = "stu-backlogs-4"
    stu4_doc = {
        "id": stu4_id,
        "name": "David Backlogs",
        "email": "david@campus.edu",
        "cgpa": 8.5,
        "branch": "CSE",
        "activeBacklogs": 2,
        "graduationYear": 2027,
        "skills": ["Docker", "AWS"]
    }
    await db.students.insert_one(stu4_doc)

    is_e4, reasons4, _ = evaluate_drive_eligibility(stu4_doc, drive_doc)
    assert is_e4 is False, "Student with 2 active backlogs > 0 max allowed must evaluate as ineligible"
    assert any("backlog" in r.lower() for r in reasons4)

    app4_id = f"app-{stu4_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app4_id,
        "student_id": stu4_id,
        "student_name": "David Backlogs",
        "drive_id": drive_id,
        "company_name": "TechTitan Corp",
        "status": "APPLIED"
    })

    res4 = client.post(f"/api/applications/{app4_id}/shortlist", json={})
    assert res4.status_code == 400, f"Expected 400 Bad Request for backlogs, got {res4.status_code}: {res4.text}"
    assert "Ineligible" in res4.json()["detail"]

    # -------------------------------------------------------------
    # TEST 5: Ineligible student manually applies -> Application preserved as APPLIED
    # -------------------------------------------------------------
    stu5_id = "stu-ineligible-applicant-5"
    stu5_doc = {
        "id": stu5_id,
        "name": "Eve Applicant",
        "email": "eve@campus.edu",
        "cgpa": 6.8,
        "branch": "MECH",
        "activeBacklogs": 1,
        "graduationYear": 2027
    }
    await db.students.insert_one(stu5_doc)

    app5_id = f"app-{stu5_id}-{drive_id}"
    await db.applications.insert_one({
        "id": app5_id,
        "student_id": stu5_id,
        "student_name": "Eve Applicant",
        "drive_id": drive_id,
        "company_name": "TechTitan Corp",
        "status": "APPLIED"
    })

    # Fetch pool from candidate pool API
    pool_res = client.get(f"/api/applications/pool?drive_id={drive_id}")
    assert pool_res.status_code == 200
    pool_data = pool_res.json()
    eve_app = next((item for item in pool_data if item["student_id"] == stu5_id), None)
    assert eve_app is not None, "Application must remain stored in pool for audit"
    assert eve_app["eligible"] is False, "Candidate pool must mark Eve as eligible=False"
    assert len(eve_app["eligibility_reasons"]) > 0

    # -------------------------------------------------------------
    # TEST 6: Direct API shortlist attempt on ineligible application is rejected
    # -------------------------------------------------------------
    res6 = client.post(f"/api/applications/{app5_id}/shortlist", json={})
    assert res6.status_code == 400, "Direct shortlist API call on ineligible student MUST return 400"
    app5_db = await db.applications.find_one({"id": app5_id})
    assert app5_db["status"] == "APPLIED", "Status must remain APPLIED"

    # Verify shortlisted counter on drive was NOT incremented
    drive_after = await db.drives.find_one({"id": drive_id})
    assert drive_after["shortlistedCount"] == 1, "Only Alice (1 eligible student) should be counted in shortlistedCount"

    # -------------------------------------------------------------
    # TEST 7: Attempt to schedule interview for ineligible / non-shortlisted application -> Rejected
    # -------------------------------------------------------------
    # Attempt for non-shortlisted / ineligible student (Eve)
    int_ineligible_payload = {
        "candidateId": stu5_id,
        "candidateName": "Eve Applicant",
        "driveId": drive_id,
        "companyName": "TechTitan Corp",
        "roleTitle": "Cloud Architect",
        "panelName": "Panel Alpha",
        "roomName": "Room 201",
        "date": "2026-09-10",
        "timeSlot": "10:00 AM - 10:30 AM"
    }
    int_res = client.post("/api/interviews", json=int_ineligible_payload)
    assert int_res.status_code == 400, f"Expected 400 Bad Request when scheduling interview for ineligible student, got {int_res.status_code}: {int_res.text}"
    assert "Only shortlisted" in int_res.json()["detail"] or "ineligible" in int_res.json()["detail"].lower()

    # Attempt for shortlisted eligible student (Alice) -> Should succeed after aptitude qualification
    client.post(f"/api/applications/{app1_id}/allocate-aptitude", json={})
    client.post(f"/api/applications/{app1_id}/evaluate-aptitude", json={"passed": True, "score": 90.0})

    int_eligible_payload = {

        "candidateId": stu1_id,
        "candidateName": "Alice Eligible",
        "driveId": drive_id,
        "companyName": "TechTitan Corp",
        "roleTitle": "Cloud Architect",
        "panelName": "Panel Alpha",
        "roomName": "Room 201",
        "date": "2026-09-10",
        "timeSlot": "10:00 AM - 10:30 AM",
        "startTime": "10:00 AM",
        "endTime": "10:30 AM"
    }
    int_ok_res = client.post("/api/interviews", json=int_eligible_payload)
    assert int_ok_res.status_code == 201, f"Expected 201 Created for shortlisted eligible student, got {int_ok_res.status_code}: {int_ok_res.text}"


    print("ALL 7 ELIGIBILITY & SHORTLIST ENFORCEMENT REGRESSION TESTS PASSED SUCCESSFULLY!")
