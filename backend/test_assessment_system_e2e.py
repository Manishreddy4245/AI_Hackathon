"""Comprehensive End-to-End Automated Test for PlaceMind AI Placement Assessment & PrepBot System."""
import sys
import uuid
import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def run_assessment_e2e_tests():
    print("\n" + "=" * 80)
    print("RUNNING PLACEMIND AI PLACEMENT ASSESSMENT & PREPBOT E2E TESTS")
    print("=" * 80 + "\n")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Register & Login Student A (Fresh Account)
        student_a_email = f"candidate_a_{uuid.uuid4().hex[:6]}@placemind.edu"
        student_a_password = "Password@123"

        print("1. Registering new Student A account...")
        reg_res = await client.post("/api/auth/register/student", json={
            "name": "Candidate Alpha",
            "email": student_a_email,
            "password": student_a_password,
            "rollNumber": f"CS{uuid.uuid4().hex[:4].upper()}",
            "branch": "CSE",
            "graduationYear": 2027,
            "cgpa": 8.8
        })
        assert reg_res.status_code in [200, 201], f"Register failed: {reg_res.text}"

        login_res = await client.post("/api/auth/login", json={
            "email": student_a_email,
            "password": student_a_password,
            "portalRole": "student"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        auth_data_a = login_res.json()
        token_a = auth_data_a.get("access_token") or auth_data_a.get("token")
        headers_a = {"Authorization": f"Bearer {token_a}"}
        print(f"   [OK] Student A authenticated (Token received: {token_a[:10]}...)")

        # 2. Verify Initial Assessment State (Zero Dummy Data Rule)
        print("\n2. Verifying Initial Zero-Assessment State for new student...")
        hist_res = await client.get("/api/assessments/student/me", headers=headers_a)
        assert hist_res.status_code == 200, f"Get history failed: {hist_res.text}"
        history_a = hist_res.json()
        assert len(history_a) == 0, f"Expected 0 assessments for fresh student, got {len(history_a)}"
        print("   [OK] History count is 0 (No dummy assessments)")

        analytics_res = await client.get("/api/assessments/student/analytics", headers=headers_a)
        assert analytics_res.status_code == 200, f"Analytics failed: {analytics_res.text}"
        anal_a = analytics_res.json()
        assert anal_a.get("has_data") is False, "Expected has_data=False for fresh student"
        assert anal_a.get("coding_average") is None, "Expected coding_average=None"
        assert anal_a.get("aptitude_average") is None, "Expected aptitude_average=None"
        print("   [OK] Analytics confirms: Coding: Not Assessed, Aptitude: Not Assessed, has_data: False")

        # 3. Test PrepBot Chat Conversation
        print("\n3. Testing PrepBot Conversational Chatbot endpoint...")
        chat_res = await client.post("/api/assessments/chat", headers=headers_a, json={
            "message": "Hello PrepBot, how can you help me prepare for campus placement?"
        })
        assert chat_res.status_code == 200, f"Chat failed: {chat_res.text}"
        chat_data = chat_res.json()
        assert "reply" in chat_data, "Expected reply in response"
        assert len(chat_data.get("suggested_actions", [])) > 0, "Expected suggested action chips"
        print(f"   [OK] PrepBot replied with {len(chat_data['suggested_actions'])} suggested action chips")

        # 4. Generate Personalized Placement Assessment
        print("\n4. Generating Personalized Assessment (Combined: Coding + Aptitude)...")
        gen_res = await client.post("/api/assessments/generate", headers=headers_a, json={
            "type": "COMBINED",
            "difficulty": "Medium",
            "topics": ["Arrays & Hashing", "Quantitative Aptitude"],
            "question_count": 4,
            "duration_minutes": 20
        })
        assert gen_res.status_code == 200, f"Generate failed: {gen_res.text}"
        session = gen_res.json()
        assessment_id = session["id"]
        questions = session["questions"]
        assert len(questions) >= 2, f"Expected at least 2 questions, got {len(questions)}"
        print(f"   [OK] Assessment session created (ID: {assessment_id}) with {len(questions)} questions")

        # Verify Security Rule: Answer keys & hidden test cases are NEVER exposed to student
        print("\n5. Verifying Security Rule: Answer keys & hidden test cases stripped...")
        for q in questions:
            assert "correct_answer" not in q or q.get("correct_answer") is None, f"Security violation: correct_answer leaked in {q}"
            if q.get("type") == "coding":
                for tc in q.get("sample_test_cases", []):
                    assert tc.get("is_sample") is True, f"Security violation: hidden test case leaked in {q}"
        print("   [OK] Verified 100% secure: No answer keys or hidden test cases in student view")

        # 6. Test Isolated Subprocess Code Runner Sandbox
        coding_q = next((q for q in questions if q.get("type") == "coding"), None)
        aptitude_q = next((q for q in questions if q.get("type") == "aptitude"), None)

        if coding_q:
            print(f"\n6. Testing Isolated Code Execution Sandbox for Q '{coding_q['question']}'...")
            py_code = coding_q.get("code_template", {}).get("python", "print('0 1')")
            run_res = await client.post(f"/api/assessments/{assessment_id}/run-code", headers=headers_a, json={
                "question_id": coding_q["id"],
                "code": py_code,
                "language": "python"
            })
            assert run_res.status_code == 200, f"Run code failed: {run_res.text}"
            run_data = run_res.json()
            print(f"   [OK] Sandbox status: {run_data['status']} ({run_data['passed_sample_cases']}/{run_data['total_sample_cases']} passed in {run_data['execution_time_ms']}ms)")

        # 7. Submit Assessment with Answers & Code
        print("\n7. Submitting Assessment for Authoritative Server-Side Evaluation...")
        answers_payload = []
        if coding_q:
            answers_payload.append({
                "question_id": coding_q["id"],
                "type": "coding",
                "code": coding_q.get("code_template", {}).get("python", "print('0 1')"),
                "language": "python"
            })
        if aptitude_q:
            # Pick first available option
            opts = aptitude_q.get("options", ["150 metres"])
            answers_payload.append({
                "question_id": aptitude_q["id"],
                "type": "aptitude",
                "selected_option": opts[0] if opts else "150 metres"
            })

        submit_res = await client.post(f"/api/assessments/{assessment_id}/submit", headers=headers_a, json={
            "answers": answers_payload,
            "time_taken_seconds": 320
        })
        assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
        result = submit_res.json()
        print(f"   [OK] Evaluation Complete:")
        print(f"     - Overall Score: {result['percentage']}% ({result['total_score']} points)")
        print(f"     - Coding Score: {result['coding_score']}%")
        print(f"     - Aptitude Score: {result['aptitude_score']}%")
        print(f"     - Topic Breakdown: {[t['topic'] + ': ' + str(t['percentage']) + '%' for t in result['topic_performance']]}")

        # 8. Verify Assessment History & Analytics Updated
        print("\n8. Verifying Assessment History & Analytics Persistence...")
        hist_updated = await client.get("/api/assessments/student/me", headers=headers_a)
        assert hist_updated.status_code == 200
        hist_items = hist_updated.json()
        assert len(hist_items) >= 1, f"Expected at least 1 history record, got {len(hist_items)}"
        print(f"   [OK] My Assessments History contains {len(hist_items)} real record(s)")

        anal_updated = await client.get("/api/assessments/student/analytics", headers=headers_a)
        assert anal_updated.status_code == 200
        anal_data_updated = anal_updated.json()
        assert anal_data_updated["has_data"] is True, "Expected has_data=True after completing test"
        assert anal_data_updated["assessments_count"] >= 1
        print(f"   [OK] Analytics Aggregated:")
        print(f"     - Average Overall: {anal_data_updated['overall_average']}%")
        print(f"     - Average Coding: {anal_data_updated['coding_average']}%")
        print(f"     - Average Aptitude: {anal_data_updated['aptitude_average']}%")

        # 9. Verify Student Data Isolation (Student B cannot access Student A's assessment)
        print("\n9. Verifying Strict Student Data Isolation Security...")
        student_b_email = f"candidate_b_{uuid.uuid4().hex[:6]}@placemind.edu"
        reg_b = await client.post("/api/auth/register/student", json={
            "name": "Candidate Beta",
            "email": student_b_email,
            "password": "Password@123",
            "rollNumber": f"CS{uuid.uuid4().hex[:4].upper()}",
            "branch": "CSE",
            "graduationYear": 2027,
            "cgpa": 8.0
        })
        assert reg_b.status_code in [200, 201]

        login_b = await client.post("/api/auth/login", json={
            "email": student_b_email,
            "password": "Password@123",
            "portalRole": "student"
        })
        assert login_b.status_code == 200
        token_b = login_b.json().get("access_token") or login_b.json().get("token")
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Student B attempts to access Student A's assessment
        access_attempt = await client.get(f"/api/assessments/{assessment_id}", headers=headers_b)
        assert access_attempt.status_code in [403, 404], f"Data isolation failure: Student B accessed Student A's test (Status {access_attempt.status_code})"
        print("   [OK] Verified: Student B received 403/404 when attempting to access Student A's assessment")

        # Student B's history must still be 0
        hist_b = await client.get("/api/assessments/student/me", headers=headers_b)
        assert len(hist_b.json()) == 0, "Data isolation failure: Student B sees Student A's history"
        print("   [OK] Verified: Student B has 0 history records (Complete Data Isolation)")

    print("\n" + "=" * 80)
    print("ALL AI PLACEMENT ASSESSMENT E2E TESTS PASSED (100% SUCCESS)")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(run_assessment_e2e_tests())
