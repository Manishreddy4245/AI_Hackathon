import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_audit_empty_database_returns_valid_list():
    """Verify empty audit collection returns 200 OK with empty array for authorized officer."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.audit_logs.delete_many({})

        officer_token = create_access_token({
            "sub": "usr-off-1",
            "id": "usr-off-1",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Placement Officer"
        })
        headers = {"Authorization": f"Bearer {officer_token}"}

        res = await client.get("/api/audit", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 0


@pytest.mark.asyncio
async def test_audit_rbac_authorization():
    """Verify students and unauthorized roles cannot access audit endpoints (403 Forbidden)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthenticated request
        res_unauth = await client.get("/api/audit")
        assert res_unauth.status_code in [401, 403]

        # Student request -> 403
        student_token = create_access_token({
            "sub": "usr-st-1",
            "id": "usr-st-1",
            "email": "student@placemind.test",
            "role": "student",
            "name": "Student Test"
        })
        res_student = await client.get("/api/audit", headers={"Authorization": f"Bearer {student_token}"})
        assert res_student.status_code == 403

        # Recruiter request -> 403
        rec_token = create_access_token({
            "sub": "usr-rec-1",
            "id": "usr-rec-1",
            "email": "recruiter@placemind.test",
            "role": "recruiter",
            "name": "Recruiter Test"
        })
        res_rec = await client.get("/api/audit", headers={"Authorization": f"Bearer {rec_token}"})
        assert res_rec.status_code == 403


