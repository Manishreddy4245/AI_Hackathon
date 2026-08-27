import time
import httpx
import re
from typing import List, Dict, Any, Optional
from app.db.mongodb import db_manager
from app.services.skill_matching_engine import calculate_skill_match, normalize_skill
from app.services.eligibility_engine import evaluate_drive_eligibility

# Tech skill vocabulary for automatic tag extraction from external job descriptions
TECH_SKILLS_VOCAB = [
    "python", "javascript", "typescript", "react", "next.js", "vue", "angular", "node.js",
    "express", "fastapi", "django", "flask", "java", "spring boot", "c++", "c#", ".net",
    "golang", "go", "rust", "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "cloud", "git", "linux", "ci/cd",
    "terraform", "graphql", "rest api", "rest apis", "html5", "css3", "tailwind",
    "machine learning", "deep learning", "nlp", "data analysis", "pandas", "pytorch", "tensorflow"
]

TECH_ROLE_KEYWORDS = [
    "software", "developer", "engineer", "engineering", "programmer", "coder",
    "backend", "frontend", "full stack", "fullstack", "web", "mobile", "ios", "android",
    "data", "analyst", "analytics", "scientist", "machine learning", "ai", "ml", "nlp",
    "devops", "cloud", "sre", "infrastructure", "systems", "security", "cyber",
    "architect", "qa", "quality assurance", "tester", "testing", "database", "dba",
    "product", "technical", "tech", "intern", "internship", "graduate", "trainee",
    "computer", "network", "linux", "python", "java", "react", "golang", "c++", "rust",
    "platform", "embedded", "firmware", "solutions architect", "support engineer"
]

NON_RELEVANT_KEYWORDS = [
    "nurse", "nursing", "dentist", "dental", "doctor", "physician", "therapist",
    "accountant", "auditor", "attorney", "paralegal",
    "real estate", "realtor", "driver", "truck", "warehouse", "cashier", "cook", "chef",
    "janitor", "housekeeping", "plumber", "electrician", "mechanic", "flight attendant"
]

def is_tech_or_software_relevant(title: str, description: str = "") -> bool:
    """Filter to ensure discovered jobs are relevant to computer science/tech students."""
    full_text = (title + " " + description).lower()
    title_lower = title.lower()

    # If explicitly non-relevant occupation
    if any(re.search(r'\b' + re.escape(w) + r'\b', title_lower) for w in NON_RELEVANT_KEYWORDS):
        return False
    # If explicitly tech related
    if any(w in full_text for w in TECH_ROLE_KEYWORDS):
        return True
    return False

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
    """Constructs the canonical composite deduplication key: company + role + location."""
    comp = normalize_company_name(job.get("company", ""))
    role = normalize_role_title(job.get("role", ""))
    loc = normalize_location(job.get("location", ""))
    return f"{comp}::{role}::{loc}"

