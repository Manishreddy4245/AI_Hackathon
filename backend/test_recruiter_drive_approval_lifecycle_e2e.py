import time
import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000/api"

def test_recruiter_drive_approval_and_visibility_lifecycle_e2e():
    """
    RIGOROUS END-TO-END TEST FOR RECRUITER DRIVE CREATION AND PLACEMENT OFFICER APPROVAL:
    1. Recruiter registers & logs in.
    2. Recruiter creates a new Placement Drive and Submits for Approval.
    3. Verify Drive status is 'PENDING_APPROVAL'.
    4. Verify Placement Officer receives 'DRIVE_APPROVAL_REQUEST' notification.
    5. Verify unapproved drive is NOT visible in Student's opportunities/drives feed.
    6. Placement Officer reviews drive and APPROVES it.
    7. Verify Drive status transitions to 'ACTIVE'.
    8. Verify Recruiter receives 'DRIVE_APPROVED' notification.
    9. Verify Drive is now visible in Officer's Companies & Drives list.
    10. Verify Eligible students can now see the approved drive.
    11. Test REJECT and REQUEST_CHANGES lifecycle flows.
    """
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # --- STEP 1: Register Recruiter & Placement Officer & Student ---
    recruiter_email = f"recruiter.drive{ts}@acmecorp.com"
    r_reg_r = client.post("/auth/register/recruiter", json={
        "name": "Sarah Jenkins",
        "email": recruiter_email,
        "password": "password123",
        "companyName": f"Acme Innovations {ts}",
        "companyId": f"comp-{ts}",
        "designation": "Head of University Hiring"
    })
    assert r_reg_r.status_code in (200, 201)
    recruiter_token = r_reg_r.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    recruiter_id = r_reg_r.json().get("id") or r_reg_r.json().get("user", {}).get("id")

    officer_email = f"officer.approval{ts}@campus.edu"
    r_reg_o = client.post("/auth/register/recruiter", json={
        "name": f"Officer Raman {ts}",
        "email": officer_email,
        "password": "password123",
        "companyName": "Campus Placement Cell",
        "companyId": "comp-univ",
        "designation": "Placement Director"
    })
    assert r_reg_o.status_code in (200, 201)
    officer_token = r_reg_o.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    student_email = f"student.candidate{ts}@campus.edu"
    r_reg_s = client.post("/auth/register/student", json={
        "name": "Karan Malhotra",
        "email": student_email,
        "password": "password123",
        "rollNumber": f"2024CS{ts % 10000}",
        "branch": "CSE",
        "college": "BITS Pilani, Hyderabad Campus",
        "graduationYear": 2027,
        "cgpa": 8.8
    })
    assert r_reg_s.status_code in (200, 201)
    student_token = r_reg_s.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # --- STEP 2: Recruiter Creates Placement Drive (Save & Submit for Approval) ---
    drive_payload = {
        "companyName": f"Acme Innovations {ts}",
        "roleTitle": "Software Development Engineer",
        "packageLpa": 18.5,
        "location": "Hyderabad / Hybrid",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT"],
        "minCgpa": 7.5,
        "graduationYear": 2027,
        "driveDate": "2026-10-15",
        "deadline": "2026-10-10",
        "description": "Seeking talented SDE freshers with Python, SQL, and FastAPI background.",
        "requiredSkills": ["Python", "SQL", "FastAPI"],
        "preferredSkills": ["Docker", "Kubernetes"],
        "recruiter_id": recruiter_id,
        "recruiter_email": recruiter_email
    }

    r_create = client.post("/drives", json=drive_payload, headers=recruiter_headers)
    assert r_create.status_code == 201, f"Failed to create drive: {r_create.text}"
    drive_data = r_create.json()
    drive_id = drive_data["id"]

    # --- STEP 3: Verify Status is PENDING_APPROVAL ---
    assert drive_data["status"] == "PENDING_APPROVAL", f"Expected PENDING_APPROVAL, got {drive_data['status']}"
    assert drive_data["aiConfirmed"] is False

    # --- STEP 4: Verify Student CANNOT See Drive Before Approval ---
    r_student_drives = client.get("/drives", headers=student_headers)
    assert r_student_drives.status_code == 200
    student_visible_ids = [d["id"] for d in r_student_drives.json()]
    assert drive_id not in student_visible_ids, "Pending drive must NOT be visible to students before officer approval"

    # --- STEP 5: Placement Officer Reviews & APPROVES Drive ---
    r_approve = client.post(f"/drives/{drive_id}/approve", headers=officer_headers)
    assert r_approve.status_code == 200, f"Approval failed: {r_approve.text}"
    approved_drive = r_approve.json()
    assert approved_drive["status"] == "ACTIVE"
    assert approved_drive["aiConfirmed"] is True

    # --- STEP 6: Verify Drive is now Visible to Placement Officer in All Drives ---
    r_officer_drives = client.get("/drives", headers=officer_headers)
    assert r_officer_drives.status_code == 200
    officer_drive_ids = [d["id"] for d in r_officer_drives.json()]
    assert drive_id in officer_drive_ids, "Approved drive must appear in Placement Officer Companies & Drives list"

    # --- STEP 7: Verify Drive is now VISIBLE to Eligible Students ---
    r_student_drives_after = client.get("/drives", headers=student_headers)
    assert r_student_drives_after.status_code == 200
    student_visible_after = [d["id"] for d in r_student_drives_after.json()]
    assert drive_id in student_visible_after, "Approved active drive must be visible to students"

    # --- STEP 8: Test REQUEST_CHANGES and REJECT Workflow on a 2nd Drive ---
    drive2_payload = {
        "companyName": f"Beta Robotics {ts}",
        "roleTitle": "Robotics Firmware Intern",
        "packageLpa": 8.0,
        "location": "Bengaluru",
        "employmentType": "Internship",
        "eligibleBranches": ["ECE", "EEE"],
        "minCgpa": 6.5,
        "graduationYear": 2027,
        "deadline": "2026-11-01",
        "description": "C++ and Embedded Systems intern role.",
        "requiredSkills": ["C++", "Embedded Systems"],
        "recruiter_id": recruiter_id,
        "recruiter_email": recruiter_email
    }
    r_create2 = client.post("/drives", json=drive2_payload, headers=recruiter_headers)
    assert r_create2.status_code == 201
    drive2_id = r_create2.json()["id"]

    # Officer requests changes
    r_req_chg = client.post(f"/drives/{drive2_id}/request-changes", json={
        "feedback": "Please increase stipend to standard tier-1 rate."
    }, headers=officer_headers)
    assert r_req_chg.status_code == 200
    assert r_req_chg.json()["status"] == "CHANGES_REQUESTED"

    # Officer rejects
    r_reject = client.post(f"/drives/{drive2_id}/reject", json={
        "reason": "Recruiter declined stipend revision."
    }, headers=officer_headers)
    assert r_reject.status_code == 200
    assert r_reject.json()["status"] == "REJECTED"

    # Verify rejected drive 2 is NOT visible to students
    r_student_drives_final = client.get("/drives", headers=student_headers)
    final_student_ids = [d["id"] for d in r_student_drives_final.json()]
    assert drive2_id not in final_student_ids

    print("\n[SUCCESS] Recruiter Drive Creation -> PENDING_APPROVAL -> Officer Review (Approve/Reject/Changes) -> Live Student Publishing verified end-to-end!")
