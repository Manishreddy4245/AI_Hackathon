from typing import Dict, Any, List, Tuple, Optional

BRANCH_SYNONYMS: Dict[str, List[str]] = {
    "CSE": ["CSE", "CS", "COMPUTER SCIENCE", "COMPUTER SCIENCE & ENGINEERING", "COMPUTER SCIENCE AND ENGINEERING", "COMPUTER ENGINEERING"],
    "IT": ["IT", "INFORMATION TECHNOLOGY", "INFO TECH", "INFORMATION SCIENCE", "ISE", "INFORMATION SCIENCE AND ENGINEERING", "INFORMATION SCIENCE & ENGINEERING"],
    "ECE": ["ECE", "ELECTRONICS", "ELECTRONICS & COMMUNICATION", "ELECTRONICS AND COMMUNICATION", "ELECTRONICS & COMMUNICATION ENGINEERING", "ELECTRONICS AND COMMUNICATION ENGINEERING", "ETC"],
    "EE": ["EE", "EEE", "ELECTRICAL", "ELECTRICAL ENGINEERING", "ELECTRICAL AND ELECTRONICS", "ELECTRICAL & ELECTRONICS ENGINEERING", "TECHNICAL / ELECTRICAL ENGINEERING"],
    "ME": ["ME", "MECH", "MECHANICAL", "MECHANICAL ENGINEERING"],
    "CE": ["CE", "CIVIL", "CIVIL ENGINEERING"],
    "AIML": ["AI", "AIML", "ARTIFICIAL INTELLIGENCE", "AI & ML", "AI/ML", "ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING", "AI AND DATA SCIENCE"],
    "DATA_SCIENCE": ["DS", "DATA SCIENCE", "DATA SCIENCE AND ENGINEERING"],
}

def get_canonical_branch(branch_str: str) -> str:
    """Resolve a raw branch string into its canonical code without unsafe substring matching."""
    if not branch_str:
        return ""
    clean = str(branch_str).upper().strip()
    for code, synonyms in BRANCH_SYNONYMS.items():
        for syn in synonyms:
            if clean == syn:
                return code
    if "COMPUTER SCIENCE" in clean or "COMPUTER ENG" in clean:
        return "CSE"
    if "INFORMATION TECH" in clean or "INFORMATION SCI" in clean:
        return "IT"
    if "ELECTRONICS" in clean and "COMMUNICATION" in clean:
        return "ECE"
    if "ELECTRICAL" in clean:
        return "EE"
    if "MECHANICAL" in clean:
        return "ME"
    if "CIVIL" in clean:
        return "CE"
    return clean

def is_branch_eligible(student_branch: str, eligible_branches: List[str]) -> bool:
    """
    Checks whether student's branch matches any of the eligible drive branches.
    Uses canonical token comparison to avoid false substring matches.
    """
    if not eligible_branches:
        return True
    if not student_branch:
        return False

    student_canon = get_canonical_branch(student_branch)
    drive_canons = {get_canonical_branch(b) for b in eligible_branches if b}
    
    if student_canon in drive_canons:
        return True

    clean_student = str(student_branch).upper().strip()
    clean_drive = {str(b).upper().strip() for b in eligible_branches if b}
    return clean_student in clean_drive

def evaluate_drive_eligibility(student_data: Dict[str, Any], drive_data: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    """
    Evaluates hard placement drive eligibility deterministically based on CGPA, Branch, and Graduation Year.
    
    Returns:
        (eligible: bool, reasons: List[str], missing_requirements: List[str])
    """
    reasons: List[str] = []
    missing_requirements: List[str] = []

    # 1. CGPA Check
    raw_student_cgpa = student_data.get("cgpa")
    try:
        student_cgpa = float(raw_student_cgpa) if raw_student_cgpa is not None else None
    except (ValueError, TypeError):
        student_cgpa = None

    raw_min_cgpa = drive_data.get("minCgpa") or drive_data.get("min_cgpa") or drive_data.get("minimum_cgpa") or 0.0
    try:
        min_cgpa = float(raw_min_cgpa) if raw_min_cgpa is not None else 0.0
    except (ValueError, TypeError):
        min_cgpa = 0.0

    if min_cgpa > 0:
        if student_cgpa is None:
            reasons.append(f"Drive requires minimum CGPA of {min_cgpa}, but your CGPA is not specified.")
            missing_requirements.append(f"Minimum CGPA >= {min_cgpa}")
        elif student_cgpa < min_cgpa:
            reasons.append(f"Minimum CGPA requirement is {min_cgpa} (Your CGPA: {student_cgpa}).")
            missing_requirements.append(f"Minimum CGPA >= {min_cgpa}")

    # 2. Eligible Branches Check
    student_branch = (student_data.get("branch") or "").strip()
    raw_branches = drive_data.get("eligibleBranches") or drive_data.get("eligible_branches") or []
    if isinstance(raw_branches, str):
        eligible_branches = [b.strip() for b in raw_branches.split(",") if b.strip()]
    elif isinstance(raw_branches, (list, tuple, set)):
        eligible_branches = [str(b).strip() for b in raw_branches if str(b).strip()]
    else:
        eligible_branches = []
    
    if eligible_branches:
        if not student_branch:
            branch_list_str = ", ".join(eligible_branches)
            reasons.append(f"Drive requires branch in {branch_list_str}, but your branch is not specified.")
            missing_requirements.append(f"Branch in [{branch_list_str}]")
        elif not is_branch_eligible(student_branch, eligible_branches):
            branch_list_str = ", ".join(eligible_branches)
            reasons.append(f"Eligible branches are {branch_list_str} (Your Branch: {student_branch}).")
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

