import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_drive_scoped_analytics_isolation_and_aggregation():
    """
    MASTER TEST SUITE: Drive-Scoped Live Analytics Isolation.
    Tests:
    1. Drive A isolation (candidates, shortlists, selections)
    2. Drive B isolation
    3. Mutual exclusivity (Drive A does not contain Drive B, and vice versa)
    4. All Drives institutional aggregate mode
    5. Empty Drive with 0 applications returns clean 0s
    6. Drive-scoped skill analytics & readiness
    7. CSV export with drive_id
    8. Recruiter RBAC isolation
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.drives.delete_many({})
            await db.students.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})
            await db.offers.delete_many({})

        # 1. Seed 4 Students
        await db.students.insert_many([
            {
                "id": "st-1",
                "name": "Aarav Patel",
                "email": "aarav@campus.edu",
                "branch": "CSE",
                "cgpa": 9.2,
                "readinessScore": 95,
                "skills": ["Python", "FastAPI", "MongoDB"]
            },
            {
                "id": "st-2",
                "name": "Diya Sen",
                "email": "diya@campus.edu",
                "branch": "CSE",
                "cgpa": 8.5,
                "readinessScore": 85,
                "skills": ["Python", "Django", "PostgreSQL"]
            },
            {
                "id": "st-3",
                "name": "Rohan Sharma",
                "email": "rohan@campus.edu",
                "branch": "ECE",
                "cgpa": 7.8,
                "readinessScore": 70,
                "skills": ["Java", "Spring Boot", "React"]
            },
            {
                "id": "st-4",
                "name": "Ananya Gupta",
                "email": "ananya@campus.edu",
                "branch": "ME",
                "cgpa": 6.5,
                "readinessScore": 50,
                "skills": ["CAD", "Matlab"]
            }
        ])

        # 2. Seed 3 Drives: Drive A (Infosys), Drive B (Google), Drive C (Empty Drive)
        drive_a_id = "drv-infosys-101"
        drive_b_id = "drv-google-202"
        drive_c_id = "drv-empty-303"

        await db.drives.insert_many([
            {
                "id": drive_a_id,
                "companyName": "Infosys",
                "roleTitle": "System Engineer Specialist",
                "packageLpa": 9.5,
                "minCgpa": 7.5,
                "eligibleBranches": ["CSE", "ECE"],
                "requiredSkills": ["Python", "FastAPI", "MongoDB"],
                "status": "ACTIVE",
                "recruiter_id": "rec-infosys-1"
            },
            {
                "id": drive_b_id,
                "companyName": "Google",
                "roleTitle": "Software Engineer",
                "packageLpa": 42.0,
                "minCgpa": 8.5,
                "eligibleBranches": ["CSE"],
                "requiredSkills": ["Java", "Distributed Systems"],
                "status": "ACTIVE",
                "recruiter_id": "rec-google-1"
            },
            {
                "id": drive_c_id,
                "companyName": "Microsoft",
                "roleTitle": "Cloud Solution Architect",
                "packageLpa": 36.0,
                "minCgpa": 8.0,
                "eligibleBranches": ["CSE", "IT"],
                "requiredSkills": ["Azure", "Kubernetes"],
                "status": "ACTIVE",
                "recruiter_id": "rec-msft-1"
            }
        ])

        # 3. Seed Applications:
        # Drive A has 3 applicants:
        #   st-1: PLACEMENT_COMPLETED (selected, offer accepted, placed)
        #   st-2: SHORTLISTED
        #   st-3: APPLIED
        await db.applications.insert_many([
            {
                "id": "app-a1",
                "drive_id": drive_a_id,
                "student_id": "st-1",
                "student_name": "Aarav Patel",
                "student_cgpa": 9.2,
                "student_branch": "CSE",
                "status": "PLACEMENT_COMPLETED",
                "stage": "PLACEMENT_COMPLETED",
                "aptitude_score": 90,
                "technical_score": 95,
                "interview_score": 92
            },
            {
                "id": "app-a2",
                "drive_id": drive_a_id,
                "student_id": "st-2",
                "student_name": "Diya Sen",
                "student_cgpa": 8.5,
                "student_branch": "CSE",
                "status": "SHORTLISTED",
                "stage": "SHORTLISTED"
            },
            {
                "id": "app-a3",
                "drive_id": drive_a_id,
                "student_id": "st-3",
                "student_name": "Rohan Sharma",
                "student_cgpa": 7.8,
                "student_branch": "ECE",
                "status": "APPLIED",
                "stage": "APPLIED"
            },
            # Drive B has 1 applicant:
            #   st-1: INTERVIEW_SCHEDULED
            {
                "id": "app-b1",
                "drive_id": drive_b_id,
                "student_id": "st-1",
                "student_name": "Aarav Patel",
                "student_cgpa": 9.2,
                "student_branch": "CSE",
                "status": "INTERVIEW_SCHEDULED",
                "stage": "INTERVIEW_SCHEDULED"
            }
        ])

        # 4. Seed Offer for Drive A
        await db.offers.insert_one({
            "id": "off-a1",
            "drive_id": drive_a_id,
            "student_id": "st-1",
            "company_name": "Infosys",
            "packageLpa": 9.5,
            "status": "ACCEPTED"
        })

        officer_token = create_access_token({
            "sub": "off-1",
            "id": "off-1",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Officer"
        })
        headers = {"Authorization": f"Bearer {officer_token}"}

        # TEST 1: Query Drive A Analytics
        res_a = await client.get(f"/api/analytics/overview?drive_id={drive_a_id}", headers=headers)
        assert res_a.status_code == 200
        data_a = res_a.json()
        kpis_a = data_a["kpis"]

        # Drive A has 3 registered applicants, 2 shortlisted (st-1 placed, st-2 shortlisted), 1 placed
        assert kpis_a["total_applications"] == 3
        assert kpis_a["total_students"] == 3
        assert kpis_a["shortlisted_candidates"] == 2
        assert kpis_a["final_selected"] == 1
        assert kpis_a["placement_completed"] == 1
        assert kpis_a["offers_accepted"] == 1
        assert kpis_a["interviews_scheduled"] == 1

        # Skill analytics for Drive A
        skills_a = data_a["skills_analytics"]
        assert len(skills_a["skillDemands"]) == 3
        skill_names_a = [s["skill"] for s in skills_a["skillDemands"]]
        assert "Python" in skill_names_a
        assert "FastAPI" in skill_names_a
        assert "MongoDB" in skill_names_a

        # TEST 2: Query Drive B Analytics
        res_b = await client.get(f"/api/analytics/overview?drive_id={drive_b_id}", headers=headers)
        assert res_b.status_code == 200
        data_b = res_b.json()
        kpis_b = data_b["kpis"]

        # Drive B has 1 application, 0 placed, 1 interview scheduled
        assert kpis_b["total_applications"] == 1
        assert kpis_b["total_students"] == 1
        assert kpis_b["final_selected"] == 0
        assert kpis_b["placement_completed"] == 0
        assert kpis_b["offers_accepted"] == 0
        assert kpis_b["interviews_scheduled"] == 1

        # TEST 3: Isolation verification (Drive A does not have Drive B metrics, and vice versa)
        assert kpis_a["total_applications"] != kpis_b["total_applications"]
        assert kpis_a["final_selected"] == 1 and kpis_b["final_selected"] == 0

        # TEST 4: Query Drive C (Empty Drive with 0 applications)
        res_c = await client.get(f"/api/analytics/overview?drive_id={drive_c_id}", headers=headers)
        assert res_c.status_code == 200
        data_c = res_c.json()
        kpis_c = data_c["kpis"]
        assert kpis_c["total_applications"] == 0
        assert kpis_c["total_students"] == 0
        assert kpis_c["final_selected"] == 0
        assert kpis_c["shortlisted_candidates"] == 0

        # TEST 5: All Placement Drives Aggregate Mode
        res_all = await client.get("/api/analytics/overview", headers=headers)
        assert res_all.status_code == 200
        data_all = res_all.json()
        kpis_all = data_all["kpis"]
        assert kpis_all["total_applications"] == 4
        assert kpis_all["total_students"] == 4
        assert kpis_all["final_selected"] == 1
        assert kpis_all["total_drives"] == 3

        # TEST 6: CSV Export with drive_id
        res_csv = await client.get(f"/api/analytics/export/csv?drive_id={drive_a_id}", headers=headers)
        assert res_csv.status_code == 200
        assert "text/csv" in res_csv.headers["content-type"]
        assert len(res_csv.text) > 50

        # TEST 7: Recruiter RBAC Scoping
        rec_token = create_access_token({
            "sub": "rec-infosys-1",
            "id": "rec-infosys-1",
            "email": "recruiter@infosys.com",
            "role": "recruiter",
            "company": "Infosys",
            "name": "Infosys HR"
        })
        rec_headers = {"Authorization": f"Bearer {rec_token}"}
        res_rec = await client.get("/api/analytics/overview", headers=rec_headers)
        assert res_rec.status_code == 200
        data_rec = res_rec.json()
        # Recruiter sees only their 1 drive and its 3 applications
        assert data_rec["kpis"]["total_drives"] == 1
        assert data_rec["kpis"]["total_applications"] == 3
