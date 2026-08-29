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
async def test_practice_interview_lifecycle_e2e():
    """
    Comprehensive E2E test for AI Practice Studio:
    1. Start a practice session with custom company, role, topics, and difficulty.
    2. Verify Question 1 is generated and persisted in db.practice_interviews.
    3. Submit real answer for Question 1, verify Question 2 is generated adaptively.
    4. Submit real answer for remaining questions until final evaluation is generated.
    5. Verify full evaluation metrics (scores, strengths, weaknesses, topic breakdown).
    6. Verify session history endpoint returns the persisted session.
    7. Verify student authorization isolation (403 IDOR rejection).
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    test_student_id = f"usr-practice-stud-{timestamp}"
    test_student_email = f"student.practice.{timestamp}@test.edu"
    test_other_student_id = f"usr-other-stud-{timestamp}"
    test_other_student_email = f"other.practice.{timestamp}@test.edu"

    token = create_access_token({
        "sub": test_student_id,
        "email": test_student_email,
        "role": "student",
        "name": "Practice Candidate"
    })
    headers = {"Authorization": f"Bearer {token}"}

    other_token = create_access_token({
        "sub": test_other_student_id,
        "email": test_other_student_email,
        "role": "student",
        "name": "Other Candidate"
    })
    other_headers = {"Authorization": f"Bearer {other_token}"}

    client = TestClient(app)
    session_id = None

    try:
        # 1. Start AI Practice Session
        create_payload = {
            "company": "Amazon",
            "role": "Software Development Engineer (SDE)",
            "interview_style": "Technical",
            "topics": ["Arrays & Hashing", "Dynamic Programming"],
            "custom_topics": ["Node.js Event Loop"],
            "experience_level": "Fresher / SDE-1",
            "difficulty": "Adaptive",
            "total_questions": 2,
            "mode": "video"
        }
        res_start = client.post("/api/interviews/practice/start", headers=headers, json=create_payload)
        assert res_start.status_code == 200
        start_data = res_start.json()

        session_id = start_data["session_id"]
        assert session_id.startswith("practice-")
        assert start_data["status"] == "IN_PROGRESS"
        assert start_data["current_question_index"] == 1
        assert len(start_data["questions"]) == 1

        q1 = start_data["current_question"]
        assert q1 is not None
        assert q1["question_index"] == 1
        assert len(q1["question_text"]) > 15
        assert q1["topic"] in ["Arrays & Hashing", "Dynamic Programming", "Node.js Event Loop", "Data Structures & Algorithms"]

        # Verify persisted in db.practice_interviews
        db_doc = await db.practice_interviews.find_one({"session_id": session_id})
        assert db_doc is not None
        assert db_doc["student_id"] == test_student_id

        # 2. Submit Answer for Question 1
        answer_1_payload = {
            "session_id": session_id,
            "question_index": 1,
            "answer_text": "I would use a hash map to store previously seen numbers for O(N) lookup time and O(N) space.",
            "transcript": "I would use a hash map to store previously seen numbers for O(N) lookup time and O(N) space.",
            "audio_video_metadata": {"duration_seconds": 25, "mode": "video"},
            "time_taken_seconds": 25,
            "is_skipped": False
        }
        res_ans1 = client.post("/api/interviews/practice/answer", headers=headers, json=answer_1_payload)
        assert res_ans1.status_code == 200
        ans1_data = res_ans1.json()

        assert ans1_data["current_question_index"] == 2
        assert len(ans1_data["questions"]) == 2
        assert len(ans1_data["answers"]) == 1

        q2 = ans1_data["current_question"]
        assert q2 is not None
        assert q2["question_index"] == 2
        assert len(q2["question_text"]) > 15

        # 3. Submit Answer for Question 2 (Final Question of 2)
        answer_2_payload = {
            "session_id": session_id,
            "question_index": 2,
            "answer_text": "For the Node.js event loop, asynchronous non-blocking I/O delegates file system and network calls to libuv worker threads.",
            "transcript": "For the Node.js event loop, asynchronous non-blocking I/O delegates file system and network calls to libuv worker threads.",
            "audio_video_metadata": {"duration_seconds": 35, "mode": "video"},
            "time_taken_seconds": 35,
            "is_skipped": False
        }
        res_ans2 = client.post("/api/interviews/practice/answer", headers=headers, json=answer_2_payload)
        assert res_ans2.status_code == 200
        ans2_data = res_ans2.json()

        assert ans2_data["status"] == "COMPLETED"
        assert ans2_data["evaluation"] is not None
        ev = ans2_data["evaluation"]
        assert ev["overall_score"] >= 0.0
        assert ev["technical_score"] >= 0.0
        assert len(ev["strengths"]) >= 1
        assert len(ev["weaknesses"]) >= 1
        assert len(ev["recommendations"]) >= 1
        assert len(ev["topic_scores"]) >= 1

        # 4. Verify GET /api/interviews/practice/session/{session_id}
        res_get = client.get(f"/api/interviews/practice/session/{session_id}", headers=headers)
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["session_id"] == session_id
        assert get_data["status"] == "COMPLETED"
        assert len(get_data["answers"]) == 2

        # 5. Verify IDOR Authorization: Other student receives 403 Forbidden
        res_unauth = client.get(f"/api/interviews/practice/session/{session_id}", headers=other_headers)
        assert res_unauth.status_code == 403

        # 6. Verify Practice History Endpoint
        res_hist = client.get("/api/interviews/practice/history", headers=headers)
        assert res_hist.status_code == 200
        hist_data = res_hist.json()
        assert any(item["session_id"] == session_id for item in hist_data)

    finally:
        if session_id:
            await db.practice_interviews.delete_one({"session_id": session_id})


@pytest.mark.asyncio
async def test_custom_target_company_and_role_flexibility():
    """
    Validates that Target Company and Target Role accept ANY custom string without whitelist restrictions:
    - Presets: Amazon, Google, Infosys, SDE
    - Custom Companies: Deloitte, Accenture, Random Tech Startup
    - Custom Roles: Java Spring Boot Developer, Machine Learning Engineer, Cloud Engineer, Business Analyst
    - Verifies persistence in db.practice_interviews with actual custom values
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    test_student_id = f"usr-custom-stud-{timestamp}"
    test_student_email = f"student.custom.{timestamp}@test.edu"

    token = create_access_token({
        "sub": test_student_id,
        "email": test_student_email,
        "role": "student",
        "name": "Custom Role Candidate"
    })
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(app)

    test_combinations = [
        ("Deloitte", "Backend Developer"),
        ("Accenture", "Cloud Engineer"),
        ("Random Tech Startup", "Java Spring Boot Developer"),
        ("Google", "Machine Learning Engineer"),
        ("Infosys", "Business Analyst")
    ]

    created_session_ids = []

    try:
        for company, role in test_combinations:
            payload = {
                "company": company,
                "role": role,
                "interview_style": "Technical",
                "topics": ["REST APIs & Backend", "System Design Fundamentals"],
                "custom_topics": ["Spring Boot Security"],
                "experience_level": "Fresher / SDE-1",
                "difficulty": "Adaptive",
                "total_questions": 2,
                "mode": "hybrid"
            }

            res = client.post("/api/interviews/practice/start", headers=headers, json=payload)
            assert res.status_code == 200, f"Failed for {company} - {role}: {res.text}"
            data = res.json()

            sid = data["session_id"]
            created_session_ids.append(sid)

            assert data["config"]["company"] == company
            assert data["config"]["role"] == role
            assert data["current_question"] is not None
            assert len(data["current_question"]["question_text"]) > 10

            # Verify persisted document in MongoDB
            doc = await db.practice_interviews.find_one({"session_id": sid})
            assert doc is not None
            assert doc["config"]["company"] == company
            assert doc["config"]["role"] == role
    finally:
        if created_session_ids:
            await db.practice_interviews.delete_many({"session_id": {"$in": created_session_ids}})


