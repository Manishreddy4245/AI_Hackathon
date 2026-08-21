from typing import Dict, Any, List, Tuple

def calculate_profile_completion(
    student: Dict[str, Any],
    has_resume: bool = False,
    skills_count: int = 0
) -> Tuple[int, bool, List[str], List[Dict[str, Any]]]:
    """
    Simple Profile Completion Rule:
    1. BEFORE RESUME UPLOAD:
       - Profile Completion = 0% for every newly registered student.
       - is_profile_complete = False.
       - All checklist items pending until resume is uploaded.
    2. AFTER RESUME UPLOAD:
       - Starts real profile completion calculation based on extracted data (Resume, Skills, Education, Projects).
    """
    # Demo student account exception
    if student.get("id") in ("student-demo", "rahul-verma") or student.get("email") == "student@demo.com":
        checklist = [
            {"key": "resume", "label": "Resume Upload & AI Analysis", "completed": True, "weight": 25},
            {"key": "skills", "label": "Verified Technical Skills", "completed": True, "weight": 25},
            {"key": "education", "label": "Education Details (College, CGPA)", "completed": True, "weight": 25},
            {"key": "projects", "label": "Projects & Experience", "completed": True, "weight": 25},
        ]
        return 100, True, [], checklist

    # Check if resume document is actually uploaded
    resume_url = student.get("resumeUrl")
    resume_id = student.get("resumeId")
    is_resume_uploaded = bool(has_resume or resume_id or (resume_url and str(resume_url).strip() not in ("#", "None", "", "null")))

    # =========================================================================
    # RULE: IF RESUME IS NOT UPLOADED -> PROFILE COMPLETION = 0%
    # =========================================================================
    if not is_resume_uploaded:
        checklist = [
            {"key": "resume", "label": "Resume Upload & AI Analysis", "completed": False, "weight": 25},
            {"key": "skills", "label": "Verified Technical Skills", "completed": False, "weight": 25},
            {"key": "education", "label": "Education Details (College, CGPA)", "completed": False, "weight": 25},
            {"key": "projects", "label": "Projects & Experience", "completed": False, "weight": 25},
        ]
        missing_requirements = [
            "Upload your resume to complete your profile before applying."
        ]
        return 0, False, missing_requirements, checklist

    # =========================================================================
    # ONCE RESUME EXISTS -> RUN REAL PROFILE COMPLETION CALCULATION
    # =========================================================================
    checklist = []
    missing_requirements = []
    total_percentage = 0

    # 1. Resume Upload (25%)
    total_percentage += 25
    checklist.append({"key": "resume", "label": "Resume Upload & AI Analysis", "completed": True, "weight": 25})

    # 2. Extracted Technical Skills (25%)
    skills = student.get("skills", [])
    effective_skills_count = max(len(skills), skills_count)
    if effective_skills_count > 0:
        total_percentage += 25
        checklist.append({"key": "skills", "label": "Verified Technical Skills", "completed": True, "weight": 25})
    else:
        checklist.append({"key": "skills", "label": "Verified Technical Skills", "completed": False, "weight": 25})
        missing_requirements.append("Extract verified technical skills from your resume")

    # 3. Education / Academic Information (25%)
    has_academic = bool(student.get("branch") and student.get("batch"))
    if has_academic:
        total_percentage += 25
        checklist.append({"key": "education", "label": "Education Details (College, CGPA)", "completed": True, "weight": 25})
    else:
        checklist.append({"key": "education", "label": "Education Details (College, CGPA)", "completed": False, "weight": 25})
        missing_requirements.append("Provide education details")

    # 4. Basic Info & Projects/Experience (25%)
    has_basic = bool(student.get("name") and student.get("email"))
    has_projects_or_exp = bool(student.get("projects") or student.get("experience") or student.get("certifications"))
    if has_basic or has_projects_or_exp:
        total_percentage += 25
        checklist.append({"key": "projects", "label": "Personal & Project Profile", "completed": True, "weight": 25})
    else:
        checklist.append({"key": "projects", "label": "Personal & Project Profile", "completed": False, "weight": 25})

    is_complete = is_resume_uploaded and (effective_skills_count > 0)
    return min(100, total_percentage), is_complete, missing_requirements, checklist
