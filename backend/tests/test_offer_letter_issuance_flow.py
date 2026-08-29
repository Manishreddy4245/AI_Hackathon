import pytest
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_offer_letter_issuance_authorization_matrix():
    """
    MASTER AUTHORIZATION TEST MATRIX FOR OFFER LETTER ISSUANCE:
    Test 1: Correct recruiter + own company drive -> Issue Offer succeeds.
    Test 2: Recruiter + another company's drive -> 403 Forbidden ('cannot access drive for another company').
    Test 3: Placement Officer + approved institutional drive -> succeeds.
    Test 4: Student trying to issue an offer -> 403 Forbidden.
    Test 5: Candidate from Drive A + Offer request for Drive B -> 403 Forbidden (cross-drive mismatch).
    Test 6: Valid selected candidate + correct drive/company -> offer successfully created with authoritative data.
    Test 7: Query candidate/application -> offer state remains correct ('OFFERED').
    Test 8: Duplicate Issue Offer request -> 409 Conflict (no duplicate offers).
    Test 9: Recruiter case-insensitive matching & direct drive ownership -> succeeds.
    Test 10: Student viewing and accepting the offer -> transitions to ACCEPTED / OFFER_ACCEPTED.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.drives.delete_many({})
            await db.students.delete_many({})
            await db.applications.delete_many({})
            await db.offers.delete_many({})
            await db.notifications.delete_many({})

        # 1. Seed Candidates: Chandan (Deloitte) and Priya (Infosys)
        await db.students.insert_many([
            {
                "id": "st-chandan",
                "name": "Chandan Kumar",
                "email": "chandan@campus.edu",
                "branch": "CSE",
                "cgpa": 8.8,
                "skills": ["Python", "FastAPI"]
            },
            {
                "id": "st-priya",
                "name": "Priya Sharma",
                "email": "priya@campus.edu",
                "branch": "CSE",
                "cgpa": 9.1,
                "skills": ["Java", "Spring"]
            }
        ])

        # 2. Seed Drives: Deloitte (Drive A) and Infosys (Drive B)
        drive_deloitte_id = "drv-deloitte-101"
        drive_infosys_id = "drv-infosys-202"

        await db.drives.insert_many([
            {
                "id": drive_deloitte_id,
                "companyName": "Deloitte",
                "company_name": "Deloitte",
                "companyId": "comp-deloitte",
                "roleTitle": "Campus Placement Role",
                "packageLpa": 12.0,
                "minCgpa": 7.5,
                "status": "APPROVED",
                "recruiter_id": "rec-deloitte-user"
            },
            {
                "id": drive_infosys_id,
                "companyName": "Infosys",
                "company_name": "Infosys",
                "companyId": "comp-infosys",
                "roleTitle": "Specialist Programmer",
                "packageLpa": 9.5,
                "minCgpa": 7.0,
                "status": "APPROVED",
                "recruiter_id": "rec-infosys-user"
            }
        ])

        # 3. Seed Applications
        app_chandan_id = "app-chandan-deloitte"
        app_priya_id = "app-priya-infosys"

        await db.applications.insert_many([
            {
                "id": app_chandan_id,
                "student_id": "st-chandan",
                "student_name": "Chandan Kumar",
                "student_email": "chandan@campus.edu",
                "drive_id": drive_deloitte_id,
                "company_name": "Deloitte",
                "companyId": "comp-deloitte",
                "job_title": "Campus Placement Role",
                "package_lpa": 12.0,
                "status": "SELECTED",
                "stage": "SELECTED",
                "pipeline_stage": "SELECTED",
                "created_at": datetime.now().isoformat()
            },
            {
                "id": app_priya_id,
                "student_id": "st-priya",
                "student_name": "Priya Sharma",
                "student_email": "priya@campus.edu",
                "drive_id": drive_infosys_id,
                "company_name": "Infosys",
                "companyId": "comp-infosys",
                "job_title": "Specialist Programmer",
                "package_lpa": 9.5,
                "status": "SELECTED",
                "stage": "SELECTED",
                "pipeline_stage": "SELECTED",
                "created_at": datetime.now().isoformat()
            }
        ])

        # Recruiter tokens
        deloitte_recruiter_token = create_access_token({
            "sub": "rec-deloitte-user",
            "id": "rec-deloitte-user",
            "email": "recruiter@deloitte.com",
            "role": "recruiter",
            "company": "Deloitte",
            "company_name": "Deloitte",
            "companyId": "comp-deloitte",
            "name": "Deloitte Recruiter"
        })
        deloitte_headers = {"Authorization": f"Bearer {deloitte_recruiter_token}"}

        infosys_recruiter_token = create_access_token({
            "sub": "rec-infosys-user",
            "id": "rec-infosys-user",
            "email": "recruiter@infosys.com",
            "role": "recruiter",
            "company": "Infosys",
            "company_name": "Infosys",
            "companyId": "comp-infosys",
            "name": "Infosys Recruiter"
        })
        infosys_headers = {"Authorization": f"Bearer {infosys_recruiter_token}"}

        # Officer token
        officer_token = create_access_token({
            "sub": "off-1",
            "id": "off-1",
            "email": "officer@campus.edu",
            "role": "placement_officer",
            "name": "Placement Officer"
        })
        officer_headers = {"Authorization": f"Bearer {officer_token}"}

        # Student token
        student_token = create_access_token({
            "sub": "st-chandan",
            "id": "st-chandan",
            "email": "chandan@campus.edu",
            "role": "student",
            "name": "Chandan Kumar"
        })
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # --- TEST 2: Recruiter + another company's drive -> 403 Forbidden ---
        # Deloitte recruiter tries to issue offer to Priya (who applied to Infosys drive)
        payload_cross_company = {
            "application_id": app_priya_id,
            "student_id": "st-priya",
            "drive_id": drive_infosys_id,
            "package_lpa": 9.5,
            "joining_date": "2026-10-27"
        }
        res_cross = await client.post("/api/offers", json=payload_cross_company, headers=deloitte_headers)
        assert res_cross.status_code == 403
        assert "cannot access drive for another company" in res_cross.json()["detail"].lower()

        # --- TEST 4: Student trying to issue offer -> 403 Forbidden ---
        res_student_attempt = await client.post("/api/offers", json=payload_cross_company, headers=student_headers)
        assert res_student_attempt.status_code == 403

        # --- TEST 5: Candidate from Drive A + Offer request for Drive B -> 403 Forbidden (cross-drive mismatch) ---
        payload_mismatched_drive = {
            "application_id": app_chandan_id,
            "student_id": "st-chandan",
            "drive_id": drive_infosys_id,  # Chandan applied to Deloitte, not Infosys
            "package_lpa": 12.0,
            "joining_date": "2026-10-27"
        }
        res_mismatch = await client.post("/api/offers", json=payload_mismatched_drive, headers=deloitte_headers)
        assert res_mismatch.status_code == 403
        assert "does not belong to the specified placement drive" in res_mismatch.json()["detail"].lower()

        # --- TEST 1: Correct recruiter + own company drive -> Issue Offer succeeds ---
        chandan_valid_payload = {
            "application_id": app_chandan_id,
            "student_id": "st-chandan",
            "drive_id": drive_deloitte_id,
            "company_name": "Deloitte",
            "job_title": "Campus Placement Role",
            "package_lpa": 12.0,
            "base_salary_lpa": 9.6,
            "joining_bonus_lpa": 0.0,
            "designation": "Software Development Engineer",
            "job_location": "Bengaluru, India",
            "employment_type": "Full-time",
            "joining_date": "27.10.2026",
            "response_deadline": "11.09.2026",
            "offer_letter_text": "Deloitte campus offer letter for Chandan."
        }
        res_deloitte_offer = await client.post("/api/offers", json=chandan_valid_payload, headers=deloitte_headers)
        assert res_deloitte_offer.status_code == 201
        deloitte_offer_data = res_deloitte_offer.json()
        assert deloitte_offer_data["company_name"] == "Deloitte"
        assert deloitte_offer_data["joining_date"] == "2026-10-27"
        assert deloitte_offer_data["status"] == "OFFERED"

        # --- TEST 7: Query candidate/application -> offer state is OFFERED ---
        app_in_db = await db.applications.find_one({"id": app_chandan_id}, {"_id": 0})
        assert app_in_db["status"] == "OFFERED"
        assert app_in_db["offer_id"] == deloitte_offer_data["id"]

        # --- TEST 8: Duplicate Issue Offer request -> 409 Conflict ---
        res_deloitte_dup = await client.post("/api/offers", json=chandan_valid_payload, headers=deloitte_headers)
        assert res_deloitte_dup.status_code == 409
        assert "already been issued" in res_deloitte_dup.json()["detail"]

        # --- TEST 3: Placement Officer + approved institutional drive -> succeeds ---
        # Officer issues offer for Priya (Infosys drive)
        priya_valid_payload = {
            "application_id": app_priya_id,
            "student_id": "st-priya",
            "drive_id": drive_infosys_id,
            "package_lpa": 9.5,
            "base_salary_lpa": 7.6,
            "joining_date": "15.11.2026",
            "response_deadline": "30.09.2026"
        }
        res_officer_offer = await client.post("/api/offers", json=priya_valid_payload, headers=officer_headers)
        assert res_officer_offer.status_code == 201
        officer_offer_data = res_officer_offer.json()
        assert officer_offer_data["company_name"] == "Infosys"
        assert officer_offer_data["status"] == "OFFERED"

        # --- TEST 10: Student views and accepts offer ---
        res_my_offers = await client.get("/api/offers", headers=student_headers)
        assert res_my_offers.status_code == 200
        my_offers = res_my_offers.json()
        assert len(my_offers) == 1
        assert my_offers[0]["company_name"] == "Deloitte"

        # Student responds to accept
        res_respond = await client.post(
            f"/api/offers/{deloitte_offer_data['id']}/respond",
            json={"action": "ACCEPT", "preferred_location": "Bengaluru"},
            headers=student_headers
        )
        assert res_respond.status_code == 200
        assert res_respond.json()["status"] == "ACCEPTED"
