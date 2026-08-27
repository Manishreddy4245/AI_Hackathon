import os
import re
import json
import logging
from typing import Dict, Any, List
import httpx
from app.core.config import settings
from app.schemas.resume import ExtractedProfileSchema, CategorizedSkillSchema, ProjectSchema, CertificationSchema, ExperienceSchema

logger = logging.getLogger("placemind.resume_ai")

# Skill dictionary with standard categories
SKILL_CATEGORY_MAP = {
    # Programming
    "python": ("Python", "Programming"),
    "java": ("Java", "Programming"),
    "c++": ("C++", "Programming"),
    "c": ("C", "Programming"),
    "javascript": ("JavaScript", "Programming"),
    "typescript": ("TypeScript", "Programming"),
    "go": ("Golang", "Programming"),
    
    # Backend
    "fastapi": ("FastAPI", "Backend"),
    "rest api": ("REST APIs", "Backend"),
    "rest apis": ("REST APIs", "Backend"),
    "sql": ("SQL", "Backend"),
    "postgresql": ("PostgreSQL", "Backend"),
    "mysql": ("MySQL", "Backend"),
    "mongodb": ("MongoDB", "Backend"),
    "spring boot": ("Spring Boot", "Backend"),
    "node.js": ("Node.js", "Backend"),
    "nodejs": ("Node.js", "Backend"),
    "express": ("Express.js", "Backend"),
    "redis": ("Redis", "Backend"),

    # Frontend
    "react": ("React", "Frontend"),
    "html": ("HTML", "Frontend"),
    "css": ("CSS", "Frontend"),
    "tailwind": ("Tailwind CSS", "Frontend"),

    # Tools & DevOps
    "git": ("Git", "Tools"),
    "github": ("GitHub", "Tools"),
    "docker": ("Docker", "Tools"),
    "kubernetes": ("Kubernetes", "Tools"),
    "linux": ("Linux", "Tools"),

    # Cloud
    "aws": ("AWS", "Cloud"),
    "azure": ("Azure", "Cloud"),
    "gcp": ("GCP", "Cloud"),

    # Data
    "data analysis": ("Data Analysis", "Data"),
    "pandas": ("Pandas", "Data"),
    "power bi": ("Power BI", "Data"),
    "powerbi": ("Power BI", "Data"),
    "machine learning": ("Machine Learning", "Data"),
    "tensorflow": ("TensorFlow", "Data"),
}

def regex_fallback_profile_extractor(resume_text: str) -> ExtractedProfileSchema:
    """Deterministic fallback parser when Gemini API key is unavailable or API fails."""
    text_lower = resume_text.lower()

    # 1. Email
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text)
    email = email_match.group(0) if email_match else None

    # 2. Phone
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    phone = phone_match.group(0) if phone_match else None

    # 3. Name (First non-empty line or near email)
    lines = [l.strip() for l in resume_text.split('\n') if l.strip()]
    name = None
    if lines:
        for l in lines[:5]:
            if not any(k in l.lower() for k in ["resume", "curriculum", "email", "phone", "@", "page"]):
                if len(l.split()) <= 4 and re.match(r'^[A-Za-z\s.]+$', l):
                    name = l
                    break
    if not name and lines:
        name = lines[0]

    # 4. Branch
    branch = None
    if "computer science" in text_lower or "cse" in text_lower:
        branch = "CSE"
    elif "information technology" in text_lower or "it" in text_lower:
        branch = "IT"
    elif "electronics" in text_lower or "ece" in text_lower:
        branch = "ECE"
    elif "electrical" in text_lower or "eee" in text_lower:
        branch = "EEE"

    # 5. Graduation Year
    grad_match = re.search(r'\b(202[4-9]|2030)\b', resume_text)
    graduation_year = int(grad_match.group(1)) if grad_match else 2027

    # 6. CGPA
    cgpa_match = re.search(r'(?:cgpa|gpa|marks)?\s*:?\s*([7-9]\.\d{1,2}|10\.0|6\.\d{1,2})', text_lower)
    cgpa = float(cgpa_match.group(1)) if cgpa_match else None

    # 7. Skills extraction
    detected_skills: List[CategorizedSkillSchema] = []
    raw_skills: List[str] = []
    seen_skills = set()

    for key, (display_name, category) in SKILL_CATEGORY_MAP.items():
        if key in text_lower and display_name not in seen_skills:
            seen_skills.add(display_name)
            raw_skills.append(display_name)
            detected_skills.append(CategorizedSkillSchema(
                name=display_name,
                category=category,
                status="Detected"
            ))

    # 8. Education Summary
    education = "B.Tech in Computer Science & Engineering" if branch == "CSE" else (f"B.Tech in {branch}" if branch else "Bachelor of Technology")

    # 9. Projects extraction heuristic
    projects = []
    if "project" in text_lower:
        # Pattern 1: Section with items
        section_match = re.search(r'(?:projects?|key projects?)\s*[:\-\n]+([^\n\r]+(?:\n[^\n\r]+)?)', resume_text, re.IGNORECASE)
        if section_match:
            sec_text = section_match.group(1).strip()
            for item in re.split(r'[,;\n•\-\*]', sec_text):
                cleaned_item = item.strip()
                if len(cleaned_item) > 3 and not any(k in cleaned_item.lower() for k in ["experience", "education", "skills", "technical", "certified"]):
                    projects.append(ProjectSchema(title=cleaned_item, name=cleaned_item, technologies=raw_skills[:3], techStack=raw_skills[:3]))

        if not projects:
            project_matches = re.findall(r'(?:project|title|name)\s*:?\s*([A-Za-z0-9\s\-]{4,30})', resume_text, re.IGNORECASE)
            for pm in project_matches[:3]:
                cleaned_p = pm.strip()
                if len(cleaned_p) > 3 and not any(k in cleaned_p.lower() for k in ["experience", "education", "skills"]):
                    projects.append(ProjectSchema(title=cleaned_p, name=cleaned_p, technologies=raw_skills[:3], techStack=raw_skills[:3]))

    # 10. Certifications
    certifications = []
    if "certified" in text_lower or "certification" in text_lower:
        cert_matches = re.findall(r'([A-Za-z0-9\s]{4,35}\s*(?:Certified|Certification|Certificate))', resume_text, re.IGNORECASE)
        for cm in cert_matches[:2]:
            certifications.append(CertificationSchema(name=cm.strip()))

    return ExtractedProfileSchema(
        name=name or "Student Profile",
        email=email,
        phone=phone,
        education=education,
        branch=branch or "CSE",
        graduation_year=graduation_year,
        cgpa=cgpa,
        skills=detected_skills,
        raw_skills=raw_skills,
        projects=projects,
        certifications=certifications,
        experience=[]
    )

