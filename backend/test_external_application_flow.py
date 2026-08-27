import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_external_application_flow():
    print("=================================================================")
    print("TESTING EXTERNAL COMPANY WEBSITE APPLICATION -> OFFICER NOTIFICATION & CANDIDATE POOL SYNC")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # STEP 1: Register & Login Placement Officer
    officer_email = f"officer.ext{ts}@campus.edu"
    officer_name = f"Prof. Officer {ts}"
    print(f"\n--- STEP 1: Register & Login Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": officer_name,
        "email": officer_email,
        "password": "password123",
        "companyName": "Cloudflare",
        "companyId": "comp-cloudflare",
        "designation": "Placement Officer"
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

    # STEP 2: Register New Student
    student_email = f"applicant.ext{ts}@campus.edu"
    student_name = "Aman Gupta"
    print(f"\n--- STEP 2: Register New Student ({student_email}) ---")
    r_reg_s = client.post("/auth/register/student", json={
        "name": student_name,
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "BITS Pilani, Hyderabad Campus",
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
    student_token = r_login_s.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # STEP 3: Student Applies for External Opportunity (Cloudflare Systems Engineer)
    print("\n--- STEP 3: Submit Application for External Company Website Opportunity ---")
    resume_pdf_content = b"""
    Aman Gupta
    Email: aman.gupta@campus.edu
    Education: B.Tech Computer Science, BITS Pilani, CGPA: 9.2
    Technical Skills: Python, Golang, Docker, Kubernetes, Linux, AWS
    Projects: Distributed Cache Engine, Cloudflare Edge Worker Analytics
    """

    form_data = {
        "driveId": f"ext-cloudflare-{ts}",
        "company_name": "Cloudflare",
        "job_title": "Systems Engineer",
        "company_id": "comp-cloudflare",
        "source": "external",
        "application_url": "https://boards.greenhouse.io/cloudflare/jobs/7690327",
        "name": "Aman Gupta",
        "mobile": "9811223344",
        "college_name": "BITS Pilani, Hyderabad Campus",
        "location": "Bengaluru, Karnataka",
    }
    files = {
        "file": ("aman_gupta_resume.pdf", resume_pdf_content, "application/pdf")
    }

    r_apply = client.post("/students/apply-form", data=form_data, files=files, headers=student_headers)
    assert r_apply.status_code == 200, f"Application form failed: {r_apply.text}"
    app_res = r_apply.json()
    print("   Application Submission Response:", app_res)
    assert app_res["status"] == "ok"
    assert app_res["source"] == "external"
    assert app_res["applicationUrl"] == "https://boards.greenhouse.io/cloudflare/jobs/7690327"
    assert app_res["applicant"]["mobile"] == "9811223344"
    app_id = app_res["applicationId"]

    # STEP 4: Verify Officer Notification
    print("\n--- STEP 4: Verify Officer Received Notification for External Company Website Application ---")
    r_off_notifs = client.get("/notifications", headers=officer_headers)
    assert r_off_notifs.status_code == 200
    off_notifs = r_off_notifs.json()
    app_notif = next((n for n in off_notifs if n.get("type") == "APPLICATION_RECEIVED" and n.get("student_id") == student_id), None)
    assert app_notif is not None, "Placement Officer must receive notification for external job application!"
    print(f"   Officer Notification:")
    print(f"     - Title: {app_notif['title']}")
    print(f"     - Message: {app_notif['message']}")
    print(f"     - Source: {app_notif.get('source')}")
    print(f"     - Application URL: {app_notif.get('application_url')}")
    assert "Aman Gupta has applied for Systems Engineer role at Cloudflare placement drive." in app_notif["message"]
    print("   -> SUCCESS: Officer received notification with company and role details!")

    # STEP 5: Verify Placement Officer Candidate Pool Sync
    print("\n--- STEP 5: Verify Candidate Pool Contains External Applicant with Real Resume Details ---")
    r_pool = client.get("/applications/pool", headers=officer_headers)
    assert r_pool.status_code == 200
    pool = r_pool.json()
    candidate = next((c for c in pool if c["student_id"] == student_id), None)
    assert candidate is not None, "Candidate must appear in Placement Officer Candidate Pool!"

    print("   Candidate Details in Officer Candidate Pool:")
    print(f"     - Name: {candidate['student_name']}")
    print(f"     - Mobile: {candidate['mobile']}")
    print(f"     - College: {candidate['college_name']}")
    print(f"     - Location: {candidate['location']}")
    print(f"     - Company: {candidate['company_name']}")
    print(f"     - Job Role: {candidate['job_title']}")
    print(f"     - Source: {candidate['source']}")
    print(f"     - Skills: {candidate['skills']}")
    print(f"     - Projects: {candidate['projects']}")
    print(f"     - Status: {candidate['status']}")

    assert candidate["mobile"] == "9811223344"
    assert candidate["company_name"] == "Cloudflare"
    assert candidate["job_title"] == "Systems Engineer"
    assert candidate["source"] == "external"
    assert any("Golang" in s or "Python" in s or "Docker" in s for s in candidate["skills"])
    print("   -> SUCCESS: External website applicant placed into Candidate Pool with resume extracted skills & projects!")

    print("\n=================================================================")
    print("EXTERNAL COMPANY WEBSITE APPLICATION WORKFLOW VERIFIED 100%!")
    print("=================================================================")

if __name__ == "__main__":
    test_external_application_flow()
