from typing import List, Dict, Any, Tuple

# Common skill alias mapping for flexible matching
SKILL_ALIASES = {
    "rest api": "rest apis",
    "restful api": "rest apis",
    "fast api": "fastapi",
    "powerbi": "power bi",
    "postgres": "postgresql",
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "aws": "cloud",
}

def normalize_skill(skill: str) -> str:
    """Normalize skill string for case-insensitive matching."""
    s = skill.lower().strip()
    return SKILL_ALIASES.get(s, s)

def calculate_skill_match(student_skills: List[str], drive_data: Dict[str, Any]) -> Tuple[int, List[str], List[str], List[str], List[str]]:
    """
    Calculates transparent skill match percentage and breakdown against drive requirements.
    
    Required skills carry 75% weight, Preferred skills carry 25% weight.
    
    Returns:
        (match_score: int, matched_required: List[str], missing_required: List[str], matched_preferred: List[str], missing_preferred: List[str])
    """
    required_skills = drive_data.get("requiredSkills") or drive_data.get("required_skills") or []
    preferred_skills = drive_data.get("preferredSkills") or drive_data.get("preferred_skills") or []

    normalized_student_set = {normalize_skill(s) for s in student_skills}

    matched_required = []
    missing_required = []

    for req_sk in required_skills:
        norm_req = normalize_skill(req_sk)
        # Check direct or substring/alias match
        if any(norm_req == st or norm_req in st or st in norm_req for st in normalized_student_set):
            matched_required.append(req_sk)
        else:
            missing_required.append(req_sk)

    matched_preferred = []
    missing_preferred = []

    for pref_sk in preferred_skills:
        norm_pref = normalize_skill(pref_sk)
        if any(norm_pref == st or norm_pref in st or st in norm_pref for st in normalized_student_set):
            matched_preferred.append(pref_sk)
        else:
            missing_preferred.append(pref_sk)

    req_coverage = len(matched_required) / len(required_skills) if required_skills else 1.0
    pref_coverage = len(matched_preferred) / len(preferred_skills) if preferred_skills else 1.0

    if preferred_skills and required_skills:
        final_score = (req_coverage * 0.75) + (pref_coverage * 0.25)
    elif required_skills:
        final_score = req_coverage
    elif preferred_skills:
        final_score = pref_coverage
    else:
        final_score = 1.0

    match_percentage = min(100, max(0, int(round(final_score * 100))))

    return match_percentage, matched_required, missing_required, matched_preferred, missing_preferred
