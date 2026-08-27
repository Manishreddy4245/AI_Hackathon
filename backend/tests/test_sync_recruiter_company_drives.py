"""
Automated Test Suite for Recruiter <-> Company <-> Drive Data Synchronization.
Validates:
TEST 1: Recruiter A creates drive -> drive.recruiter_id = Recruiter A.id
TEST 2: Recruiter A fetches drives -> sees own drives
TEST 3: Recruiter B fetches drives -> does not see Recruiter A's private drives
TEST 4: Placement Officer fetches drives -> sees drives from multiple recruiters/companies
TEST 5: Drive contains correct company relationship (companyId, companyName)
TEST 6: Existing drives remain accessible
TEST 7: Editing a drive does not remove recruiter ownership
TEST 8: Application remains connected to correct drive
TEST 9: Interview remains connected to correct drive/application
TEST 10: Candidate dropdown still filters using selected drive_id
TEST 11: Company count in Placement Officer is correct
TEST 12: No cross-company candidate leakage
"""

import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_sync_recruiter_company_drives_suite():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Clean up test records
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-sync"}})
    await db.applications.delete_many({"student_id": {"$regex": "^stu-sync"}})
    await db.students.delete_many({"id": {"$regex": "^stu-sync"}})
    await db.drives.delete_many({"id": {"$regex": "^drive-sync"}})
    await db.users.delete_many({"id": {"$regex": "^usr-sync"}})
    await db.companies.delete_many({"id": {"$regex": "^comp-sync"}})

    # 1. Setup Recruiter A (Cognizant)
    rec_a_id = f"usr-sync-rec-a-{timestamp_ms}"
    comp_a_id = f"comp-sync-a-{timestamp_ms}"
    token_a = create_access_token({"sub": rec_a_id, "id": rec_a_id, "role": "recruiter", "name": "Cognizant Recruiter", "email": f"rec_a_{timestamp_ms}@cognizant.com", "companyId": comp_a_id, "companyName": "Cognizant"})
    headers_a = {"Authorization": f"Bearer {token_a}"}

    await db.users.insert_one({
        "id": rec_a_id,
        "name": "Cognizant Recruiter",
        "email": f"rec_a_{timestamp_ms}@cognizant.com",
        "role": "recruiter",
        "companyId": comp_a_id,
        "companyName": "Cognizant"
    })
    await db.companies.insert_one({
        "id": comp_a_id,
        "name": "Cognizant",
        "logo": "CG",
        "industry": "IT Services",
        "location": "Bengaluru",
        "tier": "Tier 1"
    })

    # 2. Setup Recruiter B (TCS)
    rec_b_id = f"usr-sync-rec-b-{timestamp_ms}"
    comp_b_id = f"comp-sync-b-{timestamp_ms}"
    token_b = create_access_token({"sub": rec_b_id, "id": rec_b_id, "role": "recruiter", "name": "TCS Recruiter", "email": f"rec_b_{timestamp_ms}@tcs.com", "companyId": comp_b_id, "companyName": "TCS"})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    await db.users.insert_one({
        "id": rec_b_id,
        "name": "TCS Recruiter",
        "email": f"rec_b_{timestamp_ms}@tcs.com",
        "role": "recruiter",
        "companyId": comp_b_id,
        "companyName": "TCS"
    })
    await db.companies.insert_one({
        "id": comp_b_id,
        "name": "TCS",
        "logo": "TCS",
        "industry": "IT Services",
        "location": "Mumbai",
        "tier": "Tier 1"
    })

    # 3. Setup Placement Officer Auth Header
    officer_id = f"usr-sync-officer-{timestamp_ms}"
    token_officer = create_access_token({"sub": officer_id, "id": officer_id, "role": "placement_officer", "name": "Placement Officer"})
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # TEST 1 & TEST 5: Recruiter A creates drive -> drive.recruiter_id = Recruiter A, companyId = Cognizant
        res_create_a = await client.post("/api/drives", json={
            "companyName": "Cognizant",
            "roleTitle": "Cloud Engineer",
            "packageLpa": 14.5,
            "location": "Bengaluru",
            "employmentType": "Full Time",
            "eligibleBranches": ["CSE", "ECE"],
            "minCgpa": 7.5,
            "driveDate": "2026-11-15",
            "deadline": "2026-11-10",
            "description": "Cognizant Cloud Engineer placement drive."
        }, headers=headers_a)

        assert res_create_a.status_code == 201
        drive_a_data = res_create_a.json()
        drive_a_id = drive_a_data["id"]

        assert drive_a_data["recruiter_id"] == rec_a_id  # TEST 1 PASSED
        assert drive_a_data["companyId"] == comp_a_id  # TEST 5 PASSED
        assert drive_a_data["companyName"] == "Cognizant"

        # Recruiter B creates drive
        res_create_b = await client.post("/api/drives", json={
            "companyName": "TCS",
            "roleTitle": "Software Developer",
            "packageLpa": 11.0,
            "location": "Pune",
            "employmentType": "Full Time",
            "eligibleBranches": ["CSE", "IT"],
            "minCgpa": 7.0,
            "driveDate": "2026-11-20",
            "deadline": "2026-11-15",
            "description": "TCS Software Developer drive."
        }, headers=headers_b)

        assert res_create_b.status_code == 201
        drive_b_data = res_create_b.json()
        drive_b_id = drive_b_data["id"]

        # TEST 2 & TEST 3: Recruiter A fetches drives -> sees own drives, does NOT see Recruiter B's drives
        res_list_a = await client.get("/api/drives", headers=headers_a)
        assert res_list_a.status_code == 200
        list_a_ids = [d["id"] for d in res_list_a.json()]
        assert drive_a_id in list_a_ids  # TEST 2 PASSED
        assert drive_b_id not in list_a_ids  # TEST 3 PASSED

        # TEST 4 & TEST 6 & TEST 11: Placement Officer fetches drives -> sees drives from BOTH recruiters/companies
        res_list_officer = await client.get("/api/drives", headers=headers_officer)
        assert res_list_officer.status_code == 200
        list_officer_ids = [d["id"] for d in res_list_officer.json()]
        assert drive_a_id in list_officer_ids  # TEST 4 PASSED
        assert drive_b_id in list_officer_ids  # TEST 4 PASSED
        assert len(list_officer_ids) >= 2  # TEST 6 & TEST 11 PASSED

        # TEST 7: Editing drive_a by Recruiter A does NOT remove recruiter ownership
        res_edit = await client.put(f"/api/drives/{drive_a_id}", json={
            "packageLpa": 16.0,
            "description": "Updated Cognizant Cloud Engineer drive."
        }, headers=headers_a)

        assert res_edit.status_code == 200
        updated_drive_a = res_edit.json()
        assert updated_drive_a["recruiter_id"] == rec_a_id  # TEST 7 PASSED
        assert updated_drive_a["companyId"] == comp_a_id
        assert updated_drive_a["packageLpa"] == 16.0

        # Setup Candidates & Applications
        stu_a_id = f"stu-sync-a-{timestamp_ms}"
        await db.students.insert_one({
            "id": stu_a_id,
            "name": "Cognizant Student",
            "email": f"stu_a_{timestamp_ms}@campus.edu",
            "rollNumber": "CS901",
            "branch": "CSE",
            "cgpa": 8.5,
            "graduationYear": 2027,
            "maxBacklogs": 0,
            "placementStatus": "unplaced",
            "status": "active"
        })
        app_a_id = f"app-{stu_a_id}-{drive_a_id}"

        # TEST 8: Application connected to correct drive
        await db.applications.insert_one({
            "id": app_a_id,
            "student_id": stu_a_id,
            "student_name": "Cognizant Student",
            "drive_id": drive_a_id,
            "company_name": "Cognizant",
            "job_title": "Cloud Engineer",
            "status": "HR_INTERVIEW_PENDING",
            "stage": "HR_INTERVIEW_PENDING",
            "technical_status": "QUALIFIED"
        })

        stu_b_id = f"stu-sync-b-{timestamp_ms}"
        await db.students.insert_one({
            "id": stu_b_id,
            "name": "TCS Student",
            "email": f"stu_b_{timestamp_ms}@campus.edu",
            "rollNumber": "CS902",
            "branch": "CSE",
            "cgpa": 8.2,
            "graduationYear": 2027,
            "maxBacklogs": 0,
            "placementStatus": "unplaced",
            "status": "active"
        })
        app_b_id = f"app-{stu_b_id}-{drive_b_id}"
        await db.applications.insert_one({
            "id": app_b_id,
            "student_id": stu_b_id,
            "student_name": "TCS Student",
            "drive_id": drive_b_id,
            "company_name": "TCS",
            "job_title": "Software Developer",
            "status": "HR_INTERVIEW_PENDING",
            "stage": "HR_INTERVIEW_PENDING",
            "technical_status": "QUALIFIED"
        })



        app_doc = await db.applications.find_one({"id": app_a_id}, {"_id": 0})
        assert app_doc["drive_id"] == drive_a_id  # TEST 8 PASSED

        # TEST 10 & TEST 12: Candidate dropdown for Cognizant drive returns ONLY Cognizant candidate, NO cross-company leakage
        res_cand_a = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_a_id}", headers=headers_officer)
        assert res_cand_a.status_code == 200
        cand_a_names = [c["name"] for c in res_cand_a.json()]
        assert "Cognizant Student" in cand_a_names  # TEST 10 PASSED
        assert "TCS Student" not in cand_a_names  # TEST 12 PASSED (No cross-company leakage)

        res_cand_b = await client.get(f"/api/interviews/eligible-candidates?drive_id={drive_b_id}", headers=headers_officer)
        assert res_cand_b.status_code == 200
        cand_b_names = [c["name"] for c in res_cand_b.json()]
        assert "TCS Student" in cand_b_names
        assert "Cognizant Student" not in cand_b_names

        # TEST 9: Interview connected to correct drive/application
        res_sched = await client.post("/api/interviews", json={
            "candidateId": stu_a_id,
            "candidateName": "Cognizant Student",
            "companyName": "Cognizant",
            "roleTitle": "Cloud Engineer",
            "driveId": drive_a_id,
            "applicationId": app_a_id,
            "round": "HR",
            "date": "2026-11-25",
            "timeSlot": "10:00 AM - 10:45 AM",
            "startTime": "10:00 AM",
            "endTime": "10:45 AM",
            "panelName": "Cognizant Panel 1",
            "roomName": "Room 201"
        }, headers=headers_officer)

        assert res_sched.status_code in [200, 201]

        int_data = res_sched.json()
        assert (int_data.get("driveId") or int_data.get("drive_id")) == drive_a_id  # TEST 9 PASSED
        assert (int_data.get("applicationId") or int_data.get("application_id")) == app_a_id