@pytest.mark.asyncio
async def test_voice_configuration_and_topics_validation():
    """
    Validates:
    1. Practice session accepts and persists voice configuration:
       voice_gender, voice_accent, voice_id.
    2. Input validation:
       - Empty company -> 400 Bad Request
       - Empty role -> 400 Bad Request
       - Empty topics -> 400 Bad Request
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    test_student_id = f"usr-voice-stud-{timestamp}"
    test_student_email = f"student.voice.{timestamp}@test.edu"

    token = create_access_token({
        "sub": test_student_id,
        "email": test_student_email,
        "role": "student",
        "name": "Voice Candidate"
    })
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(app)

    session_id = None
    try:
        # 1. Validation test: Empty company
        res_empty_company = client.post("/api/interviews/practice/start", headers=headers, json={
            "company": "   ",
            "role": "Data Analyst",
            "topics": ["SQL"],
            "total_questions": 2
        })
        assert res_empty_company.status_code == 400
        assert "company is required" in res_empty_company.text.lower()

        # 2. Validation test: Empty role
        res_empty_role = client.post("/api/interviews/practice/start", headers=headers, json={
            "company": "Deloitte",
            "role": "   ",
            "topics": ["SQL"],
            "total_questions": 2
        })
        assert res_empty_role.status_code == 400
        assert "role is required" in res_empty_role.text.lower()

        # 3. Validation test: Empty topics
        res_empty_topics = client.post("/api/interviews/practice/start", headers=headers, json={
            "company": "Deloitte",
            "role": "Data Analyst",
            "topics": [],
            "custom_topics": [],
            "total_questions": 2
        })
        assert res_empty_topics.status_code == 400
        assert "topic is required" in res_empty_topics.text.lower()

        # 4. Valid session with Indian English Voice Configuration
        valid_payload = {
            "company": "Deloitte",
            "role": "Data Analyst",
            "interview_style": "Technical",
            "topics": ["SQL", "Data Visualization"],
            "custom_topics": ["Power BI", "ETL Pipelines"],
            "experience_level": "Fresher / SDE-1",
            "difficulty": "Adaptive",
            "total_questions": 2,
            "mode": "video",
            "voice_gender": "female",
            "voice_accent": "indian",
            "voice_id": "Microsoft Heera - English (India)"
        }

        res_valid = client.post("/api/interviews/practice/start", headers=headers, json=valid_payload)
        assert res_valid.status_code == 200
        data = res_valid.json()

        session_id = data["session_id"]
        assert data["config"]["voice_gender"] == "female"
        assert data["config"]["voice_accent"] == "indian"
        assert data["config"]["voice_id"] == "Microsoft Heera - English (India)"
        assert data["config"]["company"] == "Deloitte"
        assert data["config"]["role"] == "Data Analyst"
        assert "Power BI" in data["config"]["custom_topics"]

        # Verify MongoDB document
        doc = await db.practice_interviews.find_one({"session_id": session_id})
        assert doc is not None
        assert doc["config"]["voice_gender"] == "female"
        assert doc["config"]["voice_accent"] == "indian"
        assert doc["config"]["voice_id"] == "Microsoft Heera - English (India)"
    finally:
        if session_id:
            await db.practice_interviews.delete_one({"session_id": session_id})


@pytest.mark.asyncio
async def test_delete_practice_interview_history_e2e_and_security():
    """
    Comprehensive test for Delete Practice Interview History:
    1. Authenticated Student A starts an interview session.
    2. Session is verified in MongoDB and in Student A's practice history.
    3. Student B attempts to delete Student A's interview (IDOR attack).
       -> Enforces 403 Forbidden rejection and verifies session document remains in MongoDB.
    4. Nonexistent session deletion returns 404 Not Found.
    5. Unauthenticated deletion returns 401 Unauthorized.
    6. Authenticated Student A deletes own session.
       -> Returns 200 OK with success confirmation.
    7. Verifies root document is permanently removed from db.practice_interviews.
    8. Verifies session no longer appears in Student A's history.
    """
    db = db_manager.db
    if db is None:
        pytest.skip("MongoDB unavailable for integration test")

    timestamp = int(datetime.now().timestamp() * 1000)
    student_a_id = f"usr-stud-a-{timestamp}"
    student_a_email = f"student.a.{timestamp}@test.edu"
    student_b_id = f"usr-stud-b-{timestamp}"
    student_b_email = f"student.b.{timestamp}@test.edu"

    token_a = create_access_token({
        "sub": student_a_id,
        "email": student_a_email,
        "role": "student",
        "name": "Candidate A"
    })
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = create_access_token({
        "sub": student_b_id,
        "email": student_b_email,
        "role": "student",
        "name": "Candidate B"
    })
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client = TestClient(app)
    session_id = None

    try:
        # 1. Student A starts practice interview
        start_payload = {
            "company": "Amazon",
            "role": "Software Development Engineer",
            "topics": ["System Design"],
            "custom_topics": [],
            "experience_level": "Fresher / SDE-1",
            "difficulty": "Medium",
            "total_questions": 2,
            "mode": "video"
        }
        res_start = client.post("/api/interviews/practice/start", headers=headers_a, json=start_payload)
        assert res_start.status_code == 200
        session_id = res_start.json()["session_id"]

        # 2. Verify session exists in MongoDB and in Student A's history
        doc = await db.practice_interviews.find_one({"session_id": session_id})
        assert doc is not None
        assert doc["student_id"] == student_a_id

        res_hist_a = client.get("/api/interviews/practice/history", headers=headers_a)
        assert res_hist_a.status_code == 200
        history_a_ids = [item["session_id"] for item in res_hist_a.json()]
        assert session_id in history_a_ids

        # 3. IDOR Security Test: Student B tries to delete Student A's session
        res_idor = client.delete(f"/api/interviews/practice/{session_id}", headers=headers_b)
        assert res_idor.status_code == 403
        assert "permission" in res_idor.json()["detail"].lower()

        # Verify session was NOT deleted by IDOR attempt
        doc_after_idor = await db.practice_interviews.find_one({"session_id": session_id})
        assert doc_after_idor is not None

        # 4. Nonexistent session returns 404
        res_404 = client.delete("/api/interviews/practice/nonexistent-session-xyz999", headers=headers_a)
        assert res_404.status_code == 404

        # 5. Unauthenticated delete returns 401
        res_401 = client.delete(f"/api/interviews/practice/{session_id}")
        assert res_401.status_code in [401, 403]

        # 6. Student A deletes own session
        res_del = client.delete(f"/api/interviews/practice/{session_id}", headers=headers_a)
        assert res_del.status_code == 200
        data_del = res_del.json()
        assert data_del["status"] == "success"
        assert data_del["session_id"] == session_id

        # 7. Verify session is completely removed from MongoDB
        doc_deleted = await db.practice_interviews.find_one({"session_id": session_id})
        assert doc_deleted is None

        # 8. Verify session no longer appears in Student A's history
        res_hist_after = client.get("/api/interviews/practice/history", headers=headers_a)
        assert res_hist_after.status_code == 200
        history_after_ids = [item["session_id"] for item in res_hist_after.json()]
        assert session_id not in history_after_ids

        # Mark session_id as None since it was successfully deleted
        session_id = None

    finally:
        if session_id:
            await db.practice_interviews.delete_one({"session_id": session_id})



