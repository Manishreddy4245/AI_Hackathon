from typing import List, Dict, Any

def categorize_gap_importance(missing_required: List[str], missing_preferred: List[str], target_skill: str) -> str:
    """
    Categorize gap importance:
    - Critical: Missing mandatory required skill when only 1 required skill is missing, or key core skill
    - Important: Missing multiple required skills
    - Optional: Missing preferred skill
    """
    if target_skill in missing_required:
        if len(missing_required) == 1:
            return "Critical"
        return "Important"
    elif target_skill in missing_preferred:
        return "Optional"
    return "Important"

def generate_recommendation_text(eligible: bool, eligibility_reasons: List[str], match_score: int, missing_required: List[str], missing_preferred: List[str]) -> str:
    """Generate clear, human-readable recommendation string."""
    if not eligible:
        reason_str = eligibility_reasons[0] if eligibility_reasons else "Not eligible due to drive criteria."
        return f"Not Eligible: {reason_str}"
    
    if match_score >= 85:
        if not missing_required:
            return "Strong match. High probability of clearing technical shortlisting. Consider applying immediately."
        return f"Strong match. Consider applying. Focus on reviewing {missing_required[0]}."
    elif match_score >= 70:
        gap_skills = missing_required + missing_preferred
        gap_str = f"Improve {gap_skills[0]} to strengthen your profile." if gap_skills else "Review core topics before applying."
        return f"Good match. {gap_str}"
    elif match_score >= 50:
        gap_skills = missing_required + missing_preferred
        gap_str = f"Improving {', '.join(gap_skills[:2])} will boost your eligibility." if gap_skills else "Enhance key technical skills."
        return f"Partial match. {gap_str}"
    else:
        return "Low match. Substantial skill gap identified relative to drive requirements."

def aggregate_skill_gaps_across_drives(student_skills: List[str], drives: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregates skill gaps across active placement drives to return in-demand skills missing in student profile.
    Sorts by demand count (descending) and importance.
    """
    student_skill_set = {s.lower().strip() for s in student_skills}
    gap_counts: Dict[str, Dict[str, Any]] = {}

    for drive in drives:
        req_skills = drive.get("requiredSkills") or drive.get("required_skills") or []
        pref_skills = drive.get("preferredSkills") or drive.get("preferred_skills") or []

        for skill in req_skills:
            norm = skill.strip()
            if norm.lower() not in student_skill_set:
                if norm not in gap_counts:
                    gap_counts[norm] = {"skill": norm, "demand": 0, "type": "required", "category": "Technical"}
                gap_counts[norm]["demand"] += 1

        for skill in pref_skills:
            norm = skill.strip()
            if norm.lower() not in student_skill_set:
                if norm not in gap_counts:
                    gap_counts[norm] = {"skill": norm, "demand": 0, "type": "preferred", "category": "Technical"}
                gap_counts[norm]["demand"] += 1

    result = []
    for skill_name, data in gap_counts.items():
        importance = "Critical" if data["type"] == "required" and data["demand"] >= 2 else ("Important" if data["type"] == "required" else "Optional")
        result.append({
            "skill": skill_name,
            "category": data["category"],
            "demand": data["demand"],
            "student_status": "missing",
            "importance": importance
        })

    # Sort by demand descending, then importance (Critical > Important > Optional)
    importance_order = {"Critical": 0, "Important": 1, "Optional": 2}
    result.sort(key=lambda x: (-x["demand"], importance_order.get(x["importance"], 3)))

    return result
