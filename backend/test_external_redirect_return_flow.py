import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_external_redirect_return_flow():
    print("=================================================================")
    print("TESTING EXTERNAL APPLICATION REDIRECT + RETURN CONFIRMATION FLOW")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # STEP 1: Register & Login Placement Officer
    officer_email = f"officer.ret{ts}@campus.edu"
    officer_name = f"Prof. Officer {ts}"
    print(f"\n--- STEP 1: Register & Login Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": officer_name,
        "email": officer_email,
        "password": "password123",
        "companyName": "ABC Technologies",
        "companyId": "comp-abc",
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

    # STEP 2: Register Student
    student_email = f"student.ret{ts}@campus.edu"
    student_name = "Devansh Singhal"
    print(f"\n--- STEP 2: Register Student ({student_email}) ---")
    r_reg_s = client.post("/auth/register/student", json={
        "name": student_name,
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 9.1
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

    # STEP 3: Initiate External Job Apply Attempt
    drive_id = f"ext-abc-{ts}"
    company_name = "ABC Technologies"
    job_title = "Software Engineer"
    external_url = "https://abc-technologies.example.com/careers/software-engineer"

    print(f"\n--- STEP 3: Student Clicks Apply -> POST /students/external-apply/start ---")
    start_payload = {
        "drive_id": drive_id,
        "company_name": company_name,
        "job_title": job_title,
        "company_id": "comp-abc",
        "application_url": external_url
    }
    r_start = client.post("/students/external-apply/start", json=start_payload, headers=student_headers)
    assert r_start.status_code == 200, f"Start failed: {r_start.text}"
    start_res = r_start.json()
    print("   External Apply Start Response:", start_res)
    assert start_res["status"] == "ok"
    assert start_res["redirect_url"] == external_url
    assert "return_token" in start_res
    return_token = start_res["return_token"]

    # STEP 4: Verify Application Attempt State is APPLICATION_STARTED
    print(f"\n--- STEP 4: Verify Application State is APPLICATION_STARTED ---")
    r_status = client.get(f"/students/external-apply/status?drive_id={drive_id}&token={return_token}", headers=student_headers)
    assert r_status.status_code == 200
    status_res = r_status.json()
    print("   Application Status Response:", status_res)
    assert status_res["application_status"] == "APPLICATION_STARTED"
    assert status_res["is_completed"] is False
    print("   -> State is correctly APPLICATION_STARTED (not prematurely completed).")

    # STEP 5: Test Return Flow - Unconfirmed / Not Completed Selection
    print(f"\n--- STEP 5: Test Student Returns & Selects 'No, not yet' ---")
    confirm_no_payload = {
        "drive_id": drive_id,
        "token": return_token,
        "completed": False
    }
    r_confirm_no = client.post("/students/external-apply/confirm", json=confirm_no_payload, headers=student_headers)
    assert r_confirm_no.status_code == 200
    confirm_no_res = r_confirm_no.json()
    print("   Confirm (completed=False) Response:", confirm_no_res)
    assert confirm_no_res["status"] == "not_confirmed"
    assert confirm_no_res["is_completed"] is False

    # STEP 6: Test Return Flow - Confirmed / Completed Selection
    print(f"\n--- STEP 6: Test Student Returns & Selects 'Yes, I completed it' ---")
    confirm_yes_payload = {
        "drive_id": drive_id,
        "token": return_token,
        "completed": True
    }
    r_confirm_yes = client.post("/students/external-apply/confirm", json=confirm_yes_payload, headers=student_headers)
    assert r_confirm_yes.status_code == 200
    confirm_yes_res = r_confirm_yes.json()
    print("   Confirm (completed=True) Response:", confirm_yes_res)
    assert confirm_yes_res["status"] == "ok"
    assert confirm_yes_res["is_completed"] is True
    assert "You have successfully applied for ABC Technologies" in confirm_yes_res["message"]

    # STEP 7: Verify My Applications Sync & Status Persistence
    print(f"\n--- STEP 7: Verify My Applications Sync in MongoDB ---")
    r_my_apps = client.get("/applications/me", headers=student_headers)
    assert r_my_apps.status_code == 200
    my_apps = r_my_apps.json()
    target_app = next((a for a in my_apps if a["drive_id"] == drive_id), None)
    assert target_app is not None, "Application must appear in student's My Applications!"
    print("   My Applications Record:")
    print("     - Company:", target_app["company_name"])
    print("     - Job Title:", target_app["job_title"])
    print("     - Status:", target_app["status"])
    print("     - Verification Type:", target_app.get("verification_type"))
    print("     - Source:", target_app.get("source"))
    assert target_app["status"] == "EXTERNAL_APPLICATION_COMPLETED"
    assert target_app["verification_type"] == "self_confirmed"
    assert target_app["source"] == "external"

    # STEP 8: Verify Placement Officer Notification
    print(f"\n--- STEP 8: Verify Placement Officer Received Completed Notification ---")
    r_off_notifs = client.get("/notifications", headers=officer_headers)
    assert r_off_notifs.status_code == 200
    off_notifs = r_off_notifs.json()
    comp_notif = next((n for n in off_notifs if n.get("student_id") == student_id), None)
    assert comp_notif is not None, "Officer must receive notification of completed external application!"
    print("   Officer Notification:")
    print("     - Title:", comp_notif["title"])
    print("     - Message:", comp_notif["message"])
    assert "Devansh Singhal has applied for Software Engineer role at ABC Technologies placement drive." in comp_notif["message"]

    # STEP 9: Verify Duplicate Prevention (Already Applied)
    print(f"\n--- STEP 9: Verify Duplicate Prevention ---")
    r_start_dup = client.post("/students/external-apply/start", json=start_payload, headers=student_headers)
    assert r_start_dup.status_code == 200
    dup_res = r_start_dup.json()
    print("   Duplicate Start Response:", dup_res)
    assert dup_res["status"] == "already_applied"
    assert dup_res["already_applied"] is True
    print("   -> Duplicate application prevention verified.")

    print("\n=================================================================")
    print("EXTERNAL APPLICATION REDIRECT + RETURN FLOW 100% VERIFIED PASS!")
    print("=================================================================")

if __name__ == "__main__":
    test_external_redirect_return_flow()
