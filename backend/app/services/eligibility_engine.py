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
    student_grad_year = (
        student_data.get("graduationYear")
        if student_data.get("graduationYear") is not None
        else student_data.get("graduation_year")
        if student_data.get("graduation_year") is not None
        else student_data.get("batch")
    )
    try:
        if student_grad_year is not None:
            student_grad_year = int(student_grad_year)
    except (ValueError, TypeError):
        student_grad_year = None

    raw_drive_years = (
        drive_data.get("graduationYears")
        if drive_data.get("graduationYears") is not None
        else drive_data.get("eligible_graduation_years")
        if drive_data.get("eligible_graduation_years") is not None
        else drive_data.get("graduation_years")
        if drive_data.get("graduation_years") is not None
        else drive_data.get("graduationYear")
        if drive_data.get("graduationYear") is not None
        else drive_data.get("graduation_year")
    )

    drive_grad_years: List[int] = []
    if raw_drive_years is not None:
        if isinstance(raw_drive_years, (list, tuple, set)):
            for y in raw_drive_years:
                try:
                    drive_grad_years.append(int(y))
                except (ValueError, TypeError):
                    pass
        else:
            try:
                drive_grad_years.append(int(raw_drive_years))
            except (ValueError, TypeError):
                pass

    if drive_grad_years and student_grad_year is not None:
        if student_grad_year not in drive_grad_years:
            if len(drive_grad_years) == 1:
                years_str = str(drive_grad_years[0])
            else:
                years_str = ", ".join(str(y) for y in sorted(drive_grad_years))
            reasons.append(f"Graduation year {student_grad_year} is not eligible for this drive. Eligible graduation year(s): {years_str}.")
            missing_requirements.append(f"Graduation Year in [{years_str}]")


    # 4. Active Backlogs Check
    student_backlogs = (
        student_data.get("activeBacklogs")
        if student_data.get("activeBacklogs") is not None
        else student_data.get("backlogs")
        if student_data.get("backlogs") is not None
        else student_data.get("backlogsCount")
        if student_data.get("backlogsCount") is not None
        else student_data.get("active_backlogs")
    )
    
    max_backlogs = (
        drive_data.get("maxBacklogs")
        if drive_data.get("maxBacklogs") is not None
        else drive_data.get("max_backlogs")
        if drive_data.get("max_backlogs") is not None
        else drive_data.get("allowedBacklogs")
    )

    if max_backlogs is not None:
        try:
            max_backlogs = int(max_backlogs)
        except (ValueError, TypeError):
            max_backlogs = None

    if max_backlogs is not None and student_backlogs is not None:
        try:
            student_backlogs = int(student_backlogs)
            if student_backlogs > max_backlogs:
                reasons.append(f"Maximum allowed backlogs is {max_backlogs} (Your Active Backlogs: {student_backlogs}).")
                missing_requirements.append(f"Active Backlogs <= {max_backlogs}")
        except (ValueError, TypeError):
            pass

    is_eligible = len(reasons) == 0
    return is_eligible, reasons, missing_requirements

