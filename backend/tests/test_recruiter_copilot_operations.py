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
async def test_copilot_pipeline_final_round_candidates():
    """
    TEST A:
    'Which students have reached the final round?'
    Expected: Returns ONLY candidates whose actual application/interview state indicates final round.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    company_name = f"ApexCorp_{uuid.uuid4().hex[:4]}"
    drive_id = f"drv-{uuid.uuid4().hex[:6]}"
    cand_final = f"Finalist_{uuid.uuid4().hex[:4]}"
    cand_applied = f"Applied_{uuid.uuid4().hex[:4]}"

    # Seed applications
    await db.applications.insert_many([
        {
            "id": f"app-{uuid.uuid4().hex[:6]}",
            "drive_id": drive_id,
            "student_id": f"std-{uuid.uuid4().hex[:6]}",
            "company_name": company_name,
            "student_name": cand_final,
            "status": "FINAL_ROUND",
            "interview": {"round": "Final HR Round", "status": "SCHEDULED"}
        },
        {
            "id": f"app-{uuid.uuid4().hex[:6]}",
            "drive_id": drive_id,
            "student_id": f"std-{uuid.uuid4().hex[:6]}",
            "company_name": company_name,
            "student_name": cand_applied,
            "status": "APPLIED"
        }
    ])

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = f"Which students have reached the final round for {company_name}?"
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            card_titles = [c["title"] for c in data["cards"]]

            # cand_final must be in cards, cand_applied must NOT be in cards
            assert any(cand_final in t for t in card_titles), f"Expected {cand_final} in {card_titles}"
            assert not any(cand_applied in t for t in card_titles), f"{cand_applied} should not be in final round cards"
    finally:
        await db.applications.delete_many({"company_name": company_name})


@pytest.mark.anyio
async def test_copilot_pipeline_selected_candidates():
    """
    TEST B:
    'Who has been selected?'
    Expected: Returns actual SELECTED applications.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    company_name = f"NovaCorp_{uuid.uuid4().hex[:4]}"
    cand_selected = f"SelectedStudent_{uuid.uuid4().hex[:4]}"

    await db.applications.insert_one({
        "id": f"app-{uuid.uuid4().hex[:6]}",
        "drive_id": f"drv-{uuid.uuid4().hex[:6]}",
        "student_id": f"std-{uuid.uuid4().hex[:6]}",
        "company_name": company_name,
        "student_name": cand_selected,
        "status": "SELECTED"
    })

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = f"Who has been selected for {company_name}?"
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            card_titles = [c["title"] for c in data["cards"]]
            assert any(cand_selected in t for t in card_titles)
            assert data["cards"][0]["badge"] == "SELECTED"
    finally:
        await db.applications.delete_many({"company_name": company_name})


