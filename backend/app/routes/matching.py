from typing import List
from fastapi import APIRouter, HTTPException
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/matching", tags=["AI Candidate Matching"])

@router.get("/drive/{drive_id}")
async def get_candidate_matches(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    if not drive:
        drive = await db.drives.find_one({}, {"_id": 0})

    students = await db.students.find({}, {"_id": 0}).to_list(length=100)
    required_skills = drive.get("requiredSkills", ["Python", "SQL"]) if drive else ["Python", "SQL"]
    min_cgpa = drive.get("minCgpa", 7.5) if drive else 7.5

    matches = []
    for s in students:
        s_skills = [sk.lower() for sk in s.get("skills", [])]
        matched = [sk for sk in required_skills if sk.lower() in s_skills]
        missing = [sk for sk in required_skills if sk.lower() not in s_skills]
        skill_percent = int((len(matched) / len(required_skills)) * 100) if required_skills else 100
        overall_score = min(98, max(60, int(skill_percent * 0.7 + (s.get("cgpa", 8.0) / 10.0) * 30)))

        is_eligible = s.get("cgpa", 0) >= min_cgpa and len(missing) == 0

        matches.append({
            "studentId": s["id"],
            "studentName": s["name"],
            "studentAvatar": s["avatar"],
            "branch": s["branch"],
            "cgpa": s["cgpa"],
            "driveId": drive["id"] if drive else drive_id,
            "companyName": drive["companyName"] if drive else "TechNova",
            "roleTitle": drive["roleTitle"] if drive else "Backend Developer",
            "matchScore": overall_score,
            "skillMatchPercent": skill_percent,
            "matchedSkills": matched,
            "missingSkills": missing,
            "relevantProjects": s.get("projects", []),
            "status": "eligible" if is_eligible else "registered",
            "aiRecommendation": f"Strong candidate with {skill_percent}% skill match alignment for {drive.get('companyName', 'recruiter') if drive else 'recruiter'}.",
            "whyDetails": {
                "eligibilitySatisfied": is_eligible,
                "skillMatchCount": f"{len(matched)} / {len(required_skills)} required skills",
                "projectRelevanceCount": len(s.get("projects", [])),
                "strengths": matched,
                "gaps": missing,
            }
        })

    matches.sort(key=lambda x: x["matchScore"], reverse=True)
    return matches