def deduplicate_opportunities(job_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicates a merged list of opportunities based on Company + Role + Location,
    plus unique source job IDs. When duplicates are encountered, prioritizes the most complete record.
    """
    unique_jobs: List[Dict[str, Any]] = []
    seen_keys: Dict[str, int] = {}
    seen_source_ids: set = set()

    for job in job_list:
        # Check source + external ID if present
        source_id = f"{job.get('source', '')}::{job.get('id', '')}"
        if source_id in seen_source_ids and job.get('id'):
            continue

        dedup_key = build_dedup_key(job)

        if dedup_key in seen_keys:
            existing_idx = seen_keys[dedup_key]
            existing_job = unique_jobs[existing_idx]

            # Priority 1: College drives take precedence
            if job.get("source_type") == "college" and existing_job.get("source_type") != "college":
                unique_jobs[existing_idx] = job
            # Priority 2: Keep the record with a valid direct application URL
            elif not existing_job.get("application_url") and job.get("application_url"):
                unique_jobs[existing_idx] = job
            # Priority 3: Keep the record with richer required skills list
            elif len(job.get("required_skills", [])) > len(existing_job.get("required_skills", [])):
                unique_jobs[existing_idx] = job
        else:
            seen_keys[dedup_key] = len(unique_jobs)
            seen_source_ids.add(source_id)
            unique_jobs.append(job)

    return unique_jobs

class OpportunityCache:
    def __init__(self, ttl_seconds: int = 900):  # 15 minutes default TTL
        self.cached_external_jobs: List[Dict[str, Any]] = []
        self.last_fetched: float = 0
        self.ttl_seconds = ttl_seconds

    def is_valid(self) -> bool:
        return len(self.cached_external_jobs) > 0 and (time.time() - self.last_fetched) < self.ttl_seconds

    def set(self, jobs: List[Dict[str, Any]]):
        self.cached_external_jobs = jobs
        self.last_fetched = time.time()

opportunity_cache = OpportunityCache()

def extract_skills_from_text(text: str) -> List[str]:
    """Extract known technical skills from text content."""
    if not text:
        return []
    lowered = text.lower()
    detected = []
    for skill in TECH_SKILLS_VOCAB:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, lowered):
            detected.append(skill.title() if len(skill) > 3 else skill.upper())
    return list(dict.fromkeys(detected))[:8]

async def fetch_greenhouse_board(client: httpx.AsyncClient, board_name: str, company_name: str) -> List[Dict[str, Any]]:
    """Fetch all open public jobs from a Greenhouse board without artificial limits."""
    jobs = []
    try:
        url = f"https://boards-api.greenhouse.io/v1/boards/{board_name}/jobs"
        resp = await client.get(url, timeout=7.0)
        if resp.status_code == 200:
            data = resp.json()
            raw_jobs = data.get("jobs", [])
            for item in raw_jobs:
                title = item.get("title", "Software Engineer")
                # Filter for tech/software relevance
                if not is_tech_or_software_relevant(title):
                    continue

                loc = item.get("location", {}).get("name", "Remote / Global")
                req_skills = extract_skills_from_text(title)
                if not req_skills:
                    req_skills = ["Software Engineering", "Problem Solving", "Git"]

                jobs.append({
                    "id": f"gh-{board_name}-{item.get('id')}",
                    "source": "greenhouse",
                    "source_type": "external",
                    "source_label": f"Greenhouse • {company_name}",
                    "company": company_name,
                    "role": title,
                    "company_logo": company_name[:2].upper(),
                    "location": loc,
                    "package_lpa": None,
                    "salary_text": "Competitive Industry Standard",
                    "employment_type": "Full-time",
                    "description": f"Active role at {company_name}. View complete requirements on the official careers page.",
                    "required_skills": req_skills,
                    "preferred_skills": ["Docker", "Cloud", "CI/CD"],
                    "eligible_branches": ["CSE", "IT", "ECE", "All Branches"],
                    "min_cgpa": None,
                    "graduation_year": None,
                    "deadline": "Open Application",
                    "application_url": item.get("absolute_url", f"https://boards.greenhouse.io/{board_name}"),
                    "source_url": item.get("absolute_url", f"https://boards.greenhouse.io/{board_name}"),
                    "posted_at": item.get("updated_at", "")[:10] if item.get("updated_at") else "Recently Active"
                })
    except Exception as e:
        print(f"[OpportunityAggregator] Greenhouse ({board_name}) fetch notice: {e}")
    return jobs

async def fetch_remotive_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch all open tech jobs from Remotive public API."""
    jobs = []
    try:
        url = "https://remotive.com/api/remote-jobs?category=software-dev"
        resp = await client.get(url, timeout=8.0)
        if resp.status_code == 200:
            data = resp.json()
            raw_jobs = data.get("jobs", [])
            for item in raw_jobs:
                title = item.get("title", "Software Developer")
                if not is_tech_or_software_relevant(title, item.get("description", "")):
                    continue

                company = item.get("company_name", "Tech Startup")
                tags = item.get("tags", [])
                extracted = [t.title() for t in tags if len(t) < 20][:6]
                if not extracted:
                    extracted = extract_skills_from_text(title + " " + item.get("description", ""))
                if not extracted:
                    extracted = ["Software Engineering", "Problem Solving", "Git"]

                jobs.append({
                    "id": f"remotive-{item.get('id')}",
                    "source": "remotive",
                    "source_type": "external",
                    "source_label": "Remotive Global Tech Feed",
                    "company": company,
                    "role": title,
                    "company_logo": company[:2].upper(),
                    "location": item.get("candidate_required_location", "Remote / Global"),
                    "package_lpa": None,
                    "salary_text": item.get("salary") or "Competitive",
                    "employment_type": item.get("job_type", "Full-time").replace("_", " ").title(),
                    "description": item.get("description", "")[:280] + "...",
                    "required_skills": extracted,
                    "preferred_skills": ["Communication", "Agile", "Linux"],
                    "eligible_branches": ["All Branches"],
                    "min_cgpa": None,
                    "graduation_year": None,
                    "deadline": "Open Application",
                    "application_url": item.get("url"),
                    "source_url": item.get("url"),
                    "posted_at": item.get("publication_date", "")[:10] if item.get("publication_date") else "Live Feed"
                })
    except Exception as e:
        print(f"[OpportunityAggregator] Remotive fetch notice: {e}")
    return jobs

async def fetch_arbeitnow_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch tech developer jobs from Arbeitnow public API across available pages."""
    jobs = []
    try:
        # Fetch page 1
        url = "https://www.arbeitnow.com/api/job-board-api"
        resp = await client.get(url, timeout=8.0)
        if resp.status_code == 200:
            data = resp.json()
            raw_jobs = data.get("data", [])
            for item in raw_jobs:
                title = item.get("title", "Developer")
                if not is_tech_or_software_relevant(title, item.get("description", "")):
                    continue

                company = item.get("company_name", "Global Firm")
                tags = item.get("tags", [])
                skills = [t.title() for t in tags if len(t) < 20][:6]
                if not skills:
                    skills = extract_skills_from_text(title)
                if not skills:
                    skills = ["Python", "React", "Cloud"]

                jobs.append({
                    "id": f"arbeitnow-{item.get('slug', item.get('id', '1'))}",
                    "source": "arbeitnow",
                    "source_type": "external",
                    "source_label": "Arbeitnow Career Feed",
                    "company": company,
                    "role": title,
                    "company_logo": company[:2].upper(),
                    "location": item.get("location", "Remote / Hybrid"),
                    "package_lpa": None,
                    "salary_text": "Industry Standard",
                    "employment_type": "Full-time",
                    "description": f"External opportunity at {company}. View full role on Arbeitnow.",
                    "required_skills": skills,
                    "preferred_skills": ["Git", "Teamwork"],
                    "eligible_branches": ["All Branches"],
                    "min_cgpa": None,
                    "graduation_year": None,
                    "deadline": "Open Application",
                    "application_url": item.get("url"),
                    "source_url": item.get("url"),
                    "posted_at": "Live Posting"
                })
    except Exception as e:
        print(f"[OpportunityAggregator] Arbeitnow fetch notice: {e}")
    return jobs

async def get_all_external_jobs() -> List[Dict[str, Any]]:
    """Fetches and caches live external tech opportunities from all configured feeds."""
    if opportunity_cache.is_valid():
        return opportunity_cache.cached_external_jobs

    raw_list: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(headers={"User-Agent": "PlaceMind-PlacementAgent/1.0"}) as client:
        # Fetch from configured greenhouse public boards
        gh_cloudflare = await fetch_greenhouse_board(client, "cloudflare", "Cloudflare")
        gh_postman = await fetch_greenhouse_board(client, "postman", "Postman")
        gh_automattic = await fetch_greenhouse_board(client, "automattic", "Automattic")
        gh_canonical = await fetch_greenhouse_board(client, "canonical", "Canonical")
        gh_elastic = await fetch_greenhouse_board(client, "elastic", "Elastic")
        remotive_jobs = await fetch_remotive_jobs(client)
        arbeitnow_jobs = await fetch_arbeitnow_jobs(client)

        raw_list = (
            gh_cloudflare +
            gh_postman +
            gh_automattic +
            gh_canonical +
            gh_elastic +
            remotive_jobs +
            arbeitnow_jobs
        )

    aggregated = deduplicate_opportunities(raw_list)
    opportunity_cache.set(aggregated)
    return aggregated

async def get_college_placement_drives() -> List[Dict[str, Any]]:
    """Fetches official college placement drives from MongoDB."""
    db = db_manager.db
    if db is None:
        return []

    drives = await db.drives.find({"status": {"$in": ["ANNOUNCED", "announced", "open", "active", "ACTIVE", "shortlisting", "interview"]}}, {"_id": 0}).to_list(length=200)

    college_opportunities = []
    for d in drives:
        college_opportunities.append({
            "id": d.get("id", "drive-1"),
            "source": "placemind",
            "source_type": "college",
            "source_label": "Campus Placement Drive",
            "company": d.get("companyName", "Company"),
            "role": d.get("roleTitle", "Software Engineer"),
            "company_logo": d.get("companyLogo", "TN"),
            "location": d.get("location", "Campus / Hybrid"),
            "package_lpa": d.get("packageLpa"),
            "salary_text": f"{d.get('packageLpa')} LPA" if d.get("packageLpa") else None,
            "employment_type": d.get("employmentType", "Full-time"),
            "description": d.get("description", f"Campus recruitment drive for {d.get('roleTitle')} at {d.get('companyName')}."),
            "required_skills": d.get("requiredSkills", []),
            "preferred_skills": d.get("preferredSkills", []),
            "eligible_branches": d.get("eligibleBranches", ["CSE", "IT"]),
            "min_cgpa": d.get("minCgpa"),
            "graduation_year": d.get("graduationYear"),
            "deadline": d.get("deadline", "Open"),
            "application_url": d.get("id"),
            "source_url": None,
            "posted_at": "Active Campus Drive"
        })
    return deduplicate_opportunities(college_opportunities)

def group_opportunities_by_company(opportunities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Groups opportunities by company, preserving distinct roles under each company
    and computing summary statistics.
    """
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
                "source_label": opp.get("source_label", "Placement Opportunity"),
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

    # Sort groups: Companies with eligible opportunities first, then highest best match score
    groups_list = list(groups_dict.values())
    groups_list.sort(
        key=lambda g: (1 if g["eligible_jobs"] > 0 else 0, g["best_match_score"]),
        reverse=True
    )
    return groups_list

async def get_ranked_opportunities_for_student(
    student_id: Optional[str] = None,
    source_filter: str = "all",        # "all" | "college" | "external"
    eligibility_filter: str = "all",   # "all" | "eligible" | "ineligible" | "high_match"
    search_query: str = ""
) -> List[Dict[str, Any]]:
    """
    Combines MongoDB college placement drives + all live public job postings,
    performs unified cross-source deduplication, matches against authenticated student's real resume data,
    and returns categorized opportunities (both eligible and not-eligible).
    """
    db = db_manager.db

    # 1. Fetch authenticated student profile & resume
    student = None
    latest_resume = None
    if db is not None and student_id:
        student = await db.students.find_one({"id": student_id}, {"_id": 0})
        latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})

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

    # 2. Gather opportunities from all configured sources
    college_jobs = await get_college_placement_drives()
    external_jobs = await get_all_external_jobs()

    all_raw_jobs: List[Dict[str, Any]] = []
    if source_filter in ("all", "college"):
        all_raw_jobs.extend(college_jobs)
    if source_filter in ("all", "external"):
        all_raw_jobs.extend(external_jobs)

    # 3. Final unified cross-source deduplication pass
    deduped_raw_jobs = deduplicate_opportunities(all_raw_jobs)

    ranked: List[Dict[str, Any]] = []

    for opp in deduped_raw_jobs:
        if not has_resume or len(student_data.get("skills", [])) == 0:
            # NO RESUME / INCOMPLETE STATE
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
                "eligibility_reasons": ["Upload your resume to analyze your skills and discover your skill gaps."],
                "missing_requirements": ["Resume Upload Required"],
                "matched_skills": [],
                "skill_gaps": opp["required_skills"],
                "matched_preferred_skills": [],
                "missing_preferred_skills": opp["preferred_skills"],
                "recommendation": "Upload your resume to discover placement opportunities you are eligible for."
            })
            continue

        # Real Skill Matching
        match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(
            student_data.get("skills", []),
            opp
        )

        is_college = opp["source_type"] == "college"
        if is_college:
            hard_eligible, hard_reasons, missing_reqs = evaluate_drive_eligibility(student_data, opp)
            if missing_req:
                missing_reqs = missing_reqs + [f"Missing required skills: {', '.join(missing_req)}"]
            
            eligible = hard_eligible and (match_score >= 40 or len(matched_req) > 0)
            reasons = hard_reasons.copy()
            if not hard_eligible:
                reasons = hard_reasons
            elif missing_req and not eligible:
                reasons.append(f"Missing mandatory technical skills: {', '.join(missing_req)}")
        else:
            eligible = match_score >= 40 or (len(matched_req) > 0 and len(missing_req) <= 2)
            reasons = [] if eligible else [f"Missing required skills: {', '.join(missing_req)}"]
            missing_reqs = missing_req

        rec_text = (
            f"Strong profile match ({match_score}%). Matched skills: {', '.join(matched_req[:3])}."
            if matched_req else f"Opportunity match score: {match_score}%."
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

    # Default Ranking:
    # 1. Eligible + Highest match
    # 2. Eligible + Lower match
    # 3. Not Eligible + Highest match
    # 4. Not Eligible + Lower match
    ranked.sort(
        key=lambda x: (
            1 if (x["source_type"] == "college" and x["eligible"]) else (0.8 if x["eligible"] else 0),
            x["match_score"]
        ),
        reverse=True
    )
    return ranked

async def get_opportunity_skill_gap_analysis(opportunity_id: str, student_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes detailed company-specific skill gap and roadmap for the authenticated student.
    """
    db = db_manager.db

    # 1. Fetch student data
    student = None
    latest_resume = None
    if db is not None and student_id:
        student = await db.students.find_one({"id": student_id}, {"_id": 0})
        latest_resume = await db.resumes.find_one({"student_id": student_id}, {"_id": 0})

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

    # 2. Find opportunity from deduplicated list
    college_jobs = await get_college_placement_drives()
    external_jobs = await get_all_external_jobs()
    all_jobs = deduplicate_opportunities(college_jobs + external_jobs)

    target_job = next((j for j in all_jobs if j["id"] == opportunity_id), None)
    if not target_job:
        target_job = next((j for j in all_jobs if opportunity_id in j["id"] or j["id"] in opportunity_id), None)

    if not target_job:
        return {"error": "Opportunity not found", "drive_id": opportunity_id}

    req_skills = target_job.get("required_skills", [])
    pref_skills = target_job.get("preferred_skills", [])

    match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(student_skills, target_job)

    # Check non-skill criteria
    is_college = target_job["source_type"] == "college"
    if is_college:
        hard_eligible, hard_reasons, missing_reqs = evaluate_drive_eligibility(student_data, target_job)
        eligible = hard_eligible and (match_score >= 40 or len(matched_req) > 0)
        reasons = hard_reasons
    else:
        eligible = match_score >= 40 or len(matched_req) > 0
        reasons = [] if eligible else [f"Missing required skills: {', '.join(missing_req)}"]
        missing_reqs = missing_req

    # Generate Actionable Learning Steps
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
        "eligibility_reasons": reasons,
        "roadmap_steps": roadmap,
        "application_url": target_job.get("application_url"),
        "source_url": target_job.get("source_url")
    }
