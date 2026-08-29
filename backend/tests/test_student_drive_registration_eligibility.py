import pytest
import asyncio
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token
from app.services.eligibility_engine import evaluate_drive_eligibility, is_branch_eligible, get_canonical_branch

client = TestClient(app)

def test_canonical_branch_mapping_and_matching():
    """Verify exact canonical branch normalization and matching without substring leaks."""
    assert get_canonical_branch("CSE") == "CSE"
    assert get_canonical_branch("Computer Science and Engineering") == "CSE"
    assert get_canonical_branch("TECHNICAL / ELECTRICAL ENGINEERING") == "EE"
    assert get_canonical_branch("Electrical Engineering") == "EE"
    assert get_canonical_branch("Information Technology") == "IT"
    assert get_canonical_branch("Electronics and Communication") == "ECE"
    assert get_canonical_branch("Mechanical Engineering") == "ME"
    assert get_canonical_branch("Civil Engineering") == "CE"

    # Match tests
    assert is_branch_eligible("TECHNICAL / ELECTRICAL ENGINEERING", ["CSE", "IT"]) is False
    assert is_branch_eligible("Electrical Engineering", ["CSE", "IT"]) is False
    assert is_branch_eligible("Mechanical", ["CSE", "IT"]) is False
    assert is_branch_eligible("Computer Science and Engineering", ["CSE", "IT"]) is True
    assert is_branch_eligible("CSE", ["CSE", "IT"]) is True
    assert is_branch_eligible("IT", ["CSE", "IT"]) is True
    assert is_branch_eligible("Information Technology", ["CSE", "IT"]) is True

