import time
import re
from typing import List, Dict, Any, Optional
from app.db.mongodb import db_manager
from app.services.skill_matching_engine import calculate_skill_match, normalize_skill
from app.services.eligibility_engine import evaluate_drive_eligibility

def normalize_company_name(name: str) -> str:
    """Normalizes company name for comparison while preserving brand identity."""
    if not name:
        return ""
    c = name.lower().strip()
    c = re.sub(r'\b(inc|llc|ltd|pvt|private limited|corp|corporation|technologies|solutions|systems|labs|software|co)\b\.?', '', c)
    c = re.sub(r'[^\w\s]', ' ', c)
    return ' '.join(c.split())

def normalize_role_title(role: str) -> str:
    """Normalizes job role title, removing noise words while keeping distinct occupations."""
    if not role:
        return ""
    r = role.lower().strip()
    r = re.sub(r'[\(\[\{].*?[\)\]\}]', '', r)
    r = re.sub(r'\s*[-–|/]\s*(full[\s-]*time|part[\s-]*time|remote|internship|intern|contract|engineering|technology|tech|campus|drive|202\d).*$', '', r)
    r = re.sub(r'\b(full[\s-]*time|fresher|entry[\s-]*level|senior|junior|sr\.?|jr\.?|staff|lead|principal|ii|iii|iv|i)\b', '', r)
    r = re.sub(r'[^\w\s]', ' ', r)
    return ' '.join(r.split())

def normalize_location(loc: str) -> str:
    """Normalizes location string to recognize common remote and metro aliases."""
    if not loc:
        return "remote"
    l = loc.lower().strip()
    if any(w in l for w in ["remote", "global", "anywhere", "worldwide", "virtual", "work from home"]):
        return "remote"
    if "bengaluru" in l or "bangalore" in l:
        return "bengaluru"
    if "hyderabad" in l:
        return "hyderabad"
    if "pune" in l:
        return "pune"
    if "mumbai" in l or "bombay" in l:
        return "mumbai"
    if "delhi" in l or "noida" in l or "gurgaon" in l or "gurugram" in l or "ncr" in l:
        return "delhi_ncr"
    if "chennai" in l or "madras" in l:
        return "chennai"
    if "san francisco" in l or "sf" in l or "bay area" in l:
        return "san_francisco"
    l = re.sub(r',\s*(india|usa|us|united states|uk|united kingdom|germany|canada)\b', '', l)
    l = re.sub(r'[^\w\s]', ' ', l)
    return ' '.join(l.split())

def build_dedup_key(job: Dict[str, Any]) -> str:
    """Constructs canonical composite deduplication key: company + role + location."""
    comp = normalize_company_name(job.get("company", ""))
    role = normalize_role_title(job.get("role", ""))
    loc = normalize_location(job.get("location", ""))
    return f"{comp}::{role}::{loc}"

