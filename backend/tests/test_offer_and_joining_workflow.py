"""
Comprehensive Automated Test Suite for PlaceMind Offer & Joining Workflow.
Tests the entire lifecycle:
1. Final Selection -> Offer Creation (POST /api/offers)
2. Student Offer Fetching (GET /api/offers/me)
3. Student Acceptance with Confirmed Joining Date (POST /api/offers/{id}/respond -> ACCEPT)
4. State Transitions (Application -> OFFER_ACCEPTED / JOINING_CONFIRMED, Student -> placed)
5. Idempotency & Duplicate Prevention (HTTP 409)
6. Joining Confirmation Logistics (POST /api/offers/{id}/confirm-joining)
7. Decline Workflow (POST /api/offers/{id}/respond -> DECLINE)
8. RBAC & IDOR Security Restrictions
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta

from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token, hash_password


@pytest_asyncio.fixture
async def workflow_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_offer_creation_acceptance_and_joining_lifecycle(workflow_client: AsyncClient):
    """
    Test end-to-end Offer & Joining workflow:
    1. Create placement drive & student application
    2. Advance application to SELECTED
    3. Officer issues Offer Letter
    4. Student views offer at /api/offers/me
    5. Student accepts offer with joining details
    6. Verify application and student master status updates
    7. Confirm joining logistics
    """
    db = db_manager.db
    assert db is not None, "Database must be initialized"

    now_ts = int(datetime.now().timestamp() * 1000)

    # 1. Setup Officer & Student Users
    officer_id = f"usr-off-{now_ts}"
    officer_email = f"officer-{now_ts}@college.edu"
    await db.users.insert_one({
        "id": officer_id,
        "email": officer_email,
        "name": "Dr. Placement Officer",
        "role": "placement_officer",
        "hashed_password": hash_password("OfficerPass123!"),
    })
    officer_token = create_access_token({"sub": officer_id, "id": officer_id, "email": officer_email, "role": "placement_officer", "name": "Dr. Placement Officer"})
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    student_id = f"usr-stu-{now_ts}"
    student_email = f"student-{now_ts}@college.edu"
    await db.users.insert_one({
        "id": student_id,
        "email": student_email,
        "name": "Aditya Sharma",
        "role": "student",
        "hashed_password": hash_password("StudentPass123!"),
    })
    await db.students.insert_one({
        "id": student_id,
        "email": student_email,
        "name": "Aditya Sharma",
        "branch": "CSE",
        "cgpa": 8.8,
        "placementStatus": "registered",
    })
    student_token = create_access_token({"sub": student_id, "id": student_id, "email": student_email, "role": "student", "name": "Aditya Sharma"})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    drive_id = f"drv-offer-test-{now_ts}"
    drive_doc = {
        "id": drive_id,
        "companyId": "comp-alpha",
        "companyName": "AlphaTech Innovations",
        "roleTitle": "Cloud Infrastructure Engineer",
        "packageLpa": 14.5,
        "eligibleBranches": ["CSE", "IT", "ECE"],
        "minCgpa": 7.0,
        "maxBacklogs": 0,
        "graduationYear": 2027,
        "graduationYears": [2027],
        "status": "ACTIVE",
        "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "registeredCount": 1,
        "shortlistedCount": 1,
        "selectedCount": 0,
    }
    await db.drives.insert_one(drive_doc)

    app_id = f"app-offer-test-{now_ts}"
    app_doc = {
        "id": app_id,
        "student_id": student_id,
        "student_name": "Aditya Sharma",
        "student_email": student_email,
        "drive_id": drive_id,
        "company_name": "AlphaTech Innovations",
        "job_title": "Cloud Infrastructure Engineer",
        "package_lpa": 14.5,
        "cgpa": 8.8,
        "branch": "CSE",
        "status": "SELECTED",
        "stage": "SELECTED",
        "pipeline_stage": "SELECTED",
        "applied_at": datetime.now().isoformat(),
        "created_at": datetime.now().isoformat(),
    }
    await db.applications.insert_one(app_doc)

    # 2. Officer Issues Offer Letter (POST /api/offers)
    joining_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
    deadline = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")

    create_offer_payload = {
        "application_id": app_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "company_name": "AlphaTech Innovations",
        "job_title": "Cloud Infrastructure Engineer",
        "package_lpa": 14.5,
        "base_salary_lpa": 11.6,
        "joining_bonus_lpa": 1.0,
        "designation": "Associate Cloud Engineer",
        "job_location": "Hyderabad, India",
        "joining_date": joining_date,
        "response_deadline": deadline,
        "terms_and_conditions": [
            "Maintain minimum 7.5 CGPA until degree completion.",
            "No active backlogs at time of joining.",
        ],
        "benefits": [
            "Medical Insurance INR 5,00,000",
            "Relocation allowance of INR 50,000",
        ]
    }

    res_offer = await workflow_client.post("/api/offers", json=create_offer_payload, headers=officer_headers)
    assert res_offer.status_code == 201, f"Failed to create offer: {res_offer.text}"
    offer_data = res_offer.json()
    offer_id = offer_data["id"]

    assert offer_data["status"] == "OFFERED"
    assert offer_data["package_lpa"] == 14.5
    assert offer_data["designation"] == "Associate Cloud Engineer"
    assert offer_data["job_location"] == "Hyderabad, India"

    # Verify application status transitioned to OFFERED
    updated_app = await db.applications.find_one({"id": app_id})
    assert updated_app is not None
    assert updated_app.get("status") == "OFFERED"
    assert updated_app.get("offer_id") == offer_id

    # Verify notification created for student
    notif = await db.notifications.find_one({"recipient_user_id": student_id, "type": "OFFER_RECEIVED"})
    assert notif is not None
    assert "AlphaTech Innovations" in notif["title"]

    # 3. Duplicate Offer Creation Protection (HTTP 409)
    res_dup = await workflow_client.post("/api/offers", json=create_offer_payload, headers=officer_headers)
    assert res_dup.status_code == 409, "Duplicate offer creation must return HTTP 409"

    # 4. Student Fetches Offers (GET /api/offers/me)
    res_my_offers = await workflow_client.get("/api/offers/me", headers=student_headers)
    assert res_my_offers.status_code == 200
    my_offers = res_my_offers.json()
    assert len(my_offers) >= 1
    target_offer = next((o for o in my_offers if o["id"] == offer_id), None)
    assert target_offer is not None
    assert target_offer["company_name"] == "AlphaTech Innovations"
    assert target_offer["status"] == "OFFERED"

    # 5. Student Accepts Offer with Confirmed Joining Logistics (POST /api/offers/{id}/respond)
    confirmed_date = (datetime.now() + timedelta(days=50)).strftime("%Y-%m-%d")
    accept_payload = {
        "action": "ACCEPT",
        "joining_date": confirmed_date,
        "preferred_location": "Hyderabad, India",
        "emergency_contact_name": "John Doe (Father)",
        "emergency_contact_phone": "+91 9876543210",
        "notes": "Looking forward to joining the Cloud Platform team.",
    }

    res_accept = await workflow_client.post(f"/api/offers/{offer_id}/respond", json=accept_payload, headers=student_headers)
    assert res_accept.status_code == 200, f"Failed to accept offer: {res_accept.text}"
    accepted_data = res_accept.json()
    assert accepted_data["status"] == "ACCEPTED"
    assert accepted_data["joining_details"]["confirmed_joining_date"] == confirmed_date

    # Verify application transitioned to OFFER_ACCEPTED & JOINING_CONFIRMED
    app_after_accept = await db.applications.find_one({"id": app_id})
    assert app_after_accept["status"] == "OFFER_ACCEPTED"
    assert app_after_accept["stage"] == "JOINING_CONFIRMED"

    # Verify student placed status updated in db.students
    student_record = await db.students.find_one({"id": student_id})
    if student_record:
        assert student_record.get("placementStatus") == "placed"
        assert student_record.get("selectedCompany") == "AlphaTech Innovations"

    # 6. Idempotency: Student cannot respond again to already accepted offer
    res_second_accept = await workflow_client.post(f"/api/offers/{offer_id}/respond", json=accept_payload, headers=student_headers)
    assert res_second_accept.status_code == 409, "Second response to accepted offer must return HTTP 409"

    # 7. Officer Confirms Final Joining Logistics (POST /api/offers/{id}/confirm-joining)
    confirm_payload = {
        "reporting_venue_or_link": "AlphaTech Tower B, Hitec City, Hyderabad",
        "reporting_time": "09:00 AM IST",
        "onboarding_notes": "Please carry original degree certificates and 2 passport photos.",
    }
    res_join_conf = await workflow_client.post(f"/api/offers/{offer_id}/confirm-joining", json=confirm_payload, headers=officer_headers)
    assert res_join_conf.status_code == 200
    join_conf_data = res_join_conf.json()
    assert join_conf_data["status"] == "JOINING_CONFIRMED"
    assert join_conf_data["joining_details"]["reporting_venue_or_link"] == "AlphaTech Tower B, Hitec City, Hyderabad"

    # Verify final application status is PLACEMENT_COMPLETED
    app_final = await db.applications.find_one({"id": app_id})
    assert app_final["stage"] == "PLACEMENT_COMPLETED"


@pytest.mark.asyncio
async def test_offer_decline_workflow(workflow_client: AsyncClient):
    """
    Test student declining an offer letter.
    """
    db = db_manager.db
    assert db is not None

    now_ts = int(datetime.now().timestamp() * 1000)
    officer_id = f"usr-off-dec-{now_ts}"
    officer_email = f"officer-dec-{now_ts}@college.edu"
    officer_token = create_access_token({"sub": officer_id, "id": officer_id, "email": officer_email, "role": "placement_officer", "name": "Officer"})
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    student_id = f"usr-stu-dec-{now_ts}"
    student_email = f"student-dec-{now_ts}@college.edu"
    student_token = create_access_token({"sub": student_id, "id": student_id, "email": student_email, "role": "student", "name": "Rohit Verma"})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    drive_id = f"drv-dec-test-{now_ts}"
    app_id = f"app-dec-test-{now_ts}"
    app_doc = {
        "id": app_id,
        "student_id": student_id,
        "student_name": "Rohit Verma",
        "student_email": student_email,
        "drive_id": drive_id,
        "company_name": "BetaCorp Global",
        "job_title": "Backend Developer",
        "package_lpa": 10.0,
        "status": "SELECTED",
        "stage": "SELECTED",
        "applied_at": datetime.now().isoformat(),
        "created_at": datetime.now().isoformat(),
    }
    await db.applications.insert_one(app_doc)

    create_offer_payload = {
        "application_id": app_id,
        "student_id": student_id,
        "drive_id": drive_id,
        "company_name": "BetaCorp Global",
        "job_title": "Backend Developer",
        "package_lpa": 10.0,
        "joining_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
    }

    res_offer = await workflow_client.post("/api/offers", json=create_offer_payload, headers=officer_headers)
    assert res_offer.status_code == 201
    offer_id = res_offer.json()["id"]

    # Student Declines Offer (POST /api/offers/{id}/respond -> DECLINE)
    decline_payload = {
        "action": "DECLINE",
        "decline_reason": "Pursuing Master's degree in Computer Science.",
    }

    res_dec = await workflow_client.post(f"/api/offers/{offer_id}/respond", json=decline_payload, headers=student_headers)
    assert res_dec.status_code == 200
    dec_data = res_dec.json()
    assert dec_data["status"] == "DECLINED"
    assert dec_data["decline_reason"] == "Pursuing Master's degree in Computer Science."

    # Verify application status transitioned to OFFER_DECLINED
    app_after_dec = await db.applications.find_one({"id": app_id})
    assert app_after_dec["status"] == "OFFER_DECLINED"
    assert app_after_dec["stage"] == "OFFER_DECLINED"


@pytest.mark.asyncio
async def test_offer_rbac_and_idor_protection(workflow_client: AsyncClient):
    """
    Test security controls:
    1. Students cannot issue offers (HTTP 403)
    2. Student A cannot view or respond to Student B's offer (HTTP 403)
    """
    db = db_manager.db
    assert db is not None

    now_ts = int(datetime.now().timestamp() * 1000)
    student_id = f"usr-stu-sec-{now_ts}"
    student_email = f"student-sec-{now_ts}@college.edu"
    student_token = create_access_token({"sub": student_id, "id": student_id, "email": student_email, "role": "student", "name": "Student A"})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    officer_id = f"usr-off-sec-{now_ts}"
    officer_email = f"officer-sec-{now_ts}@college.edu"
    officer_token = create_access_token({"sub": officer_id, "id": officer_id, "email": officer_email, "role": "placement_officer", "name": "Officer"})
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # 1. Student attempts to issue an offer -> HTTP 403 Forbidden
    res_unauth_create = await workflow_client.post("/api/offers", json={
        "application_id": "app-fake",
        "package_lpa": 10.0,
        "joining_date": "2027-06-01"
    }, headers=student_headers)
    assert res_unauth_create.status_code == 403, "Students must not be permitted to issue offer letters"

    # 2. Officer creates offer for another student (usr-other-candidate)
    other_student_id = f"usr-other-{now_ts}"
    app_id = f"app-other-student-{now_ts}"
    await db.applications.insert_one({
        "id": app_id,
        "student_id": other_student_id,
        "student_name": "Other Candidate",
        "student_email": f"other-{now_ts}@college.edu",
        "drive_id": "drv-generic",
        "company_name": "Generic Corp",
        "job_title": "Analyst",
        "status": "SELECTED",
        "created_at": datetime.now().isoformat()
    })

    res_off = await workflow_client.post("/api/offers", json={
        "application_id": app_id,
        "student_id": other_student_id,
        "drive_id": "drv-generic",
        "company_name": "Generic Corp",
        "job_title": "Analyst",
        "package_lpa": 8.0,
        "joining_date": "2027-07-01"
    }, headers=officer_headers)
    assert res_off.status_code == 201
    other_offer_id = res_off.json()["id"]

    # Student A tries to read Student B's offer -> HTTP 403
    res_idor_get = await workflow_client.get(f"/api/offers/{other_offer_id}", headers=student_headers)
    assert res_idor_get.status_code == 403, "Student must not be allowed to access another student's offer letter"

    # Student A tries to accept Student B's offer -> HTTP 403
    res_idor_accept = await workflow_client.post(f"/api/offers/{other_offer_id}/respond", json={
        "action": "ACCEPT",
        "joining_date": "2027-07-01"
    }, headers=student_headers)
    assert res_idor_accept.status_code == 403, "Student must not be allowed to respond to another student's offer"
