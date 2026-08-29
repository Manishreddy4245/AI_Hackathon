import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_exceptions_empty_db_and_agent_activity():
    """Verify exceptions endpoint works cleanly and provides agent activity logs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.exceptions.delete_many({})
            await db.agent_activities.delete_many({})
            await db.drives.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})
            await db.offers.delete_many({})

        # 1. List exceptions
        res = await client.get("/api/exceptions")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

        # 2. Agent activity timeline
        res_act = await client.get("/api/exceptions/agent-activity")
        assert res_act.status_code == 200
        acts = res_act.json()
        assert isinstance(acts, list)
        assert len(acts) >= 1


@pytest.mark.asyncio
async def test_exceptions_autonomous_detection_and_approval():
    """
    Verify AI Exception engine autonomously detects:
    1. Pending drive awaiting officer confirmation
    2. Candidate awaiting HR interview scheduling
    3. Room scheduling conflict
    And verify human-in-the-loop approval resolves the exception and updates linked entities.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.exceptions.delete_many({})
            await db.agent_activities.delete_many({})
            await db.drives.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})
            await db.offers.delete_many({})

        officer_token = create_access_token({
            "sub": "usr-off-1",
            "id": "usr-off-1",
            "email": "officer@placemind.test",
            "role": "placement_officer",
            "name": "Dr. Sharma"
        })
        headers = {"Authorization": f"Bearer {officer_token}"}

        # 1. Seed a drive submitted by recruiter
        drive_id = "drv-pending-adobe-101"
        await db.drives.insert_one({
            "id": drive_id,
            "companyName": "Adobe Systems",
            "roleTitle": "Member of Technical Staff",
            "packageLpa": 38.0,
            "minCgpa": 8.0,
            "eligibleBranches": ["Computer Science & Engineering"],
            "status": "SUBMITTED_FOR_REVIEW",
            "employmentType": "FULL_TIME",
            "location": "Noida",
            "created_at": "2026-08-29T02:00:00"
        })

        # 2. Seed a candidate application ready for interview
        app_id = "app-cand-101"
        await db.applications.insert_one({
            "id": app_id,
            "student_id": "st-101",
            "student_name": "Siddharth Malhotra",
            "student_email": "sid@campus.edu",
            "drive_id": drive_id,
            "company_name": "Adobe Systems",
            "job_title": "Member of Technical Staff",
            "aptitude_status": "QUALIFIED",
            "status": "INTERVIEW_READY",
            "created_at": "2026-08-29T02:10:00"
        })

        # 3. Seed two conflicting interviews in the same room at the same time
        int1_id = "int-conf-1"
        int2_id = "int-conf-2"
        await db.interviews.insert_many([
            {
                "id": int1_id,
                "candidateId": "st-201",
                "candidateName": "Aryan Gupta",
                "companyName": "Adobe Systems",
                "roleTitle": "Software Engineer",
                "date": "2026-09-10",
                "timeSlot": "10:00 AM - 11:00 AM",
                "roomId": "rm-101",
                "roomName": "Interview Room 101",
                "status": "SCHEDULED"
            },
            {
                "id": int2_id,
                "candidateId": "st-202",
                "candidateName": "Kavya Sharma",
                "companyName": "Google",
                "roleTitle": "Software Engineer",
                "date": "2026-09-10",
                "timeSlot": "10:00 AM - 11:00 AM",
                "roomId": "rm-101",
                "roomName": "Interview Room 101",
                "status": "SCHEDULED"
            }
        ])

        # 4. Trigger scan / GET /api/exceptions
        res = await client.get("/api/exceptions", headers=headers)
        assert res.status_code == 200
        exceptions = res.json()
        assert len(exceptions) >= 3

        drive_exc = next((e for e in exceptions if f"exc-drive-pending-{drive_id}" == e["id"]), None)
        assert drive_exc is not None
        assert drive_exc["status"] == "open"
        assert drive_exc["category"] == "drive"

        int_exc = next((e for e in exceptions if f"exc-int-pending-{app_id}" == e["id"]), None)
        assert int_exc is not None
        assert int_exc["category"] == "scheduling"

        conf_exc = next((e for e in exceptions if "exc-conflict-room" in e["id"]), None)
        assert conf_exc is not None
        assert conf_exc["severity"] == "critical"

        # 5. Approve drive exception
        appr_res = await client.post(f"/api/exceptions/{drive_exc['id']}/approve", headers=headers)
        assert appr_res.status_code == 200
        assert appr_res.json()["status"] == "ok"

        # Check drive is now approved/announced in MongoDB
        updated_drive = await db.drives.find_one({"id": drive_id})
        assert updated_drive["status"] == "ANNOUNCED"

        # Check exception status is now resolved
        updated_exc = await db.exceptions.find_one({"id": drive_exc["id"]})
        assert updated_exc["status"] == "resolved"

        # 6. Update status of conflict exception to ignored
        status_res = await client.patch(f"/api/exceptions/{conf_exc['id']}/status", headers=headers, json={"status": "ignored"})
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "ignored"

        # Check in MongoDB
        updated_conf = await db.exceptions.find_one({"id": conf_exc["id"]})
        assert updated_conf["status"] == "ignored"


