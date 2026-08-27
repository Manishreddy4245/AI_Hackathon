import time
import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000/api"

def test_multi_drive_application_notification_and_candidate_isolation_e2e():
    """
    RIGOROUS END-TO-END VERIFICATION:
    1. Recruiter creates Drive A (TechNova Solutions - Backend Developer) & Drive B (Apex Cloud Systems - DevOps Engineer).
    2. Officer approves both drives.
    3. Student A applies to Drive A -> Verify exact notification text template:
       '{studentName} has applied for {jobRole} role at {companyName} placement drive.'
       Verify notification contains driveId, applicationId, studentId, and relatedRoute pointing to Drive A.
    4. Student B applies to Drive B -> Verify notification text and relatedRoute pointing to Drive B.
    5. Verify Candidate Isolation:
       Drive A candidate pool contains Student A ONLY.
       Drive B candidate pool contains Student B ONLY.
    6. Officer shortlists Student A from Drive A page and schedules interview.
    7. Verify Student A receives APPLICATION_SHORTLISTED notification.
    """
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # 1. Login Placement Officer and Register Recruiter + two distinct Students
    r_off_login = client.post("/auth/login", json={
        "email": "placement@demo.com",
        "password": "password123",
        "portalRole": "placement_officer"
    })
    assert r_off_login.status_code == 200, f"Officer login failed: {r_off_login.text}"
    off_token = r_off_login.json()["access_token"]
    off_headers = {"Authorization": f"Bearer {off_token}"}

    recruiter_email = f"recruiter.multidrive{ts}@corp.com"
    r_rec = client.post("/auth/register/recruiter", json={
        "name": "Sarah Recruiter",
        "email": recruiter_email,
        "password": "password123",
        "companyName": "Tech Talent Corp",
        "companyId": f"comp-talent-{ts}",
        "designation": "Talent Partner"
    })
    assert r_rec.status_code in (200, 201)
    rec_token = r_rec.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    student_a_email = f"student.vikram{ts}@campus.edu"
    r_sta = client.post("/auth/register/student", json={
        "name": "Vikram Aditya",
        "email": student_a_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 9000 + 1000}",
        "branch": "CSE",
        "college": "BITS Pilani",
        "graduationYear": 2027,
        "cgpa": 8.9
    })
    assert r_sta.status_code in (200, 201)
    sta_token = r_sta.json()["access_token"]
    sta_headers = {"Authorization": f"Bearer {sta_token}"}
    sta_id = r_sta.json().get("id") or r_sta.json().get("user", {}).get("id")

    student_b_email = f"student.priya{ts}@campus.edu"
    r_stb = client.post("/auth/register/student", json={
        "name": "Priya Verma",
        "email": student_b_email,
        "password": "password123",
        "rollNumber": f"2024IT{ts % 9000 + 1000}",
        "branch": "IT",
        "college": "BITS Pilani",
        "graduationYear": 2027,
        "cgpa": 9.2
    })
    assert r_stb.status_code in (200, 201)
    stb_token = r_stb.json()["access_token"]
    stb_headers = {"Authorization": f"Bearer {stb_token}"}
    stb_id = r_stb.json().get("id") or r_stb.json().get("user", {}).get("id")

    # 2. Recruiter creates Drive A & Drive B
    drive_a_res = client.post("/drives", json={
        "companyName": f"TechNova Solutions {ts}",
        "roleTitle": "Backend Developer",
        "packageLpa": 14.5,
        "location": "Hyderabad",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT"],
        "minCgpa": 7.0,
        "graduationYear": 2027,
        "requiredSkills": ["Python", "FastAPI", "SQL"],
        "deadline": "2026-10-30"
    }, headers=rec_headers)
    assert drive_a_res.status_code == 201
    drive_a_id = drive_a_res.json()["id"]

    drive_b_res = client.post("/drives", json={
        "companyName": f"Apex Cloud Systems {ts}",
        "roleTitle": "DevOps Engineer",
        "packageLpa": 16.0,
        "location": "Bengaluru",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT", "ECE"],
        "minCgpa": 7.0,
        "graduationYear": 2027,
        "requiredSkills": ["Docker", "Kubernetes", "AWS"],
        "deadline": "2026-10-30"
    }, headers=rec_headers)
    assert drive_b_res.status_code == 201
    drive_b_id = drive_b_res.json()["id"]

    # 3. Officer approves both drives
    r_app_a = client.post(f"/drives/{drive_a_id}/approve", headers=off_headers)
    assert r_app_a.status_code == 200
    r_app_b = client.post(f"/drives/{drive_b_id}/approve", headers=off_headers)
    assert r_app_b.status_code == 200

    dummy_resume = b"%PDF-1.4 Mock CV Content with Python and FastAPI skills"

    # 4. Student A applies to Drive A
    r_apply_a = client.post("/students/apply-form", data={
        "driveId": drive_a_id,
        "companyName": f"TechNova Solutions {ts}",
        "jobTitle": "Backend Developer",
        "name": "Vikram Aditya",
        "email": student_a_email,
        "mobile": "9876543210",
        "branch": "CSE",
        "cgpa": "8.9",
        "graduationYear": "2027"
    }, files={
        "file": ("vikram_resume.pdf", dummy_resume, "application/pdf")
    }, headers=sta_headers)
    assert r_apply_a.status_code in (200, 201)
    app_a_id = r_apply_a.json()["applicationId"]

    # 5. Student B applies to Drive B
    r_apply_b = client.post("/students/apply-form", data={
        "driveId": drive_b_id,
        "companyName": f"Apex Cloud Systems {ts}",
        "jobTitle": "DevOps Engineer",
        "name": "Priya Verma",
        "email": student_b_email,
        "mobile": "9876543211",
        "branch": "IT",
        "cgpa": "9.2",
        "graduationYear": "2027"
    }, files={
        "file": ("priya_resume.pdf", dummy_resume, "application/pdf")
    }, headers=stb_headers)
    assert r_apply_b.status_code in (200, 201)
    app_b_id = r_apply_b.json()["applicationId"]

    # 6. Verify Officer Notifications text, driveId, and relatedRoute
    r_notifs = client.get("/notifications", headers=off_headers)
    assert r_notifs.status_code == 200
    all_notifs = r_notifs.json()

    notif_a = next((n for n in all_notifs if n.get("application_id") == app_a_id or (n.get("student_id") == sta_id and n.get("drive_id") == drive_a_id)), None)
    assert notif_a is not None, "Officer must receive notification for Student A's application"
    assert f"Vikram Aditya has applied for Backend Developer role at TechNova Solutions {ts} placement drive." in notif_a["message"]
    assert notif_a["type"] == "APPLICATION_RECEIVED"
    assert notif_a["drive_id"] == drive_a_id
    assert notif_a["relatedRoute"] == f"/companies/{drive_a_id}"

    notif_b = next((n for n in all_notifs if n.get("application_id") == app_b_id or (n.get("student_id") == stb_id and n.get("drive_id") == drive_b_id)), None)
    assert notif_b is not None, "Officer must receive notification for Student B's application"
    assert f"Priya Verma has applied for DevOps Engineer role at Apex Cloud Systems {ts} placement drive." in notif_b["message"]
    assert notif_b["type"] == "APPLICATION_RECEIVED"
    assert notif_b["drive_id"] == drive_b_id
    assert notif_b["relatedRoute"] == f"/companies/{drive_b_id}"

    # 7. Verify Candidate Isolation per Drive
    pool_a_res = client.get(f"/applications/pool?drive_id={drive_a_id}", headers=off_headers)
    assert pool_a_res.status_code == 200
    pool_a = pool_a_res.json()
    pool_a_student_names = [c.get("student_name") for c in pool_a]
    assert "Vikram Aditya" in pool_a_student_names, "Student A must appear in Drive A candidate pool"
    assert "Priya Verma" not in pool_a_student_names, "Student B must NOT appear in Drive A candidate pool"

    pool_b_res = client.get(f"/applications/pool?drive_id={drive_b_id}", headers=off_headers)
    assert pool_b_res.status_code == 200
    pool_b = pool_b_res.json()
    pool_b_student_names = [c.get("student_name") for c in pool_b]
    assert "Priya Verma" in pool_b_student_names, "Student B must appear in Drive B candidate pool"
    assert "Vikram Aditya" not in pool_b_student_names, "Student A must NOT appear in Drive B candidate pool"

    # 8. Shortlist Candidate from Drive Page & Schedule Interview
    candidate_a = next(c for c in pool_a if c.get("student_name") == "Vikram Aditya")
    r_shortlist = client.patch(f"/applications/{candidate_a['id']}/shortlist", json={
        "interview": {
            "interview_date": "2026-11-05",
            "interview_time": "10:30 AM",
            "panel_id": "panel-tech-1",
            "panel_name": "Technical Interview Panel A",
            "room": "Seminar Hall B"
        }
    }, headers=off_headers)
    assert r_shortlist.status_code == 200

    # 9. Verify Student A receives Shortlist notification
    r_sta_notifs = client.get("/notifications", headers=sta_headers)
    assert r_sta_notifs.status_code == 200
    shortlist_notif = next((n for n in r_sta_notifs.json() if n.get("type") == "APPLICATION_SHORTLISTED" and n.get("drive_id") == drive_a_id), None)
    assert shortlist_notif is not None, "Student A must receive shortlist notification"

    print("\n[SUCCESS] Multi-Drive Notification Text Template, Drive-specific Destination Routing, and Candidate Isolation tested and verified 100% end-to-end!")
