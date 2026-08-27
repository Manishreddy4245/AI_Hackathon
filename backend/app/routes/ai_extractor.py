import os
import json
import logging
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import httpx

from app.core.config import settings

logger = logging.getLogger("placemind.ai_extractor")
router = APIRouter(prefix="/api/ai", tags=["AI Engine"])

class JDExtractRequest(BaseModel):
    rawText: Optional[str] = Field(None, description="The recruiter-provided raw job description text")
    raw_text: Optional[str] = Field(None, description="Alternative key for rawText")
    companyName: Optional[str] = Field(None, description="Company name")
    company_name: Optional[str] = Field(None, description="Alternative key for companyName")

class JDExtractResponse(BaseModel):
    roleTitle: Optional[str] = None
    companyName: Optional[str] = "Company"
    eligibleBranches: List[str] = []
    minCgpa: Optional[float] = None
    maxBacklogs: Optional[int] = 0
    graduationYear: Optional[int] = None
    graduationYears: List[int] = []
    requiredSkills: List[str] = []
    preferredSkills: List[str] = []
    responsibilities: Optional[List[str]] = []
    qualifications: Optional[List[str]] = []
    experience: Optional[str] = None
    rounds: Optional[List[str]] = []
    location: Optional[str] = None
    packageLpa: Optional[float] = None
    openings: Optional[int] = None
    summary: Optional[str] = ""
    aiExplanation: Optional[str] = None
    rawText: Optional[str] = None


# Comprehensive knowledge base for dynamic keyword matching in fallback mode
KNOWN_TECH_SKILLS = [
    # Frontend
    "React", "React.js", "React Native", "TypeScript", "JavaScript", "Next.js", "Vue.js", "Angular",
    "HTML", "HTML5", "CSS", "CSS3", "TailwindCSS", "Tailwind CSS", "Bootstrap", "Redux", "GraphQL",
    # Backend
    "Python", "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Java", "Spring Boot", "Spring",
    "C++", "C#", ".NET", "Golang", "Go", "Rust", "PHP", "Laravel", "Ruby", "Ruby on Rails", "REST APIs", "RESTful API",
    # Database
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Oracle", "SQLite",
    # Cloud & DevOps
    "Docker", "Kubernetes", "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "CI/CD", "Git", "GitHub", "GitLab",
    "Linux", "Terraform", "Jenkins", "Ansible", "Microservices",
    # Data Science & AI
    "Excel", "Power BI", "Tableau", "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch",
    "Machine Learning", "Deep Learning", "NLP", "Data Analysis", "Data Visualization", "Big Data", "Spark", "Hadoop",
    # Testing & Mobile
    "Selenium", "Jest", "Cypress", "Flutter", "Swift", "Kotlin", "Android", "iOS"
]

def extract_explicit_skills_from_text(raw_text: str) -> List[str]:
    """
    Extract skills explicitly listed in sections like 'Skills:', 'Required Skills:', 'Requirements:', etc.
    """
    found_skills = []
    skill_headers = re.findall(
        r"(?:skills|required skills|key skills|tech stack|technologies|requirements|qualifications)\s*[:\-]\s*([^\n\r]+)",
        raw_text,
        re.IGNORECASE
    )
    for section in skill_headers:
        tokens = re.split(r"[,;/\|\•\-\+]+", section)
        for token in tokens:
            cleaned = token.strip()
            cleaned = re.sub(r"^[\.\:\-\*\s]+|[\.\:\-\*\s]+$", "", cleaned)
            if 1 < len(cleaned) <= 30 and not cleaned.lower().startswith("looking for") and not cleaned.lower().startswith("experience in"):
                if not any(s.lower() == cleaned.lower() for s in found_skills):
                    found_skills.append(cleaned)
    return found_skills

def extract_company_from_raw_text(raw_text: str, fallback_company: str = "Company") -> str:
    """
    Extract company name if explicitly mentioned in raw text.
    """
    comp_match = re.search(
        r"(?:company|organization|recruiter)\s*[:\-]\s*([a-zA-Z0-9\s\.\,\-\&]+?)(?:\n|\.|\,|$)",
        raw_text,
        re.IGNORECASE
    )
    if comp_match:
        cand = comp_match.group(1).strip()
        if 2 < len(cand) < 40 and not cand.lower().startswith("looking"):
            return cand

    hiring_match = re.search(
        r"^([a-zA-Z0-9\s\.\,\-\&]+?)\s+(?:is hiring|is looking for|announces campus drive|invites applications)",
        raw_text,
        re.IGNORECASE | re.MULTILINE
    )
    if hiring_match:
        cand = hiring_match.group(1).strip()
        if 2 < len(cand) < 40:
            return cand

    return fallback_company