def deduplicate_opportunities(job_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicates internal placement drives based on Company + Role + Location."""
    unique_jobs: List[Dict[str, Any]] = []
    seen_keys: Dict[str, int] = {}
    seen_source_ids: set = set()

    for job in job_list:
        source_id = f"{job.get('source', '')}::{job.get('id', '')}"
        if source_id in seen_source_ids and job.get('id'):
            continue

        dedup_key = build_dedup_key(job)

        if dedup_key in seen_keys:
            existing_idx = seen_keys[dedup_key]
            existing_job = unique_jobs[existing_idx]
            if len(job.get("required_skills", [])) > len(existing_job.get("required_skills", [])):
                unique_jobs[existing_idx] = job
        else:
            seen_keys[dedup_key] = len(unique_jobs)
            seen_source_ids.add(source_id)
            unique_jobs.append(job)

    return unique_jobs

async def get_college_placement_drives() -> List[Dict[str, Any]]:
    """Fetches official internal campus placement drives from MongoDB drives collection."""
    db = db_manager.db
    if db is None:
        return []

    # 1. Discover drive IDs published/active in Communities
    community_drive_ids: List[str] = []
    try:
        active_comms = await db.communities.find(
            {"status": {"$in": ["active", "ACTIVE"]}},
            {"drive_id": 1, "driveId": 1, "_id": 0}
        ).to_list(length=200)
        for c in active_comms:
            d_id = c.get("drive_id") or c.get("driveId")
            if d_id:
                community_drive_ids.append(d_id)
    except Exception:
        community_drive_ids = []

    status_query = [
        "ANNOUNCED", "announced",
        "APPROVED", "approved",
        "open", "OPEN",
        "active", "ACTIVE",
        "shortlisting", "interview",
        "PENDING_ANNOUNCEMENT"
    ]

    drive_query: Dict[str, Any] = {
        "$or": [
            {"status": {"$in": status_query}},
            {"id": {"$in": community_drive_ids}},
            {"driveId": {"$in": community_drive_ids}}
        ]
    } if community_drive_ids else {"status": {"$in": status_query}}

    drives = await db.drives.find(drive_query, {"_id": 0}).to_list(length=500)

    college_opportunities = []
    for d in drives:
        drive_id = d.get("id") or d.get("driveId") or "drive-1"
        grad_year = (
            d.get("graduationYear")
            if d.get("graduationYear") is not None
            else (d.get("graduationYears")[0] if d.get("graduationYears") else None)
        )
        grad_years = d.get("graduationYears") or ([d.get("graduationYear")] if d.get("graduationYear") is not None else [])
        pkg_lpa = d.get("packageLpa") or d.get("package_lpa")
        sal_text = f"{pkg_lpa} LPA" if pkg_lpa else (d.get("salary") or d.get("salary_text") or None)

        college_opportunities.append({
            "id": drive_id,
            "source": "placemind",
            "source_type": "college",
            "source_label": "Campus Placement Drive",
            "company": d.get("companyName") or d.get("company_name") or "Company",
            "role": d.get("roleTitle") or d.get("role_title") or "Software Engineer",
            "company_logo": d.get("companyLogo") or d.get("company_logo") or "TN",
            "location": d.get("location") or "Campus / Hybrid",
            "package_lpa": pkg_lpa,
            "salary_text": sal_text,
            "employment_type": d.get("employmentType") or d.get("employment_type") or "Full-time",
            "description": d.get("description", f"Campus recruitment drive for {d.get('roleTitle', 'role')} at {d.get('companyName', 'company')}."),
            "required_skills": d.get("requiredSkills") or d.get("required_skills") or [],
            "preferred_skills": d.get("preferredSkills") or d.get("preferred_skills") or [],
            "eligible_branches": d.get("eligibleBranches") or d.get("eligible_branches") or ["CSE", "IT"],
            "min_cgpa": d.get("minCgpa") or d.get("min_cgpa"),
            "graduation_year": grad_year,
            "graduation_years": grad_years,
            "deadline": d.get("deadline", "Open"),
            "application_url": drive_id,
            "source_url": None,
            "posted_at": "Active Campus Drive"
        })
    return deduplicate_opportunities(college_opportunities)

def group_opportunities_by_company(opportunities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Groups internal campus placement drives by company."""
    groups_dict: Dict[str, Dict[str, Any]] = {}

    for opp in opportunities:
        comp_name = opp.get("company", "Other")
        comp_key = normalize_company_name(comp_name) or comp_name.lower()

        if comp_key not in groups_dict:
            groups_dict[comp_key] = {
                "company": comp_name,
                "company_logo": opp.get("company_logo") or comp_name[:2].upper(),
                "source": opp.get("source", "placemind"),
                "source_type": opp.get("source_type", "college"),
                "source_label": opp.get("source_label", "Campus Placement Drive"),
                "total_jobs": 0,
                "eligible_jobs": 0,
                "ineligible_jobs": 0,
                "best_match_score": 0,
                "location": opp.get("location"),
                "opportunities": []
            }

        group = groups_dict[comp_key]
        group["total_jobs"] += 1
        if opp.get("eligible"):
            group["eligible_jobs"] += 1
        else:
            group["ineligible_jobs"] += 1

        if opp.get("match_score", 0) > group["best_match_score"]:
            group["best_match_score"] = opp.get("match_score", 0)

        group["opportunities"].append(opp)

    groups_list = list(groups_dict.values())
    groups_list.sort(
        key=lambda g: (1 if g["eligible_jobs"] > 0 else 0, g["best_match_score"]),
        reverse=True
    )
    return groups_list

async def get_ranked_opportunities_for_student(
    student_id: Optional[str] = None,
    source_filter: str = "college",    # Kept for backward compatibility; always serves internal drives
    eligibility_filter: str = "all",   # "all" | "eligible" | "ineligible" | "high_match"
    search_query: str = "",
    student_email: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetches official internal campus placement drives from MongoDB, matches against
    the authenticated student's real profile/resume data, and returns evaluated campus drives.
    """
    db = db_manager.db

    # 1. Fetch authenticated student profile & resume
    student = None
    latest_resume = None
    if db is not None:
        if student_id:
            student = await db.students.find_one({"id": student_id}, {"_id": 0})
            latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})
        if not student and student_email:
            student = await db.students.find_one({"email": student_email.lower()}, {"_id": 0})
        if not latest_resume and student_email:
            latest_resume = await db.resumes.find_one({"student_email": student_email.lower()}, {"_id": 0})
        if not latest_resume and student and student.get("id"):
            latest_resume = await db.resumes.find_one({"student_id": student.get("id")}, {"_id": 0})

    has_resume = latest_resume is not None or bool(student and student.get("resumeUrl") and student.get("resumeUrl") not in ("#", "None", ""))

    student_data = {
        "cgpa": float(student.get("cgpa", 0.0)) if student else 0.0,
        "branch": student.get("branch", "CSE") if student else "CSE",
        "graduationYear": 2027,
        "skills": student.get("skills", []) if student else []
    }
    if student and str(student.get("batch", "")).isdigit():
        student_data["graduationYear"] = int(student.get("batch"))

    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("cgpa"):
            student_data["cgpa"] = prof["cgpa"]
        if prof.get("branch"):
            student_data["branch"] = prof["branch"]
        if prof.get("graduation_year"):
            student_data["graduationYear"] = prof["graduation_year"]
        if prof.get("raw_skills"):
            student_data["skills"] = list(set(student_data["skills"] + prof["raw_skills"]))

    # 2. Gather internal campus placement drives strictly from MongoDB
    college_jobs = await get_college_placement_drives()
    deduped_raw_jobs = deduplicate_opportunities(college_jobs)

    ranked: List[Dict[str, Any]] = []

    for opp in deduped_raw_jobs:
        if not has_resume or len(student_data.get("skills", [])) == 0:
            ranked.append({
                "drive_id": opp["id"],
                "company": opp["company"],
                "role": opp["role"],
                "company_logo": opp["company_logo"],
                "package_lpa": opp["package_lpa"],
                "salary_text": opp["salary_text"],
                "location": opp["location"],
                "employment_type": opp["employment_type"],
                "source": opp["source"],
                "source_type": opp["source_type"],
                "source_label": opp["source_label"],
                "application_url": opp["application_url"],
                "source_url": opp["source_url"],
                "posted_at": opp["posted_at"],
                "description": opp["description"],
                "min_cgpa": opp["min_cgpa"],
                "eligible_branches": opp["eligible_branches"],
                "graduation_year": opp["graduation_year"],
                "deadline": opp["deadline"],
                "match_score": 0,
                "eligible": False,
                "eligibility_reasons": ["Upload your resume to analyze your skills and evaluate eligibility."],
                "missing_requirements": ["Resume Upload Required"],
                "matched_skills": [],
                "skill_gaps": opp["required_skills"],
                "matched_preferred_skills": [],
                "missing_preferred_skills": opp["preferred_skills"],
                "recommendation": "Upload your resume to evaluate eligibility for this placement drive."
            })
            continue

        match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(
            student_data.get("skills", []),
            opp
        )

        hard_eligible, hard_reasons, missing_reqs = evaluate_drive_eligibility(student_data, opp)
        if missing_req:
            missing_reqs = missing_reqs + [f"Missing required skills: {', '.join(missing_req)}"]

        eligible = hard_eligible and (match_score >= 40 or len(matched_req) > 0)
        reasons = hard_reasons.copy()
        if missing_req and not eligible:
            reasons.append(f"Missing mandatory technical skills: {', '.join(missing_req)}")

        rec_text = (
            f"Strong profile match ({match_score}%). Matched skills: {', '.join(matched_req[:3])}."
            if matched_req else f"Drive match score: {match_score}%."
        )

        ranked.append({
            "drive_id": opp["id"],
            "company": opp["company"],
            "role": opp["role"],
            "company_logo": opp["company_logo"],
            "package_lpa": opp["package_lpa"],
            "salary_text": opp["salary_text"],
            "location": opp["location"],
            "employment_type": opp["employment_type"],
            "source": opp["source"],
            "source_type": opp["source_type"],
            "source_label": opp["source_label"],
            "application_url": opp["application_url"],
            "source_url": opp["source_url"],
            "posted_at": opp["posted_at"],
            "description": opp["description"],
            "min_cgpa": opp["min_cgpa"],
            "eligible_branches": opp["eligible_branches"],
            "graduation_year": opp["graduation_year"],
            "deadline": opp["deadline"],
            "match_score": match_score,
            "eligible": eligible,
            "eligibility_reasons": reasons,
            "missing_requirements": missing_reqs,
            "matched_skills": matched_req,
            "skill_gaps": missing_req,
            "matched_preferred_skills": matched_pref,
            "missing_preferred_skills": missing_pref,
            "recommendation": rec_text
        })

    # Search query filtering
    if search_query.strip():
        q = search_query.lower().strip()
        ranked = [
            o for o in ranked if (
                q in o["company"].lower() or
                q in o["role"].lower() or
                (o["location"] and q in o["location"].lower()) or
                any(q in s.lower() for s in o.get("matched_skills", [])) or
                any(q in s.lower() for s in o.get("skill_gaps", []))
            )
        ]

    # Apply eligibility filters
    if eligibility_filter == "eligible":
        ranked = [o for o in ranked if o["eligible"]]
    elif eligibility_filter == "ineligible":
        ranked = [o for o in ranked if not o["eligible"]]
    elif eligibility_filter == "high_match":
        ranked = [o for o in ranked if o["match_score"] >= 65]

    ranked.sort(
        key=lambda x: (1 if x["eligible"] else 0, x["match_score"]),
        reverse=True
    )
    return ranked

async def get_opportunity_skill_gap_analysis(
    opportunity_id: str,
    student_id: Optional[str] = None,
    student_email: Optional[str] = None
) -> Dict[str, Any]:
    """Computes detailed company-specific skill gap for an internal placement drive."""
    db = db_manager.db

    student = None
    latest_resume = None
    if db is not None:
        if student_id:
            student = await db.students.find_one({"id": student_id}, {"_id": 0})
            latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})
        if not student and student_email:
            student = await db.students.find_one({"email": student_email.lower()}, {"_id": 0})
        if not latest_resume and student_email:
            latest_resume = await db.resumes.find_one({"student_email": student_email.lower()}, {"_id": 0})
        if not latest_resume and student and student.get("id"):
            latest_resume = await db.resumes.find_one({"student_id": student.get("id")}, {"_id": 0})

    has_resume = latest_resume is not None or bool(student and student.get("resumeUrl") and student.get("resumeUrl") not in ("#", "None", ""))

    student_skills = student.get("skills", []) if student else []
    student_cgpa = float(student.get("cgpa", 0.0)) if student else 0.0
    student_branch = student.get("branch", "CSE") if student else "CSE"
    student_grad_year = 2027
    if student and str(student.get("batch", "")).isdigit():
        student_grad_year = int(student.get("batch"))

    if latest_resume and "extracted_profile" in latest_resume:
        prof = latest_resume["extracted_profile"]
        if prof.get("raw_skills"):
            student_skills = list(set(student_skills + prof["raw_skills"]))
        if prof.get("cgpa"):
            student_cgpa = prof["cgpa"]
        if prof.get("branch"):
            student_branch = prof["branch"]
        if prof.get("graduation_year"):
            student_grad_year = prof["graduation_year"]

    student_data = {
        "skills": student_skills,
        "cgpa": student_cgpa,
        "branch": student_branch,
        "graduationYear": student_grad_year
    }

    college_jobs = await get_college_placement_drives()
    target_job = next((j for j in college_jobs if j["id"] == opportunity_id), None)
    if not target_job:
        target_job = next((j for j in college_jobs if opportunity_id in j["id"] or j["id"] in opportunity_id), None)

    if not target_job:
        return {"error": "Placement drive not found", "drive_id": opportunity_id}

    req_skills = target_job.get("required_skills", [])
    pref_skills = target_job.get("preferred_skills", [])

    match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(student_skills, target_job)
    hard_eligible, hard_reasons, missing_reqs = evaluate_drive_eligibility(student_data, target_job)
    eligible = hard_eligible and (match_score >= 40 or len(matched_req) > 0)

    roadmap = []
    for idx, skill in enumerate(missing_req, start=1):
        roadmap.append({
            "step": idx,
            "skill": skill,
            "importance": "Mandatory",
            "action": f"Master core concepts, syntax, and build a project using {skill}."
        })
    for idx, skill in enumerate(missing_pref, start=len(missing_req) + 1):
        roadmap.append({
            "step": idx,
            "skill": skill,
            "importance": "Preferred",
            "action": f"Gain foundational hands-on familiarity with {skill}."
        })

    return {
        "opportunity_id": target_job["id"],
        "company": target_job["company"],
        "role": target_job["role"],
        "source": target_job["source"],
        "source_type": target_job["source_type"],
        "source_label": target_job["source_label"],
        "has_resume": has_resume,
        "is_eligible": eligible,
        "match_score": match_score,
        "match_fraction": f"{len(matched_req)} / {len(req_skills)}" if req_skills else "N/A",
        "student_skills": student_skills,
        "skills_you_have": matched_req + matched_pref,
        "skills_you_need": missing_req,
        "preferred_skills_missing": missing_pref,
        "required_skills_breakdown": [
            {"skill": s, "status": "have" if s in matched_req else "need"} for s in req_skills
        ],
        "preferred_skills_breakdown": [
            {"skill": s, "status": "have" if s in matched_pref else "need"} for s in pref_skills
        ],
        "non_skill_criteria": {
            "min_cgpa": {
                "required": target_job.get("min_cgpa"),
                "student": student_cgpa,
                "satisfied": (student_cgpa >= target_job.get("min_cgpa")) if target_job.get("min_cgpa") else True
            },
            "eligible_branches": {
                "required": target_job.get("eligible_branches", []),
                "student": student_branch,
                "satisfied": (student_branch.upper() in [b.upper() for b in target_job.get("eligible_branches", [])]) if target_job.get("eligible_branches") else True
            },
            "graduation_year": {
                "required": target_job.get("graduation_year"),
                "student": student_grad_year,
                "satisfied": (student_grad_year == target_job.get("graduation_year")) if target_job.get("graduation_year") else True
            }
        },
        "eligibility_reasons": hard_reasons,
        "roadmap_steps": roadmap,
        "application_url": target_job.get("application_url"),
        "source_url": target_job.get("source_url")
    }