@pytest.mark.anyio
async def test_copilot_pipeline_interview_completed_candidates():
    """
    TEST C:
    'Which students are currently at INTERVIEW_COMPLETED?'
    Expected: Returns matching records with INTERVIEW_COMPLETED status.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    company_name = f"PrimeTech_{uuid.uuid4().hex[:4]}"
    cand_completed = f"IntCompleted_{uuid.uuid4().hex[:4]}"

    await db.applications.insert_one({
        "id": f"app-{uuid.uuid4().hex[:6]}",
        "drive_id": f"drv-{uuid.uuid4().hex[:6]}",
        "student_id": f"std-{uuid.uuid4().hex[:6]}",
        "company_name": company_name,
        "student_name": cand_completed,
        "status": "INTERVIEW_COMPLETED"
    })

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = f"Which students are currently at INTERVIEW_COMPLETED for {company_name}?"
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            card_titles = [c["title"] for c in data["cards"]]
            assert any(cand_completed in t for t in card_titles)
    finally:
        await db.applications.delete_many({"company_name": company_name})


@pytest.mark.anyio
async def test_copilot_complete_pipeline_stages_of_all_applicants():
    """
    TEST D:
    'Show me the complete pipeline stage of every Infosys applicant.'
    Expected: Actual pipeline states of all applicants with aptitude/technical scores.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    company_name = f"Infosys_{uuid.uuid4().hex[:4]}"
    drive_id = f"drv-{uuid.uuid4().hex[:6]}"

    await db.applications.insert_many([
        {
            "id": f"app-{uuid.uuid4().hex[:6]}",
            "drive_id": drive_id,
            "student_id": f"std-{uuid.uuid4().hex[:6]}",
            "company_name": company_name,
            "student_name": "Applicant Alice",
            "status": "TECHNICAL_CLEARED",
            "aptitude_score": 88,
            "technical_score": 92
        },
        {
            "id": f"app-{uuid.uuid4().hex[:6]}",
            "drive_id": drive_id,
            "student_id": f"std-{uuid.uuid4().hex[:6]}",
            "company_name": company_name,
            "student_name": "Applicant Bob",
            "status": "APPLIED",
            "aptitude_score": 70
        }
    ])

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = f"Show me the complete pipeline stage of every {company_name} applicant."
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            assert len(data["cards"]) == 2
            titles = [c["title"] for c in data["cards"]]
            assert any("Alice" in t for t in titles)
            assert any("Bob" in t for t in titles)
    finally:
        await db.applications.delete_many({"company_name": company_name})


@pytest.mark.anyio
async def test_copilot_candidates_readiness_score_above_90():
    """
    TEST E:
    'Which candidates have a readiness score above 90?'
    Expected: Candidate ranking context filtered by readiness score >= 90.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    high_cand = f"HighScorer_{uuid.uuid4().hex[:4]}"
    low_cand = f"LowScorer_{uuid.uuid4().hex[:4]}"

    await db.students.insert_many([
        {"id": f"std-{uuid.uuid4().hex[:6]}", "name": high_cand, "cgpa": 9.2, "readinessScore": 95, "branch": "CSE"},
        {"id": f"std-{uuid.uuid4().hex[:6]}", "name": low_cand, "cgpa": 7.1, "readinessScore": 65, "branch": "ME"}
    ])

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = "Which candidates have a readiness score above 90?"
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            card_titles = [c["title"] for c in data["cards"]]
            assert any(high_cand in t for t in card_titles)
            assert not any(low_cand in t for t in card_titles)
    finally:
        await db.students.delete_many({"name": {"$in": [high_cand, low_cand]}})


@pytest.mark.anyio
async def test_copilot_complete_drive_document_retrieval():
    """
    TEST H:
    'Give me details of the Infosys drive.'
    Expected: Returns complete fields (package, min CGPA, branches, graduation year, skills).
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    drive_id = f"drv-{uuid.uuid4().hex[:6]}"
    unique_company = f"Infosys_{uuid.uuid4().hex[:4]}"

    await db.drives.insert_one({
        "id": drive_id,
        "companyName": unique_company,
        "roleTitle": "Systems Engineer Specialist",
        "packageLpa": 8.0,
        "minCgpa": 7.5,
        "eligibleBranches": ["CSE", "IT", "ECE"],
        "graduationYear": 2026,
        "graduationYears": [2026],
        "maxBacklogs": 0,
        "requiredSkills": ["Java", "Python", "Data Structures"],
        "status": "ACTIVE"
    })

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            query = f"What is the package, minimum CGPA, eligible branches and graduation year for {unique_company}?"
            resp = await ac.post("/api/copilot/chat", json={"query": query})
            assert resp.status_code == 200
            data = resp.json()

            assert data["cards"] is not None
            card_subtitles = [c.get("subtitle", "") for c in data["cards"]]
            card_details = [c.get("detail", "") for c in data["cards"]]

            assert any("8" in sub and "7.5" in sub for sub in card_subtitles)
            assert any("CSE" in d and "2026" in d for d in card_details)
    finally:
        await db.drives.delete_one({"id": drive_id})


