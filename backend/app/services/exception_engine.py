import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("placemind.exceptions")


async def scan_and_sync_exceptions(db) -> List[Dict[str, Any]]:
    """
    Autonomous AI Diagnostic Engine.
    Scans live placement drives, candidate pipeline, interviews, and offers
    to detect real operational exceptions, sync resolutions, and maintain
    an authoritative, synchronized exceptions list.
    """
    if db is None:
        return []

    now = datetime.now()
    now_str = now.strftime("%I:%M %p • %d %b %Y")
    now_iso = now.isoformat()

    try:
        # =====================================================================
        # 1. SCAN UNREVIEWED / PENDING PLACEMENT DRIVES
        # =====================================================================
        pending_drives = await db.drives.find({
            "status": {"$in": ["SUBMITTED_FOR_REVIEW", "PENDING_APPROVAL", "DRAFT", "pending_approval", "submitted_for_review"]}
        }, {"_id": 0}).to_list(length=100)

        for drive in pending_drives:
            drive_id = drive.get("id")
            if not drive_id:
                continue

            exc_id = f"exc-drive-pending-{drive_id}"
            existing = await db.exceptions.find_one({"id": exc_id})

            company_name = drive.get("companyName") or drive.get("company_name") or "Corporate Partner"
            role_title = drive.get("roleTitle") or drive.get("job_title") or "Open Role"

            exc_doc = {
                "id": exc_id,
                "title": f"Drive Confirmation Required: {company_name}",
                "description": f"Placement drive for '{role_title}' submitted by recruiter is awaiting Placement Officer approval before campus broadcast.",
                "severity": "warning",
                "status": existing.get("status", "open") if existing else "open",
                "category": "drive",
                "timestamp": existing.get("timestamp") if existing else now_str,
                "affectedEntity": f"{company_name} ({role_title})",
                "aiRecommendation": "Review drive parameters (package CTC, eligibility criteria, dates) and approve or request revisions.",
                "suggestedActionText": f"Approve '{company_name}' Placement Drive",
                "recommendedAction": "APPROVE_DRIVE",
                "actionText": "Review Drive",
                "actionRoute": f"/companies/{drive_id}",
                "candidateAvailable": True,
                "panelAvailable": True,
                "roomAvailable": True,
                "created_at": existing.get("created_at") if existing else now_iso,
                "metadata": {"drive_id": drive_id, "company_name": company_name, "role_title": role_title}
            }

            if not existing:
                await db.exceptions.insert_one(exc_doc)
            else:
                # Update details while preserving officer status
                await db.exceptions.update_one({"id": exc_id}, {"$set": {
                    "title": exc_doc["title"],
                    "description": exc_doc["description"],
                    "affectedEntity": exc_doc["affectedEntity"],
                    "aiRecommendation": exc_doc["aiRecommendation"],
                    "suggestedActionText": exc_doc["suggestedActionText"],
                    "actionRoute": exc_doc["actionRoute"],
                    "metadata": exc_doc["metadata"]
                }})

        # Auto-resolve drive exceptions for drives that are now approved / announced / rejected
        active_drives = await db.drives.find({
            "status": {"$in": ["ANNOUNCED", "ACTIVE", "APPROVED", "COMPLETED", "REJECTED", "approved", "announced", "active"]}
        }, {"_id": 0}).to_list(length=200)

        for drive in active_drives:
            drive_id = drive.get("id")
            if drive_id:
                exc_id = f"exc-drive-pending-{drive_id}"
                await db.exceptions.update_one(
                    {"id": exc_id, "status": {"$ne": "resolved"}},
                    {"$set": {"status": "resolved", "resolvedBy": "Placement Officer / System", "resolved_at": now_iso}}
                )

        # =====================================================================
        # 2. SCAN UNSCHEDULED INTERVIEWS (Technical Qualified Candidates Only)
        # =====================================================================
        # Panel and HR interview will ONLY be allotted if the candidate has
        # explicitly qualified the Technical Round and is not disqualified/rejected.
        all_apps = await db.applications.find({}, {"_id": 0}).to_list(length=500)

        for app_doc in all_apps:
            app_id = app_doc.get("id")
            if not app_id:
                continue

            exc_id = f"exc-int-pending-{app_id}"
            app_status = (app_doc.get("status") or "").upper()
            app_stage = (app_doc.get("stage") or app_doc.get("pipeline_stage") or "").upper()
            apt_status = (app_doc.get("aptitude_status") or "").upper()
            tech_status = (app_doc.get("technical_status") or "").upper()
            hr_status = (app_doc.get("hr_status") or "").upper()

            # Disqualification check (Technical Failed, Aptitude Failed, Rejected, Disqualified)
            is_disqualified = (
                app_status in [
                    "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE",
                    "REJECTED_AT_APTITUDE", "APTITUDE_FAILED",
                    "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED",
                    "REJECTED_AT_HR", "DISQUALIFIED", "FAILED"
                ] or
                app_stage in [
                    "REJECTED", "NOT_SHORTLISTED", "INELIGIBLE",
                    "REJECTED_AT_APTITUDE", "APTITUDE_FAILED",
                    "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED",
                    "REJECTED_AT_HR", "DISQUALIFIED", "FAILED"
                ] or
                apt_status in ["FAILED", "DISQUALIFIED", "REJECTED"] or
                tech_status in ["FAILED", "DISQUALIFIED", "REJECTED"] or
                hr_status in ["FAILED", "DISQUALIFIED", "REJECTED"]
            )

            # Strictly require Technical Round Qualification
            is_tech_qualified = (
                tech_status in ["QUALIFIED", "PASSED"] or
                app_status in ["TECHNICAL_QUALIFIED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED", "INTERVIEW_READY", "INTERVIEW_PENDING"] or
                app_stage in ["TECHNICAL_QUALIFIED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED", "INTERVIEW_READY", "INTERVIEW_PENDING"] or
                app_doc.get("canAllocateHR") is True or
                hr_status == "ALLOCATED"
            ) and not is_disqualified

            cand_id = app_doc.get("student_id") or app_doc.get("studentId")
            cand_name = app_doc.get("student_name") or app_doc.get("studentName") or "Candidate"

            # If student is disqualified/rejected or not technical qualified:
            # They must NEVER have an interview scheduling exception. DELETE it completely.
            if is_disqualified or not is_tech_qualified:
                await db.exceptions.delete_many({
                    "$or": [
                        {"id": exc_id},
                        {"metadata.application_id": app_id},
                        {"metadata.student_id": cand_id, "category": "scheduling"},
                        {"affectedEntity": {"$regex": f"^{cand_name}", "$options": "i"}, "category": "scheduling"}
                    ]
                })
                continue

            existing_interview = await db.interviews.find_one({
                "$or": [{"application_id": app_id}, {"candidateId": cand_id, "driveId": app_doc.get("drive_id")}],
                "status": {"$nin": ["CANCELLED", "REJECTED"]}
            })

            # If interview is already scheduled or candidate is placed:
            # Mark exception as resolved
            if existing_interview or app_status in ["INTERVIEW_SCHEDULED", "OFFER_ISSUED", "OFFER_ACCEPTED", "JOINING_CONFIRMED", "PLACEMENT_COMPLETED"]:
                await db.exceptions.update_one(
                    {"id": exc_id, "status": {"$ne": "resolved"}},
                    {"$set": {"status": "resolved", "resolvedBy": "System / Interview Scheduled", "resolved_at": now_iso}}
                )
                continue

            # Candidate is legitimately technical qualified and awaiting interview scheduling
            existing = await db.exceptions.find_one({"id": exc_id})
            comp_name = app_doc.get("company_name") or "Company Drive"
            role_name = app_doc.get("job_title") or "Engineering Role"

            exc_doc = {
                "id": exc_id,
                "title": f"Unscheduled HR Interview: {cand_name}",
                "description": f"Candidate {cand_name} has passed Technical Round for {comp_name} ({role_name}). HR interview panel & room allocation is pending.",
                "severity": "warning",
                "status": existing.get("status", "open") if existing else "open",
                "category": "scheduling",
                "timestamp": existing.get("timestamp") if existing else now_str,
                "affectedEntity": f"{cand_name} ({comp_name})",
                "aiRecommendation": f"Candidate qualified technical evaluation. Assign panel & room in Interview Operations for {cand_name}.",
                "suggestedActionText": f"Schedule HR Interview for {cand_name}",
                "recommendedAction": "SCHEDULE_INTERVIEW",
                "actionText": "Schedule Interview",
                "actionRoute": "/interviews",
                "candidateAvailable": True,
                "panelAvailable": True,
                "roomAvailable": True,
                "created_at": existing.get("created_at") if existing else now_iso,
                "metadata": {"application_id": app_id, "student_id": cand_id, "student_name": cand_name, "company_name": comp_name}
            }

            if not existing:
                await db.exceptions.insert_one(exc_doc)
            else:
                await db.exceptions.update_one({"id": exc_id}, {"$set": {
                    "title": exc_doc["title"],
                    "description": exc_doc["description"],
                    "affectedEntity": exc_doc["affectedEntity"],
                    "aiRecommendation": exc_doc["aiRecommendation"],
                    "suggestedActionText": exc_doc["suggestedActionText"]
                }})

        # Extra safety: Purge any scheduling exceptions referring to rejected/disqualified candidates
        existing_sched_excs = await db.exceptions.find({"category": "scheduling"}, {"_id": 0}).to_list(length=200)
        for s_exc in existing_sched_excs:
            s_app_id = (s_exc.get("metadata") or {}).get("application_id")
            s_cand_id = (s_exc.get("metadata") or {}).get("student_id")
            if s_app_id:
                app_match = await db.applications.find_one({"id": s_app_id})
                if app_match:
                    app_st = (app_match.get("status") or "").upper()
                    tech_st = (app_match.get("technical_status") or "").upper()
                    apt_st = (app_match.get("aptitude_status") or "").upper()
                    if (
                        app_st in ["REJECTED", "NOT_SHORTLISTED", "INELIGIBLE", "REJECTED_AT_APTITUDE", "APTITUDE_FAILED", "REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED", "REJECTED_AT_HR", "DISQUALIFIED", "FAILED"] or
                        tech_st in ["FAILED", "DISQUALIFIED", "REJECTED"] or
                        apt_st in ["FAILED", "DISQUALIFIED", "REJECTED"] or
                        (tech_st not in ["QUALIFIED", "PASSED"] and app_st not in ["TECHNICAL_QUALIFIED", "HR_INTERVIEW_PENDING", "HR_INTERVIEW_ALLOCATED", "INTERVIEW_READY", "INTERVIEW_PENDING"])
                    ):
                        await db.exceptions.delete_one({"id": s_exc.get("id")})

        # =====================================================================
        # 3. SCAN INTERVIEW SCHEDULE CONFLICTS (Double Bookings)
        # =====================================================================
        active_interviews = await db.interviews.find({
            "status": {"$nin": ["CANCELLED", "REJECTED", "COMPLETED"]}
        }, {"_id": 0}).to_list(length=200)

        # Check room conflicts
        room_slots: Dict[str, List[Dict[str, Any]]] = {}
        for intv in active_interviews:
            r_name = intv.get("roomName") or intv.get("room_name") or intv.get("roomId")
            dt = intv.get("date") or intv.get("interview_date")
            ts = intv.get("timeSlot") or intv.get("time_slot") or intv.get("interview_time")
            if r_name and dt and ts:
                key = f"{r_name}_{dt}_{ts}".lower()
                room_slots.setdefault(key, []).append(intv)

        for key, ints in room_slots.items():
            if len(ints) > 1:
                int1, int2 = ints[0], ints[1]
                exc_id = f"exc-conflict-room-{int1.get('id')}-{int2.get('id')}"
                existing = await db.exceptions.find_one({"id": exc_id})

                r_name = int1.get("roomName") or int1.get("room_name") or "Room"
                dt = int1.get("date") or int1.get("interview_date")
                ts = int1.get("timeSlot") or int1.get("time_slot")

                exc_doc = {
                    "id": exc_id,
                    "title": f"Room Double Booking: {r_name} ({ts})",
                    "description": f"Multiple interview sessions assigned to '{r_name}' simultaneously on {dt} ({ts}) for {int1.get('candidateName')} and {int2.get('candidateName')}.",
                    "severity": "critical",
                    "status": existing.get("status", "open") if existing else "open",
                    "category": "room",
                    "timestamp": existing.get("timestamp") if existing else now_str,
                    "affectedEntity": f"{r_name} ({dt})",
                    "aiRecommendation": f"Relocate one candidate's interview session to an alternative vacant room.",
                    "suggestedActionText": f"Reassign Room for {int2.get('candidateName')}",
                    "recommendedAction": "RESCHEDULE_INTERVIEW",
                    "actionText": "Manage Rooms",
                    "actionRoute": "/panels",
                    "candidateAvailable": True,
                    "panelAvailable": True,
                    "roomAvailable": False,
                    "created_at": existing.get("created_at") if existing else now_iso,
                    "metadata": {"interview_1": int1.get("id"), "interview_2": int2.get("id"), "room": r_name, "timeSlot": ts}
                }

                if not existing:
                    await db.exceptions.insert_one(exc_doc)

        # =====================================================================
        # 4. SCAN OFFERS AWAITING CANDIDATE RESPONSE
        # =====================================================================
        pending_offers = await db.offers.find({
            "status": {"$in": ["OFFER_ISSUED", "PENDING", "issued"]}
        }, {"_id": 0}).to_list(length=100)

        for off in pending_offers:
            off_id = off.get("id") or off.get("offer_id")
            if not off_id:
                continue

            exc_id = f"exc-offer-pending-{off_id}"
            existing = await db.exceptions.find_one({"id": exc_id})

            st_name = off.get("student_name") or "Candidate"
            cp_name = off.get("company_name") or "Company"
            pkg = off.get("package_lpa", 0)

            exc_doc = {
                "id": exc_id,
                "title": f"Offer Awaiting Response: {st_name} ({cp_name})",
                "description": f"Formal placement offer of INR {pkg:.2f} LPA issued to {st_name} is awaiting candidate response.",
                "severity": "info",
                "status": existing.get("status", "open") if existing else "open",
                "category": "candidate",
                "timestamp": existing.get("timestamp") if existing else now_str,
                "affectedEntity": f"{st_name} - {cp_name}",
                "aiRecommendation": f"Monitor response window and dispatch automated reminder if response is delayed.",
                "suggestedActionText": f"Send Reminder to {st_name}",
                "recommendedAction": "SEND_REMINDER",
                "actionText": "View Offers",
                "actionRoute": "/admin/candidates",
                "candidateAvailable": True,
                "panelAvailable": True,
                "roomAvailable": True,
                "created_at": existing.get("created_at") if existing else now_iso,
                "metadata": {"offer_id": off_id, "student_name": st_name, "company_name": cp_name}
            }

            if not existing:
                await db.exceptions.insert_one(exc_doc)

        # Auto-resolve accepted / declined / confirmed offers
        settled_offers = await db.offers.find({
            "status": {"$in": ["ACCEPTED", "DECLINED", "JOINING_CONFIRMED", "accepted", "declined", "joining_confirmed"]}
        }, {"_id": 0}).to_list(length=200)

        for off in settled_offers:
            off_id = off.get("id") or off.get("offer_id")
            if off_id:
                exc_id = f"exc-offer-pending-{off_id}"
                await db.exceptions.update_one(
                    {"id": exc_id, "status": {"$ne": "resolved"}},
                    {"$set": {"status": "resolved", "resolvedBy": "Candidate Action", "resolved_at": now_iso}}
                )

    except Exception as e:
        logger.warning(f"Error during autonomous exceptions scan: {e}")

    # Return active + resolved exceptions
    all_exceptions = await db.exceptions.find({}, {"_id": 0}).to_list(length=200)
    return all_exceptions
