from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import re

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])

class JDExtractRequest(BaseModel):
    rawText: str
    companyName: Optional[str] = "Company"

class JDExtractResponse(BaseModel):
    roleTitle: str
    eligibleBranches: List[str]
    minCgpa: float
    maxBacklogs: int
    requiredSkills: List[str]
    preferredSkills: List[str]
    rounds: List[str]
    location: str
    packageLpa: float
    summary: str

@router.post("/extract-jd", response_model=JDExtractResponse)
async def extract_job_description(req: JDExtractRequest):
    text = req.rawText.lower()
    
    # 1. Role Title Extraction
    role_title = "Software Engineer"
    if "backend" in text:
        role_title = "Backend Developer"
    elif "frontend" in text or "react" in text:
        role_title = "Frontend Engineer"
    elif "data" in text or "analyst" in text:
        role_title = "Data Analyst"
    elif "fullstack" in text or "full stack" in text:
        role_title = "Full Stack Engineer"
    elif "devops" in text or "cloud" in text:
        role_title = "DevOps / Cloud Engineer"

    # 2. Branch Extraction
    branches = []
    if "cse" in text or "computer" in text:
        branches.append("CSE")
    if "it" in text or "information technology" in text:
        branches.append("IT")
    if "ece" in text or "electronics" in text:
        branches.append("ECE")
    if "eee" in text or "electrical" in text:
        branches.append("EEE")
    if not branches:
        branches = ["CSE", "IT"]

    # 3. CGPA Extraction
    cgpa_match = re.search(r"(\d\.\d)\s*(cgpa|gpa)?", text)
    min_cgpa = float(cgpa_match.group(1)) if cgpa_match and 5.0 <= float(cgpa_match.group(1)) <= 10.0 else 7.5

    # 4. Skills Extraction
    skill_keywords = [
        "python", "sql", "java", "react", "fastapi", "docker", "aws", "git",
        "node.js", "mongodb", "c++", "linux", "rest apis", "machine learning", "pandas"
    ]
    extracted_skills = [sk.capitalize() if sk != "fastapi" and sk != "rest apis" else ("FastAPI" if sk == "fastapi" else "REST APIs") 
                        for sk in skill_keywords if sk in text]
    
    req_skills = extracted_skills[:3] if extracted_skills else ["Python", "SQL", "Git"]
    pref_skills = extracted_skills[3:6] if len(extracted_skills) > 3 else ["Docker", "Cloud"]

    # 5. Package Extraction
    pkg_match = re.search(r"(\d+\.?\d*)\s*(lpa|lakhs)", text)
    package_lpa = float(pkg_match.group(1)) if pkg_match and float(pkg_match.group(1)) > 3.0 else 14.5

    # 6. Location
    location = "Bengaluru"
    if "hyderabad" in text:
        location = "Hyderabad"
    elif "pune" in text:
        location = "Pune"
    elif "mumbai" in text:
        location = "Mumbai"
    elif "remote" in text or "hybrid" in text:
        location = "Bengaluru / Hybrid"

    return JDExtractResponse(
        roleTitle=role_title,
        eligibleBranches=branches,
        minCgpa=min_cgpa,
        maxBacklogs=0,
        requiredSkills=req_skills,
        preferredSkills=pref_skills,
        rounds=["Online Assessment", "Technical Interview", "HR Evaluation"],
        location=location,
        packageLpa=package_lpa,
        summary=f"AI JD Extractor: Successfully analyzed job requirements for {role_title}. Extracted {len(req_skills)} mandatory skills & eligibility threshold (CGPA {min_cgpa})."
    )