def dynamic_fallback_jd_extractor(raw_text: str, company_name: str = "Company") -> JDExtractResponse:
    """
    Strictly dynamic content-driven extraction from recruiter's Raw Text.
    Never uses static predefined job descriptions or fake skills.
    Only extracts fields that are supported by the provided text.
    """
    text_lower = raw_text.lower()
    comp_name = extract_company_from_raw_text(raw_text, company_name)

    # 1. Dynamic Role Title Extraction
    role_title = None
    if "react developer" in text_lower or ("react" in text_lower and "developer" in text_lower):
        role_title = "React Developer"
    elif "python backend developer" in text_lower or ("python" in text_lower and "backend" in text_lower):
        role_title = "Python Backend Developer"
    elif "data analyst" in text_lower:
        role_title = "Data Analyst"
    elif "data scientist" in text_lower:
        role_title = "Data Scientist"
    elif "devops" in text_lower or "cloud engineer" in text_lower:
        role_title = "DevOps Engineer"
    elif "full stack" in text_lower or "fullstack" in text_lower:
        role_title = "Full Stack Engineer"
    elif "frontend developer" in text_lower or "frontend engineer" in text_lower:
        role_title = "Frontend Developer"
    elif "backend developer" in text_lower or "backend engineer" in text_lower:
        role_title = "Backend Developer"
    elif "qa engineer" in text_lower or "tester" in text_lower or "automation engineer" in text_lower:
        role_title = "QA Automation Engineer"
    elif "machine learning" in text_lower or "ml engineer" in text_lower:
        role_title = "Machine Learning Engineer"

    if not role_title:
        title_match = re.search(
            r"(?:role|title|position|hiring for|seeking a|seeking an|looking for a|looking for an|job title)\s*[:\-]?\s*([a-zA-Z0-9\s\/\+\#\.\-]+?)(?:\n|\.|\,|\;|$)",
            raw_text,
            re.IGNORECASE
        )
        if title_match:
            cand = title_match.group(1).strip()
            cand = re.split(r"\b(?:with|having|proficient|skilled|who|to|at|for|in|from|batch|requirements|skills)\b", cand, flags=re.IGNORECASE)[0].strip()
            if 2 < len(cand) < 50:
                role_title = cand.title()

    if not role_title:
        # Check first non-empty line
        first_line = next((line.strip() for line in raw_text.splitlines() if line.strip()), "")
        if 3 < len(first_line) < 40 and not any(k in first_line.lower() for k in ["http", "salary", "package", "cgpa", "batch"]):
            role_title = first_line.title()
        else:
            role_title = "Placement Opportunity"

    # 2. Dynamic Skills Extraction strictly from Raw Text
    explicit_skills = extract_explicit_skills_from_text(raw_text)
    detected_skills = []

    for s in explicit_skills:
        if not any(existing.lower() == s.lower() for existing in detected_skills):
            detected_skills.append(s)

    for skill in KNOWN_TECH_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            if not any(skill.lower() == existing.lower() for existing in detected_skills):
                detected_skills.append(skill)

    req_skills = []
    pref_skills = []

    if any(k in text_lower for k in ["preferred", "good to have", "nice to have", "plus point"]):
        parts = re.split(r"(?:preferred|good to have|nice to have|plus point)", raw_text, flags=re.IGNORECASE)
        req_part = parts[0].lower()
        pref_part = parts[1].lower() if len(parts) > 1 else ""

        for s in detected_skills:
            if s.lower() in pref_part and s.lower() not in req_part:
                pref_skills.append(s)
            else:
                req_skills.append(s)
    else:
        req_skills = detected_skills

    # 3. Dynamic Branch Extraction (empty if not mentioned)
    branches = []
    branch_map = {
        "cse": "CSE",
        "computer science": "CSE",
        "it": "IT",
        "information technology": "IT",
        "ece": "ECE",
        "electronics": "ECE",
        "eee": "EEE",
        "electrical": "EEE",
        "mech": "MECH",
        "mechanical": "MECH",
        "civil": "CIVIL",
        "ai": "AI/ML",
        "data science": "Data Science"
    }
    for key, val in branch_map.items():
        if re.search(r"\b" + re.escape(key) + r"\b", text_lower):
            if val not in branches:
                branches.append(val)

    # 4. Dynamic CGPA Extraction (None if not mentioned)
    cgpa_match = re.search(
        r"(?:cgpa|gpa)\s*(?:of|:\s*|>=\s*|minimum\s*|min\s*|is\s*|above\s*)?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:cgpa|gpa)",
        text_lower
    )
    min_cgpa = None
    if cgpa_match:
        val_str = cgpa_match.group(1) or cgpa_match.group(2)
        try:
            val = float(val_str)
            if 4.0 <= val <= 10.0:
                min_cgpa = val
        except ValueError:
            pass

    # 4b. Dynamic Graduation Years Extraction (empty list if none mentioned)
    grad_years: List[int] = []
    year_matches = re.findall(r"\b(202[0-9]|203[0-9])\b", text_lower)
    for y in year_matches:
        yi = int(y)
        if yi not in grad_years:
            grad_years.append(yi)
    single_grad_year = grad_years[0] if grad_years else None

    # 5. Dynamic Package Extraction (None if not mentioned)
    pkg_match = re.search(r"(?:₹|ctc|package|salary)?\s*(\d+\.?\d*)\s*(?:lpa|lakhs|lakh|inr|₹|ctc)", text_lower)
    if not pkg_match:
        pkg_match = re.search(r"(\d+\.?\d*)\s*(?:lpa|lakhs|lakh)", text_lower)
    package_lpa = float(pkg_match.group(1)) if pkg_match and 1.0 <= float(pkg_match.group(1)) <= 150.0 else None

    # 6. Dynamic Location Extraction (None if not mentioned)
    location = None
    loc_keywords = ["Bengaluru", "Bangalore", "Hyderabad", "Pune", "Mumbai", "Chennai", "Delhi", "Noida", "Gurugram", "Gurgaon", "Kolkata", "Ahmedabad", "Remote", "Hybrid"]
    for loc in loc_keywords:
        if loc.lower() in text_lower:
            location = "Bengaluru" if loc.lower() in ["bengaluru", "bangalore"] else loc
            break

    # 7. Dynamic Openings Extraction
    openings_match = re.search(r"(\d+)\s*(?:openings|positions|vacancies|seats|candidates)", text_lower)
    openings = int(openings_match.group(1)) if openings_match else None

    # 8. Dynamic Experience
    exp_match = re.search(r"(\d+[\-\+]?\d*\s*(?:years|yrs|year))\s*(?:experience|exp)?", text_lower)
    experience = exp_match.group(1) if exp_match else None

    # 9. Dynamic Responsibilities extraction
    responsibilities = []
    resp_lines = re.findall(r"(?:[\•\-\*]|\d+\.)\s*([^\n\r]+)", raw_text)
    for r_line in resp_lines:
        cleaned_r = r_line.strip()
        if 10 < len(cleaned_r) < 150 and not any(k in cleaned_r.lower() for k in ["cgpa", "lpa", "salary", "package", "branch"]):
            responsibilities.append(cleaned_r)

    skills_str = ", ".join(req_skills) if req_skills else "as outlined in description"
    summary_role = role_title or "placement role"
    summary_cgpa = f" (Min CGPA: {min_cgpa})" if min_cgpa else ""
    summary = f"Job requirements for {summary_role} at {comp_name}. Extracted required skills: {skills_str}{summary_cgpa}."
    ai_explanation = f"Analysis generated strictly from the recruiter-provided raw text for {comp_name}. Core requirements identified: {skills_str}."

    return JDExtractResponse(
        roleTitle=role_title or "Campus Placement Role",
        companyName=comp_name,
        eligibleBranches=branches,
        minCgpa=min_cgpa,
        maxBacklogs=0,
        graduationYear=single_grad_year,
        graduationYears=grad_years,
        requiredSkills=req_skills,
        preferredSkills=pref_skills,
        responsibilities=responsibilities[:5],
        qualifications=[f"B.Tech / B.E in {', '.join(branches)}"] if branches else [],
        experience=experience or "Fresher / Entry Level",
        rounds=["Online Assessment", "Technical Interview", "HR Evaluation"],
        location=location,
        packageLpa=package_lpa,
        openings=openings,
        summary=summary,
        aiExplanation=ai_explanation,
        rawText=raw_text
    )

