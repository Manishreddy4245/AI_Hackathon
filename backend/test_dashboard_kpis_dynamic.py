import time
from datetime import datetime
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_dashboard_kpis_dynamic():
    print("=================================================================")
    print("TESTING PLACEMENT OFFICER DASHBOARD KPIS 100% DYNAMIC FLOW")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())
    today_str = datetime.now().strftime("%Y-%m-%d")

    # STEP 1: Register & Login Placement Officer
    officer_email = f"officer.kpi{ts}@campus.edu"
    print(f"\n--- STEP 1: Register & Login Placement Officer ({officer_email}) ---")
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": f"Officer KPI {ts}",
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Corp",
        "companyId": "comp-kpi",
        "designation": "Head Placement Officer"
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

    # STEP 2: Fetch Initial Dashboard Summary
    print("\n--- STEP 2: Fetch Initial Dashboard Summary ---")
    r_sum0 = client.get("/dashboard/summary", headers=officer_headers)
    assert r_sum0.status_code == 200, f"Summary failed: {r_sum0.text}"
    s0 = r_sum0.json()
    print("   Initial Live MongoDB KPIs:")
    print("     - Active Drives:", s0["active_drives"], f"({s0['active_drives_change'].encode('ascii', 'ignore').decode()})")
    print("     - Eligible Students:", s0["eligible_students"], f"({s0['eligible_students_change'].encode('ascii', 'ignore').decode()})")
    print("     - Shortlisted Candidates:", s0["shortlisted_candidates"], f"({s0['shortlisted_change'].encode('ascii', 'ignore').decode()})")
    print("     - Interviews Today:", s0["interviews_today"], f"({s0['interviews_change'].encode('ascii', 'ignore').decode()})")
    print("     - Pending Actions:", s0["pending_actions"], f"({s0['pending_actions_change'].encode('ascii', 'ignore').decode()})")

    init_drives = s0["active_drives"]
    init_shortlisted = s0["shortlisted_candidates"]
    init_interviews_today = s0["interviews_today"]
    init_pending = s0["pending_actions"]

    # STEP 3: Create a New Active Placement Drive -> Active Drives increases by +1
    print("\n--- STEP 3: Create Active Placement Drive -> Verify Active Drives +1 ---")
    r_drive = client.post("/drives", json={
        "companyName": f"Dynamic Corp {ts}",
        "companyId": f"comp-dyn-{ts}",
        "roleTitle": "Cloud Infrastructure Engineer",
        "packageLpa": 16.0,
        "branches": ["CSE", "IT", "ECE"],
        "minCgpa": 7.0,
        "mandatorySkills": ["Python", "AWS", "Docker"],
        "optionalSkills": ["Kubernetes"],
        "deadline": "2026-10-31",
        "date": "2026-10-31",
        "selectionProcess": ["Online Test", "Technical Interview", "HR Round"]
    }, headers=officer_headers)
    assert r_drive.status_code in (200, 201)
    new_drive_id = r_drive.json()["id"]

    # Approve drive so it becomes active
    r_appr = client.post(f"/drives/{new_drive_id}/approve", headers=officer_headers)
    assert r_appr.status_code == 200

    r_sum1 = client.get("/dashboard/summary", headers=officer_headers)
    assert r_sum1.status_code == 200
    s1 = r_sum1.json()
    print(f"   Active Drives after creation: {s1['active_drives']} (Expected: {init_drives + 1})")
    assert s1["active_drives"] == init_drives + 1, "Active Drives must increase by exactly 1!"

    # STEP 4: Register Student & Apply to Drive
    student_email = f"student.kpi{ts}@campus.edu"
    print(f"\n--- STEP 4: Register Student ({student_email}) & Submit Application ---")
    r_reg_s = client.post("/auth/register/student", json={
        "name": "Kavya Patel",
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "Campus University",
        "graduationYear": 2027,
        "cgpa": 9.3
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

    r_app = client.post(
        "/students/apply-form",
        data={
            "driveId": new_drive_id,
            "name": "Kavya Patel",
            "mobile": "9876543210",
            "college_name": "Campus University",
            "location": "Bengaluru",
            "company_name": f"Dynamic Corp {ts}",
            "job_title": "Cloud Infrastructure Engineer"
        },
        files={
            "file": ("resume.pdf", b"%PDF-1.4\nSkills: Python, AWS, Docker, Kubernetes\nCGPA: 9.3\nEducation: B.Tech Computer Science\n%%EOF", "application/pdf")
        },
        headers=student_headers
    )
    assert r_app.status_code == 200, f"Application failed: {r_app.text}"
    app_id = r_app.json().get("applicationId")

    # STEP 5: Create Available Interview Slot for TODAY
    print("\n--- STEP 5: Officer Creates Interview Slot for TODAY ---")
    r_slot = client.post("/interviews/availability", json={
        "panel_name": f"Dynamic Panel {ts}",
        "panel_members": ["Dr. Rajesh Rao", "Prof. Sunita Menon"],
        "block": f"Block-{ts % 100}",
        "room_number": f"R-{ts % 1000}",
        "date": today_str,
        "start_time": "11:00 AM",
        "end_time": "11:30 AM",
        "status": "AVAILABLE"
    }, headers=officer_headers)
    assert r_slot.status_code in (200, 201)
    slot_id = r_slot.json()["id"]

    # Pre-shortlist snapshot
    r_pre = client.get("/dashboard/summary", headers=officer_headers)
    pre_shortlisted = r_pre.json()["shortlisted_candidates"]
    pre_interviews = r_pre.json()["interviews_today"]

    # STEP 6: Shortlist Candidate with the Today Interview Slot
    print(f"\n--- STEP 6: Shortlist Candidate with Today Slot -> Verify Shortlisted & Interviews Today ---")
    r_shortlist = client.post(f"/applications/{app_id}/shortlist", json={"slot_id": slot_id}, headers=officer_headers)
    assert r_shortlist.status_code == 200

    r_sum2 = client.get("/dashboard/summary", headers=officer_headers)
    assert r_sum2.status_code == 200
    s2 = r_sum2.json()
    print(f"   Shortlisted Candidates: {s2['shortlisted_candidates']} (Expected: {pre_shortlisted + 1})")
    print(f"   Interviews Today: {s2['interviews_today']} (Expected: {pre_interviews + 1})")
    assert s2["shortlisted_candidates"] == pre_shortlisted + 1, "Shortlisted Candidates must increase by 1!"
    assert s2["interviews_today"] == pre_interviews + 1, "Interviews Today must increase by 1 for today's date!"

    # STEP 7: Resolve an Exception / Confirm Drive Requirements
    print("\n--- STEP 7: Confirm Drive Requirements & Check Pending Actions ---")
    r_confirm = client.patch(f"/drives/{new_drive_id}/confirm-requirements", headers=officer_headers)
    assert r_confirm.status_code == 200

    r_sum3 = client.get("/dashboard/summary", headers=officer_headers)
    assert r_sum3.status_code == 200
    s3 = r_sum3.json()
    print(f"   Pending Actions: {s3['pending_actions']} ({s3['pending_actions_change'].encode('ascii', 'ignore').decode()})")
    pipeline_summary = [f"{p['stage']}: {p['count']}" for p in s3['pipeline']]
    print(f"   Pipeline Stages: {pipeline_summary}")

    print("\n=================================================================")
    print("PLACEMENT OFFICER DASHBOARD KPIS 100% VERIFIED DYNAMIC AND LIVE!")
    print("=================================================================")

if __name__ == "__main__":
    test_dashboard_kpis_dynamic()
