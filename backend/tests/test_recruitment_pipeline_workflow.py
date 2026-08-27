"""
Comprehensive Test Suite for Recruitment Pipeline & Aptitude Round Gate.
Verifies all 9 strict business-logic rules:
TEST A: Eligible candidate complete workflow (Applied -> Shortlisted -> Aptitude Assigned -> Qualified -> Interview Scheduled).
TEST B: Shortlisted but aptitude NOT qualified -> Attempt interview scheduling MUST FAIL (HTTP 400).
TEST C: Shortlisted but aptitude not attempted -> Attempt interview scheduling MUST FAIL (HTTP 400).
TEST D: Ineligible candidate -> Attempt shortlist MUST FAIL (HTTP 400).
TEST E: Ineligible candidate -> Attempt aptitude allocation MUST FAIL (HTTP 400).
TEST F: Ineligible candidate -> Attempt interview scheduling MUST FAIL (HTTP 400).
TEST G: Eligible candidate -> Aptitude qualified -> Interview scheduling succeeds.
TEST H: Recruitment Pipeline stage calculation correctly tracks Rahul Verma after every transition.
TEST I: Ayush remains INELIGIBLE and never enters successful recruitment stages.
"""
import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncMockDatabase
from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.pipeline_engine import derive_recruitment_pipeline_stage

client = TestClient(app)

def test_recruitment_pipeline_and_aptitude_gate_suite():
    asyncio.run(_run_test_recruitment_pipeline_suite())