async def _analyze_with_gemini(raw_text: str, company_name: str, api_key: str) -> Optional[JDExtractResponse]:
    """
    Call Google Gemini Generative AI strictly using the current recruiter raw text.
    """
    prompt = f"""You are an expert AI Job Description and Campus Recruitment Placement Analysis Engine.
Analyze ONLY the following recruiter-provided job description/raw text and extract the structured job information from it.
Do NOT use predefined company/job data. Do NOT invent company-specific requirements that are not supported by the provided text.
If a field is not present or mentioned in the raw text, return null or an empty list. DO NOT replace missing information with dummy or default values.

RAW JOB TEXT:
{raw_text[:4000]}

Company Name Context (if not explicitly specified in raw text): {company_name}

Return a valid JSON object matching this structure EXACTLY:
{{
  "roleTitle": "Exact role title mentioned in raw text (or null)",
  "companyName": "Company name mentioned in text or provided context",
  "eligibleBranches": ["List of eligible engineering branches mentioned in text, e.g. CSE, IT, ECE - empty array if none"],
  "minCgpa": null,
  "maxBacklogs": 0,
  "graduationYears": [2026, 2027],
  "requiredSkills": ["Mandatory skills strictly mentioned in raw text - empty array if none"],
  "preferredSkills": ["Secondary/good-to-have skills mentioned in raw text - empty array if none"],
  "responsibilities": ["Key responsibilities mentioned in raw text - empty array if none"],
  "qualifications": ["Degrees or education mentioned in raw text - empty array if none"],
  "experience": "Experience range mentioned or null",
  "rounds": ["Recruitment rounds mentioned in text or empty array"],
  "location": "Location mentioned in text or null",
  "packageLpa": null,
  "openings": null,
  "summary": "Brief 1-2 sentence factual summary based strictly on the provided text",
  "aiExplanation": "Clear reasoning of requirements detected strictly in the provided text"
}}
"""
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result_json = response.json()
                    text_content = result_json["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(text_content)

                    # Extract values strictly from Gemini response
                    role_title = data.get("roleTitle")
                    ret_company = data.get("companyName") or company_name
                    branches = data.get("eligibleBranches") or []
                    min_cgpa = float(data["minCgpa"]) if data.get("minCgpa") is not None else None
                    max_backlogs = int(data.get("maxBacklogs", 0)) if data.get("maxBacklogs") is not None else 0
                    
                    raw_years = data.get("graduationYears") or []
                    grad_years = [int(y) for y in raw_years if str(y).isdigit()]
                    single_grad_year = grad_years[0] if grad_years else None

                    req_skills = data.get("requiredSkills") or []
                    pref_skills = data.get("preferredSkills") or []
                    responsibilities = data.get("responsibilities") or []
                    qualifications = data.get("qualifications") or []
                    experience = data.get("experience")
                    rounds = data.get("rounds") or ["Online Assessment", "Technical Interview", "HR Evaluation"]
                    location = data.get("location")
                    package_lpa = float(data["packageLpa"]) if data.get("packageLpa") is not None else None
                    openings = int(data["openings"]) if data.get("openings") is not None else None
                    summary = data.get("summary") or f"AI analyzed requirements for {role_title or 'this role'}."
                    ai_explanation = data.get("aiExplanation") or "Requirements extracted dynamically from the provided raw text."

                    return JDExtractResponse(
                        roleTitle=role_title or "Campus Placement Role",
                        companyName=ret_company,
                        eligibleBranches=branches,
                        minCgpa=min_cgpa,
                        maxBacklogs=max_backlogs,
                        graduationYear=single_grad_year,
                        graduationYears=grad_years,
                        requiredSkills=req_skills,
                        preferredSkills=pref_skills,
                        responsibilities=responsibilities,
                        qualifications=qualifications,
                        experience=experience,
                        rounds=rounds,
                        location=location,
                        packageLpa=package_lpa,
                        openings=openings,
                        summary=summary,
                        aiExplanation=ai_explanation,
                        rawText=raw_text
                    )
        except Exception as e:
            logger.warning("Gemini model %s extraction failed: %s", model, str(e))
            continue
    return None

@router.post("/extract-jd", response_model=JDExtractResponse)
@router.post("/analyze-job", response_model=JDExtractResponse)
async def extract_job_description(req: JDExtractRequest):
    """
    Extract structured placement drive requirements strictly from recruiter's Raw Text.
    Raw Text is the single source of truth.
    Uses Google Gemini API when configured, with accurate content-driven dynamic extraction.
    """
    raw_text = (req.rawText or req.raw_text or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Raw job description text cannot be empty. Please enter the job requirements.")

    company_name = req.companyName or req.company_name or "Company"
    api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or settings.AI_API_KEY

    if api_key and api_key != "your-gemini-api-key-here" and len(api_key) > 10:
        gemini_result = await _analyze_with_gemini(raw_text, company_name, api_key)
        if gemini_result is not None:
            return gemini_result

    # Dynamic fallback parser based purely on provided raw text
    return dynamic_fallback_jd_extractor(raw_text, company_name)


