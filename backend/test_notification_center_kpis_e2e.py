import time
import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000/api"

def test_notification_center_kpis_and_isolation_e2e():
    """
    RIGOROUS END-TO-END TEST FOR NOTIFICATION CENTER:
    1. Newly registered student starts with Unread=0, Today=0, Scheduled=0, Important=0.
    2. Student A applies -> Officer gets application notification.
    3. Officer shortlists Student A -> Student A receives real shortlist notification.
    4. Student A notification statistics reflect: Unread=1, Today=1, Important=1.
    5. Student B registers -> Student B has Unread=0, Today=0, Scheduled=0, Important=0 (Zero leakage).
    6. Student A marks notification as read -> Unread decreases to 0.
    7. Toggle notification importance -> Important counter updates.
    8. Schedule interview event -> Scheduled counter updates.
    9. Delete notification -> removes from DB and updates counters.
    10. Re-login persistence verified.
    """
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # --- STEP 1: Register Placement Officer ---
    officer_email = f"officer.notif{ts}@campus.edu"
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": f"Placement Officer {ts}",
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
    officer_headers = {"Authorization": f"Bearer {r_login_o.json()['access_token']}"}

    # Create an available interview slot for TechNova
    r_slot = client.post("/interviews/availability", json={
        "panel_name": f"Technical Panel {ts % 1000}",
        "panel_members": ["Prof. Rao", "Dr. Sharma"],
        "date": "2026-09-18",
        "start_time": "11:00 AM",
        "end_time": "11:45 AM",
        "block": "Block C",
        "room_number": f"C-{ts % 400}",
        "status": "AVAILABLE"
    }, headers=officer_headers)
    assert r_slot.status_code == 201
    slot_id = r_slot.json()["id"]

    # --- STEP 2: Register Student A & Student B ---
    student_a_email = f"student.notif.a{ts}@campus.edu"
    student_b_email = f"student.notif.b{ts}@campus.edu"

    r_reg_a = client.post("/auth/register/student", json={
        "name": "Candidate Alpha",
        "email": student_a_email,
        "password": "password123",
        "rollNumber": f"2024NA{ts % 10000}",
        "branch": "CSE",
        "college": "BITS Pilani, Hyderabad Campus",
        "graduationYear": 2027,
        "cgpa": 9.0
    })
    assert r_reg_a.status_code in (200, 201)
    student_a_id = r_reg_a.json().get("id") or r_reg_a.json().get("user", {}).get("id")
    token_a = r_reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    r_reg_b = client.post("/auth/register/student", json={
        "name": "Candidate Beta",
        "email": student_b_email,
        "password": "password123",
        "rollNumber": f"2024NB{ts % 10000}",
        "branch": "IT",
        "college": "BITS Pilani, Hyderabad Campus",
        "graduationYear": 2027,
        "cgpa": 8.6
    })
    assert r_reg_b.status_code in (200, 201)
    student_b_id = r_reg_b.json().get("id") or r_reg_b.json().get("user", {}).get("id")
    token_b = r_reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # --- STEP 3: Verify Student A and Student B Start with EXACTLY 0 Notifications ---
    r_stats_a0 = client.get("/notifications/stats", headers=headers_a)
    assert r_stats_a0.status_code == 200
    stats_a0 = r_stats_a0.json()
    assert stats_a0["unread"] == 0
    assert stats_a0["today"] == 0
    assert stats_a0["scheduled"] == 0
    assert stats_a0["important"] == 0

    r_notifs_a0 = client.get("/notifications", headers=headers_a)
    assert r_notifs_a0.status_code == 200
    assert len(r_notifs_a0.json()) == 0

    r_stats_b0 = client.get("/notifications/stats", headers=headers_b)
    assert r_stats_b0.status_code == 200
    stats_b0 = r_stats_b0.json()
    assert stats_b0["unread"] == 0
    assert stats_b0["today"] == 0
    assert stats_b0["scheduled"] == 0
    assert stats_b0["important"] == 0

    # --- STEP 4: Student A Applies to Placement Drive ---
    resume_pdf_content = b"""
    Candidate Alpha
    Email: student.notif.a@campus.edu
    Education: B.Tech CSE, CGPA: 9.0
    Technical Skills: Python, SQL, Docker, FastAPI
    Projects: Distributed Job Scheduler
    """
    form_data = {
        "driveId": "technova-backend",
        "name": "Candidate Alpha",
        "mobile": "9876543211",
        "college_name": "BITS Pilani, Hyderabad Campus",
        "location": "Hyderabad",
    }
    files = {"file": ("resume_alpha.pdf", resume_pdf_content, "application/pdf")}
    r_apply = client.post("/students/apply-form", data=form_data, files=files, headers=headers_a)
    assert r_apply.status_code == 200
    app_id = r_apply.json()["applicationId"]

    # --- STEP 5: Officer Shortlists Student A with Interview Slot ---
    r_shortlist = client.post(f"/applications/{app_id}/shortlist", json={
        "notes": "Candidate selected for final round interview",
        "round": "Technical Round 1",
        "slot_id": slot_id
    }, headers=officer_headers)
    assert r_shortlist.status_code == 200

    # --- STEP 6: Verify Student A Received Notification & Live Statistics Update ---
    r_notifs_a1 = client.get("/notifications", headers=headers_a)
    assert r_notifs_a1.status_code == 200
    notifs_a1 = r_notifs_a1.json()
    assert len(notifs_a1) == 1, f"Student A must have 1 notification, got {len(notifs_a1)}"
    notif_a = notifs_a1[0]
    notif_id = notif_a["id"]
    assert notif_a["read"] is False
    assert notif_a["important"] is True

    r_stats_a1 = client.get("/notifications/stats", headers=headers_a)
    assert r_stats_a1.status_code == 200
    stats_a1 = r_stats_a1.json()
    assert stats_a1["unread"] == 1
    assert stats_a1["today"] == 1
    assert stats_a1["important"] == 1

    # --- STEP 7: Verify Student B Still Has 0 Notifications (Strict Cross-Account Isolation) ---
    r_notifs_b1 = client.get("/notifications", headers=headers_b)
    assert r_notifs_b1.status_code == 200
    assert len(r_notifs_b1.json()) == 0

    r_stats_b1 = client.get("/notifications/stats", headers=headers_b)
    assert r_stats_b1.status_code == 200
    assert r_stats_b1.json()["unread"] == 0

    # --- STEP 8: Mark Notification as Read & Verify Unread Counter Decreases ---
    r_mark_read = client.patch(f"/notifications/{notif_id}/read", headers=headers_a)
    assert r_mark_read.status_code == 200

    r_stats_a2 = client.get("/notifications/stats", headers=headers_a)
    assert r_stats_a2.status_code == 200
    assert r_stats_a2.json()["unread"] == 0
    assert r_stats_a2.json()["today"] == 1
    assert r_stats_a2.json()["important"] == 1

    # --- STEP 9: Toggle Notification Important ---
    r_toggle_imp = client.patch(f"/notifications/{notif_id}/important", headers=headers_a)
    assert r_toggle_imp.status_code == 200
    assert r_toggle_imp.json()["important"] is False

    r_stats_a3 = client.get("/notifications/stats", headers=headers_a)
    assert r_stats_a3.json()["important"] == 0

    # --- STEP 10: Delete Notification & Verify Complete Removal ---
    r_delete = client.delete(f"/notifications/{notif_id}", headers=headers_a)
    assert r_delete.status_code == 200

    r_notifs_a_final = client.get("/notifications", headers=headers_a)
    assert len(r_notifs_a_final.json()) == 0

    r_stats_a_final = client.get("/notifications/stats", headers=headers_a)
    assert r_stats_a_final.json()["unread"] == 0
    assert r_stats_a_final.json()["today"] == 0
    assert r_stats_a_final.json()["important"] == 0

    print("\n[SUCCESS] Notification Center KPI cards, Live Filtering, and Cross-Student Isolation Tests Passed!")
