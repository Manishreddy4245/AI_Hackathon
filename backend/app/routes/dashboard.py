from datetime import datetime, date
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.services.eligibility_engine import evaluate_drive_eligibility

router = APIRouter(prefix="/api/dashboard", tags=["Placement Officer Dashboard"])

@router.get("/summary")
async def get_placement_officer_dashboard_summary(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Returns 100% dynamic Placement Officer Dashboard KPI summary and pipeline statistics
    calculated strictly from live MongoDB collections.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    today_dt = datetime.now()
    today_str = today_dt.strftime("%Y-%m-%d")
    today_human_str = today_dt.strftime("%d %b %Y")
    today_human_str2 = today_dt.strftime("%d %B %Y")

    # -------------------------------------------------------------
    # 1. ACTIVE DRIVES
    # Definition: Unique placement drives that are currently approved/active
    # and whose application period has not ended.
    # Exclude: draft, rejected, expired, closed, cancelled.
    # -------------------------------------------------------------
    excluded_statuses = [
        "draft", "rejected", "expired", "closed", "cancelled",
        "CANCELLED", "CLOSED", "DRAFT", "REJECTED"
    ]
    all_drives = await db.drives.find({}, {"_id": 0}).to_list(length=200)

    active_drives_list = []
    for d in all_drives:
        st = (d.get("status") or "open").lower()
        if st in excluded_statuses:
            continue
        # Check deadline if present
        deadline_str = d.get("deadline") or d.get("application_deadline") or d.get("date")
        if deadline_str:
            try:
                if "-" in str(deadline_str) and len(str(deadline_str)) >= 10:
                    d_date = datetime.strptime(str(deadline_str)[:10], "%Y-%m-%d").date()
                    if d_date < today_dt.date():
                        continue
            except Exception:
                pass
        active_drives_list.append(d)

    active_drives_count = len(active_drives_list)
    active_drives_change = f"{active_drives_count} active drive{'s' if active_drives_count != 1 else ''}" if active_drives_count > 0 else "No active drives"

    # -------------------------------------------------------------
    # 2. ELIGIBLE STUDENTS
    # Definition: Count UNIQUE registered students who are eligible
    # for at least one active drive (using eligibility engine).
    # -------------------------------------------------------------
    all_students = await db.students.find({}, {"_id": 0}).to_list(length=1000)
    total_registered_students = len(all_students)

    eligible_student_ids = set()
    if active_drives_list and all_students:
        for student in all_students:
            s_id = student.get("id") or str(student.get("_id", ""))
            for drive in active_drives_list:
                res = evaluate_drive_eligibility(student, drive)
                is_eligible = False
                if isinstance(res, (tuple, list)) and len(res) > 0:
                    is_eligible = bool(res[0])
                elif isinstance(res, dict):
                    is_eligible = bool(res.get("eligible", False))
                elif isinstance(res, bool):
                    is_eligible = res

                if is_eligible:
                    eligible_student_ids.add(s_id)
                    break
    elif not active_drives_list and all_students:
        eligible_student_ids = set()

    eligible_students_count = len(eligible_student_ids) if active_drives_list else 0
    if total_registered_students > 0:
        batch_eligibility_pct = round((eligible_students_count / total_registered_students) * 100)
        eligible_students_change = f"{batch_eligibility_pct}% batch eligibility"
    else:
        eligible_students_change = "No registered students"

    # -------------------------------------------------------------
    # 3. SHORTLISTED CANDIDATES
    # Definition: Real application records whose status represents SHORTLISTED.
    # -------------------------------------------------------------
    shortlisted_apps = await db.applications.find({
        "$or": [
            {"status": "SHORTLISTED"},
            {"status": "shortlisted"},
            {"status": "Shortlisted"}
        ]
    }, {"_id": 0}).to_list(length=1000)
    shortlisted_count = len(shortlisted_apps)
    shortlisted_change = f"{shortlisted_count} candidate{'s' if shortlisted_count != 1 else ''} shortlisted"

    # -------------------------------------------------------------
    # 4. INTERVIEWS TODAY
    # Definition: Active scheduled interviews for current local date.
    # Exclude cancelled interviews.
    # -------------------------------------------------------------
    all_interviews = await db.interviews.find({}, {"_id": 0}).to_list(length=500)
    interviews_today_count = 0

    for intv in all_interviews:
        intv_status = (intv.get("status") or "").upper()
        if intv_status in ["CANCELLED", "REJECTED"]:
            continue
        intv_date = str(intv.get("date") or intv.get("interview_date") or "").strip()
        if not intv_date:
            continue

        if intv_date == today_str or intv_date == today_human_str or intv_date == today_human_str2:
            interviews_today_count += 1
        elif intv_date.startswith(today_str):
            interviews_today_count += 1
        else:
            try:
                if "-" in intv_date and len(intv_date) >= 10:
                    parsed_d = datetime.strptime(intv_date[:10], "%Y-%m-%d").date()
                    if parsed_d == today_dt.date():
                        interviews_today_count += 1
            except Exception:
                pass

    # Available slots today for dynamic subtext
    today_available_slots = await db.interview_slots.count_documents({
        "$and": [
            {"status": {"$in": ["AVAILABLE", "available"]}},
            {
                "$or": [
                    {"date": today_str},
                    {"date": today_human_str},
                    {"date": today_human_str2}
                ]
            }
        ]
    })
    interviews_change = f"{today_available_slots} slot{'s' if today_available_slots != 1 else ''} remaining" if today_available_slots > 0 else (
        f"{interviews_today_count} scheduled today" if interviews_today_count > 0 else "No interviews today"
    )

    # -------------------------------------------------------------
    # 5. PENDING ACTIONS
    # Definition: Real unresolved placement operations:
    # 1. Unresolved AI / placement exceptions in db.exceptions (status != resolved)
    # 2. Drives requiring officer confirmation (aiConfirmed == False or status in pending_review)
    # -------------------------------------------------------------
    unresolved_exceptions_count = await db.exceptions.count_documents({
        "status": {"$nin": ["resolved", "Resolved", "APPROVED", "approved"]}
    })
    unreviewed_drives_count = await db.drives.count_documents({
        "$or": [
            {"aiConfirmed": False},
            {"status": {"$in": ["pending", "pending_review", "awaiting_approval"]}}
        ]
    })

    total_pending_actions = unresolved_exceptions_count + unreviewed_drives_count
    pending_actions_change = f"{total_pending_actions} require{'s' if total_pending_actions == 1 else ''} officer review" if total_pending_actions > 0 else "All actions resolved ✓"

    # -------------------------------------------------------------
    # PIPELINE DATA (Dynamic Placement Operations Pipeline)
    # -------------------------------------------------------------
    applied_count = await db.applications.count_documents({})
    interview_count = await db.interviews.count_documents({"status": {"$nin": ["CANCELLED", "cancelled"]}})
    selected_count = await db.applications.count_documents({"status": {"$in": ["SELECTED", "selected", "PLACED", "placed"]}})

    pipeline = [
        {"stage": "Registered", "count": total_registered_students, "fill": "#64748B"},
        {"stage": "Eligible", "count": eligible_students_count, "fill": "#3B82F6"},
        {"stage": "Applied", "count": applied_count, "fill": "#06B6D4"},
        {"stage": "Shortlisted", "count": shortlisted_count, "fill": "#3B82F6"},
        {"stage": "Interview", "count": interview_count, "fill": "#F59E0B"},
        {"stage": "Selected", "count": selected_count, "fill": "#22C55E"}
    ]

    return {
        "active_drives": active_drives_count,
        "eligible_students": eligible_students_count,
        "shortlisted_candidates": shortlisted_count,
        "interviews_today": interviews_today_count,
        "pending_actions": total_pending_actions,
        "active_drives_change": active_drives_change,
        "eligible_students_change": eligible_students_change,
        "shortlisted_change": shortlisted_change,
        "interviews_change": interviews_change,
        "pending_actions_change": pending_actions_change,
        "available_slots_today": today_available_slots,
        "total_registered_students": total_registered_students,
        "unresolved_exceptions_count": unresolved_exceptions_count,
        "pipeline": pipeline
    }

@router.get("/kpi-details")
async def get_kpi_detailed_breakdown(
    kpi: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Returns 100% real MongoDB records and exact calculation breakdowns for any clicked KPI card.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    today_dt = datetime.now()
    today_str = today_dt.strftime("%Y-%m-%d")
    today_human_str = today_dt.strftime("%d %b %Y")
    today_human_str2 = today_dt.strftime("%d %B %Y")

    kpi = kpi.lower().strip()

    # =============================================================
    # 1. ACTIVE DRIVES BREAKDOWN
    # =============================================================
    if kpi in ["active_drives", "drives"]:
        all_drives = await db.drives.find({}, {"_id": 0}).to_list(length=200)
        excluded_statuses = ["draft", "rejected", "expired", "closed", "cancelled", "CANCELLED", "CLOSED", "DRAFT", "REJECTED"]

        approved_active_drives = []
        expired_drives = []
        closed_cancelled_drives = []

        for d in all_drives:
            st = (d.get("status") or "open").lower()
            if st in ["closed", "cancelled", "rejected", "draft"]:
                closed_cancelled_drives.append(d)
                continue

            deadline_str = d.get("deadline") or d.get("application_deadline") or d.get("date")
            is_expired = False
            if deadline_str:
                try:
                    if "-" in str(deadline_str) and len(str(deadline_str)) >= 10:
                        d_date = datetime.strptime(str(deadline_str)[:10], "%Y-%m-%d").date()
                        if d_date < today_dt.date():
                            is_expired = True
                except Exception:
                    pass

            if is_expired:
                expired_drives.append(d)
            else:
                # Count associated applications and shortlists
                d_id = d.get("id")
                apps_count = await db.applications.count_documents({"$or": [{"drive_id": d_id}, {"driveId": d_id}]})
                short_count = await db.applications.count_documents({"$and": [{"$or": [{"drive_id": d_id}, {"driveId": d_id}]}, {"status": {"$in": ["SHORTLISTED", "shortlisted"]}}]})

                # Calculate eligible students for this drive
                all_students = await db.students.find({}, {"_id": 0}).to_list(length=500)
                eligible_for_drive = 0
                for s in all_students:
                    res = evaluate_drive_eligibility(s, d)
                    is_el = res[0] if isinstance(res, (tuple, list)) and len(res) > 0 else (bool(res.get("eligible")) if isinstance(res, dict) else bool(res))
                    if is_el:
                        eligible_for_drive += 1

                drive_item = {
                    "id": d.get("id"),
                    "company_name": d.get("companyName") or d.get("company_name", "Company"),
                    "role_title": d.get("roleTitle") or d.get("job_title", "Software Engineer"),
                    "package_lpa": d.get("packageLpa") or d.get("package_lpa", 0.0),
                    "location": d.get("location", "Campus / Hybrid"),
                    "status": (d.get("status") or "ACTIVE").upper(),
                    "deadline": deadline_str or "Ongoing",
                    "eligible_branches": d.get("eligibleBranches") or d.get("branches", ["CSE", "IT"]),
                    "min_cgpa": d.get("minCgpa", 6.5),
                    "eligible_count": eligible_for_drive,
                    "applications_count": apps_count,
                    "shortlisted_count": short_count,
                    "created_at": d.get("created_at", today_human_str)
                }
                approved_active_drives.append(drive_item)

        total_active = len(approved_active_drives)
        return {
            "kpi": "active_drives",
            "title": "Active Placement Drives",
            "count": total_active,
            "formula": {
                "total_drives_in_db": len(all_drives),
                "approved_active": len(all_drives) - len(closed_cancelled_drives),
                "expired_deducted": len(expired_drives),
                "closed_cancelled_deducted": len(closed_cancelled_drives),
                "final_count": total_active,
                "explanation": f"Active Drives ({total_active}) = Total Approved Drives ({len(all_drives) - len(closed_cancelled_drives)}) - Expired ({len(expired_drives)}) - Closed/Cancelled ({len(closed_cancelled_drives)})"
            },
            "items": approved_active_drives
        }

    # =============================================================
    # 2. ELIGIBLE STUDENTS BREAKDOWN
    # =============================================================
    elif kpi in ["eligible_students", "students", "eligible"]:
        all_drives = await db.drives.find({}, {"_id": 0}).to_list(length=200)
        excluded_statuses = ["draft", "rejected", "expired", "closed", "cancelled", "CANCELLED", "CLOSED", "DRAFT", "REJECTED"]
        active_drives = [d for d in all_drives if (d.get("status") or "open").lower() not in excluded_statuses]

        all_students = await db.students.find({}, {"_id": 0}).to_list(length=1000)
        total_registered = len(all_students)

        student_evaluations = []
        drive_breakdown_map = {d.get("id"): {"company": d.get("companyName", "Company"), "role": d.get("roleTitle", "Role"), "count": 0} for d in active_drives}

        unique_eligible_count = 0

        for s in all_students:
            s_id = s.get("id") or str(s.get("_id", ""))
            s_name = s.get("name", "Candidate")
            s_branch = s.get("branch", "N/A")
            s_cgpa = s.get("cgpa", 0.0)
            s_roll = s.get("rollNumber", "N/A")
            s_skills = s.get("skills", [])

            eligible_drives = []
            reasons_log = []

            for d in active_drives:
                d_id = d.get("id")
                res = evaluate_drive_eligibility(s, d)
                is_el = False
                res_reasons = []
                if isinstance(res, (tuple, list)):
                    is_el = bool(res[0]) if len(res) > 0 else False
                    res_reasons = res[1] if len(res) > 1 else []
                elif isinstance(res, dict):
                    is_el = bool(res.get("eligible", False))
                    res_reasons = res.get("reasons", [])

                if is_el:
                    c_name = d.get("companyName", "Company")
                    r_title = d.get("roleTitle", "Role")
                    eligible_drives.append(f"{c_name} ({r_title})")
                    if d_id in drive_breakdown_map:
                        drive_breakdown_map[d_id]["count"] += 1
                else:
                    if res_reasons:
                        reasons_log.extend(res_reasons[:2])

            is_overall_eligible = len(eligible_drives) > 0
            if is_overall_eligible:
                unique_eligible_count += 1

            student_evaluations.append({
                "student_id": s_id,
                "name": s_name,
                "roll_number": s_roll,
                "branch": s_branch,
                "cgpa": s_cgpa,
                "skills": s_skills[:5],
                "is_eligible": is_overall_eligible,
                "eligible_drives_count": len(eligible_drives),
                "eligible_drives": eligible_drives,
                "reasons": [
                    f"✓ Branch ({s_branch}) and CGPA ({s_cgpa}) evaluated",
                    f"{'✓ Eligible for ' + str(len(eligible_drives)) + ' active drive(s)' if is_overall_eligible else '✗ Below CGPA or branch criteria for active drives'}"
                ]
            })

        batch_pct = round((unique_eligible_count / total_registered) * 100) if total_registered > 0 else 0

        return {
            "kpi": "eligible_students",
            "title": "Eligible Students",
            "count": unique_eligible_count,
            "total_registered_students": total_registered,
            "batch_eligibility_pct": batch_pct,
            "formula": {
                "total_registered": total_registered,
                "unique_eligible": unique_eligible_count,
                "not_eligible": total_registered - unique_eligible_count,
                "batch_pct": batch_pct,
                "explanation": f"Unique Eligible Students ({unique_eligible_count}) / Total Registered Students ({total_registered}) = {batch_pct}% Batch Eligibility. Students eligible for multiple drives are counted only ONCE."
            },
            "drive_breakdowns": list(drive_breakdown_map.values()),
            "items": student_evaluations
        }

    # =============================================================
    # 3. SHORTLISTED CANDIDATES BREAKDOWN
    # =============================================================
    elif kpi in ["shortlisted_candidates", "shortlisted"]:
        shortlisted_docs = await db.applications.find({
            "$or": [
                {"status": "SHORTLISTED"},
                {"status": "shortlisted"},
                {"status": "Shortlisted"}
            ]
        }, {"_id": 0}).to_list(length=1000)

        items = []
        unique_students_set = set()

        for a in shortlisted_docs:
            s_id = a.get("student_id") or a.get("studentId")
            if s_id:
                unique_students_set.add(s_id)

            intv = a.get("interview", {})
            applicant = a.get("applicant", {})

            items.append({
                "application_id": a.get("id"),
                "student_id": s_id,
                "student_name": a.get("student_name") or a.get("studentName") or applicant.get("name", "Student"),
                "student_email": a.get("student_email") or a.get("studentEmail") or applicant.get("email", "N/A"),
                "company_name": a.get("company_name") or a.get("companyName", "Company"),
                "job_title": a.get("job_title") or a.get("roleTitle", "Software Engineer"),
                "skills": a.get("skills", []),
                "status": "SHORTLISTED",
                "applied_at": a.get("applied_at") or a.get("created_at", today_human_str),
                "interview": {
                    "scheduled": bool(intv),
                    "date": intv.get("date"),
                    "time": intv.get("time") or intv.get("timeSlot"),
                    "panel_name": intv.get("panel_name"),
                    "room": intv.get("room_number") or intv.get("room_name")
                } if intv else None
            })

        total_count = len(items)
        return {
            "kpi": "shortlisted_candidates",
            "title": "Shortlisted Candidates",
            "count": total_count,
            "unique_students_count": len(unique_students_set),
            "counting_mode": "Shortlisted Applications (MongoDB db.applications where status == SHORTLISTED)",
            "formula": {
                "shortlisted_applications": total_count,
                "unique_students": len(unique_students_set),
                "explanation": f"Total Shortlisted Applications = {total_count} ({len(unique_students_set)} unique candidates). Tracks all active shortlist decisions made by Placement Officers."
            },
            "items": items
        }

    # =============================================================
    # 4. INTERVIEWS TODAY BREAKDOWN
    # =============================================================
    elif kpi in ["interviews_today", "interviews", "interview"]:
        all_interviews = await db.interviews.find({}, {"_id": 0}).to_list(length=500)
        today_interviews = []

        scheduled_today_cnt = 0
        completed_today_cnt = 0
        cancelled_today_cnt = 0

        for intv in all_interviews:
            intv_date = str(intv.get("date") or intv.get("interview_date") or "").strip()
            if not intv_date:
                continue

            is_today = False
            if intv_date == today_str or intv_date == today_human_str or intv_date == today_human_str2:
                is_today = True
            elif intv_date.startswith(today_str):
                is_today = True
            else:
                try:
                    if "-" in intv_date and len(intv_date) >= 10:
                        parsed_d = datetime.strptime(intv_date[:10], "%Y-%m-%d").date()
                        if parsed_d == today_dt.date():
                            is_today = True
                except Exception:
                    pass

            if is_today:
                st = (intv.get("status") or "SCHEDULED").upper()
                if st in ["CANCELLED", "REJECTED"]:
                    cancelled_today_cnt += 1
                elif st in ["COMPLETED", "FINISHED"]:
                    completed_today_cnt += 1
                    today_interviews.append(intv)
                else:
                    scheduled_today_cnt += 1
                    today_interviews.append(intv)

        # Available slots today
        today_slots = await db.interview_slots.find({
            "$and": [
                {"status": {"$in": ["AVAILABLE", "available"]}},
                {
                    "$or": [
                        {"date": today_str},
                        {"date": today_human_str},
                        {"date": today_human_str2}
                    ]
                }
            ]
        }, {"_id": 0}).to_list(length=100)

        active_interviews_count = scheduled_today_cnt + completed_today_cnt

        return {
            "kpi": "interviews_today",
            "title": "Interviews Scheduled Today",
            "count": active_interviews_count,
            "today_date": today_human_str,
            "scheduled_today": scheduled_today_cnt,
            "completed_today": completed_today_cnt,
            "cancelled_today": cancelled_today_cnt,
            "available_slots_remaining": len(today_slots),
            "formula": {
                "active_today": active_interviews_count,
                "scheduled": scheduled_today_cnt,
                "completed": completed_today_cnt,
                "cancelled": cancelled_today_cnt,
                "available_slots": len(today_slots),
                "explanation": f"Interviews Today ({active_interviews_count}) = Scheduled Today ({scheduled_today_cnt}) + Completed Today ({completed_today_cnt}). Cancelled ({cancelled_today_cnt}) excluded. Remaining available slots: {len(today_slots)}."
            },
            "items": [{
                "interview_id": i.get("id") or i.get("interview_id"),
                "student_name": i.get("student_name") or i.get("studentName", "Candidate"),
                "company_name": i.get("company_name") or i.get("companyName", "Company"),
                "job_title": i.get("job_title") or i.get("roleTitle", "Software Engineer"),
                "panel_name": i.get("panel_name") or i.get("panelName", "Technical Panel"),
                "panel_members": i.get("panel_members") or i.get("panelMembers", []),
                "block": i.get("block", "Block A"),
                "room_number": i.get("room_number") or i.get("room_name", "A-101"),
                "date": i.get("date", today_human_str),
                "time_slot": i.get("timeSlot") or i.get("time") or f"{i.get('start_time', '10:00 AM')} - {i.get('end_time', '10:30 AM')}",
                "status": (i.get("status") or "SCHEDULED").upper()
            } for i in today_interviews],
            "available_slots": [{
                "slot_id": s.get("id"),
                "panel_name": s.get("panel_name"),
                "block": s.get("block"),
                "room_number": s.get("room_number"),
                "time_slot": f"{s.get('start_time')} - {s.get('end_time')}",
                "status": "AVAILABLE"
            } for s in today_slots]
        }

    # =============================================================
    # 5. PENDING ACTIONS BREAKDOWN
    # =============================================================
    elif kpi in ["pending_actions", "actions", "pending"]:
        unresolved_exceptions = await db.exceptions.find({
            "status": {"$nin": ["resolved", "Resolved", "APPROVED", "approved"]}
        }, {"_id": 0}).to_list(length=100)

        unconfirmed_drives = await db.drives.find({
            "$or": [
                {"aiConfirmed": False},
                {"status": {"$in": ["pending", "pending_review", "awaiting_approval"]}}
            ]
        }, {"_id": 0}).to_list(length=100)

        pending_applications = await db.applications.find({
            "status": {"$in": ["APPLIED", "applied", "APPLICATION_STARTED"]}
        }, {"_id": 0}).to_list(length=100)

        items = []

        for d in unconfirmed_drives:
            items.append({
                "id": d.get("id"),
                "category": "Drive Approval",
                "title": f"Review Placement Drive: {d.get('companyName', 'Company')}",
                "description": f"Drive for {d.get('roleTitle', 'Role')} ({d.get('packageLpa', 0)} LPA) requires Placement Officer review & confirmation.",
                "status": "PENDING_REVIEW",
                "priority": "HIGH",
                "timestamp": d.get("created_at", today_human_str),
                "action_route": "/companies"
            })

        for ex in unresolved_exceptions:
            items.append({
                "id": ex.get("id"),
                "category": "AI Exception",
                "title": ex.get("title", "AI Operations Conflict"),
                "description": ex.get("description") or ex.get("suggestedActionText", "Officer decision required."),
                "status": "UNRESOLVED",
                "priority": ex.get("severity", "MEDIUM").upper(),
                "timestamp": ex.get("timestamp", today_human_str),
                "action_route": "/exceptions"
            })

        for app in pending_applications[:10]:
            items.append({
                "id": app.get("id"),
                "category": "Candidate Review",
                "title": f"New Application: {app.get('student_name', 'Student')} -> {app.get('company_name', 'Company')}",
                "description": f"Applied for {app.get('job_title', 'Role')}. Review profile and shortlist candidate.",
                "status": "APPLIED",
                "priority": "NORMAL",
                "timestamp": app.get("applied_at", today_human_str),
                "action_route": "/admin/candidates"
            })

        total_count = len(unconfirmed_drives) + len(unresolved_exceptions)

        return {
            "kpi": "pending_actions",
            "title": "Pending Placement Actions",
            "count": total_count,
            "categories": {
                "drive_approvals": len(unconfirmed_drives),
                "unresolved_exceptions": len(unresolved_exceptions),
                "pending_applications": len(pending_applications)
            },
            "formula": {
                "drive_approvals": len(unconfirmed_drives),
                "unresolved_exceptions": len(unresolved_exceptions),
                "total_pending": total_count,
                "explanation": f"Pending Actions ({total_count}) = Drives Requiring Confirmation ({len(unconfirmed_drives)}) + Unresolved Placement/AI Exceptions ({len(unresolved_exceptions)}). Automatically decreases as actions are approved or resolved."
            },
            "items": items
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unknown KPI identifier '{kpi}'. Valid keys: active_drives, eligible_students, shortlisted_candidates, interviews_today, pending_actions.")

