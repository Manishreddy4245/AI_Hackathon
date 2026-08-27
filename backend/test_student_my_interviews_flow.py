import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_student_my_interviews_flow():
    print("=================================================================")
    print("TESTING STUDENT MY INTERVIEWS SYNC WITH SHORTLISTED ASSIGNMENT")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # STEP 1: Register & Login Placement Officer
    officer_email = f"officer.int{ts}@campus.edu"
    officer_name = f"Prof. Officer {ts}"
    print(f"\n--- STEP 1: Register & Login Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": officer_name,
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Solutions",
        "companyId": "comp-1",
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

    # STEP 2: Placement Officer Creates Available Interview Slot
    print("\n--- STEP 2: Placement Officer Creates Available Interview Slot ---")
    slot_payload = {
        "panel_name": f"Technical Panel Alpha {ts % 1000}",
        "panel_members": ["Rahul Sharma", "Priya Verma", "Amit Kumar"],
        "date": "2026-08-25",
        "start_time": "10:00 AM",
        "end_time": "10:30 AM",
        "block": "Block B",
        "room_number": f"B-{ts % 1000}",
        "status": "AVAILABLE"
    }
    r_slot = client.post("/interviews/availability", json=slot_payload, headers=officer_headers)
    assert r_slot.status_code == 201, f"Failed to create slot: {r_slot.text}"
    slot = r_slot.json()
    slot_id = slot["id"]
    print(f"   Slot created successfully: ID={slot_id}, Panel={slot['panel_name']}, Room={slot['room_number']}")

    # STEP 3: Register Student 1 & Submit Application
    student1_email = f"student1.int{ts}@campus.edu"
    student1_name = "Vikram Aditya"
    print(f"\n--- STEP 3: Register Student 1 ({student1_email}) & Submit Application ---")
    r_reg_s1 = client.post("/auth/register/student", json={
        "name": student1_name,
        "email": student1_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 8.9
    })
    assert r_reg_s1.status_code in (200, 201)
    student1_id = r_reg_s1.json().get("id") or r_reg_s1.json().get("user", {}).get("id")

    r_login_s1 = client.post("/auth/login", json={
        "email": student1_email,
        "password": "password123",
        "portalRole": "student"
    })
    assert r_login_s1.status_code == 200
    student1_token = r_login_s1.json()["access_token"]
    student1_headers = {"Authorization": f"Bearer {student1_token}"}

    # Verify Initial Empty State of My Interviews
    print("\n--- STEP 4: Verify Student Initial My Interviews Empty State ---")
    r_initial_int = client.get("/interviews/student/me", headers=student1_headers)
    assert r_initial_int.status_code == 200
    assert len(r_initial_int.json()) == 0, "Student with no interviews must receive empty list!"
    print("   -> Initial empty state verified: 0 interviews.")

    # Student Applies for Drive
    resume_pdf_content = b"""
    Vikram Aditya
    Email: student1@campus.edu
    Education: B.Tech Computer Science, Campus University, CGPA: 8.9
    Technical Skills: Java, Spring Boot, MySQL, Docker, React, Microservices
    Projects: Placement Management Portal, Cloud Inventory Microservice
    """
    form_data = {
        "driveId": "technova-backend",
        "company_name": "TechNova Solutions",
        "job_title": "Backend Developer",
        "name": student1_name,
        "mobile": "9988776655",
        "college_name": "Campus University",
        "location": "Bengaluru, Karnataka",
    }
    files = {
        "file": ("vikram_resume.pdf", resume_pdf_content, "application/pdf")
    }
    r_app = client.post("/students/apply-form", data=form_data, files=files, headers=student1_headers)
    assert r_app.status_code == 200
    app_id = r_app.json()["applicationId"]
    print(f"   Application submitted: ID={app_id}")

    # STEP 5: Officer Shortlists Student 1 with Slot
    print("\n--- STEP 5: Officer Shortlists Student & Assigns Interview Slot ---")
    shortlist_payload = {
        "status": "SHORTLISTED",
        "slot_id": slot_id
    }
    r_shortlist = client.post(f"/applications/{app_id}/shortlist", json=shortlist_payload, headers=officer_headers)
    assert r_shortlist.status_code == 200
    print("   Shortlist & interview assignment confirmed by backend.")

    # STEP 6: Verify Student Notification Contains Interview Details
    print("\n--- STEP 6: Verify Student Shortlist Notification ---")
    r_notifs = client.get("/notifications", headers=student1_headers)
    assert r_notifs.status_code == 200
    notifs = r_notifs.json()
    shortlist_notif = next((n for n in notifs if n.get("type") == "APPLICATION_SHORTLISTED"), None)
    assert shortlist_notif is not None, "Student must receive APPLICATION_SHORTLISTED notification!"
    print("   Student Notification Content:")
    print("     Title:", shortlist_notif["title"].encode("ascii", "replace").decode())
    print("     Message:\n" + shortlist_notif["message"].encode("ascii", "replace").decode())
    assert "TechNova Solutions" in shortlist_notif["message"]
    assert "2026-08-25" in shortlist_notif["message"]
    assert slot['panel_name'] in shortlist_notif["message"]

    # STEP 7: Student Calls My Interviews API (`GET /api/interviews/student/me`)
    print("\n--- STEP 7: Student Calls My Interviews API & Validates All Fields ---")
    r_my_int = client.get("/interviews/student/me", headers=student1_headers)
    assert r_my_int.status_code == 200
    my_interviews = r_my_int.json()
    assert len(my_interviews) == 1, f"Expected 1 interview, got {len(my_interviews)}"
    interview = my_interviews[0]

    print("   Interview Record Returned to Student:")
    print(f"     - Interview ID: {interview['interview_id']}")
    print(f"     - Application ID: {interview['application_id']}")
    print(f"     - Student ID: {interview['student_id']}")
    print(f"     - Company Name: {interview['company_name']}")
    print(f"     - Job Title: {interview['job_title']}")
    print(f"     - Panel Name: {interview['panel_name']}")
    print(f"     - Panel Members: {interview['panel_members']}")
    print(f"     - Block: {interview['block']}")
    print(f"     - Room Number: {interview['room_number']}")
    print(f"     - Date: {interview['date']}")
    print(f"     - Start Time: {interview['start_time']}")
    print(f"     - End Time: {interview['end_time']}")
    print(f"     - Status: {interview['status']}")

    assert interview["company_name"] == "TechNova Solutions"
    assert interview["job_title"] == "Backend Developer"
    assert interview["panel_name"] == slot_payload["panel_name"]
    assert interview["panel_members"] == ["Rahul Sharma", "Priya Verma", "Amit Kumar"]
    assert interview["block"] == "Block B"
    assert interview["room_number"] == slot_payload["room_number"]
    assert interview["date"] == "2026-08-25"
    assert interview["start_time"] == "10:00 AM"
    assert interview["end_time"] == "10:30 AM"
    assert interview["status"] == "SCHEDULED"
    print("   -> ALL REQUIRED FIELDS VERIFIED MATCHING MongoDB ASSIGNMENT!")

    # STEP 8: Verify Alias Endpoint `GET /api/students/me/interviews`
    print("\n--- STEP 8: Verify Alias Endpoint /api/students/me/interviews ---")
    r_alias = client.get("/students/me/interviews", headers=student1_headers)
    assert r_alias.status_code == 200
    assert len(r_alias.json()) == 1
    print("   -> Alias endpoint verified.")

    # STEP 9: Verify Authentication Isolation (Student 2 cannot see Student 1's interview)
    print("\n--- STEP 9: Verify Strict Authentication Isolation ---")
    student2_email = f"student2.int{ts}@campus.edu"
    r_reg_s2 = client.post("/auth/register/student", json={
        "name": "Pooja Sharma",
        "email": student2_email,
        "password": "password123",
        "rollNumber": f"2024CS{ (ts + 1) % 10000}",
        "branch": "IT",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 9.0
    })
    assert r_reg_s2.status_code in (200, 201)
    r_login_s2 = client.post("/auth/login", json={
        "email": student2_email,
        "password": "password123",
        "portalRole": "student"
    })
    s2_token = r_login_s2.json()["access_token"]
    s2_headers = {"Authorization": f"Bearer {s2_token}"}

    r_s2_int = client.get("/interviews/student/me", headers=s2_headers)
    assert r_s2_int.status_code == 200
    assert len(r_s2_int.json()) == 0, "Student 2 must NOT see Student 1's interview!"
    print("   -> Strict student authentication isolation verified (0 interviews for Student 2).")

    # STEP 10: Verify Persistence Across Re-Login
    print("\n--- STEP 10: Verify Persistence Across Re-Login ---")
    r_relogin_s1 = client.post("/auth/login", json={
        "email": student1_email,
        "password": "password123",
        "portalRole": "student"
    })
    re_token = r_relogin_s1.json()["access_token"]
    r_re_int = client.get("/interviews/student/me", headers={"Authorization": f"Bearer {re_token}"})
    assert r_re_int.status_code == 200
    assert len(r_re_int.json()) == 1
    assert r_re_int.json()[0]["panel_name"] == slot_payload["panel_name"]
    print("   -> Persistence across login/refresh verified 100%.")

    print("\n=================================================================")
    print("STUDENT MY INTERVIEWS SYNCHRONIZATION FLOW VERIFIED 100% PASS!")
    print("=================================================================")

if __name__ == "__main__":
    test_student_my_interviews_flow()
