import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_resume_reuse_and_application_flow():
    print("=================================================================")
    print("TESTING FIX RESUME RE-UPLOAD ISSUE IN STUDENT JOB APPLICATION FLOW")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # =========================================================================
    # PART 1: STUDENT A (Uploads Resume -> Analyzes -> Applies using Existing)
    # =========================================================================
    print("\n--- PART 1: Testing Student A (Uploads in Analyzer -> Applies with Existing Resume) ---")

    student_a_email = f"student.a.{ts}@campus.edu"
    student_a_name = f"Dipesh Gupta {ts}"
    
    # 1. Register Student A
    r_reg_a = client.post("/auth/register/student", json={
        "name": student_a_name,
        "email": student_a_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 8.8
    })
    assert r_reg_a.status_code in (200, 201), f"Register failed: {r_reg_a.text}"
    student_a_id = r_reg_a.json().get("id") or r_reg_a.json().get("user", {}).get("id")

    r_login_a = client.post("/auth/login", json={
        "email": student_a_email,
        "password": "password123",
        "portalRole": "student"
    })
    assert r_login_a.status_code == 200, f"Login failed: {r_login_a.text}"
    token_a = r_login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Verify initial state before resume upload
    r_prof_a_pre = client.get("/students/me", headers=headers_a)
    assert r_prof_a_pre.status_code == 200
    assert r_prof_a_pre.json()["hasResume"] == False
    print("   [OK] Student A hasResume is False before upload")

    # 3. Student A Uploads & Analyzes Resume via Resume Analyzer
    resume_a_pdf = b"""%PDF-1.4
Dipesh Gupta
Email: dipesh.gupta@campus.edu
Education: B.Tech Computer Science, Campus University, CGPA: 8.8
Technical Skills: Python, FastAPI, React, MongoDB, Docker, SQL
Projects: AI Placement Agent Platform, Smart Attendance System
%%EOF"""
    
    files_a = {
        "file": ("Dipesh_Gupta_Resume.pdf", resume_a_pdf, "application/pdf")
    }
    r_analyze_a = client.post("/resumes/analyze", files=files_a, headers=headers_a)
    assert r_analyze_a.status_code == 200, f"Analyze failed: {r_analyze_a.text}"
    analyzed_data_a = r_analyze_a.json()
    resume_a_id = analyzed_data_a["resume_id"]
    print(f"   [OK] Resume Analyzer processed resume. Resume ID: {resume_a_id}, Filename: {analyzed_data_a['filename']}")

    # 4. Check that Student A's profile now reflects the active resume
    r_prof_a_post = client.get("/students/me", headers=headers_a)
    assert r_prof_a_post.status_code == 200
    prof_a_data = r_prof_a_post.json()
    assert prof_a_data["hasResume"] == True
    assert prof_a_data["resumeId"] == resume_a_id
    assert "Dipesh_Gupta_Resume.pdf" in (prof_a_data["resumeFilename"] or "")
    print("   [OK] Backend GET /api/students/me confirms hasResume=True, resumeId and resumeFilename")

    # 5. Student A applies for placement drive WITHOUT re-uploading file
    r_apply_a = client.post(
        "/students/apply-form",
        data={
            "driveId": "technova-backend",
            "name": student_a_name,
            "mobile": "9876543210",
            "college_name": "Campus University",
            "location": "Bengaluru",
            "company_name": "TechNova Solutions",
            "job_title": "Backend Developer"
        },
        headers=headers_a
    )
    assert r_apply_a.status_code == 200, f"Apply without file failed: {r_apply_a.text}"
    apply_res_a = r_apply_a.json()
    print("   [OK] Student A successfully applied without re-uploading resume!")
    assert apply_res_a["status"] == "ok"
    assert apply_res_a["studentId"] == student_a_id

    # 6. Verify application in /api/applications/me has existing resume attached
    r_my_apps_a = client.get("/applications/me", headers=headers_a)
    assert r_my_apps_a.status_code == 200
    apps_a = r_my_apps_a.json()
    assert len(apps_a) > 0
    app_a = apps_a[0]
    assert app_a["student_id"] == student_a_id
    assert app_a["resume_id"] == resume_a_id
    assert "Dipesh_Gupta_Resume.pdf" in app_a["resume_url"]
    assert any("Python" in s or "FastAPI" in s for s in app_a["skills"])
    print(f"   [OK] Verified Application references existing resumeId: {app_a['resume_id']} and skills: {app_a['skills']}")

    # =========================================================================
    # PART 2: STUDENT B (Has No Resume -> Blocked -> Uploads -> Applies)
    # =========================================================================
    print("\n--- PART 2: Testing Student B (Has No Resume -> Gated -> Uploads & Applies) ---")

    student_b_email = f"student.b.{ts}@campus.edu"
    student_b_name = f"Rohan Mehta {ts}"

    # 1. Register Student B
    r_reg_b = client.post("/auth/register/student", json={
        "name": student_b_name,
        "email": student_b_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000 + 1}",
        "branch": "CSE",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 8.2
    })
    assert r_reg_b.status_code in (200, 201)
    student_b_id = r_reg_b.json().get("id") or r_reg_b.json().get("user", {}).get("id")

    r_login_b = client.post("/auth/login", json={
        "email": student_b_email,
        "password": "password123",
        "portalRole": "student"
    })
    assert r_login_b.status_code == 200
    token_b = r_login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. Verify Student B has no resume
    r_prof_b = client.get("/students/me", headers=headers_b)
    assert r_prof_b.status_code == 200
    assert r_prof_b.json()["hasResume"] == False
    print("   [OK] Student B hasResume is False")

    # 3. Student B tries to apply without resume -> MUST fail with 400 validation error
    r_apply_b_fail = client.post(
        "/students/apply-form",
        data={
            "driveId": "technova-backend",
            "name": student_b_name,
            "mobile": "9876543211",
            "college_name": "Campus University",
            "location": "Bengaluru",
            "company_name": "TechNova Solutions",
            "job_title": "Backend Developer"
        },
        headers=headers_b
    )
    assert r_apply_b_fail.status_code == 400, f"Expected 400 when applying without resume, got: {r_apply_b_fail.status_code}"
    err_detail = r_apply_b_fail.json().get("detail", "")
    assert "Please upload and analyze your resume before applying." in err_detail or "resume" in err_detail.lower()
    print(f"   [OK] Student B application properly rejected: {err_detail}")

    # 4. Student B uploads resume in the application flow
    resume_b_pdf = b"""%PDF-1.4
Rohan Mehta
Email: rohan.mehta@campus.edu
Education: B.Tech Computer Science, Campus University, CGPA: 8.2
Technical Skills: Java, Spring Boot, MySQL, AWS
Projects: E-Commerce Microservices, Cloud Security Auditor
%%EOF"""

    files_b = {
        "file": ("Rohan_Mehta_Resume.pdf", resume_b_pdf, "application/pdf")
    }
    r_apply_b_success = client.post(
        "/students/apply-form",
        data={
            "driveId": "technova-backend",
            "name": student_b_name,
            "mobile": "9876543211",
            "college_name": "Campus University",
            "location": "Bengaluru",
            "company_name": "TechNova Solutions",
            "job_title": "Backend Developer"
        },
        files=files_b,
        headers=headers_b
    )
    assert r_apply_b_success.status_code == 200, f"Application with file failed: {r_apply_b_success.text}"
    print("   [OK] Student B application succeeded after uploading resume!")

    # 5. Check Student B's profile is now updated with active resume
    r_prof_b_post = client.get("/students/me", headers=headers_b)
    assert r_prof_b_post.status_code == 200
    assert r_prof_b_post.json()["hasResume"] == True
    print("   [OK] Student B profile now has active resume attached for all future drives!")

    print("\n=================================================================")
    print("ALL TESTS PASSED: RESUME RE-UPLOAD ISSUE FIXED 100%!")
    print("=================================================================")

if __name__ == "__main__":
    test_resume_reuse_and_application_flow()
