from typing import Dict, Any, List, Tuple

def evaluate_drive_eligibility(student_data: Dict[str, Any], drive_data: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    """
    Evaluates hard placement drive eligibility deterministically based on CGPA, Branch, and Graduation Year.
    
    Returns:
        (eligible: bool, reasons: List[str], missing_requirements: List[str])
    """
    reasons: List[str] = []
    missing_requirements: List[str] = []

    # 1. CGPA Check
    student_cgpa = student_data.get("cgpa")
    min_cgpa = drive_data.get("minCgpa") or drive_data.get("minimum_cgpa") or 0.0

    if min_cgpa > 0:
        if student_cgpa is None:
            reasons.append(f"Drive requires minimum CGPA of {min_cgpa}, but your CGPA is not specified.")
            missing_requirements.append(f"Minimum CGPA >= {min_cgpa}")
        elif student_cgpa < min_cgpa:
            reasons.append(f"Minimum CGPA requirement is {min_cgpa} (Your CGPA: {student_cgpa}).")
            missing_requirements.append(f"Minimum CGPA >= {min_cgpa}")

    # 2. Eligible Branches Check
    student_branch = (student_data.get("branch") or "").upper().strip()
    eligible_branches = drive_data.get("eligibleBranches") or drive_data.get("eligible_branches") or []
    
    if eligible_branches:
        normalized_drive_branches = [b.upper().strip() for b in eligible_branches]
        if student_branch and student_branch not in normalized_drive_branches:
            branch_list_str = ", ".join(normalized_drive_branches)
            reasons.append(f"Eligible branches are {branch_list_str} (Your Branch: {student_branch}).")
            missing_requirements.append(f"Branch in [{branch_list_str}]")
        elif not student_branch:
            branch_list_str = ", ".join(normalized_drive_branches)
            reasons.append(f"Drive requires branch in {branch_list_str}, but your branch is not specified.")
            missing_requirements.append(f"Branch in [{branch_list_str}]")

    # 3. Graduation Year Check
    student_grad_year = student_data.get("graduationYear") or student_data.get("graduation_year") or student_data.get("batch")
    try:
        if isinstance(student_grad_year, str):
            student_grad_year = int(student_grad_year)
    except (ValueError, TypeError):
        student_grad_year = None

    drive_grad_year = drive_data.get("graduationYear") or drive_data.get("graduation_year")

    if drive_grad_year and student_grad_year:
        if student_grad_year != drive_grad_year:
            reasons.append(f"Eligible graduation year is {drive_grad_year} (Your Graduation Year: {student_grad_year}).")
            missing_requirements.append(f"Graduation Year == {drive_grad_year}")

    is_eligible = len(reasons) == 0
    return is_eligible, reasons, missing_requirements
