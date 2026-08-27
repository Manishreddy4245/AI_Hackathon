import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.routes.ai_extractor import dynamic_fallback_jd_extractor

client = TestClient(app)

def test_raw_text_analysis_test_1_react_developer():
    """TEST 1: React Developer Raw Text must extract React/JS/TS and zero backend/python static data."""
    raw_text = "Looking for a React Developer with skills in React, JavaScript, and TypeScript. Minimum CGPA 7.8 in CSE or IT. Location: Pune. Package: 12 LPA."
    res = dynamic_fallback_jd_extractor(raw_text, "AlphaTech Inc")
    
    assert res.roleTitle == "React Developer"
    assert res.companyName == "AlphaTech Inc"
    assert res.minCgpa == 7.8
    assert res.packageLpa == 12.0
    assert res.location == "Pune"
    assert "CSE" in res.eligibleBranches
    assert "IT" in res.eligibleBranches
    
    all_skills_lower = [s.lower() for s in (res.requiredSkills + res.preferredSkills)]
    assert "react" in all_skills_lower
    assert "javascript" in all_skills_lower or "typescript" in all_skills_lower
    assert "fastapi" not in all_skills_lower
    assert "docker" not in all_skills_lower
    assert "python" not in all_skills_lower

def test_raw_text_analysis_test_2_python_backend():
    """TEST 2: Replacing Raw Text with Python Backend must extract FastAPI/Docker/MongoDB and clear previous React data."""
    raw_text = "Looking for a Python Backend Developer with FastAPI, MongoDB, Python and Docker. Minimum CGPA 8.0 in CSE. Location: Hyderabad. Package: 16 LPA."
    res = dynamic_fallback_jd_extractor(raw_text, "BetaCloud Systems")
    
    assert res.roleTitle == "Python Backend Developer"
    assert res.companyName == "BetaCloud Systems"
    assert res.minCgpa == 8.0
    assert res.packageLpa == 16.0
    assert res.location == "Hyderabad"
    
    all_skills_lower = [s.lower() for s in (res.requiredSkills + res.preferredSkills)]
    assert "python" in all_skills_lower
    assert "fastapi" in all_skills_lower
    assert "mongodb" in all_skills_lower
    assert "docker" in all_skills_lower
    assert "react" not in all_skills_lower
    assert "javascript" not in all_skills_lower

def test_raw_text_analysis_test_3_data_analyst():
    """TEST 3: Replacing Raw Text with Data Analyst must extract SQL/Excel/Power BI."""
    raw_text = "Hiring Data Analyst. Required skills: SQL, Excel, Power BI, Python. Eligible branches: ECE, CSE. Location: Bengaluru. Package: 9.5 LPA."
    res = dynamic_fallback_jd_extractor(raw_text, "Gamma Analytics")
    
    assert res.roleTitle == "Data Analyst"
    assert res.companyName == "Gamma Analytics"
    assert res.packageLpa == 9.5
    assert res.location == "Bengaluru"
    assert "ECE" in res.eligibleBranches
    assert "CSE" in res.eligibleBranches
    
    all_skills_lower = [s.lower() for s in (res.requiredSkills + res.preferredSkills)]
    assert "sql" in all_skills_lower
    assert "excel" in all_skills_lower
    assert "power bi" in all_skills_lower
    assert "docker" not in all_skills_lower
    assert "react" not in all_skills_lower

def test_raw_text_analysis_test_4_dynamic_company_and_empty_fields():
    """TEST 4: Company name extracted dynamically and unsupported fields return empty/null without dummy fallbacks."""
    raw_text = "CloudMatrix is hiring Machine Learning Interns. Must know PyTorch, Scikit-Learn. Good to have: MLflow, Docker."
    res = dynamic_fallback_jd_extractor(raw_text, "DefaultFallback")
    
    assert res.companyName == "CloudMatrix"
    assert "PyTorch" in res.requiredSkills or "Scikit-Learn" in res.requiredSkills
    # CGPA was not mentioned, must be None (not dummy 7.0)
    assert res.minCgpa is None
    # Package was not mentioned, must be None or 0 (not dummy 10.5)
    assert res.packageLpa == 0.0 or res.packageLpa is None

def test_api_endpoint_extract_jd():
    """Test HTTP endpoint /api/ai/extract-jd directly with TestClient."""
    resp = client.post("/api/ai/extract-jd", json={
        "rawText": "Looking for a React Developer with skills in React, JavaScript, and TypeScript.",
        "companyName": "TechCorp"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "React" in data["requiredSkills"] or "JavaScript" in data["requiredSkills"]
    assert data["rawText"] == "Looking for a React Developer with skills in React, JavaScript, and TypeScript."
    
    # Test empty rawText validation
    err_resp = client.post("/api/ai/extract-jd", json={"rawText": "   "})
    assert err_resp.status_code == 400
    assert "cannot be empty" in err_resp.json()["detail"]

def test_api_endpoint_analyze_job_alias():
    """Test HTTP endpoint /api/ai/analyze-job and /api/drives/analyze-job aliases."""
    resp1 = client.post("/api/ai/analyze-job", json={
        "rawText": "Hiring Python Developer with FastAPI and Docker.",
        "companyName": "BetaSystems"
    })
    assert resp1.status_code == 200
    assert "FastAPI" in resp1.json()["requiredSkills"] or "Python" in resp1.json()["requiredSkills"]

    resp2 = client.post("/api/drives/analyze-job", json={
        "rawText": "Hiring Python Developer with FastAPI and Docker.",
        "companyName": "BetaSystems"
    })
    assert resp2.status_code == 200
    assert "FastAPI" in resp2.json()["requiredSkills"] or "Python" in resp2.json()["requiredSkills"]
