import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_student_application_flow():
    print("=================================================================")
    print("TESTING STUDENT APPLICATION FORM + RESUME ANALYSIS + OFFICER NOTIFICATION + CANDIDATE POOL")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # STEP 1: Register Placement Officer & Create Available Interview Slot
    officer_email = f"officer.flow{ts}@campus.edu"
    officer_name = f"Prof. Officer {ts}"
    print(f"\n--- STEP 1: Register & Login Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": officer_name,
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Solutions",
        "companyId": "comp-1",
        "designation": "Placement Lead"
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

    # Create manual interview availability slot with unique date/time
    slot_payload = {
        "panel_name": f"Technical Panel {ts % 1000}",
        "panel_members": ["Rahul Sharma", "Priya Verma", "Amit Kumar"],
        "date": "2026-09-15",
        "start_time": f"{(ts % 12) + 1:02d}:00 AM",
        "end_time": f"{(ts % 12) + 1:02d}:30 AM",
        "block": "Block B",
        "room_number": f"B-{ts % 500}",
        "status": "AVAILABLE"
    }
    r_slot = client.post("/interviews/availability", json=slot_payload, headers=officer_headers)
    assert r_slot.status_code == 201, f"Failed to create slot: {r_slot.text}"
    slot_id = r_slot.json()["id"]
    panel_name = r_slot.json()["panel_name"]
    block_name = r_slot.json()["block"]
    room_num = r_slot.json()["room_number"]
    slot_date = r_slot.json()["date"]
    slot_time = f"{r_slot.json()['start_time']} - {r_slot.json()['end_time']}"
    print(f"   Created Interview Slot: {slot_id} ({panel_name} in {block_name} {room_num}) [OK]")

    # STEP 2: Register New Student
    student_email = f"rahul.sharma{ts}@campus.edu"
    student_name = "Rahul Sharma"
    print(f"\n--- STEP 2: Register New Student ({student_email}) ---")
    r_reg_s = client.post("/auth/register/student", json={
        "name": student_name,
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "BITS Pilani, Hyderabad Campus",
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

    # STEP 3: Test Resume Required Gate
    print("\n--- STEP 3: Test Resume Required on Application Submission ---")
    r_no_resume = client.post("/students/apply", json={"driveId": "technova-backend"}, headers=student_headers)
    assert r_no_resume.status_code == 400, f"Expected 400 when no resume provided, got {r_no_resume.status_code}"
    print(f"   Submission without resume properly blocked: {r_no_resume.json()['detail']}")

    # STEP 4: Submit Application with Simple Form Fields + Resume Upload
    print("\n--- STEP 4: Submit Application with Form Fields + Resume File ---")
    resume_pdf_content = b"""
    Rahul Sharma
    Email: rahul.sharma@campus.edu
    Education: B.Tech Computer Science, BITS Pilani, Hyderabad Campus, CGPA: 9.1
    Technical Skills: Java, Python, MongoDB, React, SQL
    Projects: AI Campus Placement Agent, Weather Application
    """

    form_data = {
        "driveId": "technova-backend",
        "name": "Rahul Sharma",
        "mobile": "9876543210",
        "college_name": "BITS Pilani, Hyderabad Campus",
        "location": "Guntur, Andhra Pradesh",
    }
    files = {
        "file": ("rahul_sharma_resume.pdf", resume_pdf_content, "application/pdf")
    }

    r_apply = client.post("/students/apply-form", data=form_data, files=files, headers=student_headers)
    assert r_apply.status_code == 200, f"Application form failed: {r_apply.text}"
    app_res = r_apply.json()
    print("   Application Submission Response:", app_res)
    assert app_res["status"] == "ok"
    assert app_res["applicant"]["mobile"] == "9876543210"
    assert app_res["applicant"]["location"] == "Guntur, Andhra Pradesh"
    app_id = app_res["applicationId"]

    # STEP 5: Verify Duplicate Application Prevention
    print("\n--- STEP 5: Test Duplicate Application Prevention ---")
    r_dup = client.post("/students/apply-form", data=form_data, files=files, headers=student_headers)
    assert r_dup.status_code == 400, f"Expected 400 on duplicate apply, got {r_dup.status_code}"
    print(f"   Duplicate application properly blocked: {r_dup.json()['detail']}")

    # STEP 6: Verify Officer Received APPLICATION_RECEIVED Notification
    print("\n--- STEP 6: Verify Officer Received 'New Placement Application' Notification ---")
    r_off_notifs = client.get("/notifications", headers=officer_headers)
    assert r_off_notifs.status_code == 200
    off_notifs = r_off_notifs.json()
    app_notif = next((n for n in off_notifs if n.get("type") == "APPLICATION_RECEIVED" and n.get("student_id") == student_id), None)
    assert app_notif is not None, "Officer must receive APPLICATION_RECEIVED notification"
    print(f"   Officer Notification:")
    print(f"     - Title: {app_notif['title']}")
    print(f"     - Message: {app_notif['message']}")
    assert "Rahul Sharma has applied for Backend Developer role at TechNova Solutions placement drive." in app_notif["message"]
    print("   -> SUCCESS: Officer received exact APPLICATION_RECEIVED notification")

    # STEP 7: Verify Placement Officer Candidate Pool Sync
    print("\n--- STEP 7: Verify Candidate Pool Displays Real Applicant with Extracted Data ---")
    r_pool = client.get("/applications/pool", headers=officer_headers)
    assert r_pool.status_code == 200
    pool = r_pool.json()
    candidate = next((c for c in pool if c["student_id"] == student_id), None)
    assert candidate is not None, "Candidate must appear in Candidate Pool"

    print("   Candidate Pool Details:")
    print(f"     - Name: {candidate['student_name']}")
    print(f"     - Mobile: {candidate['mobile']}")
    print(f"     - College: {candidate['college_name']}")
    print(f"     - Location: {candidate['location']}")
    print(f"     - Skills: {candidate['skills']}")
    print(f"     - Projects: {candidate['projects']}")
    print(f"     - Status: {candidate['status']}")

    assert candidate["mobile"] == "9876543210"
    assert "Guntur" in candidate["location"]
    assert candidate["status"] == "APPLIED"
    assert any("Python" in s or "Java" in s for s in candidate["skills"])
    print("   -> SUCCESS: Candidate Pool displays real applicant with resume extracted skills & projects")

    # STEP 8: Officer Shortlists Candidate with Saved Slot
    print(f"\n--- STEP 8: Officer Shortlists Candidate with Slot ID {slot_id} ---")
    r_shortlist = client.post(f"/applications/{app_id}/shortlist", json={"slot_id": slot_id}, headers=officer_headers)
    assert r_shortlist.status_code == 200
    assert r_shortlist.json()["applicationStatus"] == "SHORTLISTED"
    print("   Candidate shortlisted successfully [OK]")

    # STEP 9: Student Receives Shortlist Notification with Exact Logistics
    print("\n--- STEP 9: Student Receives Shortlist Notification ---")
    r_student_notifs = client.get("/notifications", headers=student_headers)
    assert r_student_notifs.status_code == 200
    shortlist_notif = next((n for n in r_student_notifs.json() if n.get("type") == "APPLICATION_SHORTLISTED"), None)
    assert shortlist_notif is not None
    s_msg = shortlist_notif["message"]
    print("   Shortlist Notification Preview:\n", s_msg.encode("ascii", "ignore").decode("ascii"))
    assert "TechNova Solutions" in s_msg
    assert "Backend Developer" in s_msg
    assert slot_date in s_msg
    assert panel_name in s_msg
    assert block_name in s_msg
    assert room_num in s_msg
    print("   -> SUCCESS: Student received shortlist notification with all exact logistics")

    # STEP 10: Student Dashboard Persistence
    print("\n--- STEP 10: Verify Student Dashboard Application Details ---")
    r_my_apps = client.get("/applications/me", headers=student_headers)
    assert r_my_apps.status_code == 200
    my_app = r_my_apps.json()[0]
    assert my_app["status"] == "SHORTLISTED"
    assert my_app["interview"]["panel_name"] == panel_name
    assert my_app["interview"]["block"] == block_name
    assert my_app["interview"]["room_number"] == room_num
    print("   -> SUCCESS: Student Dashboard persists application and interview logistics")

    print("\n=================================================================")
    print("ALL APPLICATION FORM, RESUME ANALYSIS & POOL SYNC TESTS PASSED 100%!")
    print("=================================================================")

if __name__ == "__main__":
    test_student_application_flow()
