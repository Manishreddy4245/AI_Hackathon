import sys
import os
import pytest

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.eligibility_engine import evaluate_drive_eligibility
from app.services.skill_matching_engine import calculate_skill_match
from app.services.skill_gap_engine import categorize_gap_importance, aggregate_skill_gaps_across_drives, generate_recommendation_text


def test_hard_eligibility_engine_eligible():
    student = {"cgpa": 8.9, "branch": "CSE", "graduationYear": 2027}
    drive = {"minCgpa": 7.5, "eligibleBranches": ["CSE", "IT"], "graduationYear": 2027}

    eligible, reasons, missing = evaluate_drive_eligibility(student, drive)
    assert eligible is True
    assert len(reasons) == 0
    assert len(missing) == 0


def test_hard_eligibility_engine_ineligible_cgpa():
    student = {"cgpa": 6.8, "branch": "CSE", "graduationYear": 2027}
    drive = {"minCgpa": 7.5, "eligibleBranches": ["CSE", "IT"], "graduationYear": 2027}

    eligible, reasons, missing = evaluate_drive_eligibility(student, drive)
    assert eligible is False
    assert any("Minimum CGPA requirement is 7.5" in r for r in reasons)


def test_hard_eligibility_engine_ineligible_branch():
    student = {"cgpa": 8.5, "branch": "MECH", "graduationYear": 2027}
    drive = {"minCgpa": 7.5, "eligibleBranches": ["CSE", "IT"], "graduationYear": 2027}

    eligible, reasons, missing = evaluate_drive_eligibility(student, drive)
    assert eligible is False
    assert any("Eligible branches are CSE, IT" in r for r in reasons)


def test_skill_matching_engine_full_match():
    student_skills = ["Python", "SQL", "REST APIs", "FastAPI", "Docker", "Git"]
    drive = {
        "requiredSkills": ["Python", "SQL", "REST APIs"],
        "preferredSkills": ["FastAPI", "Docker"]
    }

    match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(student_skills, drive)
    assert match_score == 100
    assert len(matched_req) == 3
    assert len(missing_req) == 0
    assert len(matched_pref) == 2
    assert len(missing_pref) == 0


def test_skill_matching_engine_partial_match():
    student_skills = ["Python", "SQL", "REST APIs"]
    drive = {
        "requiredSkills": ["Python", "SQL", "REST APIs", "Docker"],
        "preferredSkills": ["FastAPI", "Kubernetes"]
    }

    match_score, matched_req, missing_req, matched_pref, missing_pref = calculate_skill_match(student_skills, drive)
    # 3/4 required = 0.75 * 0.75 = 0.5625
    # 0/2 preferred = 0 * 0.25 = 0
    # Final = ~56%
    assert match_score == 56
    assert "Docker" in missing_req
    assert "Kubernetes" in missing_pref


def test_skill_gap_engine_categorization():
    importance_critical = categorize_gap_importance(["Docker"], [], "Docker")
    assert importance_critical == "Critical"

    importance_optional = categorize_gap_importance([], ["Kubernetes"], "Kubernetes")
    assert importance_optional == "Optional"


def test_skill_gap_aggregation():
    student_skills = ["Python", "SQL"]
    drives = [
        {"requiredSkills": ["Python", "SQL", "Docker"], "preferredSkills": ["FastAPI"]},
        {"requiredSkills": ["Python", "Docker", "AWS"], "preferredSkills": ["Power BI"]}
    ]

    gaps = aggregate_skill_gaps_across_drives(student_skills, drives)
    assert len(gaps) >= 2
    
    # Docker is missing in 2 drives
    docker_gap = next((g for g in gaps if g["skill"] == "Docker"), None)
    assert docker_gap is not None
    assert docker_gap["demand"] == 2
    assert docker_gap["importance"] == "Critical"