async def extract_resume_profile_ai(resume_text: str) -> ExtractedProfileSchema:
    """
    Extracts structured resume profile using Gemini AI API (if GEMINI_API_KEY is configured),
    or falls back gracefully to structured text parsing.
    """
    api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or settings.AI_API_KEY

    if not api_key:
        logger.info("GEMINI_API_KEY not configured. Running fallback structured text extraction.")
        return regex_fallback_profile_extractor(resume_text)

    prompt = f"""
You are an expert AI Resume Parsing System for campus placement.
Analyze the following resume text and return a valid JSON object matching this structure EXACTLY.

Do NOT invent or hallucinate information. If a field is not present in the text, use null or empty list.

Required JSON Structure:
{{
  "name": "Full Name or null",
  "email": "email@domain.com or null",
  "phone": "phone number or null",
  "education": "Degree name or null",
  "branch": "Branch name like CSE/IT/ECE or null",
  "graduation_year": 2027,
  "cgpa": 8.5,
  "skills": [
    {{"name": "Python", "category": "Programming"}},
    {{"name": "FastAPI", "category": "Backend"}},
    {{"name": "Docker", "category": "Tools"}}
  ],
  "projects": [
    {{"name": "Project Name", "description": "Brief summary", "techStack": ["Python", "FastAPI"]}}
  ],
  "certifications": [
    {{"name": "AWS Certified Developer", "issuer": "Amazon Web Services", "date": "2025"}}
  ],
  "experience": [
    {{"role": "Intern", "company": "Tech Corp", "duration": "3 months", "description": "Developed REST APIs"}}
  ]
}}

Resume Text:
{resume_text[:4000]}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result_json = response.json()
            
            # Extract content from response
            text_content = result_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed_data = json.loads(text_content)

            # Build Pydantic model from AI JSON output
            raw_skills = [s.get("name") for s in parsed_data.get("skills", []) if s.get("name")]
            categorized_skills = [
                CategorizedSkillSchema(
                    name=s.get("name"),
                    category=s.get("category", "Technical"),
                    status="Detected"
                )
                for s in parsed_data.get("skills", []) if s.get("name")
            ]

            projects = [
                ProjectSchema(
                    name=p.get("name", "Project"),
                    description=p.get("description"),
                    techStack=p.get("techStack", [])
                )
                for p in parsed_data.get("projects", []) if isinstance(p, dict) and p.get("name")
            ]

            certifications = [
                CertificationSchema(
                    name=c.get("name", "Certificate"),
                    issuer=c.get("issuer"),
                    date=c.get("date")
                )
                for c in parsed_data.get("certifications", []) if isinstance(c, dict) and c.get("name")
            ]

            experience = [
                ExperienceSchema(
                    role=e.get("role", "Role"),
                    company=e.get("company"),
                    duration=e.get("duration"),
                    description=e.get("description")
                )
                for e in parsed_data.get("experience", []) if isinstance(e, dict) and e.get("role")
            ]

            return ExtractedProfileSchema(
                name=parsed_data.get("name"),
                email=parsed_data.get("email"),
                phone=parsed_data.get("phone"),
                education=parsed_data.get("education"),
                branch=parsed_data.get("branch"),
                graduation_year=parsed_data.get("graduation_year"),
                cgpa=parsed_data.get("cgpa"),
                skills=categorized_skills,
                raw_skills=raw_skills,
                projects=projects,
                certifications=certifications,
                experience=experience
            )

    except Exception as e:
        logger.warning("Gemini AI API call failed or timed out: %s. Switching to fallback parser.", str(e))
        return regex_fallback_profile_extractor(resume_text)