def test_evaluate_drive_eligibility_scenarios():
    """Verify deterministic evaluate_drive_eligibility logic."""
    drive = {
        "id": "drive-test-1",
        "minCgpa": 8.0,
        "eligibleBranches": ["CSE", "IT"],
        "graduationYears": [2026, 2027],
        "maxBacklogs": 0
    }

    # Scenario 1: User prompt case (CGPA 8.9, TECHNICAL / ELECTRICAL ENGINEERING) -> Ineligible
    student_1 = {
        "cgpa": 8.9,
        "branch": "TECHNICAL / ELECTRICAL ENGINEERING",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    is_elig_1, reasons_1, _ = evaluate_drive_eligibility(student_1, drive)
    assert is_elig_1 is False
    assert any("Eligible branches" in r for r in reasons_1)

    # Scenario 2: Low CGPA (CGPA 7.5, CSE) -> Ineligible
    student_2 = {
        "cgpa": 7.5,
        "branch": "CSE",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    is_elig_2, reasons_2, _ = evaluate_drive_eligibility(student_2, drive)
    assert is_elig_2 is False
    assert any("Minimum CGPA" in r for r in reasons_2)

    # Scenario 3: Wrong Batch (CGPA 8.5, CSE, 2024) -> Ineligible
    student_3 = {
        "cgpa": 8.5,
        "branch": "CSE",
        "graduationYear": 2024,
        "activeBacklogs": 0
    }
    is_elig_3, reasons_3, _ = evaluate_drive_eligibility(student_3, drive)
    assert is_elig_3 is False
    assert any("Graduation year" in r for r in reasons_3)

    # Scenario 4: All criteria met (CGPA 8.5, Computer Science and Engineering, 2026) -> Eligible
    student_4 = {
        "cgpa": 8.5,
        "branch": "Computer Science and Engineering",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    is_elig_4, reasons_4, _ = evaluate_drive_eligibility(student_4, drive)
    assert is_elig_4 is True
    assert len(reasons_4) == 0

def test_backend_enforcement_community_registration_rejection():
    """Verify that POST /api/communities/{drive_id}/register rejects ineligible students with HTTP 400 and preserves DB state."""
    asyncio.run(_run_test_backend_enforcement_community_registration_rejection())

async def _run_test_backend_enforcement_community_registration_rejection():
    db = db_manager.db
    if db is None:
        pytest.skip("Database not connected")

    drive_id = f"drive-elig-test-{uuid.uuid4().hex[:6]}"
    student_id = f"stu-inelig-{uuid.uuid4().hex[:6]}"
    student_email = f"inelig_{uuid.uuid4().hex[:4]}@campus.edu"

    # Create Drive in DB with strict criteria (min CGPA 8.0, Branches: CSE, IT)
    drive_doc = {
        "id": drive_id,
        "driveId": drive_id,
        "companyName": "TechCorp Global",
        "roleTitle": "Software Engineer",
        "companyId": "comp-test-1",
        "minCgpa": 8.0,
        "eligibleBranches": ["CSE", "IT"],
        "graduationYears": [2026, 2027],
        "registeredCount": 0,
        "status": "ACTIVE"
    }
    await db.drives.insert_one(drive_doc)

    # Create Ineligible Student in DB (CGPA 8.9, TECHNICAL / ELECTRICAL ENGINEERING)
    student_doc = {
        "id": student_id,
        "email": student_email,
        "name": "Alex Electrical",
        "role": "student",
        "cgpa": 8.9,
        "branch": "TECHNICAL / ELECTRICAL ENGINEERING",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    await db.students.insert_one(student_doc)
    await db.users.insert_one(student_doc)

    token = create_access_token({"id": student_id, "sub": student_id, "email": student_email, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    # Ineligible Student attempts registration via Community Form
    payload = {
        "name": "Alex Electrical",
        "email": student_email,
        "roll_number": "EE-2026-001",
        "branch": "TECHNICAL / ELECTRICAL ENGINEERING",
        "cgpa": 8.9,
        "phone": "9998887776"
    }
    res = client.post(f"/api/communities/{drive_id}/register", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Ineligible" in res.json().get("detail", "")

    # Verify DB state: NO application record created
    app_count = await db.applications.count_documents({"drive_id": drive_id, "student_id": student_id})
    assert app_count == 0

    # Verify DB state: NO community response created
    resp_count = await db.community_responses.count_documents({"drive_id": drive_id, "student_id": student_id})
    assert resp_count == 0

    # Verify registeredCount did NOT increase
    d_fresh = await db.drives.find_one({"id": drive_id})
    assert d_fresh.get("registeredCount", 0) == 0

    # Now test Student Portal Apply endpoint (/api/students/apply)
    apply_payload = {
        "driveId": drive_id,
        "name": "Alex Electrical",
        "mobile": "9998887776"
    }
    res2 = client.post("/api/students/apply", json=apply_payload, headers=headers)
    assert res2.status_code == 400
    assert "Ineligible" in res2.json().get("detail", "")

    # Clean up
    await db.drives.delete_one({"id": drive_id})
    await db.students.delete_one({"id": student_id})
    await db.users.delete_one({"id": student_id})

def test_backend_enforcement_eligible_student_success():
    """Verify that eligible student registers successfully, increments count, and prevents duplicate registration."""
    asyncio.run(_run_test_backend_enforcement_eligible_student_success())

async def _run_test_backend_enforcement_eligible_student_success():
    db = db_manager.db
    if db is None:
        pytest.skip("Database not connected")

    drive_id = f"drive-elig-succ-{uuid.uuid4().hex[:6]}"
    student_id = f"stu-elig-{uuid.uuid4().hex[:6]}"
    student_email = f"elig_{uuid.uuid4().hex[:4]}@campus.edu"

    # Create Drive in DB
    drive_doc = {
        "id": drive_id,
        "driveId": drive_id,
        "companyName": "TechCorp Global",
        "roleTitle": "Software Engineer",
        "companyId": "comp-test-1",
        "minCgpa": 8.0,
        "eligibleBranches": ["CSE", "IT"],
        "graduationYears": [2026, 2027],
        "registeredCount": 0,
        "status": "ACTIVE"
    }
    await db.drives.insert_one(drive_doc)

    # Create Eligible Student in DB (CGPA 8.5, Computer Science and Engineering)
    student_doc = {
        "id": student_id,
        "email": student_email,
        "name": "Samantha CS",
        "role": "student",
        "cgpa": 8.5,
        "branch": "Computer Science and Engineering",
        "graduationYear": 2026,
        "activeBacklogs": 0
    }
    await db.students.insert_one(student_doc)
    await db.users.insert_one(student_doc)

    token = create_access_token({"id": student_id, "sub": student_id, "email": student_email, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Samantha CS",
        "email": student_email,
        "roll_number": "CS-2026-001",
        "branch": "Computer Science and Engineering",
        "cgpa": 8.5,
        "phone": "9998887775"
    }
    res = client.post(f"/api/communities/{drive_id}/register", json=payload, headers=headers)
    assert res.status_code == 201
    assert res.json().get("status") in ["SUCCESS", "registered"]

    # Verify DB state: 1 application record created
    app_doc = await db.applications.find_one({"drive_id": drive_id, "student_id": student_id})
    assert app_doc is not None
    assert app_doc.get("status") == "APPLIED"

    # Verify registeredCount incremented to 1
    d_fresh = await db.drives.find_one({"id": drive_id})
    assert d_fresh.get("registeredCount") == 1

    # Duplicate Attempt -> MUST FAIL with 400
    res_dup = client.post(f"/api/communities/{drive_id}/register", json=payload, headers=headers)
    assert res_dup.status_code == 400
    assert "already registered" in res_dup.json().get("detail", "").lower()

    # Clean up
    await db.drives.delete_one({"id": drive_id})
    await db.students.delete_one({"id": student_id})
    await db.users.delete_one({"id": student_id})
    await db.applications.delete_many({"drive_id": drive_id})
    await db.community_responses.delete_many({"drive_id": drive_id})
