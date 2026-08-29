import io
import csv
from datetime import datetime, timedelta, date
from collections import Counter
from typing import Dict, Any, List, Optional, Set
from app.services.eligibility_engine import evaluate_drive_eligibility


# Canonical status groups
SHORTLISTED_STATUSES = {"SHORTLISTED", "shortlisted", "Shortlisted"}
ASSESSMENT_PARTICIPANT_STATUSES = {
    "IN_ASSESSMENT", "ASSESSMENT_STARTED", "ASSESSMENT_CLEARED", "ASSESSMENT_FAILED",
    "TECHNICAL_STARTED", "TECHNICAL_CLEARED", "TECHNICAL_FAILED",
    "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "FINAL_ROUND", "HR_CLEARED",
    "SELECTED", "OFFERED", "OFFER_ACCEPTED", "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
ASSESSMENT_QUALIFIED_STATUSES = {
    "ASSESSMENT_CLEARED", "TECHNICAL_CLEARED", "INTERVIEW_SCHEDULED",
    "INTERVIEW_COMPLETED", "FINAL_ROUND", "HR_CLEARED", "SELECTED",
    "OFFERED", "OFFER_ACCEPTED", "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
INTERVIEW_SCHEDULED_STATUSES = {
    "INTERVIEW_SCHEDULED", "INTERVIEW_ALLOCATED", "INTERVIEW_COMPLETED",
    "FINAL_ROUND", "HR_CLEARED", "SELECTED", "OFFERED", "OFFER_ACCEPTED",
    "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
INTERVIEW_COMPLETED_STATUSES = {
    "INTERVIEW_COMPLETED", "INTERVIEWED", "FINAL_ROUND", "HR_CLEARED",
    "SELECTED", "OFFERED", "OFFER_ACCEPTED", "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
SELECTED_STATUSES = {
    "SELECTED", "selected", "Selected", "OFFERED", "OFFER_ACCEPTED",
    "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "placed", "PLACEMENT_COMPLETED"
}
OFFER_ISSUED_STATUSES = {
    "OFFERED", "offered", "OFFER_ACCEPTED", "OFFER_DECLINED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
OFFER_ACCEPTED_STATUSES = {
    "OFFER_ACCEPTED", "accepted", "ACCEPTED", "JOINING_CONFIRMED", "PLACED", "PLACEMENT_COMPLETED"
}
OFFER_DECLINED_STATUSES = {
    "OFFER_DECLINED", "declined", "DECLINED", "REJECTED_OFFER"
}
PLACEMENT_COMPLETED_STATUSES = {
    "JOINING_CONFIRMED", "PLACED", "placed", "JOINED", "joined", "PLACEMENT_COMPLETED"
}


class AnalyticsService:

    @classmethod
    async def get_analytics_overview(
        cls,
        db: Any,
        user_scope: Dict[str, Any],
        branch: Optional[str] = None,
        grad_year: Optional[str] = None,
        drive_id: Optional[str] = None,
        company: Optional[str] = None,
        date_range: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates 100% database-driven placement analytics, funnel, performance metrics,
        drive breakdown, branch/batch cross-tabulation, time trends, and skill gap metrics.
        """
        now = datetime.now()
        
        # 1. Base Filters & Date Window
        date_cutoff: Optional[datetime] = None
        if date_range == "7d":
            date_cutoff = now - timedelta(days=7)
        elif date_range == "30d":
            date_cutoff = now - timedelta(days=30)
        elif date_range == "90d":
            date_cutoff = now - timedelta(days=90)
        elif date_range in ["1y", "year", "academic_year"]:
            date_cutoff = now - timedelta(days=365)
        elif start_date:
            try:
                date_cutoff = datetime.strptime(start_date[:10], "%Y-%m-%d")
            except Exception:
                pass

        end_cutoff: Optional[datetime] = None
        if end_date:
            try:
                end_cutoff = datetime.strptime(end_date[:10], "%Y-%m-%d") + timedelta(days=1)
            except Exception:
                pass

        # 2. Fetch Students matching student-level filters
        student_query: Dict[str, Any] = {}
        if branch and branch != "all":
            student_query["branch"] = {"$regex": f"^{branch}$", "$options": "i"}
        if grad_year and grad_year != "all":
            try:
                yr = int(grad_year)
                student_query["$or"] = [
                    {"graduationYear": yr},
                    {"graduationYears": yr},
                    {"batch": str(yr)}
                ]
            except Exception:
                student_query["batch"] = grad_year

        raw_students = await db.students.find(student_query, {"_id": 0}).to_list(length=2000)
        student_map = {s.get("id") or str(s.get("_id", "")): s for s in raw_students}
        filtered_student_ids = set(student_map.keys())

        # 3. Fetch Drives matching drive-level filters & Recruiter Scope
        drive_query: Dict[str, Any] = {}
        if user_scope.get("is_recruiter") and user_scope.get("user_id"):
            drive_query["$or"] = [
                {"recruiter_id": user_scope["user_id"]},
                {"createdBy": user_scope["user_id"]}
            ]
            if user_scope.get("company"):
                drive_query["$or"].append({"companyName": {"$regex": f"^{user_scope['company']}$", "$options": "i"}})
        
        if drive_id and drive_id != "all":
            drive_query["id"] = drive_id
        elif company and company != "all":
            drive_query["companyName"] = {"$regex": f"^{company}$", "$options": "i"}

        raw_drives = await db.drives.find(drive_query, {"_id": 0}).to_list(length=500)
        drive_map = {d.get("id"): d for d in raw_drives if d.get("id")}
        filtered_drive_ids = set(drive_map.keys())

        # 4. Fetch Applications matching Drive and Student IDs
        app_query: Dict[str, Any] = {}
        
        # Recruiter Scoping or Drive Filter
        if user_scope.get("is_recruiter") or (drive_id and drive_id != "all") or (company and company != "all"):
            if filtered_drive_ids:
                app_query["$or"] = [
                    {"drive_id": {"$in": list(filtered_drive_ids)}},
                    {"driveId": {"$in": list(filtered_drive_ids)}}
                ]
            else:
                # No authorized drives found for recruiter
                app_query["drive_id"] = "non-existent"

        raw_apps = await db.applications.find(app_query, {"_id": 0}).to_list(length=5000)

        # In-memory filter applications by student pool & date
        apps = []
        for a in raw_apps:
            s_id = a.get("student_id") or a.get("studentId")
            if filtered_student_ids and s_id not in filtered_student_ids:
                # If student filters are active, only include applications from matching students
                if branch and branch != "all":
                    continue
                if grad_year and grad_year != "all":
                    continue

            # Date filter check
            app_time_str = a.get("applied_at") or a.get("created_at") or a.get("timestamp")
            if app_time_str and (date_cutoff or end_cutoff):
                try:
                    app_dt = None
                    if isinstance(app_time_str, datetime):
                        app_dt = app_time_str
                    elif isinstance(app_time_str, str) and len(app_time_str) >= 10:
                        app_dt = datetime.strptime(app_time_str[:10], "%Y-%m-%d")

                    if app_dt:
                        if date_cutoff and app_dt < date_cutoff:
                            continue
                        if end_cutoff and app_dt >= end_cutoff:
                            continue
                except Exception:
                    pass

            apps.append(a)

        # 5. Fetch Interviews and Offers for filtered drives
        interview_query: Dict[str, Any] = {}
        offer_query: Dict[str, Any] = {}

        if filtered_drive_ids:
            interview_query["$or"] = [
                {"drive_id": {"$in": list(filtered_drive_ids)}},
                {"driveId": {"$in": list(filtered_drive_ids)}}
            ]
            offer_query["$or"] = [
                {"drive_id": {"$in": list(filtered_drive_ids)}},
                {"driveId": {"$in": list(filtered_drive_ids)}}
            ]

        raw_interviews = await db.interviews.find(interview_query, {"_id": 0}).to_list(length=2000)
        raw_offers = await db.offers.find(offer_query, {"_id": 0}).to_list(length=1000)

        # 6. CALCULATE PLACEMENT OVERVIEW KPIS
        is_single_drive_selected = bool(drive_id and drive_id != "all")
        target_drive = raw_drives[0] if (is_single_drive_selected and raw_drives) else None

        # Unique applicant student IDs for filtered applications
        drive_applicant_student_ids: Set[str] = {
            a.get("student_id") or a.get("studentId")
            for a in apps
            if (a.get("student_id") or a.get("studentId"))
        }
        drive_students = [
            student_map[s_id] for s_id in drive_applicant_student_ids if s_id in student_map
        ]

        total_students = len(drive_applicant_student_ids) if is_single_drive_selected else len(raw_students)
        total_drives = len(raw_drives)
        
        active_drives_count = sum(1 for d in raw_drives if (d.get("status") or "").upper() in ["ACTIVE", "APPROVED", "OPEN", "ANNOUNCED"])
        completed_drives_count = sum(1 for d in raw_drives if (d.get("status") or "").upper() in ["COMPLETED", "CLOSED"])

        # Eligible Students calculation
        eligible_students_set: Set[str] = set()
        if is_single_drive_selected and target_drive:
            for s in raw_students:
                s_id = s.get("id") or str(s.get("_id", ""))
                res = evaluate_drive_eligibility(s, target_drive)
                is_elig = False
                if isinstance(res, (tuple, list)) and len(res) > 0:
                    is_elig = bool(res[0])
                elif isinstance(res, dict):
                    is_elig = bool(res.get("eligible", False))
                elif isinstance(res, bool):
                    is_elig = res
                if is_elig:
                    eligible_students_set.add(s_id)
        else:
            active_drives = [d for d in raw_drives if (d.get("status") or "").upper() in ["ACTIVE", "APPROVED", "OPEN", "ANNOUNCED"]]
            if active_drives and raw_students:
                for s in raw_students:
                    s_id = s.get("id") or str(s.get("_id", ""))
                    for d in active_drives:
                        res = evaluate_drive_eligibility(s, d)
                        is_elig = False
                        if isinstance(res, (tuple, list)) and len(res) > 0:
                            is_elig = bool(res[0])
                        elif isinstance(res, dict):
                            is_elig = bool(res.get("eligible", False))
                        elif isinstance(res, bool):
                            is_elig = res
                        if is_elig:
                            eligible_students_set.add(s_id)
                            break

        total_applications = len(apps)
        
        # Unique applicants tracking per stage to avoid double counting
        shortlisted_cands: Set[str] = set()
        assessment_cands: Set[str] = set()
        assessment_qual_cands: Set[str] = set()
        interview_sched_cands: Set[str] = set()
        interview_comp_cands: Set[str] = set()
        selected_cands: Set[str] = set()
        offer_issued_cands: Set[str] = set()
        offer_accepted_cands: Set[str] = set()
        offer_declined_cands: Set[str] = set()
        placement_completed_cands: Set[str] = set()

        applicant_cgpas: List[float] = []
        shortlisted_cgpas: List[float] = []
        assessment_scores: List[float] = []
        technical_scores: List[float] = []
        interview_scores: List[float] = []
        package_values: List[float] = []

        for a in apps:
            s_id = a.get("student_id") or a.get("studentId") or a.get("id")
            st = (a.get("status") or "").upper()
            int_data = a.get("interview") or {}
            int_st = (int_data.get("status") or a.get("interview_status") or "").upper()

            # CGPA collection
            student_obj = student_map.get(s_id)
            cgpa = a.get("student_cgpa") or (student_obj.get("cgpa") if student_obj else None)
            if cgpa is not None:
                try:
                    applicant_cgpas.append(float(cgpa))
                except Exception:
                    pass

            # Stage checks
            if st in SHORTLISTED_STATUSES or st in ASSESSMENT_PARTICIPANT_STATUSES:
                shortlisted_cands.add(s_id)
                if cgpa is not None:
                    try:
                        shortlisted_cgpas.append(float(cgpa))
                    except Exception:
                        pass

            if st in ASSESSMENT_PARTICIPANT_STATUSES:
                assessment_cands.add(s_id)

            if st in ASSESSMENT_QUALIFIED_STATUSES:
                assessment_qual_cands.add(s_id)

            if st in INTERVIEW_SCHEDULED_STATUSES or int_st in ["SCHEDULED", "COMPLETED", "INTERVIEWED"]:
                interview_sched_cands.add(s_id)

            if st in INTERVIEW_COMPLETED_STATUSES or int_st in ["COMPLETED", "INTERVIEWED"]:
                interview_comp_cands.add(s_id)

            if st in SELECTED_STATUSES:
                selected_cands.add(s_id)

            if st in OFFER_ISSUED_STATUSES:
                offer_issued_cands.add(s_id)

            if st in OFFER_ACCEPTED_STATUSES:
                offer_accepted_cands.add(s_id)

            if st in OFFER_DECLINED_STATUSES:
                offer_declined_cands.add(s_id)

            if st in PLACEMENT_COMPLETED_STATUSES:
                placement_completed_cands.add(s_id)

            # Scores collection
            apt_s = a.get("aptitude_score") or a.get("aptitudeScore")
            if apt_s is not None:
                try:
                    assessment_scores.append(float(apt_s))
                except Exception:
                    pass

            tech_s = a.get("technical_score") or a.get("technicalScore")
            if tech_s is not None:
                try:
                    technical_scores.append(float(tech_s))
                except Exception:
                    pass

            int_s = a.get("interview_score") or a.get("interviewScore") or int_data.get("score")
            if int_s is not None:
                try:
                    interview_scores.append(float(int_s))
                except Exception:
                    pass

        # Check raw_offers for issued/accepted/declined packages and counters
        for off in raw_offers:
            off_s_id = off.get("student_id")
            off_st = (off.get("status") or "").upper()
            if off_st in ["OFFERED", "ISSUED", "ACCEPTED", "JOINING_CONFIRMED", "JOINED", "DECLINED"]:
                offer_issued_cands.add(off_s_id)
            if off_st in ["ACCEPTED", "JOINING_CONFIRMED", "JOINED"]:
                offer_accepted_cands.add(off_s_id)
            if off_st in ["DECLINED", "REJECTED"]:
                offer_declined_cands.add(off_s_id)
            if off_st in ["JOINING_CONFIRMED", "JOINED"]:
                placement_completed_cands.add(off_s_id)

            pkg = off.get("packageLpa") or off.get("package") or off.get("salaryLpa")
            if pkg is not None:
                try:
                    package_values.append(float(pkg))
                except Exception:
                    pass

        # If no offers have packageLpa yet, pull packages from drives where students got selected/placed
        if not package_values:
            for d in raw_drives:
                pkg = d.get("packageLpa") or d.get("package")
                if pkg is not None:
                    try:
                        package_values.append(float(pkg))
                    except Exception:
                        pass

        # 7. BUILD RECRUITMENT FUNNEL
        # Funnel stages: Registered -> Shortlisted -> In Assessment -> Qualified -> Interview Scheduled -> Interview Completed -> Selected -> Offer Issued -> Offer Accepted -> Placement Completed
        base_applicants_count = max(total_applications, len(apps))
        
        funnel_stages = [
            {"key": "registered", "label": "Registered Applicants", "count": total_applications, "fill": "#64748B"},
            {"key": "shortlisted", "label": "Shortlisted", "count": len(shortlisted_cands), "fill": "#3B82F6"},
            {"key": "in_assessment", "label": "In Assessment", "count": len(assessment_cands), "fill": "#0284C7"},
            {"key": "assessment_qualified", "label": "Assessment Qualified", "count": len(assessment_qual_cands), "fill": "#06B6D4"},
            {"key": "interview_scheduled", "label": "Interview Scheduled", "count": len(interview_sched_cands), "fill": "#8B5CF6"},
            {"key": "interview_completed", "label": "Interview Completed", "count": len(interview_comp_cands), "fill": "#D946EF"},
            {"key": "selected", "label": "Selected", "count": len(selected_cands), "fill": "#F59E0B"},
            {"key": "offer_issued", "label": "Offers Issued", "count": len(offer_issued_cands), "fill": "#10B981"},
            {"key": "offer_accepted", "label": "Offers Accepted", "count": len(offer_accepted_cands), "fill": "#059669"},
            {"key": "placement_completed", "label": "Joining Confirmed", "count": len(placement_completed_cands), "fill": "#22C55E"},
        ]

        # Calculate percentage of total and conversion from previous stage
        enriched_funnel = []
        prev_count = total_applications
        for idx, stg in enumerate(funnel_stages):
            cnt = stg["count"]
            pct_of_total = round((cnt / base_applicants_count * 100), 1) if base_applicants_count > 0 else 0.0
            if idx == 0:
                conv_pct = 100.0 if total_applications > 0 else 0.0
            else:
                conv_pct = round((cnt / prev_count * 100), 1) if prev_count > 0 else 0.0

            enriched_funnel.append({
                **stg,
                "percentage_of_total": pct_of_total,
                "conversion_percentage": conv_pct
            })
            prev_count = cnt if cnt > 0 else prev_count

        # 8. PERFORMANCE METRICS
        avg_cgpa_applicants = round(sum(applicant_cgpas) / len(applicant_cgpas), 2) if applicant_cgpas else None
        avg_cgpa_shortlisted = round(sum(shortlisted_cgpas) / len(shortlisted_cgpas), 2) if shortlisted_cgpas else None
        avg_assessment_score = round(sum(assessment_scores) / len(assessment_scores), 1) if assessment_scores else None
        avg_technical_score = round(sum(technical_scores) / len(technical_scores), 1) if technical_scores else None
        avg_interview_score = round(sum(interview_scores) / len(interview_scores), 1) if interview_scores else None

        selection_rate = round((len(selected_cands) / base_applicants_count * 100), 1) if base_applicants_count > 0 else None
        offer_acceptance_rate = round((len(offer_accepted_cands) / len(offer_issued_cands) * 100), 1) if len(offer_issued_cands) > 0 else None
        placement_completion_rate = round((len(placement_completed_cands) / len(selected_cands) * 100), 1) if len(selected_cands) > 0 else None

        avg_package = round(sum(package_values) / len(package_values), 2) if package_values else None
        highest_package = round(max(package_values), 2) if package_values else None
        lowest_package = round(min(package_values), 2) if package_values else None

        # 9. DRIVE-WISE ANALYTICS BREAKDOWN
        drive_breakdown_list = []
        for d in raw_drives:
            d_id = d.get("id")
            comp_name = d.get("companyName") or "Company"
            role_t = d.get("roleTitle") or "Role"
            pkg = d.get("packageLpa") or 0.0
            st = d.get("status") or "ACTIVE"
            branches = d.get("eligibleBranches") or []
            min_c = d.get("minCgpa") or 0.0

            # Match apps for this drive
            d_apps = [a for a in apps if (a.get("drive_id") == d_id or a.get("driveId") == d_id or a.get("company_name") == comp_name)]
            d_app_cands = set(a.get("student_id") or a.get("studentId") for a in d_apps)
            
            d_short = sum(1 for a in d_apps if (a.get("status") or "").upper() in SHORTLISTED_STATUSES or (a.get("status") or "").upper() in ASSESSMENT_PARTICIPANT_STATUSES)
            d_ass_part = sum(1 for a in d_apps if (a.get("status") or "").upper() in ASSESSMENT_PARTICIPANT_STATUSES)
            d_ass_qual = sum(1 for a in d_apps if (a.get("status") or "").upper() in ASSESSMENT_QUALIFIED_STATUSES)
            d_int_sched = sum(1 for a in d_apps if (a.get("status") or "").upper() in INTERVIEW_SCHEDULED_STATUSES or ((a.get("interview") or {}).get("status") or "").upper() in ["SCHEDULED", "COMPLETED"])
            d_int_comp = sum(1 for a in d_apps if (a.get("status") or "").upper() in INTERVIEW_COMPLETED_STATUSES or ((a.get("interview") or {}).get("status") or "").upper() == "COMPLETED")
            d_sel = sum(1 for a in d_apps if (a.get("status") or "").upper() in SELECTED_STATUSES)
            d_off_iss = sum(1 for a in d_apps if (a.get("status") or "").upper() in OFFER_ISSUED_STATUSES)
            d_off_acc = sum(1 for a in d_apps if (a.get("status") or "").upper() in OFFER_ACCEPTED_STATUSES)
            d_off_dec = sum(1 for a in d_apps if (a.get("status") or "").upper() in OFFER_DECLINED_STATUSES)
            d_placed = sum(1 for a in d_apps if (a.get("status") or "").upper() in PLACEMENT_COMPLETED_STATUSES)

            # Check raw offers for this drive
            for off in raw_offers:
                if off.get("drive_id") == d_id or off.get("company_name") == comp_name:
                    off_st = (off.get("status") or "").upper()
                    if off_st in ["OFFERED", "ISSUED", "ACCEPTED", "JOINING_CONFIRMED"]:
                        d_off_iss = max(d_off_iss, d_off_iss + 1)
                    if off_st in ["ACCEPTED", "JOINING_CONFIRMED"]:
                        d_off_acc = max(d_off_acc, d_off_acc + 1)
                    if off_st in ["DECLINED"]:
                        d_off_dec = max(d_off_dec, d_off_dec + 1)
                    if off_st in ["JOINING_CONFIRMED", "JOINED"]:
                        d_placed = max(d_placed, d_placed + 1)

            drive_breakdown_list.append({
                "drive_id": d_id,
                "company_name": comp_name,
                "role_title": role_t,
                "package_lpa": pkg,
                "status": st,
                "eligible_branches": branches,
                "min_cgpa": min_c,
                "total_applicants": len(d_apps),
                "shortlisted": d_short,
                "assessment_participants": d_ass_part,
                "assessment_qualified": d_ass_qual,
                "interview_scheduled": d_int_sched,
                "interview_completed": d_int_comp,
                "selected": d_sel,
                "offers_issued": d_off_iss,
                "offers_accepted": d_off_acc,
                "offers_declined": d_off_dec,
                "placement_completed": d_placed,
                "conversion_rate": round((d_placed / len(d_apps) * 100), 1) if len(d_apps) > 0 else 0.0
            })

        # 10. BRANCH & BATCH ANALYTICS
        branch_stats_dict: Dict[str, Dict[str, Any]] = {}
        for s in raw_students:
            b_name = s.get("branch") or "General"
            if b_name not in branch_stats_dict:
                branch_stats_dict[b_name] = {
                    "branch": b_name,
                    "total_students": 0,
                    "applicants": 0,
                    "shortlisted": 0,
                    "assessment_qualified": 0,
                    "interview_completed": 0,
                    "selected": 0,
                    "offers_accepted": 0,
                    "placement_completed": 0
                }
            branch_stats_dict[b_name]["total_students"] += 1

        for a in apps:
            s_id = a.get("student_id") or a.get("studentId")
            s_obj = student_map.get(s_id)
            b_name = a.get("student_branch") or (s_obj.get("branch") if s_obj else "General")
            if b_name not in branch_stats_dict:
                branch_stats_dict[b_name] = {
                    "branch": b_name,
                    "total_students": 0,
                    "applicants": 0,
                    "shortlisted": 0,
                    "assessment_qualified": 0,
                    "interview_completed": 0,
                    "selected": 0,
                    "offers_accepted": 0,
                    "placement_completed": 0
                }
            
            branch_stats_dict[b_name]["applicants"] += 1
            st = (a.get("status") or "").upper()
            if st in SHORTLISTED_STATUSES or st in ASSESSMENT_PARTICIPANT_STATUSES:
                branch_stats_dict[b_name]["shortlisted"] += 1
            if st in ASSESSMENT_QUALIFIED_STATUSES:
                branch_stats_dict[b_name]["assessment_qualified"] += 1
            if st in INTERVIEW_COMPLETED_STATUSES:
                branch_stats_dict[b_name]["interview_completed"] += 1
            if st in SELECTED_STATUSES:
                branch_stats_dict[b_name]["selected"] += 1
            if st in OFFER_ACCEPTED_STATUSES:
                branch_stats_dict[b_name]["offers_accepted"] += 1
            if st in PLACEMENT_COMPLETED_STATUSES:
                branch_stats_dict[b_name]["placement_completed"] += 1

        branch_breakdown = []
        for b_name, data in branch_stats_dict.items():
            tot = data["total_students"] or data["applicants"] or 1
            pct = round((data["placement_completed"] / tot * 100), 1)
            branch_breakdown.append({**data, "placement_percentage": pct})

        # 11. COMPANY & ROLE ANALYTICS
        company_stats_dict: Dict[str, Dict[str, Any]] = {}
        for row in drive_breakdown_list:
            c_name = row["company_name"]
            if c_name not in company_stats_dict:
                company_stats_dict[c_name] = {
                    "company_name": c_name,
                    "total_drives": 0,
                    "applicants": 0,
                    "shortlisted": 0,
                    "selected": 0,
                    "offers_issued": 0,
                    "offers_accepted": 0,
                    "placement_completed": 0,
                    "packages": []
                }
            company_stats_dict[c_name]["total_drives"] += 1
            company_stats_dict[c_name]["applicants"] += row["total_applicants"]
            company_stats_dict[c_name]["shortlisted"] += row["shortlisted"]
            company_stats_dict[c_name]["selected"] += row["selected"]
            company_stats_dict[c_name]["offers_issued"] += row["offers_issued"]
            company_stats_dict[c_name]["offers_accepted"] += row["offers_accepted"]
            company_stats_dict[c_name]["placement_completed"] += row["placement_completed"]
            if row["package_lpa"] > 0:
                company_stats_dict[c_name]["packages"].append(row["package_lpa"])

        company_breakdown = []
        for c_name, data in company_stats_dict.items():
            pkgs = data["packages"]
            avg_p = round(sum(pkgs) / len(pkgs), 2) if pkgs else 0.0
            sel_r = round((data["selected"] / data["applicants"] * 100), 1) if data["applicants"] > 0 else 0.0
            company_breakdown.append({
                "company_name": c_name,
                "total_drives": data["total_drives"],
                "applicants": data["applicants"],
                "shortlisted": data["shortlisted"],
                "selected": data["selected"],
                "offers_issued": data["offers_issued"],
                "offers_accepted": data["offers_accepted"],
                "placement_completed": data["placement_completed"],
                "average_package": avg_p,
                "selection_rate": sel_r
            })

        # 12. PLACEMENT TIMELINE & TRENDS (Daily / Weekly Bucketing)
        trend_map: Dict[str, Dict[str, int]] = {}
        for a in apps:
            t_str = str(a.get("applied_at") or a.get("created_at") or datetime.now().strftime("%Y-%m-%d"))[:10]
            if not t_str or len(t_str) < 10:
                t_str = datetime.now().strftime("%Y-%m-%d")

            if t_str not in trend_map:
                trend_map[t_str] = {
                    "date": t_str,
                    "applications": 0,
                    "shortlisted": 0,
                    "interviews": 0,
                    "selections": 0,
                    "offers": 0,
                    "placements": 0
                }
            trend_map[t_str]["applications"] += 1
            st = (a.get("status") or "").upper()
            if st in SHORTLISTED_STATUSES:
                trend_map[t_str]["shortlisted"] += 1
            if st in INTERVIEW_SCHEDULED_STATUSES:
                trend_map[t_str]["interviews"] += 1
            if st in SELECTED_STATUSES:
                trend_map[t_str]["selections"] += 1
            if st in OFFER_ISSUED_STATUSES:
                trend_map[t_str]["offers"] += 1
            if st in PLACEMENT_COMPLETED_STATUSES:
                trend_map[t_str]["placements"] += 1

        trends = sorted(list(trend_map.values()), key=lambda x: x["date"])

        # 13. SKILL ANALYTICS & RECRUITER DEMAND
        eval_students = drive_students if is_single_drive_selected else raw_students
        eval_student_count = len(eval_students)

        student_skills_flat = []
        for s in eval_students:
            s_skills = s.get("skills") or []
            if isinstance(s_skills, list):
                for sk in s_skills:
                    if isinstance(sk, str) and sk.strip():
                        student_skills_flat.append(sk.strip().lower())

        student_skill_counter = Counter(student_skills_flat)

        # Placed candidates skills
        placed_skills_flat = []
        for a in apps:
            st = (a.get("status") or "").upper()
            if st in SELECTED_STATUSES or st in PLACEMENT_COMPLETED_STATUSES:
                s_id = a.get("student_id") or a.get("studentId")
                s_obj = student_map.get(s_id)
                if s_obj:
                    for sk in (s_obj.get("skills") or []):
                        if isinstance(sk, str) and sk.strip():
                            placed_skills_flat.append(sk.strip())
        
        placed_skill_counter = Counter(placed_skills_flat)

        skill_demands = []
        top_skill_gap = "None"
        high_demand_skill = "None"
        max_gap = -1

        if is_single_drive_selected and target_drive:
            # Sourced directly from the selected drive's requirements
            drive_req_skills = target_drive.get("requiredSkills") or target_drive.get("skills") or []
            if isinstance(drive_req_skills, list):
                drive_req_skills = [sk.strip() for sk in drive_req_skills if isinstance(sk, str) and sk.strip()]
            
            if drive_req_skills:
                high_demand_skill = drive_req_skills[0]
                for skill in drive_req_skills:
                    demand_pct = 100
                    proficient_count = student_skill_counter.get(skill.lower(), 0)
                    proficient_pct = round((proficient_count / max(1, eval_student_count)) * 100) if eval_student_count > 0 else 0
                    needing_imp_pct = max(0, 100 - proficient_pct)

                    gap = demand_pct - proficient_pct
                    if gap > max_gap:
                        max_gap = gap
                        top_skill_gap = skill

                    placed_count = sum(1 for s in eval_students if (s.get("id") or str(s.get("_id", ""))) in selected_cands and skill.lower() in [str(sk).lower() for sk in (s.get("skills") or [])])
                    placed_pct = round((placed_count / max(1, len(selected_cands))) * 100) if selected_cands else 0

                    skill_demands.append({
                        "skill": skill,
                        "demandPercent": demand_pct,
                        "proficientPercent": proficient_pct,
                        "needingImprovementPercent": needing_imp_pct,
                        "placedCandidateProficiency": placed_pct
                    })
        else:
            drive_required_skills = []
            for d in raw_drives:
                req = d.get("requiredSkills") or []
                if isinstance(req, list):
                    for sk in req:
                        if isinstance(sk, str) and sk.strip():
                            drive_required_skills.append(sk.strip())

            demand_counter = Counter(drive_required_skills)
            high_demand_skill = demand_counter.most_common(1)[0][0] if demand_counter else "None"
            total_drives_count = max(1, len(raw_drives))

            for skill, demand_count in demand_counter.most_common(10):
                demand_pct = round((demand_count / total_drives_count) * 100)
                proficient_count = student_skill_counter.get(skill.lower(), 0)
                proficient_pct = round((proficient_count / max(1, total_students)) * 100) if total_students > 0 else 0
                needing_imp_pct = max(0, 100 - proficient_pct)

                gap = demand_pct - proficient_pct
                if gap > max_gap:
                    max_gap = gap
                    top_skill_gap = skill

                placed_count = placed_skill_counter.get(skill, 0)
                placed_pct = round((placed_count / max(1, len(selected_cands))) * 100) if selected_cands else 0

                skill_demands.append({
                    "skill": skill,
                    "demandPercent": demand_pct,
                    "proficientPercent": proficient_pct,
                    "needingImprovementPercent": needing_imp_pct,
                    "placedCandidateProficiency": placed_pct
                })

        # Student Readiness Breakdown (strictly evaluated on the target population)
        ready_count = sum(1 for s in eval_students if float(s.get("readinessScore", 0) or 0) >= 80)
        almost_ready_count = sum(1 for s in eval_students if 60 <= float(s.get("readinessScore", 0) or 0) < 80)
        needs_imp_count = sum(1 for s in eval_students if float(s.get("readinessScore", 0) or 0) < 60)
        avg_readiness = round(sum(float(s.get("readinessScore", 0) or 0) for s in eval_students) / max(1, eval_student_count)) if eval_student_count > 0 else 0

        return {
            "filters_applied": {
                "branch": branch or "all",
                "grad_year": grad_year or "all",
                "drive_id": drive_id or "all",
                "company": company or "all",
                "date_range": date_range or "all"
            },
            "kpis": {
                "total_students": total_students,
                "eligible_students": len(eligible_students_set),
                "total_drives": total_drives,
                "active_drives": active_drives_count,
                "completed_drives": completed_drives_count,
                "total_applications": total_applications,
                "shortlisted_candidates": len(shortlisted_cands),
                "candidates_in_assessment": len(assessment_cands),
                "assessment_qualified": len(assessment_qual_cands),
                "interviews_scheduled": len(interview_sched_cands),
                "interviews_completed": len(interview_comp_cands),
                "final_selected": len(selected_cands),
                "offers_issued": len(offer_issued_cands),
                "offers_accepted": len(offer_accepted_cands),
                "offers_declined": len(offer_declined_cands),
                "placement_completed": len(placement_completed_cands)
            },
            "funnel": enriched_funnel,
            "performance_metrics": {
                "avg_cgpa_applicants": avg_cgpa_applicants,
                "avg_cgpa_shortlisted": avg_cgpa_shortlisted,
                "avg_assessment_score": avg_assessment_score,
                "avg_technical_score": avg_technical_score,
                "avg_interview_score": avg_interview_score,
                "selection_rate": selection_rate,
                "offer_acceptance_rate": offer_acceptance_rate,
                "placement_completion_rate": placement_completion_rate,
                "avg_package_lpa": avg_package,
                "highest_package_lpa": highest_package,
                "lowest_package_lpa": lowest_package
            },
            "drive_breakdown": drive_breakdown_list,
            "branch_breakdown": branch_breakdown,
            "company_breakdown": company_breakdown,
            "trends": trends,
            "skills_analytics": {
                "avgPlacementReadiness": avg_readiness,
                "studentsReady": ready_count,
                "studentsNeedingImprovement": needs_imp_count,
                "topSkillGap": top_skill_gap,
                "highDemandSkill": high_demand_skill,
                "skillDemands": skill_demands,
                "topPlacedSkills": [
                    {"skill": k, "count": v} for k, v in placed_skill_counter.most_common(8)
                ]
            },
            "generated_at": datetime.now().isoformat()
        }

    @classmethod
    def generate_analytics_csv(cls, overview_data: Dict[str, Any]) -> str:
        """Generates a complete, structured CSV export of filtered analytics."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["PlaceMind Institutional Placement & Recruitment Report"])
        writer.writerow(["Generated At", overview_data.get("generated_at", "")])
        writer.writerow([])

        # Section 1: Executive KPIs
        writer.writerow(["--- EXECUTIVE KPI SUMMARY ---"])
        writer.writerow(["Metric", "Count / Value"])
        kpis = overview_data.get("kpis", {})
        for k, v in kpis.items():
            writer.writerow([k.replace("_", " ").title(), v])

        writer.writerow([])
        # Section 2: Performance Metrics
        writer.writerow(["--- PERFORMANCE & COMPENSATION METRICS ---"])
        writer.writerow(["Metric", "Value"])
        perf = overview_data.get("performance_metrics", {})
        for k, v in perf.items():
            val_str = f"{v}" if v is not None else "No data available"
            writer.writerow([k.replace("_", " ").title(), val_str])

        writer.writerow([])
        # Section 3: Recruitment Funnel
        writer.writerow(["--- RECRUITMENT FUNNEL ---"])
        writer.writerow(["Stage", "Candidates", "% of Total Applicants", "Stage Conversion %"])
        for stg in overview_data.get("funnel", []):
            writer.writerow([stg.get("label"), stg.get("count"), f"{stg.get('percentage_of_total')}%", f"{stg.get('conversion_percentage')}%"])

        writer.writerow([])
        # Section 4: Drive Performance Table
        writer.writerow(["--- PLACEMENT DRIVES PERFORMANCE ---"])
        writer.writerow([
            "Company", "Role", "Package (LPA)", "Status", "Applicants",
            "Shortlisted", "In Assessment", "Assessment Qualified",
            "Interview Scheduled", "Interview Completed", "Selected",
            "Offers Issued", "Offers Accepted", "Offers Declined", "Placement Completed", "Conversion %"
        ])
        for d in overview_data.get("drive_breakdown", []):
            writer.writerow([
                d.get("company_name"),
                d.get("role_title"),
                d.get("package_lpa"),
                d.get("status"),
                d.get("total_applicants"),
                d.get("shortlisted"),
                d.get("assessment_participants"),
                d.get("assessment_qualified"),
                d.get("interview_scheduled"),
                d.get("interview_completed"),
                d.get("selected"),
                d.get("offers_issued"),
                d.get("offers_accepted"),
                d.get("offers_declined"),
                d.get("placement_completed"),
                f"{d.get('conversion_rate')}%"
            ])

        writer.writerow([])
        # Section 5: Branch Performance Table
        writer.writerow(["--- BRANCH PLACEMENT BREAKDOWN ---"])
        writer.writerow([
            "Branch", "Total Students", "Applicants", "Shortlisted",
            "Assessment Qualified", "Interview Completed", "Selected",
            "Offers Accepted", "Placement Completed", "Placement %"
        ])
        for b in overview_data.get("branch_breakdown", []):
            writer.writerow([
                b.get("branch"),
                b.get("total_students"),
                b.get("applicants"),
                b.get("shortlisted"),
                b.get("assessment_qualified"),
                b.get("interview_completed"),
                b.get("selected"),
                b.get("offers_accepted"),
                b.get("placement_completed"),
                f"{b.get('placement_percentage')}%"
            ])

        return output.getvalue()
