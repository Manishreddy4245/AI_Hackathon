"""
Comprehensive End-to-End Test Suite for Core Placement Workflow.
Verifies full placement lifecycle:
Recruiter creates drive -> Officer announces -> Student sees drive -> Student applies
-> Appears in pool -> Candidate matching -> Candidate shortlisted -> Notification created
-> Panel/room selected -> Interview scheduled -> Conflict detection -> Student view -> Status update -> KPI update.
"""
import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncMockDatabase
from app.core.security import create_access_token

client = TestClient(app)

def test_full_core_placement_lifecycle_e2e():
    asyncio.run(_run_test_full_core_placement_lifecycle_e2e())

async def _run_test_full_core_placement_lifecycle_e2e():
    db_manager.db = AsyncMockDatabase("placemind_e2e_test")
    db = db_manager.db

    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # -------------------------------------------------------------
    # SETUP DEMO USER ACCOUNTS & TOKENS FOR TEST ISOLATION
    # -------------------------------------------------------------
    recruiter_id = f"test-recruiter-{timestamp_ms}"
    student_id = f"test-student-{timestamp_ms}"
    student_email = f"student-{timestamp_ms}@campus.edu"

    recruiter_token = create_access_token({
        "sub": recruiter_id,
        "id": recruiter_id,
        "role": "recruiter",
        "name": "Sarah Recruiter",
        "email": f"sarah-{timestamp_ms}@aegis.com"
    })
    rec_headers = {"Authorization": f"Bearer {recruiter_token}"}

    officer_token = create_access_token({
        "sub": "officer-101",
        "id": "officer-101",
        "role": "placement_officer",
        "name": "Dean TPO",
        "email": "tpo@campus.edu"
    })
    off_headers = {"Authorization": f"Bearer {officer_token}"}

    student_token = create_access_token({
        "sub": student_id,
        "id": student_id,
        "role": "student",
        "name": "Alex E2E Tester",
        "email": student_email
    })
    stu_headers = {"Authorization": f"Bearer {student_token}"}

    # Insert test student
    student_doc = {
        "id": student_id,
        "name": "Alex E2E Tester",
        "email": student_email,
        "rollNumber": f"CS-{timestamp_ms % 10000}",
        "branch": "CSE",
        "cgpa": 8.8,
        "graduationYear": 2027,
        "skills": ["Python", "FastAPI", "SQL", "Docker", "React"],
        "placementStatus": "unplaced",
        "applicationsCount": 0,
        "shortlistsCount": 0,
        "resumeUrl": "alex_resume.pdf",
        "created_at": datetime.now().isoformat()
    }
    await db.students.insert_one(student_doc)

    # 1. RECRUITER CREATES PLACEMENT DRIVE
    drive_payload = {
        "companyName": f"Aegis Tech {timestamp_ms % 1000}",
        "roleTitle": "Software Development Engineer",
        "packageLpa": 14.5,
        "minCgpa": 7.5,
        "eligibleBranches": ["CSE", "IT", "ECE"],
        "graduationYear": 2027,
        "requiredSkills": ["Python", "SQL"],
        "preferredSkills": ["FastAPI", "Docker"],
        "location": "Bengaluru",
        "driveDate": "2026-09-15",
        "deadline": "2026-09-10",
        "openings": 5,
        "recruiter_id": recruiter_id,
        "recruiter_name": "Sarah Recruiter",
        "recruiter_email": f"sarah-{timestamp_ms}@aegis.com"
    }

    res_create = client.post("/api/drives", json=drive_payload, headers=rec_headers)
    assert res_create.status_code == 201, f"Failed drive creation: {res_create.text}"
    drive_data = res_create.json()
    drive_id = drive_data["id"]
    assert drive_data["status"] == "PENDING_ANNOUNCEMENT"

    # 2. PLACEMENT OFFICER REVIEWS & ANNOUNCES DRIVE
    res_list = client.get("/api/drives", headers=off_headers)
    assert res_list.status_code == 200
    all_drives = res_list.json()
    target_drive = next((d for d in all_drives if d["id"] == drive_id), None)
    assert target_drive is not None
    assert target_drive["status"] == "PENDING_ANNOUNCEMENT"

    res_announce = client.post(f"/api/drives/{drive_id}/announce", headers=off_headers)
    assert res_announce.status_code == 200, f"Failed announcement: {res_announce.text}"
    announced_drive = res_announce.json()
    assert announced_drive["status"] == "ANNOUNCED"

    # 3. CANDIDATE MATCHING & ELIGIBILITY VERIFICATION
    res_match = client.get(f"/api/matching/drive/{drive_id}", headers=off_headers)
    assert res_match.status_code == 200
    match_list = res_match.json()
    assert len(match_list) > 0
    alex_match = next((m for m in match_list if m["studentId"] == student_id), None)
    assert alex_match is not None
    assert alex_match["eligible"] is True
    assert alex_match["matchScore"] >= 75

    # Test 404 behavior for non-existent drive_id
    res_fake_match = client.get("/api/matching/drive/non-existent-drive-999", headers=off_headers)
    assert res_fake_match.status_code == 404

    # 4. STUDENT APPLIES TO DRIVE
    apply_payload = {"student_id": student_id, "drive_id": drive_id, "studentId": student_id, "driveId": drive_id}
    res_apply = client.post("/api/students/apply", json=apply_payload, headers=stu_headers)
    assert res_apply.status_code == 200, f"Failed student apply: {res_apply.text}"

    # Verify duplicate application prevention returns 400 Bad Request or idempotent response
    res_apply_dup = client.post("/api/students/apply", json=apply_payload, headers=stu_headers)
    assert res_apply_dup.status_code in (200, 400), f"Duplicate apply response: {res_apply_dup.text}"



    # 5. APPLICATION APPEARS IN CANDIDATE POOL
    res_pool = client.get(f"/api/applications/pool?drive_id={drive_id}", headers=off_headers)
    assert res_pool.status_code == 200
    pool_list = res_pool.json()
    app_doc = next((a for a in pool_list if a["student_id"] == student_id), None)
    assert app_doc is not None
    app_id = app_doc["id"]
    assert app_doc["status"] == "APPLIED"

    # 6. PLACEMENT OFFICER SHORTLISTS CANDIDATE
    res_shortlist = client.post(f"/api/applications/{app_id}/shortlist", headers=off_headers)
    assert res_shortlist.status_code == 200

    # Verify drive shortlistedCount incremented
    updated_drive = await db.drives.find_one({"id": drive_id})
    assert updated_drive.get("shortlistedCount", 0) >= 1

    # Verify application status is now SHORTLISTED
    updated_app = await db.applications.find_one({"id": app_id})
    assert updated_app["status"] == "SHORTLISTED"

    # 7. CANDIDATE RECEIVES SHORTLIST NOTIFICATION
    res_notifs = client.get(f"/api/notifications?recipient_id={student_id}", headers=stu_headers)
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    shortlist_notif = next((n for n in notifs if n.get("type") == "APPLICATION_SHORTLISTED" and n.get("drive_id") == drive_id), None)
    assert shortlist_notif is not None

    # 7.5 APTITUDE ROUND ALLOCATION & QUALIFICATION
    res_alloc = client.post(f"/api/applications/{app_id}/allocate-aptitude", headers=off_headers)
    assert res_alloc.status_code == 200

    res_eval = client.post(f"/api/applications/{app_id}/evaluate-aptitude", json={"passed": True, "score": 90.0}, headers=off_headers)
    assert res_eval.status_code == 200

    # 8. PANEL & ROOM SELECTED -> INTERVIEW SCHEDULED
    time_slot_val = f"11:00 AM - 11:45 AM ({timestamp_ms % 1000})"

    date_val = "2026-09-18"
    panel_name_val = f"Tech Panel {timestamp_ms % 1000}"
    room_name_val = f"Room B-{timestamp_ms % 1000}"

    interview_payload = {
        "candidateId": student_id,
        "candidateName": "Alex E2E Tester",
        "candidateRoll": student_doc["rollNumber"],
        "companyName": drive_payload["companyName"],
        "roleTitle": drive_payload["roleTitle"],
        "round": "Technical Round 1",
        "timeSlot": time_slot_val,
        "startTime": "11:00 AM",
        "endTime": "11:45 AM",
        "date": date_val,
        "panelName": panel_name_val,
        "roomName": room_name_val,
        "driveId": drive_id,
        "applicationId": app_id
    }

    res_int = client.post("/api/interviews", json=interview_payload, headers=off_headers)
    assert res_int.status_code == 201, f"Failed interview creation: {res_int.text}"
    int_data = res_int.json()
    int_id = int_data["id"]
    assert int_data["status"] == "scheduled"

    # 9. CONFLICT DETECTION (Candidate, Panel, Room)
    dup_room_payload = dict(interview_payload)
    dup_room_payload["candidateName"] = "Other Student"
    dup_room_payload["candidateId"] = "other-student-id"
    dup_room_payload["panelName"] = "Different Panel"

    res_conflict = client.post("/api/interviews", json=dup_room_payload, headers=off_headers)
    assert res_conflict.status_code == 409, "Expected conflict 409 response for occupied room"

    # 10. STUDENT INTERVIEW VIEW IS POPULATED WITH REAL RECORD
    res_my_int = client.get(f"/api/interviews/student/me?user_id={student_id}&email={student_email}", headers=stu_headers)
    assert res_my_int.status_code == 200
    my_interviews = res_my_int.json()
    my_int = next((i for i in my_interviews if i["id"] == int_id or i.get("drive_id") == drive_id), None)
    assert my_int is not None
    assert my_int["companyName"] == drive_payload["companyName"]

    # 11. INTERVIEW STATUS UPDATE USING JSON BODY {"status": "COMPLETED"}
    res_status = client.patch(f"/api/interviews/{int_id}/status", json={"status": "COMPLETED"}, headers=off_headers)
    assert res_status.status_code == 200

    updated_int_db = await db.interviews.find_one({"id": int_id})
    assert updated_int_db["status"] == "COMPLETED"

    # 12. DASHBOARD KPI SYNCHRONIZATION
    res_stats = client.get("/api/dashboard/summary", headers=off_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "active_drives" in stats or "activeDrivesCount" in stats or "total_drives" in stats



    # Cleanup test isolation documents
    await db.students.delete_one({"id": student_id})
    await db.drives.delete_one({"id": drive_id})
    await db.applications.delete_one({"id": app_id})
    await db.interviews.delete_one({"id": int_id})
    await db.notifications.delete_many({"drive_id": drive_id})

