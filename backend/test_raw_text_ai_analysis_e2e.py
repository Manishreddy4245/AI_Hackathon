import asyncio
import httpx
import sys

BASE_URL = "http://127.0.0.1:8000"

async def test_ai_jd_extraction_raw_text():
    print("\n=======================================================")
    print("RUNNING E2E TESTS: RAW TEXT AS SINGLE SOURCE OF TRUTH")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=20.0) as client:
        # TEST 1: React Developer Raw Text
        print("--- TEST 1: React Developer Raw Text ---")
        req1 = {
            "rawText": "Looking for a React Developer with skills in React, JavaScript, and TypeScript. Minimum CGPA 7.8 in CSE or IT. Location: Pune. Package: 12 LPA.",
            "companyName": "AlphaTech Inc"
        }
        res1 = await client.post(f"{BASE_URL}/api/ai/extract-jd", json=req1)
        assert res1.status_code == 200, f"Test 1 failed with status {res1.status_code}: {res1.text}"
        data1 = res1.json()
        print("Response 1:", data1)
        skills1_lower = [s.lower() for s in (data1.get("requiredSkills", []) + data1.get("preferredSkills", []))]
        assert "react" in skills1_lower, "Expected 'React' in skills for Test 1"
        assert "javascript" in skills1_lower or "typescript" in skills1_lower, "Expected JS/TS in skills for Test 1"
        assert "fastapi" not in skills1_lower, "Did NOT expect 'FastAPI' in Test 1 (leaked static data)"
        assert "docker" not in skills1_lower, "Did NOT expect 'Docker' in Test 1 (leaked static data)"
        print("✓ TEST 1 PASSED: React Developer correctly extracted from Raw Text #1.\n")

        # TEST 2: Python Backend Developer Raw Text
        print("--- TEST 2: Python Backend Developer Raw Text ---")
        req2 = {
            "rawText": "Looking for a Python Backend Developer with FastAPI, MongoDB, Python and Docker. Minimum CGPA 8.0 in CSE. Location: Hyderabad. Package: 16 LPA.",
            "companyName": "BetaCloud Systems"
        }
        res2 = await client.post(f"{BASE_URL}/api/ai/extract-jd", json=req2)
        assert res2.status_code == 200, f"Test 2 failed with status {res2.status_code}: {res2.text}"
        data2 = res2.json()
        print("Response 2:", data2)
        skills2_lower = [s.lower() for s in (data2.get("requiredSkills", []) + data2.get("preferredSkills", []))]
        assert "python" in skills2_lower, "Expected 'Python' in skills for Test 2"
        assert "fastapi" in skills2_lower or "docker" in skills2_lower, "Expected FastAPI/Docker in skills for Test 2"
        assert "react" not in skills2_lower, "Did NOT expect 'React' in Test 2 (stale data from Test 1)"
        assert "javascript" not in skills2_lower, "Did NOT expect 'JavaScript' in Test 2 (stale data from Test 1)"
        print("✓ TEST 2 PASSED: Python Backend Developer correctly extracted from Raw Text #2.\n")

        # TEST 3: Data Analyst Raw Text
        print("--- TEST 3: Data Analyst Raw Text ---")
        req3 = {
            "rawText": "Hiring Data Analyst. Required skills: SQL, Excel, Power BI, Python. Eligible branches: ECE, CSE. Location: Bengaluru. Package: 9.5 LPA.",
            "companyName": "Gamma Analytics"
        }
        res3 = await client.post(f"{BASE_URL}/api/ai/extract-jd", json=req3)
        assert res3.status_code == 200, f"Test 3 failed with status {res3.status_code}: {res3.text}"
        data3 = res3.json()
        print("Response 3:", data3)
        skills3_lower = [s.lower() for s in (data3.get("requiredSkills", []) + data3.get("preferredSkills", []))]
        assert "sql" in skills3_lower, "Expected 'SQL' in skills for Test 3"
        assert "excel" in skills3_lower or "power bi" in skills3_lower, "Expected Excel/Power BI in Test 3"
        assert "docker" not in skills3_lower, "Did NOT expect 'Docker' in Test 3"
        assert "react" not in skills3_lower, "Did NOT expect 'React' in Test 3"
        print("✓ TEST 3 PASSED: Data Analyst correctly extracted from Raw Text #3.\n")

        # TEST 4: Drive Creation and Persistence with Extracted Data
        print("--- TEST 4: Placement Drive Persistence with Raw Text Source of Truth ---")
        drive_payload = {
            "companyName": "Gamma Analytics",
            "roleTitle": data3.get("roleTitle", "Data Analyst"),
            "packageLpa": data3.get("packageLpa", 9.5),
            "location": data3.get("location", "Bengaluru"),
            "employmentType": "Full-time",
            "eligibleBranches": data3.get("eligibleBranches", ["CSE", "ECE"]),
            "minCgpa": data3.get("minCgpa", 7.0),
            "graduationYear": 2027,
            "driveDate": "2026-09-30",
            "deadline": "2026-09-30",
            "description": req3["rawText"],
            "requiredSkills": data3.get("requiredSkills", []),
            "preferredSkills": data3.get("preferredSkills", []),
            "aiExplanation": data3.get("aiExplanation", "Extracted strictly from raw text.")
        }
        res4 = await client.post(f"{BASE_URL}/api/drives", json=drive_payload)
        assert res4.status_code in [200, 201], f"Failed to create drive: {res4.text}"
        created_drive = res4.json()
        drive_id = created_drive["id"]
        print(f"Created Drive ID: {drive_id}")

        # Fetch the created drive
        res5 = await client.get(f"{BASE_URL}/api/drives/{drive_id}")
        assert res5.status_code == 200
        saved_drive = res5.json()
        assert saved_drive["description"] == req3["rawText"], "Saved drive description must match raw text"
        assert set(saved_drive["requiredSkills"]) == set(data3.get("requiredSkills", [])), "Saved requiredSkills must match extracted skills"
        print("✓ TEST 4 PASSED: Drive saved and retrieved with exact raw text and dynamic skills.\n")

    print("=======================================================")
    print("ALL E2E RAW TEXT AI ANALYSIS TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_ai_jd_extraction_raw_text())