@pytest.mark.anyio
async def test_copilot_nonexistent_drive_not_hallucinated():
    """
    TEST I:
    'Give me details of a drive that does not exist.'
    Expected: No hallucinated data, explicit statement that it was not found.
    """
    await connect_to_mongo()
    fake_company = f"NonExistentCompany_{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        query = f"Give me the details of the placement drive for {fake_company}."
        resp = await ac.post("/api/copilot/chat", json={"query": query})
        assert resp.status_code == 200
        data = resp.json()

        text_lower = data["text"].lower()
        assert "couldn't find" in text_lower or "not found" in text_lower or "no placement drive" in text_lower


@pytest.mark.anyio
async def test_copilot_role_aware_navigation_recruiter_and_officer():
    """
    TEST J, K, L:
    Verify role-aware navigation:
    - Recruiter asking about rooms -> answer provided, NO inaccessible button to /admin/panels (actionButton is None).
    - Recruiter asking about candidates -> button points to /recruiter/candidates (NEVER /admin/matching).
    - Recruiter asking about drives -> button points to /recruiter/drives.
    - Officer asking about drives -> button points to /admin/companies.
    """
    recruiter_token = create_access_token({"sub": "rec-123", "role": "recruiter", "email": "rec@tech.com"})
    officer_token = create_access_token({"sub": "off-123", "role": "placement_officer", "email": "officer@college.edu"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Recruiter asking for room availability: Must NOT receive an officer-only navigation button
        room_resp = await ac.post(
            "/api/copilot/chat",
            json={"query": "Which rooms are available?"},
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert room_resp.status_code == 200
        room_data = room_resp.json()
        assert room_data.get("actionButton") is None, "Recruiter should not receive venue management CTA"

        # 2. Recruiter asking for candidates: Action button must point to /recruiter/candidates (NOT /admin/matching)
        cand_resp = await ac.post(
            "/api/copilot/chat",
            json={"query": "Which candidates have a readiness score above 90?"},
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert cand_resp.status_code == 200
        cand_data = cand_resp.json()
        if cand_data.get("actionButton"):
            assert cand_data["actionButton"]["route"] == "/recruiter/candidates"
            assert "matching" not in cand_data["actionButton"]["route"]

        # 3. Recruiter asking for drives: Action button must point to /recruiter/drives
        drive_resp = await ac.post(
            "/api/copilot/chat",
            json={"query": "How many active placement drives are currently available?"},
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert drive_resp.status_code == 200
        drive_data = drive_resp.json()
        if drive_data.get("actionButton"):
            assert drive_data["actionButton"]["route"] == "/recruiter/drives"

        # 4. Officer asking for drives: Action button points to /admin/companies
        off_drive_resp = await ac.post(
            "/api/copilot/chat",
            json={"query": "How many active placement drives are currently available?"},
            headers={"Authorization": f"Bearer {officer_token}"}
        )
        assert off_drive_resp.status_code == 200
        off_drive_data = off_drive_resp.json()
        if off_drive_data.get("actionButton"):
            assert off_drive_data["actionButton"]["route"] == "/admin/companies"


@pytest.mark.anyio
async def test_copilot_action_proposal_and_two_phase_confirmation_lifecycle():
    """
    Verify complete two-phase interview scheduling lifecycle:
    1. Copilot proposes action (actionProposal returned, NO database mutation yet).
    2. Recruiter explicitly confirms -> backend double-checks availability and creates interview.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    recruiter_id = f"rec-{uuid.uuid4().hex[:6]}"
    recruiter_email = f"rec.{uuid.uuid4().hex[:6]}@techcorp.com"
    company_name = f"TechCorp_{uuid.uuid4().hex[:4]}"

    await db.users.insert_one({
        "id": recruiter_id,
        "email": recruiter_email,
        "name": "Sarah Recruiter",
        "role": "recruiter",
        "company": company_name,
        "is_active": True
    })

    drive_id = f"drv-{uuid.uuid4().hex[:6]}"
    cand_id = f"std-{uuid.uuid4().hex[:6]}"
    cand_name = f"Sujal_{uuid.uuid4().hex[:4]}"
    room_name = f"Room_{uuid.uuid4().hex[:4]}"
    panel_name = f"Panel_{uuid.uuid4().hex[:4]}"
    target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    await db.drives.insert_one({
        "id": drive_id,
        "companyName": company_name,
        "roleTitle": "Software Engineer",
        "recruiter_id": recruiter_id,
        "status": "ACTIVE"
    })
    await db.students.insert_one({
        "id": cand_id,
        "name": cand_name,
        "cgpa": 8.9,
        "branch": "CSE"
    })
    await db.rooms.insert_one({
        "id": f"rm-{uuid.uuid4().hex[:4]}",
        "name": room_name,
        "building": "Tower B"
    })
    await db.panels.insert_one({
        "id": f"pn-{uuid.uuid4().hex[:4]}",
        "name": panel_name,
        "members": ["Dr. Alan", "Jane Smith"]
    })

    token = create_access_token({"sub": recruiter_id, "role": "recruiter", "email": recruiter_email})
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # PHASE 1: Proposal query
            query = f"Schedule {cand_name} for {company_name} tomorrow at 11 AM in {room_name} with {panel_name}"
            chat_resp = await ac.post("/api/copilot/chat", json={"query": query}, headers=headers)
            assert chat_resp.status_code == 200
            chat_data = chat_resp.json()

            assert chat_data.get("actionProposal") is not None
            proposal = chat_data["actionProposal"]
            assert proposal["action_type"] == "schedule_interview"

            # Verify NO interview created prematurely
            initial_count = await db.interviews.count_documents({"candidateName": cand_name})
            assert initial_count == 0

            # PHASE 2: Confirmed action execution
            exec_payload = {
                "action_type": proposal["action_type"],
                "details": proposal["details"]
            }
            exec_resp = await ac.post("/api/copilot/execute-action", json=exec_payload, headers=headers)
            assert exec_resp.status_code == 200
            exec_data = exec_resp.json()
            assert exec_data["status"] == "success"

            created_int = await db.interviews.find_one({"candidateName": cand_name})
            assert created_int is not None
            assert created_int["status"] == "SCHEDULED"
    finally:
        await db.users.delete_one({"id": recruiter_id})
        await db.drives.delete_one({"id": drive_id})
        await db.students.delete_one({"id": cand_id})
        await db.rooms.delete_many({"name": room_name})
        await db.panels.delete_many({"name": panel_name})
        await db.interviews.delete_many({"candidateName": cand_name})


@pytest.mark.anyio
async def test_copilot_recruiter_unauthorized_company_rejection():
    """Verify recruiter cannot execute an interview action for a different company (IDOR protection)."""
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    recruiter_id = f"rec-{uuid.uuid4().hex[:6]}"
    recruiter_email = f"rec.{uuid.uuid4().hex[:6]}@wipro.com"

    await db.users.insert_one({
        "id": recruiter_id,
        "email": recruiter_email,
        "role": "recruiter",
        "company": "Wipro",
        "is_active": True
    })

    token = create_access_token({"sub": recruiter_id, "role": "recruiter", "email": recruiter_email})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "action_type": "schedule_interview",
        "details": {
            "candidate_id": "cand-test",
            "candidate_name": "Test Student",
            "company_name": "Google",
            "date": "2026-09-01",
            "time_slot": "10:00 AM - 10:30 AM",
            "room_name": "Room 101",
            "panel_name": "Panel Alpha"
        }
    }

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/api/copilot/execute-action", json=payload, headers=headers)
            assert resp.status_code == 403
            assert "Permission Denied" in resp.json()["detail"]
    finally:
        await db.users.delete_one({"id": recruiter_id})
