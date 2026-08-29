import sys
import os
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.core.security import create_access_token
from app.db.mongodb import db_manager


@pytest.mark.asyncio
async def test_student_placement_drives_global_summary_counts():
    """
    Tests that:
    1. Global summary counts (total, eligible, ineligible, companies) are computed on the full opportunity set
       regardless of the UI eligibility_filter.
    2. When student is ineligible, global counts are total=1, eligible=0, ineligible=1, companies=1 even when
       eligibility_filter='eligible'.
    3. Student email fallback resolves student profile properly.
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    test_drive_id = f"test-drive-summary-{timestamp}"
    test_student_user_id = f"usr-student-{timestamp}"
    test_student_email = f"student.summary.{timestamp}@test.edu"

    try:
        # Create an active drive requiring min CGPA 8.5
        drive_doc = {
            "id": test_drive_id,
            "companyName": "SummaryCorp",
            "roleTitle": "Software Development Engineer",
            "companyLogo": "SC",
            "location": "Bengaluru",
            "packageLpa": 12.5,
            "employmentType": "Full-time",
            "description": "Campus recruitment for SDE",
            "requiredSkills": ["Python", "FastAPI"],
            "preferredSkills": ["Docker"],
            "eligibleBranches": ["CSE", "IT"],
            "minCgpa": 8.5,
            "graduationYear": 2026,
            "status": "ACTIVE",
            "registeredCount": 0,
            "created_at": datetime.now().isoformat()
        }
        await db.drives.insert_one(drive_doc)

        # Create student with CGPA 7.5 (Ineligible because 7.5 < 8.5)
        student_doc = {
            "id": f"student-profile-{timestamp}",
            "email": test_student_email,
            "name": "Summary Test Candidate",
            "branch": "CSE",
            "batch": "2026",
            "cgpa": 7.5,
            "skills": ["Python", "FastAPI"],
            "resumeUrl": "https://example.com/resume.pdf"
        }
        await db.students.insert_one(student_doc)

        # Generate student token where sub is test_student_user_id and email is test_student_email
        token = create_access_token({
            "sub": test_student_user_id,
            "email": test_student_email,
            "role": "student",
            "name": "Summary Test Candidate"
        })

        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Query with eligibility_filter = 'all'
        res_all = client.get("/api/opportunities?source_type=all&eligibility_filter=all", headers=headers)
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert data_all["total_opportunities"] >= 1
        assert data_all["ineligible_count"] >= 1

        # Check our specific test drive is in the response
        test_opp = next((o for o in data_all["opportunities"] if o["drive_id"] == test_drive_id), None)
        assert test_opp is not None
        assert test_opp["eligible"] is False

        # 2. Query with eligibility_filter = 'eligible'
        # The returned opportunities should NOT contain test_drive_id, but the summary counts must NOT be zero!
        res_eligible = client.get("/api/opportunities?source_type=all&eligibility_filter=eligible", headers=headers)
        assert res_eligible.status_code == 200
        data_eligible = res_eligible.json()
        assert not any(o["drive_id"] == test_drive_id for o in data_eligible["opportunities"])
        # Global summary counts remain accurate
        assert data_eligible["total_opportunities"] == data_all["total_opportunities"]
        assert data_eligible["eligible_count"] == data_all["eligible_count"]
        assert data_eligible["ineligible_count"] == data_all["ineligible_count"]
        assert data_eligible["total_companies"] == data_all["total_companies"]

        # 3. Query with eligibility_filter = 'ineligible'
        res_ineligible = client.get("/api/opportunities?source_type=all&eligibility_filter=ineligible", headers=headers)
        assert res_ineligible.status_code == 200
        data_ineligible = res_ineligible.json()
        assert any(o["drive_id"] == test_drive_id for o in data_ineligible["opportunities"])
        assert data_ineligible["total_opportunities"] == data_all["total_opportunities"]
        assert data_ineligible["ineligible_count"] == data_all["ineligible_count"]

    finally:
        # Clean up test data
        await db.drives.delete_one({"id": test_drive_id})
        await db.students.delete_one({"email": test_student_email})


@pytest.mark.asyncio
async def test_community_drive_synced_to_placement_drives():
    """
    Tests that an approved drive published in Communities is synced and discovered in Student Placement Drives
    with accurate eligibility evaluation and summary counts.
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    test_drive_id = f"test-drive-comm-sync-{timestamp}"
    test_comm_id = f"comm-{test_drive_id}"
    test_student_user_id = f"usr-student-sync-{timestamp}"
    test_student_email = f"student.commsync.{timestamp}@test.edu"

    try:
        # 1. Drive in db.drives
        drive_doc = {
            "id": test_drive_id,
            "companyName": "Infosys",
            "roleTitle": "Campus Placement Role",
            "companyLogo": "INF",
            "location": "Bengaluru / Campus",
            "packageLpa": 9.5,
            "employmentType": "Full-time",
            "description": "Campus recruitment for Infosys",
            "requiredSkills": ["Java", "SQL"],
            "preferredSkills": ["Spring Boot"],
            "eligibleBranches": ["CSE", "IT"],
            "minCgpa": 8.0,
            "graduationYear": 2026,
            "status": "ACTIVE",
            "registeredCount": 0,
            "created_at": datetime.now().isoformat()
        }
        await db.drives.insert_one(drive_doc)

        # 2. Matching community in db.communities
        comm_doc = {
            "id": test_comm_id,
            "community_id": test_comm_id,
            "drive_id": test_drive_id,
            "company_name": "Infosys",
            "role_title": "Campus Placement Role",
            "status": "ACTIVE",
            "created_at": datetime.now().isoformat()
        }
        await db.communities.insert_one(comm_doc)

        # 3. Student profile in db.students
        student_doc = {
            "id": f"student-profile-sync-{timestamp}",
            "email": test_student_email,
            "name": "Sync Test Student",
            "branch": "CSE",
            "batch": "2026",
            "cgpa": 8.8,
            "skills": ["Java", "SQL"],
            "resumeUrl": "https://example.com/resume.pdf"
        }
        await db.students.insert_one(student_doc)

        token = create_access_token({
            "sub": test_student_user_id,
            "email": test_student_email,
            "role": "student",
            "name": "Sync Test Student"
        })

        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}

        # Query Student Placement Drives
        res = client.get("/api/opportunities?source_type=all&eligibility_filter=all", headers=headers)
        assert res.status_code == 200
        data = res.json()

        # The Infosys drive must appear in Placement Drives
        infosys_opp = next((o for o in data["opportunities"] if o["drive_id"] == test_drive_id), None)
        assert infosys_opp is not None, "Approved community drive was not discovered by Student Placement Drives"
        assert infosys_opp["company"] == "Infosys"
        assert infosys_opp["eligible"] is True
        assert data["total_opportunities"] >= 1
        assert data["eligible_count"] >= 1
        assert data["total_companies"] >= 1

    finally:
        await db.drives.delete_one({"id": test_drive_id})
        await db.communities.delete_one({"id": test_comm_id})
        await db.students.delete_one({"email": test_student_email})

