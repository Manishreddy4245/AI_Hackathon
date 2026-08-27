"""
Canonical Recruitment Pipeline Engine for PlaceMind.
Derives exact drive-specific candidate recruitment stage, status labels, transition permissions,
and next-action prompts for Placement Officers.
"""
from typing import Dict, Any, Optional
from app.services.eligibility_engine import evaluate_drive_eligibility

def derive_recruitment_pipeline_stage(
    student_data: Dict[str, Any],
    drive_data: Dict[str, Any],
    app_data: Optional[Dict[str, Any]] = None,
    interview_data: Optional[Dict[str, Any]] = None,
    assessment_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Authoritative calculation of a student's drive-specific recruitment stage.
    Single source of truth for drive recruitment stage progression.
    """
    app = app_data or {}
    intv = interview_data or app.get("interview")
    asm = assessment_data or app.get("assessment")

    # 1. Hard Eligibility Check
    is_eligible, eligibility_reasons, missing_reqs = evaluate_drive_eligibility(student_data, drive_data)
    if not is_eligible:
        return {
            "stage": "INELIGIBLE",
            "stageLabel": "Ineligible",
            "stageGroup": "ineligible",
            "isEligible": False,
            "eligibilityReasons": eligibility_reasons,
            "missingRequirements": missing_reqs,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canScheduleInterview": False,
            "nextAction": "None",
            "statusColor": "#EF4444"
        }

    raw_status = (app.get("status") or "APPLIED").upper() if isinstance(app.get("status"), str) else "APPLIED"
    apt_status = (app.get("aptitude_status") or (asm.get("status") if (asm and isinstance(asm, dict)) else "") or "").upper() if isinstance(app.get("aptitude_status") or (asm.get("status") if (asm and isinstance(asm, dict)) else ""), str) else ""
    tech_status = (app.get("technical_status") or "").upper()
    int_status = (intv.get("status") if (intv and isinstance(intv, dict) and isinstance(intv.get("status"), str)) else "") or ""
    int_status = int_status.upper()


    hr_status = (app.get("hr_status") or "").upper()

    # 2. Derive Stage based on explicit progression records
    if raw_status in ["SELECTED", "PLACED"]:
        return {
            "stage": "SELECTED",
            "stageLabel": "Selected / Placed",
            "stageGroup": "selected",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": False,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "Completed",
            "statusColor": "#22C55E"
        }

    if raw_status in ["REJECTED", "NOT_SHORTLISTED", "APTITUDE_FAILED", "REJECTED_AT_APTITUDE", "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED", "REJECTED_AT_HR", "INTERVIEW_FAILED"] or apt_status == "FAILED" or tech_status == "FAILED" or hr_status == "FAILED":
        is_apt_fail = raw_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED"] or apt_status == "FAILED"
        is_tech_fail = raw_status in ["REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED"] or tech_status == "FAILED"
        is_hr_fail = raw_status in ["REJECTED_AT_HR", "INTERVIEW_FAILED"] or hr_status == "FAILED"
        rej_stage = "REJECTED_AT_APTITUDE" if is_apt_fail else ("REJECTED_AT_TECHNICAL" if is_tech_fail else ("REJECTED_AT_HR" if is_hr_fail else "REJECTED"))
        rej_label = "Rejected at Aptitude" if is_apt_fail else ("Rejected at Technical" if is_tech_fail else ("Rejected at HR / Interview" if is_hr_fail else "Rejected / Not Qualified"))
        return {
            "stage": rej_stage,
            "stageLabel": rej_label,
            "stageGroup": "rejected",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": False,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "None",
            "statusColor": "#64748B"
        }

    if int_status in ["COMPLETED", "INTERVIEWED"] or raw_status in ["INTERVIEW_COMPLETED", "INTERVIEWED"]:
        return {
            "stage": "INTERVIEW_COMPLETED",
            "stageLabel": "Interview Completed",
            "stageGroup": "interview",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": False,
            "canCompleteInterview": False,
            "canMakeFinalDecision": True,
            "nextAction": "Final Decision",
            "statusColor": "#3B82F6"
        }

    if int_status in ["SCHEDULED", "CONFIRMED"] or raw_status == "INTERVIEW_SCHEDULED":
        return {
            "stage": "INTERVIEW_SCHEDULED",
            "stageLabel": "Interview Scheduled",
            "stageGroup": "interview",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": True,
            "canCompleteInterview": True,
            "canMakeFinalDecision": False,
            "nextAction": "Complete Interview",
            "statusColor": "#8B5CF6"
        }

    if raw_status in ["HR_INTERVIEW_ALLOCATED", "HR_ALLOCATED"] or hr_status in ["ALLOCATED", "ASSIGNED"]:
        return {
            "stage": "HR_INTERVIEW_ALLOCATED",
            "stageLabel": "HR / Interview Allocated",
            "stageGroup": "interview",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": True,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "Schedule Interview",
            "statusColor": "#06B6D4"
        }

    if raw_status in ["INTERVIEW_PENDING", "HR_INTERVIEW_PENDING", "TECHNICAL_QUALIFIED"] or tech_status == "QUALIFIED":
        return {
            "stage": "TECHNICAL_QUALIFIED",
            "stageLabel": "Technical Qualified (HR / Interview Pending)",
            "stageGroup": "technical",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": True,
            "canScheduleInterview": True,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "Allocate HR / Interview",
            "statusColor": "#10B981"
        }

    if raw_status in ["TECHNICAL_ALLOCATED", "TECHNICAL_IN_PROGRESS"] or (app.get("technical_status") or "").upper() in ["ALLOCATED", "IN_PROGRESS"]:
        return {
            "stage": "TECHNICAL_ALLOCATED",
            "stageLabel": "Technical Round Allocated",
            "stageGroup": "technical",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": False,
            "canAllocateHR": False,
            "canScheduleInterview": False,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "Technical Pending",
            "statusColor": "#6366F1"
        }

    if raw_status in ["APTITUDE_QUALIFIED", "TECHNICAL_ROUND_PENDING", "INTERVIEW_READY"] or apt_status in ["QUALIFIED", "PASSED"]:
        return {
            "stage": "APTITUDE_QUALIFIED",
            "stageLabel": "Aptitude Qualified (Technical Round Pending)",
            "stageGroup": "aptitude",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canAllocateTechnical": True,
            "canAllocateHR": False,
            "canScheduleInterview": True,
            "canCompleteInterview": False,
            "canMakeFinalDecision": False,
            "nextAction": "Schedule Interview",
            "statusColor": "#10B981"
        }





    if raw_status == "APTITUDE_ATTEMPTED" or apt_status == "COMPLETED":
        return {
            "stage": "APTITUDE_ATTEMPTED",
            "stageLabel": "Aptitude Attempted (Pending Evaluation)",
            "stageGroup": "aptitude",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canScheduleInterview": False,
            "nextAction": "Evaluate Aptitude Result",
            "statusColor": "#F59E0B"
        }

    if raw_status in ["APTITUDE_ALLOCATED", "APTITUDE_ASSIGNED"] or apt_status in ["ALLOCATED", "ASSIGNED"]:
        return {
            "stage": "APTITUDE_ALLOCATED",
            "stageLabel": "Aptitude Round Allocated",
            "stageGroup": "aptitude",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": False,
            "canScheduleInterview": False,
            "nextAction": "Aptitude Pending",
            "statusColor": "#06B6D4"
        }


    if raw_status == "SHORTLISTED":
        return {
            "stage": "SHORTLISTED",
            "stageLabel": "Shortlisted (Aptitude Pending)",
            "stageGroup": "shortlisted",
            "isEligible": True,
            "canShortlist": False,
            "canAllocateAptitude": True,
            "canScheduleInterview": False,
            "nextAction": "Allocate Aptitude",
            "statusColor": "#EAB308"
        }

    # Default: APPLIED
    return {
        "stage": "APPLIED",
        "stageLabel": "Applied (Pending Review)",
        "stageGroup": "applied",
        "isEligible": True,
        "canShortlist": True,
        "canAllocateAptitude": False,
        "canScheduleInterview": False,
        "nextAction": "Shortlist Candidate",
        "statusColor": "#3B82F6"
    }