@pytest.mark.asyncio
async def test_exceptions_search_and_filters():
    """Verify multi-parameter filtering on /api/exceptions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.exceptions.delete_many({})
            await db.agent_activities.delete_many({})
            await db.drives.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})
            await db.offers.delete_many({})

        # Create 2 custom exceptions
        res1 = await client.post("/api/exceptions", json={
            "title": "Panel Resignation Alert: Technical Panel Alpha",
            "description": "Panel member unable to attend afternoon sessions.",
            "severity": "critical",
            "status": "open",
            "category": "panel",
            "affectedEntity": "Technical Panel Alpha",
            "aiRecommendation": "Reallocate slots to Panel Beta.",
            "suggestedActionText": "Reallocate Panel Slots"
        })
        assert res1.status_code == 201

        res2 = await client.post("/api/exceptions", json={
            "title": "Drive Turnout Warning: Infosys",
            "description": "Only 3 applicants for 20 positions.",
            "severity": "warning",
            "status": "in_review",
            "category": "drive",
            "affectedEntity": "Infosys Drive",
            "aiRecommendation": "Broadcast notification to eligible branch students.",
            "suggestedActionText": "Broadcast Push Notification"
        })
        assert res2.status_code == 201

        # 1. Filter by severity=critical
        res_crit = await client.get("/api/exceptions?severity=critical")
        assert res_crit.status_code == 200
        crit_items = res_crit.json()
        assert len(crit_items) == 1
        assert crit_items[0]["severity"] == "critical"

        # 2. Filter by status=in_review
        res_rev = await client.get("/api/exceptions?status=in_review")
        assert res_rev.status_code == 200
        rev_items = res_rev.json()
        assert len(rev_items) == 1
        assert rev_items[0]["status"] == "in_review"

        # 3. Search keyword "Infosys"
        res_srch = await client.get("/api/exceptions?search=Infosys")
        assert res_srch.status_code == 200
        srch_items = res_srch.json()
        assert len(srch_items) == 1
        assert "Infosys" in srch_items[0]["title"]


@pytest.mark.asyncio
async def test_disqualified_technical_candidate_not_flagged_for_interview():
    """
    Verify student disqualified in technical round is NEVER flagged for panel or interview allotment.
    Panel is allotted ONLY if student qualified the technical round.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_manager.db
        if db is not None:
            await db.exceptions.delete_many({})
            await db.applications.delete_many({})
            await db.interviews.delete_many({})

        # 1. Seed candidate Chandan who failed/disqualified in Technical Round
        chandan_app_id = "app-chandan-001"
        await db.applications.insert_one({
            "id": chandan_app_id,
            "student_id": "st-chandan",
            "student_name": "Chandan Kumar",
            "company_name": "Infosys",
            "job_title": "System Engineer",
            "aptitude_status": "QUALIFIED",
            "technical_status": "FAILED",
            "status": "TECHNICAL_FAILED",
            "stage": "TECHNICAL_FAILED"
        })

        # 2. Seed candidate Priya who passed/qualified Technical Round
        priya_app_id = "app-priya-002"
        await db.applications.insert_one({
            "id": priya_app_id,
            "student_id": "st-priya",
            "student_name": "Priya Sharma",
            "company_name": "Infosys",
            "job_title": "System Engineer",
            "aptitude_status": "QUALIFIED",
            "technical_status": "QUALIFIED",
            "status": "TECHNICAL_QUALIFIED",
            "stage": "TECHNICAL_QUALIFIED"
        })

        # 3. Trigger scan / GET exceptions
        res = await client.get("/api/exceptions")
        assert res.status_code == 200
        exceptions = res.json()

        # Chandan MUST NOT have any open exception for interview/panel allotment
        chandan_exc = [e for e in exceptions if "chandan" in e["title"].lower() or "chandan" in e["description"].lower()]
        assert len(chandan_exc) == 0, "Disqualified student Chandan must NOT be flagged for panel allotment"

        # Priya (who passed technical round) MUST be flagged
        priya_exc = next((e for e in exceptions if f"exc-int-pending-{priya_app_id}" == e["id"]), None)
        assert priya_exc is not None, "Technical qualified candidate Priya must be flagged for interview allocation"
        assert priya_exc["status"] == "open"
        assert "Priya Sharma" in priya_exc["title"]