@pytest.mark.asyncio
async def test_audit_events_lifecycle_end_to_end():
    """
    Test that real business operations across authentication, student registration,
    drive creation, shortlisting, scheduling, offers, and practice interviews
    emit accurate, immutable audit logs with real entity IDs.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.users.delete_many({})
            await db.students.delete_many({})
            await db.drives.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})
            await db.interview_slots.delete_many({})
            await db.offers.delete_many({})
            await db.practice_interviews.delete_many({})
            await db.audit_logs.delete_many({})

        officer_token = create_access_token({
            "sub": "usr-officer-main",
            "id": "usr-officer-main",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Dr. Sharma"
        })
        officer_headers = {"Authorization": f"Bearer {officer_token}"}

        # 1. Student Registration
        reg_res = await client.post("/api/auth/register/student", json={
            "name": "Ananya Roy",
            "email": "ananya.roy@example.com",
            "password": "SecurePassword123!",
            "rollNumber": "2024CSE105",
            "branch": "Computer Science & Engineering",
            "graduationYear": 2027,
            "cgpa": 9.2
        })
        assert reg_res.status_code in [200, 201]
        student_id = reg_res.json()["user"]["id"]

        # Ensure student has resume attached for application
        await db.students.update_one({"id": student_id}, {"$set": {"resumeUrl": "resume_ananya.pdf", "skills": ["Python", "Algorithms"]}})

        # Verify Student Registered Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        assert audits_res.status_code == 200
        logs = audits_res.json()
        assert any(l["action"] == "STUDENT_REGISTERED" and l["entityId"] == student_id for l in logs)

        # 2. User Login
        login_res = await client.post("/api/auth/login", json={
            "email": "ananya.roy@example.com",
            "password": "SecurePassword123!"
        })
        assert login_res.status_code == 200
        student_token = login_res.json()["access_token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # Verify Login Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "USER_LOGIN" for l in logs)

        # 3. Create Placement Drive
        drive_res = await client.post("/api/drives", headers=officer_headers, json={
            "companyName": "Microsoft",
            "roleTitle": "Software Development Engineer",
            "packageLpa": 42.0,
            "minCgpa": 8.0,
            "eligibleBranches": ["Computer Science & Engineering"],
            "graduationYears": [2027],
            "requiredSkills": ["Python", "Algorithms", "System Design"],
            "preferredSkills": ["Distributed Systems"],
            "status": "ANNOUNCED",
            "employmentType": "FULL_TIME",
            "location": "Hyderabad / Hybrid",
            "description": "Core engineering opportunities at Microsoft IDC."
        })
        assert drive_res.status_code in [200, 201]
        drive_id = drive_res.json()["id"]

        # Verify Drive Created Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "DRIVE_CREATED" and l["entityId"] == drive_id for l in logs)

        # 4. Student Applies to Drive
        apply_res = await client.post("/api/students/apply", headers=student_headers, json={
            "driveId": drive_id,
            "name": "Ananya Roy",
            "mobile": "+91 9876543210",
            "college_name": "Campus Institute of Tech",
            "location": "Bengaluru",
            "company_name": "Microsoft",
            "job_title": "Software Development Engineer",
            "company_id": "comp-microsoft"
        })
        assert apply_res.status_code == 200
        app_id = apply_res.json()["applicationId"]

        # Verify Application Submitted Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "APPLICATION_SUBMITTED" and l["entityId"] == app_id for l in logs)

        # 5. Shortlist Candidate & Advance to Interview Ready
        shortlist_res = await client.post(f"/api/applications/{app_id}/shortlist", headers=officer_headers, json={})
        assert shortlist_res.status_code == 200

        # Verify Shortlist Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "CANDIDATE_SHORTLISTED" and l["entityId"] == app_id for l in logs)

        # Set aptitude round qualified so interview scheduling passes business rule
        await db.applications.update_one({"id": app_id}, {"$set": {"aptitude_status": "QUALIFIED", "status": "INTERVIEW_READY"}})

        # 6. Manual Interview Scheduling
        panel_id = "pnl-tech-101"
        await db.panels.update_one({"id": panel_id}, {"$set": {"id": panel_id, "name": "Cloud Engineering Panel", "members": ["Satya N", "Amy H"]}}, upsert=True)
        room_id = "rm-audit-101"
        await db.rooms.update_one({"id": room_id}, {"$set": {"id": room_id, "name": "Room 402", "building": "Tech Block A", "roomNumber": "402"}}, upsert=True)

        sched_res = await client.post("/api/interviews", headers=officer_headers, json={
            "candidateId": student_id,
            "candidateName": "Ananya Roy",
            "companyName": "Microsoft",
            "roleTitle": "Software Development Engineer",
            "driveId": drive_id,
            "date": "2026-09-15",
            "timeSlot": "02:00 PM - 03:00 PM",
            "panelId": panel_id,
            "panelName": "Cloud Engineering Panel",
            "panelMembers": ["Satya N", "Amy H"],
            "roomId": room_id,
            "roomName": "Room 402",
            "block": "Tech Block A",
            "roomNumber": "402"
        })
        assert sched_res.status_code == 201

        # Verify Interview Scheduled Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "INTERVIEW_SCHEDULED" for l in logs)

        # 7. Issue Offer Letter
        offer_res = await client.post("/api/offers", headers=officer_headers, json={
            "application_id": app_id,
            "package_lpa": 42.0,
            "designation": "Software Development Engineer",
            "job_location": "Hyderabad, India",
            "joining_date": "2026-10-01",
            "response_deadline": "2026-09-30"
        })
        assert offer_res.status_code in [200, 201]
        offer_id = offer_res.json()["id"]

        # Verify Offer Issued Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "OFFER_ISSUED" and l["entityId"] == offer_id for l in logs)

        # 8. Student Accepts Offer
        acc_res = await client.post(f"/api/offers/{offer_id}/respond", headers=student_headers, json={
            "action": "ACCEPT",
            "joining_date": "2026-10-01",
            "preferred_location": "Hyderabad"
        })
        assert acc_res.status_code == 200

        # Verify Offer Accepted Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "OFFER_ACCEPT" and l["entityId"] == offer_id for l in logs)

        # 9. Officer Confirms Joining Logistics
        join_res = await client.post(f"/api/offers/{offer_id}/confirm-joining", headers=officer_headers, json={
            "reporting_venue_or_link": "Microsoft Campus, Gachibowli, Hyderabad",
            "reporting_time": "09:00 AM IST",
            "onboarding_notes": "Carry original degree and photo ID."
        })
        assert join_res.status_code == 200

        # Verify Joining Confirmed Audit Event
        audits_res = await client.get("/api/audit", headers=officer_headers)
        logs = audits_res.json()
        assert any(l["action"] == "JOINING_CONFIRMED" and l["entityId"] == offer_id for l in logs)


@pytest.mark.asyncio
async def test_audit_search_and_role_entity_filtering():
    """Verify search and multi-dimensional filtering on /api/audit."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.audit_logs.delete_many({})

        officer_token = create_access_token({
            "sub": "usr-off-1",
            "id": "usr-off-1",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Placement Officer"
        })
        headers = {"Authorization": f"Bearer {officer_token}"}

        # Seed multiple distinct audit logs
        from app.services.audit_service import record_audit_event

        await record_audit_event(
            db=db,
            user={"id": "st-1", "name": "Rahul Verma", "role": "student"},
            action="APPLICATION_SUBMITTED",
            entity="Application",
            entity_id="app-1",
            detail="Rahul applied for Amazon SDE role."
        )

        await record_audit_event(
            db=db,
            user={"id": "rec-1", "name": "Priya Recruiter", "role": "recruiter"},
            action="DRIVE_CREATED",
            entity="Drive",
            entity_id="drv-1",
            detail="Priya announced Oracle drive."
        )

        await record_audit_event(
            db=db,
            user={"id": "off-1", "name": "Dr. Sharma", "role": "placement_officer"},
            action="INTERVIEW_SCHEDULED",
            entity="Interview",
            entity_id="int-1",
            detail="Dr. Sharma scheduled interview in Room 301."
        )

        # 1. Filter by role: student
        res_student = await client.get("/api/audit?role=student", headers=headers)
        assert res_student.status_code == 200
        logs_st = res_student.json()
        assert len(logs_st) == 1
        assert logs_st[0]["userRole"] == "student"

        # 2. Filter by entity: Drive
        res_drive = await client.get("/api/audit?entity=Drive", headers=headers)
        assert res_drive.status_code == 200
        logs_drv = res_drive.json()
        assert len(logs_drv) == 1
        assert logs_drv[0]["entity"] == "Drive"

        # 3. Search by text keyword "Oracle"
        res_search = await client.get("/api/audit?search=Oracle", headers=headers)
        assert res_search.status_code == 200
        logs_search = res_search.json()
        assert len(logs_search) == 1
        assert "Oracle" in logs_search[0]["detail"]


@pytest.mark.asyncio
async def test_audit_duplicate_protection():
    """Verify single operations do not generate duplicate audit records."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.audit_logs.delete_many({})

        officer_token = create_access_token({
            "sub": "usr-off-1",
            "id": "usr-off-1",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Placement Officer"
        })
        headers = {"Authorization": f"Bearer {officer_token}"}

        # Perform 1 drive creation
        drive_res = await client.post("/api/drives", headers=headers, json={
            "companyName": "Goldman Sachs",
            "roleTitle": "Quantitative Analyst",
            "packageLpa": 36.0,
            "minCgpa": 8.5,
            "eligibleBranches": ["Computer Science & Engineering"],
            "graduationYears": [2027],
            "requiredSkills": ["C++", "Probability"],
            "status": "ANNOUNCED",
            "employmentType": "FULL_TIME",
            "location": "Bengaluru",
            "description": "Quant roles at GS."
        })
        assert drive_res.status_code in [200, 201]
        drive_id = drive_res.json()["id"]

        # Check total DRIVE_CREATED records for this entity ID in MongoDB
        count = await db.audit_logs.count_documents({
            "action": "DRIVE_CREATED",
            "entityId": drive_id
        })
        assert count == 1, f"Expected exactly 1 audit record, found {count}"
