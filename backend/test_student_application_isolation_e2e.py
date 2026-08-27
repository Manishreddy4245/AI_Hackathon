import time
import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000/api"

def test_student_application_isolation_and_no_dummy_data():
    """
    RIGOROUS END-TO-END TEST:
    1. Newly registered students have EXACTLY 0 applications initially.
    2. Student A applies to Drive A -> Student A has 1 application, Student B has 0 applications.
    3. Student B applies to Drive B -> Student B has 1 application, Student A has 1 application (Drive A).
    4. Student A NEVER sees Student B's applications, and Student B NEVER sees Student A's applications.
    5. Duplicate application prevention works (cannot apply twice to same drive).
    6. Candidate pool displays only actual applicants per drive.
    7. Officer shortlist syncs with student application status without cross-user leakage.
    8. Login/re-login persistence verified.
    """
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # --- STEP 1: Register Placement Officer ---
    officer_email = f"officer.iso{ts}@campus.edu"
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": f"Officer Iso {ts}",
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Solutions",
        "companyId": "comp-1",
        "designation": "Placement Director"
    })
    assert r_reg_o.status_code in (200, 201)
    r_login_o = client.post("/auth/login", json={
        "email": officer_email,
        "password": "password123",
        "portalRole": "recruiter"
    })
    assert r_login_o.status_code == 200
    officer_token = r_login_o.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # --- STEP 2: Register Student A & Student B ---
    student_a_email = f"student.a.{ts}@campus.edu"
    student_b_email = f"student.b.{ts}@campus.edu"

    r_reg_a = client.post("/auth/register/student", json={
        "name": "Student Alpha",
        "email": student_a_email,
        "password": "password123",
        "rollNumber": f"2024A{ts % 10000}",
        "branch": "CSE",
        "college": "BITS Pilani, Hyderabad Campus",
        "graduationYear": 2027,
        "cgpa": 8.8
    })
    assert r_reg_a.status_code in (200, 201)
    student_a_id = r_reg_a.json().get("id") or r_reg_a.json().get("user", {}).get("id")
    token_a = r_reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    r_reg_b = client.post("/auth/register/student", json={
        "name": "Student Beta",
        "email": student_b_email,
        "password": "password123",
        "rollNumber": f"2024B{ts % 10000}",
        "branch": "IT",
        "college": "BITS Pilani, Hyderabad Campus",
        "graduationYear": 2027,
        "cgpa": 8.5
    })
    assert r_reg_b.status_code in (200, 201)
    student_b_id = r_reg_b.json().get("id") or r_reg_b.json().get("user", {}).get("id")
    token_b = r_reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # --- STEP 3: Verify Both Students Initially Have 0 Applications ---
    r_apps_a0 = client.get("/applications/me", headers=headers_a)
    assert r_apps_a0.status_code == 200
    apps_a0 = r_apps_a0.json()
    assert len(apps_a0) == 0, f"New Student A must have 0 applications, got {len(apps_a0)}"

    r_apps_b0 = client.get("/applications/me", headers=headers_b)
    assert r_apps_b0.status_code == 200
    apps_b0 = r_apps_b0.json()
    assert len(apps_b0) == 0, f"New Student B must have 0 applications, got {len(apps_b0)}"

    # --- STEP 4: Student A Applies to TechNova Solutions (College Drive) ---
    resume_a_content = b"""
    Student Alpha
    Email: student.a@campus.edu
    Education: B.Tech Computer Science, CGPA: 8.8
    Technical Skills: Python, SQL, REST APIs, FastAPI
    Projects: Distributed Cache Microservice
    """
    form_a = {
        "driveId": "technova-backend",
        "name": "Student Alpha",
        "mobile": "9876500001",
        "college_name": "BITS Pilani, Hyderabad Campus",
        "location": "Hyderabad",
    }
    files_a = {"file": ("resume_alpha.pdf", resume_a_content, "application/pdf")}
    r_apply_a = client.post("/students/apply-form", data=form_a, files=files_a, headers=headers_a)
    assert r_apply_a.status_code == 200, f"Student A apply failed: {r_apply_a.text}"
    app_a_id = r_apply_a.json()["applicationId"]

    # --- STEP 5: Verify Student A Has 1 Application, Student B Still Has 0 ---
    r_apps_a1 = client.get("/applications/me", headers=headers_a)
    assert r_apps_a1.status_code == 200
    apps_a1 = r_apps_a1.json()
    assert len(apps_a1) == 1, f"Student A must have 1 application, got {len(apps_a1)}"
    assert apps_a1[0]["drive_id"] == "technova-backend"
    assert apps_a1[0]["company_name"] == "TechNova Solutions"

    r_apps_b1 = client.get("/applications/me", headers=headers_b)
    assert r_apps_b1.status_code == 200
    apps_b1 = r_apps_b1.json()
    assert len(apps_b1) == 0, f"Student B must still have 0 applications, got {len(apps_b1)}"

    # --- STEP 6: Student B Applies to External/Different Drive ---
    ext_drive_id = f"ext-drive-beta-{ts}"
    r_ext_start_b = client.post("/students/external-apply/start", json={
        "drive_id": ext_drive_id,
        "company_name": "CloudNova Systems",
        "job_title": "Frontend Engineer",
        "application_url": "https://example.com/careers/frontend"
    }, headers=headers_b)
    assert r_ext_start_b.status_code == 200
    return_tok_b = r_ext_start_b.json()["return_token"]

    r_ext_conf_b = client.post("/students/external-apply/confirm", json={
        "drive_id": ext_drive_id,
        "token": return_tok_b,
        "applied": True,
        "notes": "Applied on portal"
    }, headers=headers_b)
    assert r_ext_conf_b.status_code == 200

    # --- STEP 7: Verify Student A & Student B Strict Isolation ---
    r_apps_a2 = client.get("/applications/me", headers=headers_a)
    apps_a2 = r_apps_a2.json()
    assert len(apps_a2) == 1
    assert apps_a2[0]["drive_id"] == "technova-backend"
    assert apps_a2[0]["company_name"] == "TechNova Solutions"

    r_apps_b2 = client.get("/applications/me", headers=headers_b)
    apps_b2 = r_apps_b2.json()
    assert len(apps_b2) == 1
    assert apps_b2[0]["drive_id"] == ext_drive_id
    assert apps_b2[0]["company_name"] == "CloudNova Systems"

    # --- STEP 8: Verify Duplicate Application Prevention ---
    r_dup_a = client.post("/students/apply-form", data=form_a, files=files_a, headers=headers_a)
    assert r_dup_a.status_code == 400
    assert "already applied" in r_dup_a.json()["detail"].lower()

    # --- STEP 9: Verify Candidate Pool Scoping ---
    r_pool_technova = client.get("/applications/pool?drive_id=technova-backend", headers=officer_headers)
    assert r_pool_technova.status_code == 200
    pool_technova = r_pool_technova.json()
    technova_student_ids = [c["student_id"] for c in pool_technova]
    assert student_a_id in technova_student_ids, "Student A must appear in TechNova pool"
    assert student_b_id not in technova_student_ids, "Student B must NOT appear in TechNova pool"

    # --- STEP 10: Verify Officer Shortlisting & Real Notification Sync ---
    r_shortlist = client.post(f"/applications/{app_a_id}/shortlist", json={
        "notes": "Excellent microservices experience",
        "round": "Technical Interview"
    }, headers=officer_headers)
    assert r_shortlist.status_code == 200

    # Student A's application status must now be SHORTLISTED
    r_apps_a_short = client.get("/applications/me", headers=headers_a)
    apps_a_short = r_apps_a_short.json()
    assert len(apps_a_short) == 1
    assert apps_a_short[0]["status"] == "SHORTLISTED"

    # Student B's applications must remain unaffected
    r_apps_b_short = client.get("/applications/me", headers=headers_b)
    apps_b_short = r_apps_b_short.json()
    assert len(apps_b_short) == 1
    assert apps_b_short[0]["status"] == "EXTERNAL_APPLICATION_COMPLETED"

    # --- STEP 11: Re-Login Persistence Test ---
    r_relogin_a = client.post("/auth/login", json={
        "email": student_a_email,
        "password": "password123",
        "portalRole": "student"
    })
    assert r_relogin_a.status_code == 200
    relogin_headers_a = {"Authorization": f"Bearer {r_relogin_a.json()['access_token']}"}

    r_apps_relogin_a = client.get("/applications/me", headers=relogin_headers_a)
    assert r_apps_relogin_a.status_code == 200
    relogin_apps_a = r_apps_relogin_a.json()
    assert len(relogin_apps_a) == 1
    assert relogin_apps_a[0]["drive_id"] == "technova-backend"
    assert relogin_apps_a[0]["status"] == "SHORTLISTED"

    print("\n[SUCCESS] All 11 End-to-End Application Isolation & Dynamic Verification Assertions Passed!")
