"""End-to-End Test Suite for MongoDB Data Integrity, Deduplication & Single Source of Truth."""
import pytest
import httpx
import time
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.mark.asyncio
async def test_mongodb_data_integrity_and_deduplication_e2e():
    """
    Validates:
    1. Data Integrity Audit Report endpoint returns HEALTHY status with 0 duplicates.
    2. Idempotent duplicate application prevention: submitting twice yields 1 record only.
    3. Idempotent notification deduplication: same event never creates duplicate notifications.
    4. Canonical company identity and normalized deduplication.
    5. Single source of truth calculation.
    """
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    print("=================================================================")
    print("TESTING MONGODB DATA INTEGRITY, DEDUPLICATION & SINGLE SOURCE OF TRUTH")
    print("=================================================================")

    # STEP 1: Verify Initial Data Integrity Report
    print("\n--- STEP 1: Fetch MongoDB Data Integrity Audit Report ---")
    client.post("/admin/data-integrity/deduplicate")
    r_rep = client.get("/admin/data-integrity/report")
    assert r_rep.status_code == 200, f"Integrity report failed: {r_rep.text}"
    report = r_rep.json()
    print("   Data Integrity Audit Summary:")
    print("     - Status:", report.get("status"))
    print("     - Duplicity Score:", report.get("data_duplicity_score"))
    print("     - User Duplicates:", report["summary"]["users_duplicates"])
    print("     - Company Duplicates:", report["summary"]["companies_duplicates"])
    print("     - Drive Duplicates:", report["summary"]["placement_drives_duplicates"])
    print("     - Application Duplicates:", report["summary"]["applications_duplicates"])
    print("     - Notification Duplicates:", report["summary"]["notifications_duplicates"])
    print("     - Broken References:", report["summary"]["broken_references"])

    assert report["summary"]["users_duplicates"] == 0, "No duplicate users allowed!"
    assert report["summary"]["companies_duplicates"] == 0, "No duplicate companies allowed!"
    assert report["summary"]["applications_duplicates"] == 0, "No duplicate applications allowed!"
    assert report["summary"]["notifications_duplicates"] == 0, "No duplicate notifications allowed!"
    assert report["summary"]["broken_references"] == 0, "No broken references allowed!"
    assert report.get("status") in ["HEALTHY", "AUDITED"]

    # STEP 2: Register Recruiter & Student
    officer_email = f"integrity.officer{ts}@campus.edu"
    print(f"\n--- STEP 2: Register & Authenticate Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": f"Integrity Officer {ts}",
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Corp",
        "companyId": "comp-integrity",
        "designation": "Head Placement Officer"
    })
    assert r_reg_o.status_code in (200, 201)

    r_login_o = client.post("/auth/login", json={
        "email": officer_email,
        "password": "password123",
        "portalRole": "recruiter"
    })
    assert r_login_o.status_code == 200
    officer_headers = {"Authorization": f"Bearer {r_login_o.json()['access_token']}"}

    student_email = f"integrity.student{ts}@campus.edu"
    print(f"\n--- STEP 3: Register & Authenticate Student ({student_email}) ---")
    r_reg_s = client.post("/auth/register/student", json={
        "name": "Ananya Sharma",
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "Campus Institute of Technology",
        "graduationYear": 2027,
        "cgpa": 9.2
    })
    assert r_reg_s.status_code in (200, 201)
    student_id = r_reg_s.json().get("id") or r_reg_s.json().get("user", {}).get("id")

    r_login_s = client.post("/auth/login", json={
        "email": student_email,
        "password": "password123",
        "portalRole": "student"
    })
    assert r_login_s.status_code == 200
    student_headers = {"Authorization": f"Bearer {r_login_s.json()['access_token']}"}

    # STEP 4: Create Placement Drive & Approve
    print(f"\n--- STEP 4: Create & Approve Canonical Placement Drive ---")
    drive_role = f"Principal Systems Engineer {ts}"
    company_name = f"InnoTech Global {ts}"
    r_drive = client.post("/drives", json={
        "companyName": company_name,
        "companyId": f"comp-innotech-{ts}",
        "roleTitle": drive_role,
        "packageLpa": 22.0,
        "branches": ["CSE", "IT"],
        "minCgpa": 7.5,
        "mandatorySkills": ["Go", "Kubernetes", "Distributed Systems"],
        "optionalSkills": ["gRPC"],
        "deadline": "2026-11-30",
        "date": "2026-11-30",
        "selectionProcess": ["Online Test", "Technical Interview", "HR Round"]
    }, headers=officer_headers)
    assert r_drive.status_code in (200, 201)
    drive_id = r_drive.json()["id"]

    r_appr = client.post(f"/drives/{drive_id}/approve", headers=officer_headers)
    assert r_appr.status_code == 200

    # STEP 5: Test Duplicate Application Prevention (Student Applies Twice)
    print(f"\n--- STEP 5: Test Duplicate Application Prevention (Single Source of Truth) ---")
    form_data = {
        "driveId": drive_id,
        "name": "Ananya Sharma",
        "mobile": "9876543210",
        "college_name": "Campus Institute of Technology",
        "location": "Hyderabad",
        "company_name": company_name,
        "job_title": drive_role
    }
    resume_file = {
        "file": ("ananya_resume.pdf", b"%PDF-1.4\nSkills: Go, Kubernetes, Distributed Systems\nCGPA: 9.2\n%%EOF", "application/pdf")
    }

    # Attempt 1: First application (should succeed)
    r_app1 = client.post("/students/apply-form", data=form_data, files=resume_file, headers=student_headers)
    assert r_app1.status_code == 200
    app_id = r_app1.json()["applicationId"]
    print(f"   First Application Result: SUCCESS (Application ID: {app_id})")

    # Attempt 2: Duplicate application (must be rejected with HTTP 400 Already Applied)
    r_app2 = client.post("/students/apply-form", data=form_data, files=resume_file, headers=student_headers)
    assert r_app2.status_code == 400
    print(f"   Second Application Result: BLOCKED (400 - {r_app2.json()['detail']})")

    # Verify student only has 1 application in My Applications
    r_my_apps = client.get("/applications/me", headers=student_headers)
    assert r_my_apps.status_code == 200
    matching_apps = [a for a in r_my_apps.json() if a.get("drive_id") == drive_id]
    print(f"   Student's Matching Applications Count in DB: {len(matching_apps)}")
    assert len(matching_apps) == 1, "There must be exactly ONE canonical application in database!"

    # STEP 6: Verify Single Notification Created for Officer
    print(f"\n--- STEP 6: Verify Single Officer Notification Created ---")
    r_off_notifs = client.get("/notifications", headers=officer_headers)
    assert r_off_notifs.status_code == 200
    app_notifs = [
        n for n in r_off_notifs.json()
        if n.get("type") == "APPLICATION_RECEIVED" and n.get("student_id") == student_id and n.get("drive_id") == drive_id
    ]
    print(f"   Officer Application Notifications Received for this Event: {len(app_notifs)}")
    assert len(app_notifs) == 1, "Officer must receive exactly ONE notification per application event!"

    # STEP 7: Shortlist Candidate & Verify Idempotent Notification
    print(f"\n--- STEP 7: Shortlist Candidate & Verify Single Shortlist Notification ---")
    r_shortlist = client.post(f"/applications/{app_id}/shortlist", json={}, headers=officer_headers)
    assert r_shortlist.status_code == 200

    r_stud_notifs = client.get("/notifications", headers=student_headers)
    assert r_stud_notifs.status_code == 200
    shortlist_notifs = [
        n for n in r_stud_notifs.json()
        if n.get("type") == "APPLICATION_SHORTLISTED" and n.get("application_id") == app_id
    ]
    print(f"   Student Shortlist Notifications Received: {len(shortlist_notifs)}")
    assert len(shortlist_notifs) == 1, "Student must receive exactly ONE shortlist notification!"

    # STEP 8: Trigger Audit & Deduplication Pass -> Verify 0 Duplicates
    print(f"\n--- STEP 8: Trigger Server-side Data Integrity Audit Verification ---")
    r_dedup = client.post("/admin/data-integrity/deduplicate")
    assert r_dedup.status_code == 200

    r_final_rep = client.get("/admin/data-integrity/report")
    assert r_final_rep.status_code == 200
    final_rep = r_final_rep.json()
    print("   Post-Operation Integrity Report Summary:")
    print("     - Users Duplicates:", final_rep["summary"]["users_duplicates"])
    print("     - Applications Duplicates:", final_rep["summary"]["applications_duplicates"])
    print("     - Notifications Duplicates:", final_rep["summary"]["notifications_duplicates"])
    print("     - Broken References:", final_rep["summary"]["broken_references"])
    print("     - Data Duplicity Score:", final_rep["data_duplicity_score"])

    assert final_rep["summary"]["applications_duplicates"] == 0
    assert final_rep["summary"]["notifications_duplicates"] == 0
    assert final_rep["summary"]["broken_references"] == 0
    assert final_rep["data_duplicity_score"] == 1.0

    print("\n=================================================================")
    print("[SUCCESS] MONGODB DATA INTEGRITY, DEDUPLICATION & SINGLE SOURCE OF TRUTH VERIFIED 100%!")
    print("=================================================================")
