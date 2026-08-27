from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.db.mongodb import db_manager
from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.skill_matching_engine import calculate_skill_match

router = APIRouter(prefix="/api/matching", tags=["AI Candidate Matching"])

@router.get("/drive/{drive_id}")
async def get_candidate_matches(drive_id: str):
    """
    Generate candidate matching scores and eligibility breakdown for a specific drive
    using canonical skill_matching_engine and eligibility_engine.
    Returns 404 if the requested drive_id does not exist.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Placement drive '{drive_id}' not found.")

    students = await db.students.find({}, {"_id": 0}).to_list(length=200)
    required_skills = drive.get("requiredSkills") or drive.get("required_skills") or []
    preferred_skills = drive.get("preferredSkills") or drive.get("preferred_skills") or []

    matches = []
    for s in students:
        s_skills = s.get("skills", [])
        
        # 1. Canonical Skill Matching Engine calculation
        match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(s_skills, drive)
        
        # 2. Canonical Eligibility Engine evaluation
        is_eligible, eligibility_reasons, missing_requirements = evaluate_drive_eligibility(s, drive)

        matches.append({
            "studentId": s["id"],
            "studentName": s.get("name", "Student"),
            "studentAvatar": s.get("avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "branch": s.get("branch", "N/A"),
            "cgpa": s.get("cgpa", 0.0),
            "driveId": drive["id"],
            "companyName": drive.get("companyName", "Company"),
            "roleTitle": drive.get("roleTitle", "Software Engineer"),
            "matchScore": match_score,
            "skillMatchPercent": match_score,
            "matchedSkills": matched_req,
            "missingSkills": missing_req,
            "matchedPreferredSkills": matched_pref,
            "missingPreferredSkills": missing_pref,
            "eligible": is_eligible,
            "eligibilityReasons": eligibility_reasons,
            "missingRequirements": missing_requirements,
            "relevantProjects": s.get("projects", []),
            "status": "eligible" if is_eligible else "ineligible",
            "aiRecommendation": (
                f"Candidate has {match_score}% skill alignment for {drive.get('companyName')} ({len(matched_req)}/{len(required_skills)} required skills matched)."
                if is_eligible
                else f"INELIGIBLE FOR SHORTLIST ({'; '.join(eligibility_reasons)}). Skill alignment: {match_score}%."
            ),

            "whyDetails": {
                "eligibilitySatisfied": is_eligible,
                "eligibilityReasons": eligibility_reasons,
                "skillMatchCount": f"{len(matched_req)} / {len(required_skills)} required skills",
                "preferredMatchCount": f"{len(matched_pref)} / {len(preferred_skills)} preferred skills",
                "projectRelevanceCount": len(s.get("projects", [])),
                "strengths": matched_req + matched_pref,
                "gaps": missing_req + missing_requirements,
            }
        })

    matches.sort(key=lambda x: x["matchScore"], reverse=True)
    return matches

