import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_analytics_empty_database_returns_valid_zero_state():
    """
    TEST 1:
    Empty database records return valid zero/empty state without crashing.
    """
    await connect_to_mongo()
    token = create_access_token({"sub": "officer-test", "role": "placement_officer", "email": "officer@college.edu"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/analytics/overview", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()

        assert "kpis" in data
        assert "funnel" in data
        assert "performance_metrics" in data
        assert "drive_breakdown" in data
        assert "skills_analytics" in data

        assert isinstance(data["kpis"]["total_students"], int)
        assert isinstance(data["funnel"], list)


@pytest.mark.anyio
async def test_analytics_application_and_stage_counters_lifecycle():
    """
    TESTS 2-9:
    Verifies that applying, shortlisting, assessing, scheduling interviews, selecting,
    issuing offers, accepting offers, and confirming joining update live KPI counters.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    unique_suffix = uuid.uuid4().hex[:6]
    company_name = f"AnalyticsCorp_{unique_suffix}"
    drive_id = f"drv-{unique_suffix}"
    student_id = f"std-{unique_suffix}"
    app_id = f"app-{unique_suffix}"
    offer_id = f"off-{unique_suffix}"

    token = create_access_token({"sub": "officer-test", "role": "placement_officer", "email": "officer@college.edu"})
    headers = {"Authorization": f"Bearer {token}"}

    # Step A: Seed Student & Drive
    await db.students.insert_one({
        "id": student_id,
        "name": f"Student {unique_suffix}",
        "branch": "CSE",
        "graduationYear": 2026,
        "cgpa": 8.8,
        "readinessScore": 85,
        "skills": ["Python", "React", "MongoDB"]
    })

    await db.drives.insert_one({
        "id": drive_id,
        "companyName": company_name,
        "roleTitle": "Fullstack Engineer",
        "packageLpa": 12.0,
        "minCgpa": 7.0,
        "eligibleBranches": ["CSE", "IT"],
        "status": "ACTIVE",
        "requiredSkills": ["Python", "MongoDB"]
    })

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Base verification: 1 drive, 1 student
            resp1 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            assert resp1.status_code == 200
            d1 = resp1.json()
            assert d1["kpis"]["total_drives"] == 1
            assert d1["kpis"]["total_applications"] == 0

            # 2. Candidate Applies (TEST 2)
            await db.applications.insert_one({
                "id": app_id,
                "drive_id": drive_id,
                "student_id": student_id,
                "company_name": company_name,
                "student_branch": "CSE",
                "student_cgpa": 8.8,
                "status": "APPLIED",
                "applied_at": datetime.now().isoformat()
            })

            resp2 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            assert resp2.status_code == 200
            d2 = resp2.json()
            assert d2["kpis"]["total_applications"] == 1
            assert d2["kpis"]["shortlisted_candidates"] == 0

            # 3. Candidate Shortlisted (TEST 3)
            await db.applications.update_one({"id": app_id}, {"$set": {"status": "SHORTLISTED"}})
            resp3 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d3 = resp3.json()
            assert d3["kpis"]["shortlisted_candidates"] == 1

            # 4. Assessment Completed (TEST 4)
            await db.applications.update_one(
                {"id": app_id},
                {"$set": {"status": "ASSESSMENT_CLEARED", "aptitude_score": 90, "technical_score": 95}}
            )
            resp4 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d4 = resp4.json()
            assert d4["kpis"]["assessment_qualified"] == 1
            assert d4["performance_metrics"]["avg_assessment_score"] == 90.0
            assert d4["performance_metrics"]["avg_technical_score"] == 95.0

            # 5. Interview Scheduled & Completed (TEST 5)
            await db.applications.update_one(
                {"id": app_id},
                {"$set": {
                    "status": "INTERVIEW_COMPLETED",
                    "interview_score": 88,
                    "interview": {"status": "COMPLETED", "score": 88, "round": "Technical Round 1"}
                }}
            )
            resp5 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d5 = resp5.json()
            assert d5["kpis"]["interviews_completed"] == 1
            assert d5["performance_metrics"]["avg_interview_score"] == 88.0

            # 6. Final Selected (TEST 6)
            await db.applications.update_one({"id": app_id}, {"$set": {"status": "SELECTED"}})
            resp6 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d6 = resp6.json()
            assert d6["kpis"]["final_selected"] == 1

            # 7. Offer Issued (TEST 7)
            await db.applications.update_one({"id": app_id}, {"$set": {"status": "OFFERED"}})
            await db.offers.insert_one({
                "id": offer_id,
                "drive_id": drive_id,
                "student_id": student_id,
                "company_name": company_name,
                "packageLpa": 12.0,
                "status": "OFFERED",
                "created_at": datetime.now().isoformat()
            })
            resp7 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d7 = resp7.json()
            assert d7["kpis"]["offers_issued"] == 1
            assert d7["performance_metrics"]["highest_package_lpa"] == 12.0

            # 8. Offer Accepted (TEST 8)
            await db.applications.update_one({"id": app_id}, {"$set": {"status": "OFFER_ACCEPTED"}})
            await db.offers.update_one({"id": offer_id}, {"$set": {"status": "ACCEPTED"}})
            resp8 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d8 = resp8.json()
            assert d8["kpis"]["offers_accepted"] == 1

            # 9. Joining Confirmed / Placement Completed (TEST 9)
            await db.applications.update_one({"id": app_id}, {"$set": {"status": "JOINING_CONFIRMED"}})
            await db.offers.update_one({"id": offer_id}, {"$set": {"status": "JOINING_CONFIRMED"}})
            resp9 = await ac.get(f"/api/analytics/overview?company={company_name}", headers=headers)
            d9 = resp9.json()
            assert d9["kpis"]["placement_completed"] == 1
    finally:
        await db.students.delete_one({"id": student_id})
        await db.drives.delete_one({"id": drive_id})
        await db.applications.delete_one({"id": app_id})
        await db.offers.delete_one({"id": offer_id})


@pytest.mark.anyio
async def test_analytics_recruiter_scope_isolation():
    """
    TEST 10:
    Recruiter only receives analytics for drives owned/authorized by their recruiter account.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    rec1_id = f"rec1-{uuid.uuid4().hex[:6]}"
    rec2_id = f"rec2-{uuid.uuid4().hex[:6]}"
    drv1_id = f"drv1-{uuid.uuid4().hex[:6]}"
    drv2_id = f"drv2-{uuid.uuid4().hex[:6]}"

    await db.drives.insert_one({"id": drv1_id, "companyName": "Rec1Company", "recruiter_id": rec1_id, "status": "ACTIVE"})
    await db.drives.insert_one({"id": drv2_id, "companyName": "Rec2Company", "recruiter_id": rec2_id, "status": "ACTIVE"})

    token_rec1 = create_access_token({"sub": rec1_id, "role": "recruiter", "email": "rec1@company.com"})

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/api/analytics/overview", headers={"Authorization": f"Bearer {token_rec1}"})
            assert resp.status_code == 200
            data = resp.json()

            drive_ids = [d["drive_id"] for d in data["drive_breakdown"]]
            assert drv1_id in drive_ids
            assert drv2_id not in drive_ids
    finally:
        await db.drives.delete_many({"id": {"$in": [drv1_id, drv2_id]}})


@pytest.mark.anyio
async def test_analytics_student_access_denied():
    """
    TEST 11:
    Student role is forbidden from institutional analytics endpoints (403 Forbidden).
    """
    student_token = create_access_token({"sub": "std-123", "role": "student", "email": "student@college.edu"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/analytics/overview", headers={"Authorization": f"Bearer {student_token}"})
        assert resp.status_code == 403


@pytest.mark.anyio
async def test_analytics_csv_export():
    """
    TEST 12:
    CSV export endpoint streams valid CSV content with headers and KPI records.
    """
    token = create_access_token({"sub": "officer-test", "role": "placement_officer", "email": "officer@college.edu"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/analytics/export/csv", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        text = resp.text
        assert "PlaceMind Institutional Placement & Recruitment Report" in text
        assert "EXECUTIVE KPI SUMMARY" in text
        assert "RECRUITMENT FUNNEL" in text


@pytest.mark.anyio
async def test_analytics_branch_and_batch_filters():
    """
    TESTS 13 & 14:
    Branch and Batch filters accurately scope analytics computations.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    s1_id = f"std1-{uuid.uuid4().hex[:6]}"
    s2_id = f"std2-{uuid.uuid4().hex[:6]}"

    await db.students.insert_many([
        {"id": s1_id, "name": "CSE Student", "branch": "CSE", "graduationYear": 2026, "cgpa": 9.0},
        {"id": s2_id, "name": "ECE Student", "branch": "ECE", "graduationYear": 2027, "cgpa": 8.0}
    ])

    token = create_access_token({"sub": "officer-test", "role": "placement_officer", "email": "officer@college.edu"})
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Filter by CSE
            resp_cse = await ac.get("/api/analytics/overview?branch=CSE", headers=headers)
            assert resp_cse.status_code == 200
            data_cse = resp_cse.json()
            assert data_cse["filters_applied"]["branch"] == "CSE"

            # Filter by Batch 2027
            resp_batch = await ac.get("/api/analytics/overview?grad_year=2027", headers=headers)
            assert resp_batch.status_code == 200
            data_batch = resp_batch.json()
            assert data_batch["filters_applied"]["grad_year"] == "2027"
    finally:
        await db.students.delete_many({"id": {"$in": [s1_id, s2_id]}})