async def _run_test_recruitment_pipeline_suite():
    db_manager.db = AsyncMockDatabase("placemind_pipeline_test")
    db = db_manager.db

    # Setup Drive: Google Cloud Architect (CGPA >= 8.0, Branch CSE, Backlogs <= 0)
    drive_id = "drive-google-cloud-101"
    drive_doc = {
        "id": drive_id,
        "companyName": "Google",
        "roleTitle": "Cloud Engineer",
        "minCgpa": 8.0,
        "eligibleBranches": ["CSE"],
        "maxBacklogs": 0,
        "graduationYear": 2027,
        "requiredSkills": ["Cloud", "Docker", "Python"],
        "status": "ANNOUNCED",
        "shortlistedCount": 0
    }
    await db.drives.insert_one(drive_doc)

    # -------------------------------------------------------------
    # SETUP CANDIDATES:
    # 1. Rahul Verma (Eligible: CGPA 8.8, CSE, 0 Backlogs)
    # 2. Ayush (Ineligible: CGPA 7.2 < 8.0)
    # 3. Bob (Eligible: CGPA 8.2, CSE, 0 Backlogs)
    # -------------------------------------------------------------
    rahul_id = "stu-rahul-verma"
    rahul_doc = {
        "id": rahul_id,
        "name": "Rahul Verma",
        "email": "rahul.verma@campus.edu",
        "cgpa": 8.8,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Cloud", "Docker", "Python"]
    }
    await db.students.insert_one(rahul_doc)

    ayush_id = "stu-ayush"
    ayush_doc = {
        "id": ayush_id,
        "name": "Ayush",
        "email": "ayush@campus.edu",
        "cgpa": 7.2,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Cloud", "Python"]
    }
    await db.students.insert_one(ayush_doc)

    bob_id = "stu-bob"
    bob_doc = {
        "id": bob_id,
        "name": "Bob Tester",
        "email": "bob.tester@campus.edu",
        "cgpa": 8.2,
        "branch": "CSE",
        "activeBacklogs": 0,
        "graduationYear": 2027,
        "skills": ["Cloud", "Docker"]
    }
    await db.students.insert_one(bob_doc)

    # Create Applications
    rahul_app_id = f"app-{rahul_id}-{drive_id}"
    await db.applications.insert_one({
        "id": rahul_app_id,
        "student_id": rahul_id,
        "student_name": "Rahul Verma",
        "drive_id": drive_id,
        "company_name": "Google",
        "job_title": "Cloud Engineer",
        "status": "APPLIED"
    })

    ayush_app_id = f"app-{ayush_id}-{drive_id}"
    await db.applications.insert_one({
        "id": ayush_app_id,
        "student_id": ayush_id,
        "student_name": "Ayush",
        "drive_id": drive_id,
        "company_name": "Google",
        "job_title": "Cloud Engineer",
        "status": "APPLIED"
    })

    bob_app_id = f"app-{bob_id}-{drive_id}"
    await db.applications.insert_one({
        "id": bob_app_id,
        "student_id": bob_id,
        "student_name": "Bob Tester",
        "drive_id": drive_id,
        "company_name": "Google",
        "job_title": "Cloud Engineer",
        "status": "APPLIED"
    })

    # =============================================================
    # TEST D: Ineligible candidate (Ayush) -> Attempt Shortlist MUST FAIL
    # =============================================================
    res_d = client.post(f"/api/applications/{ayush_app_id}/shortlist", json={})
    assert res_d.status_code == 400, f"Expected 400 for shortlisting ineligible Ayush, got {res_d.status_code}: {res_d.text}"

    # =============================================================
    # TEST E: Ineligible candidate (Ayush) -> Attempt Aptitude Allocation MUST FAIL
    # =============================================================
    res_e = client.post(f"/api/applications/{ayush_app_id}/allocate-aptitude", json={})
    assert res_e.status_code == 400, f"Expected 400 for allocating aptitude to ineligible Ayush, got {res_e.status_code}: {res_e.text}"

    # =============================================================
    # TEST F: Ineligible candidate (Ayush) -> Attempt Interview Scheduling MUST FAIL
    # =============================================================
    res_f = client.post("/api/interviews", json={
        "candidateId": ayush_id,
        "candidateName": "Ayush",
        "driveId": drive_id,
        "companyName": "Google",
        "roleTitle": "Cloud Engineer",
        "panelName": "Panel 1",
        "roomName": "Room A",
        "date": "2026-09-15",
        "timeSlot": "10:00 AM - 10:30 AM",
        "startTime": "10:00 AM",
        "endTime": "10:30 AM"
    })
    assert res_f.status_code == 400, f"Expected 400 for scheduling interview for ineligible Ayush, got {res_f.status_code}: {res_f.text}"

    # =============================================================
    # TEST I: Ayush remains INELIGIBLE and never enters successful recruitment stages
    # =============================================================
    ayush_app_db = await db.applications.find_one({"id": ayush_app_id})
    ayush_stage = derive_recruitment_pipeline_stage(ayush_doc, drive_doc, ayush_app_db)
    assert ayush_stage["stage"] == "INELIGIBLE", "Ayush must evaluate as INELIGIBLE"
    assert ayush_stage["isEligible"] is False
    assert ayush_stage["canAllocateAptitude"] is False
    assert ayush_stage["canScheduleInterview"] is False

    # =============================================================
    # TEST H & A: Tracking Rahul Verma through every stage transition
    # Stage 1: APPLIED
    # =============================================================
    r_app_1 = await db.applications.find_one({"id": rahul_app_id})
    stage_1 = derive_recruitment_pipeline_stage(rahul_doc, drive_doc, r_app_1)
    assert stage_1["stage"] == "APPLIED"
    assert stage_1["nextAction"] == "Shortlist Candidate"

    # Officer shortlists Rahul -> Stage 2: SHORTLISTED
    res_shortlist = client.post(f"/api/applications/{rahul_app_id}/shortlist", json={})
    assert res_shortlist.status_code == 200
    r_app_2 = await db.applications.find_one({"id": rahul_app_id})
    stage_2 = derive_recruitment_pipeline_stage(rahul_doc, drive_doc, r_app_2)
    assert stage_2["stage"] == "SHORTLISTED", f"Rahul stage should be SHORTLISTED, got {stage_2['stage']}"
    assert stage_2["canAllocateAptitude"] is True
    assert stage_2["canScheduleInterview"] is False, "Rahul cannot get interview scheduled yet"
    assert stage_2["nextAction"] == "Allocate Aptitude"

    # =============================================================
    # TEST C: Shortlisted but aptitude not attempted -> Attempt Interview Scheduling MUST FAIL
    # =============================================================
    res_c = client.post("/api/interviews", json={
        "candidateId": rahul_id,
        "candidateName": "Rahul Verma",
        "driveId": drive_id,
        "companyName": "Google",
        "roleTitle": "Cloud Engineer",
        "panelName": "Panel 1",
        "roomName": "Room A",
        "date": "2026-09-15",
        "timeSlot": "10:00 AM - 10:30 AM",
        "startTime": "10:00 AM",
        "endTime": "10:30 AM"
    })
    assert res_c.status_code == 400, f"Expected 400 Bad Request when aptitude not completed, got {res_c.status_code}: {res_c.text}"
    assert "aptitude round" in res_c.json()["detail"].lower()

    # Officer allocates Aptitude Round to Rahul -> Stage 3: APTITUDE_ASSIGNED
    res_alloc = client.post(f"/api/applications/{rahul_app_id}/allocate-aptitude", json={})
    assert res_alloc.status_code == 200
    r_app_3 = await db.applications.find_one({"id": rahul_app_id})
    stage_3 = derive_recruitment_pipeline_stage(rahul_doc, drive_doc, r_app_3)
    assert stage_3["stage"] in ["APTITUDE_ALLOCATED", "APTITUDE_ASSIGNED"]
    assert stage_3["canScheduleInterview"] is False


    # =============================================================
    # TEST B: Shortlisted / Aptitude assigned but NOT qualified (FAILED) -> Attempt Interview Scheduling MUST FAIL
    # =============================================================
    # Shortlist Bob & mark Bob as FAILED in aptitude
    client.post(f"/api/applications/{bob_app_id}/shortlist", json={})
    client.post(f"/api/applications/{bob_app_id}/allocate-aptitude", json={})
    client.post(f"/api/applications/{bob_app_id}/evaluate-aptitude", json={"passed": False, "score": 40.0})

    res_b = client.post("/api/interviews", json={
        "candidateId": bob_id,
        "candidateName": "Bob Tester",
        "driveId": drive_id,
        "companyName": "Google",
        "roleTitle": "Cloud Engineer",
        "panelName": "Panel 1",
        "roomName": "Room A",
        "date": "2026-09-15",
        "timeSlot": "11:00 AM - 11:30 AM",
        "startTime": "11:00 AM",
        "endTime": "11:30 AM"
    })
    assert res_b.status_code == 400, f"Expected 400 for aptitude failed student, got {res_b.status_code}: {res_b.text}"

    # =============================================================
    # TEST G: Rahul attempts & QUALIFIES Aptitude Round -> Stage 4: APTITUDE_QUALIFIED
    # =============================================================
    res_eval = client.post(f"/api/applications/{rahul_app_id}/evaluate-aptitude", json={"passed": True, "score": 92.0})
    assert res_eval.status_code == 200
    r_app_4 = await db.applications.find_one({"id": rahul_app_id})
    stage_4 = derive_recruitment_pipeline_stage(rahul_doc, drive_doc, r_app_4)
    assert stage_4["stage"] == "APTITUDE_QUALIFIED"
    assert stage_4["canScheduleInterview"] is True
    assert stage_4["nextAction"] == "Schedule Interview"

    # =============================================================
    # TEST A: Officer Schedules Interview for Rahul -> Stage 5: INTERVIEW_SCHEDULED (PASS)
    # =============================================================
    res_int_ok = client.post("/api/interviews", json={
        "candidateId": rahul_id,
        "candidateName": "Rahul Verma",
        "driveId": drive_id,
        "companyName": "Google",
        "roleTitle": "Cloud Engineer",
        "panelName": "Panel 1",
        "roomName": "Room A",
        "date": "2026-09-15",
        "timeSlot": "10:00 AM - 10:30 AM",
        "startTime": "10:00 AM",
        "endTime": "10:30 AM"
    })
    assert res_int_ok.status_code == 201, f"Expected 201 Created for qualified Rahul, got {res_int_ok.status_code}: {res_int_ok.text}"

    r_app_5 = await db.applications.find_one({"id": rahul_app_id})
    intv_doc = await db.interviews.find_one({"id": res_int_ok.json()["id"]})
    stage_5 = derive_recruitment_pipeline_stage(rahul_doc, drive_doc, r_app_5, intv_doc)
    assert stage_5["stage"] == "INTERVIEW_SCHEDULED", f"Rahul final stage should be INTERVIEW_SCHEDULED, got {stage_5['stage']}"

    print("ALL 9 RECRUITMENT PIPELINE & APTITUDE GATE TESTS PASSED SUCCESSFULLY!")
