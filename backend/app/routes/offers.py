"""Offer & Joining API Routes for PlaceMind."""
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Query

from bson import ObjectId
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user, require_role
from app.db.integrity import create_idempotent_notification
from app.services.audit_service import record_audit_event
from app.schemas.offer import (
    OfferCreateRequest,
    OfferResponse,
    OfferStudentActionRequest,
    JoiningConfirmationRequest,
)

logger = logging.getLogger("placemind.offers")

router = APIRouter(prefix="/api/offers", tags=["Offers & Joining"])


def _generate_default_offer_letter(
    student_name: str,
    company_name: str,
    job_title: str,
    package_lpa: float,
    job_location: str,
    joining_date: str,
    response_deadline: str,
) -> str:
    """Generates a formal corporate placement offer letter text."""
    return (
        f"Dear {student_name},\n\n"
        f"On behalf of {company_name}, we are delighted to extend an official offer of employment for the position of "
        f"{job_title}.\n\n"
        f"Key Offer Terms:\n"
        f"• Position: {job_title}\n"
        f"• Total Annual Compensation (CTC): INR {package_lpa:.2f} LPA\n"
        f"• Work Location: {job_location}\n"
        f"• Tentative Date of Joining: {joining_date}\n\n"
        f"This offer is subject to satisfactory completion of your academic degree and verification of original credentials. "
        f"Please review and submit your formal acceptance on the PlaceMind portal before {response_deadline}.\n\n"
        f"We look forward to welcoming you to the {company_name} team!\n\n"
        f"Sincerely,\n"
        f"Campus Talent Acquisition Team\n"
        f"{company_name}"
    )


@router.post("", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
async def create_and_issue_offer(
    req: OfferCreateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["placement_officer", "recruiter", "admin"]))
):
    """
    Recruiter or Placement Officer creates and issues an official Offer Letter to a candidate.
    Validates application existence and status.
    Stores offer in db.offers, updates db.applications to OFFERED, and dispatches student notification.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    app_id = req.application_id
    app_query_filters: List[Dict[str, Any]] = [{"id": app_id}, {"_id": app_id}]
    if ObjectId.is_valid(app_id):
        app_query_filters.append({"_id": ObjectId(app_id)})

    app = await db.applications.find_one({"$or": app_query_filters})
    
    # Fallback lookup by student_id and drive_id if not found by app_id directly
    if not app and (req.student_id or req.drive_id):
        fallback_query: Dict[str, Any] = {}
        if req.student_id:
            fallback_query["$or"] = [{"student_id": req.student_id}, {"studentId": req.student_id}, {"id": req.student_id}]
        if req.drive_id:
            fallback_query["drive_id"] = req.drive_id
        app = await db.applications.find_one(fallback_query)

    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found for candidate")

    canonical_app_id = app.get("id") or str(app.get("_id", ""))
    app_drive_id = app.get("drive_id") or app.get("driveId")
    
    # Validate drive relationship
    if req.drive_id and app_drive_id and req.drive_id != app_drive_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: candidate application does not belong to the specified placement drive."
        )

    drive_id = app_drive_id or req.drive_id
    drive = await db.drives.find_one({"$or": [{"id": drive_id}, {"_id": drive_id}]}) if drive_id else None

    # Derive authoritative company info from the drive and application records (do not trust arbitrary client input)
    effective_company_name = (
        (drive.get("companyName") or drive.get("company_name") if drive else None)
        or app.get("company_name")
        or app.get("companyName")
        or req.company_name
        or "Company"
    )
    effective_company_id = (
        (drive.get("companyId") or drive.get("company_id") if drive else None)
        or app.get("company_id")
        or app.get("companyId")
    )
    drive_recruiter_id = (drive.get("recruiter_id") or drive.get("recruiterId") if drive else None)

    student_id = app.get("student_id") or app.get("studentId") or req.student_id
    job_title = (
        (drive.get("roleTitle") or drive.get("job_title") if drive else None)
        or app.get("job_title")
        or app.get("roleTitle")
        or req.job_title
        or "Software Engineer"
    )
    student_name = app.get("student_name") or app.get("studentName") or "Candidate"
    student_email = (app.get("student_email") or app.get("studentEmail") or "").lower()

    # Recruiter company authorization check (Enforce strict company isolation)
    user_role = current_user.get("role", "")
    if user_role in ["recruiter", "company_recruiter"]:
        user_company_id = str(current_user.get("company_id") or current_user.get("companyId") or "").strip()
        user_company_name = str(current_user.get("company_name") or current_user.get("companyName") or current_user.get("company") or "").strip()
        user_id = str(current_user.get("id") or current_user.get("sub") or "").strip()

        # Check 1: Recruiter is the direct creator/owner of this drive
        is_direct_owner = bool(drive_recruiter_id and user_id and str(drive_recruiter_id).strip() == user_id)

        if not is_direct_owner:
            # Check 2: Match by company name
            if user_company_name and effective_company_name:
                if user_company_name.lower() != effective_company_name.strip().lower():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Unauthorized: cannot access drive for another company ({effective_company_name})."
                    )
            # Check 3: Match by company ID
            elif user_company_id and effective_company_id:
                if user_company_id != str(effective_company_id).strip():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Unauthorized: cannot access drive for another company."
                    )
            else:
                if not user_company_name and not user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Unauthorized: recruiter account is not associated with an authorized company."
                    )

    # Check for existing active offer
    existing_offer = await db.offers.find_one({
        "$or": [{"application_id": canonical_app_id}, {"application_id": app_id}],
        "status": {"$in": ["OFFERED", "ACCEPTED", "JOINING_CONFIRMED"]}
    })
    if existing_offer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active offer letter has already been issued for this application (Offer ID: {existing_offer.get('id')})."
        )

    now_iso = datetime.now().isoformat()
    offer_id = f"off-{uuid.uuid4().hex[:12]}"
    designation = req.designation or job_title
    location = req.job_location or "Bengaluru, India"
    deadline = req.response_deadline or datetime.now().strftime("%Y-%m-%d")

    terms = req.terms_and_conditions or [
        "Completion of undergraduate degree with no active backlogs.",
        "Submission of verified mark sheets and provisional degree certificate prior to joining.",
        "Compliance with corporate code of conduct and standard background verification.",
    ]

    benefits = req.benefits or [
        "Comprehensive Medical and Health Insurance Coverage",
        "Performance-Linked Annual Bonus & Relocation Allowance",
        "Continuous Learning, Cloud Certification & Upskilling Sponsorship",
    ]

    letter_text = req.offer_letter_text or _generate_default_offer_letter(
        student_name=student_name,
        company_name=effective_company_name,
        job_title=designation,
        package_lpa=req.package_lpa,
        job_location=location,
        joining_date=req.joining_date,
        response_deadline=deadline,
    )

    issuer_name = current_user.get("name") or "Placement Officer"
    issuer_role = current_user.get("role") or "placement_officer"

    offer_doc = {
        "id": offer_id,
        "offer_id": offer_id,
        "application_id": canonical_app_id,
        "student_id": student_id,
        "student_name": student_name,
        "student_email": student_email,
        "drive_id": drive_id,
        "company_name": effective_company_name,
        "company_id": effective_company_id,
        "job_title": job_title,
        "designation": designation,
        "package_lpa": req.package_lpa,
        "base_salary_lpa": req.base_salary_lpa or round(req.package_lpa * 0.8, 2),
        "joining_bonus_lpa": req.joining_bonus_lpa or 0.0,
        "job_location": location,
        "employment_type": req.employment_type or "Full-time",
        "joining_date": req.joining_date,
        "response_deadline": deadline,
        "status": "OFFERED",
        "offer_letter_text": letter_text,
        "terms_and_conditions": terms,
        "benefits": benefits,
        "issued_by": issuer_name,
        "issued_by_role": issuer_role,
        "issued_at": now_iso,
        "responded_at": None,
        "decline_reason": None,
        "joining_details": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    await db.offers.insert_one(offer_doc)

    # Update application record
    app_update_query = [{"id": canonical_app_id}, {"id": app_id}]
    if app.get("_id") is not None:
        app_update_query.append({"_id": app.get("_id")})
    if ObjectId.is_valid(app_id):
        app_update_query.append({"_id": ObjectId(app_id)})

    await db.applications.update_one(
        {"$or": app_update_query},
        {"$set": {
            "status": "OFFERED",
            "stage": "OFFERED",
            "pipeline_stage": "OFFERED",
            "offer_id": offer_id,
            "package_lpa": req.package_lpa,
            "offer_status": "OFFERED",
            "offer_issued_at": now_iso,
            "updated_at": now_iso,
        }}
    )

    # Dispatch rich student notification
    if student_id:
        notif_id = f"notif-off-{student_id}-{offer_id}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": student_id,
            "recipientRole": "student",
            "recipientName": student_name,
            "type": "OFFER_RECEIVED",
            "title": f"🎉 Official Offer Letter: {effective_company_name}!",
            "message": (
                f"Congratulations {student_name}!\n\n"
                f"You have officially received an offer from {effective_company_name} for the position of {job_title} "
                f"with a package of INR {req.package_lpa:.2f} LPA. Please review and respond before {deadline}."
            ),
            "application_id": canonical_app_id,
            "student_id": student_id,
            "drive_id": drive_id,
            "offer_id": offer_id,
            "relatedRoute": "/student/offers",
            "read": False,
            "important": True,
            "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
            "created_at": now_iso,
        })

    await record_audit_event(
        db=db,
        user=current_user,
        action="OFFER_ISSUED",
        entity="Offer",
        entity_id=offer_id,
        detail=f"Offer letter issued to {student_name} for {job_title} at {effective_company_name} ({req.package_lpa:.2f} LPA)."
    )

    return OfferResponse(**offer_doc)


@router.get("", response_model=List[OfferResponse])
async def list_offers(
    drive_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    student_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List offers with role-based filtering.
    Officers see all, Recruiters see owned company drives, Students see their own offers.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}
    user_role = current_user.get("role", "")
    user_id = current_user.get("id")

    if user_role == "student":
        query["$or"] = [{"student_id": user_id}, {"student_email": (current_user.get("email") or "").lower()}]
    elif user_role in ["recruiter", "company_recruiter"]:
        comp_name = current_user.get("company_name") or current_user.get("companyName")
        if comp_name:
            query["company_name"] = {"$regex": f"^{comp_name}$", "$options": "i"}

    if drive_id:
        query["drive_id"] = drive_id
    if status_filter:
        query["status"] = status_filter.upper()
    if student_id and user_role != "student":
        query["student_id"] = student_id

    raw_offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=300)
    return [OfferResponse(**o) for o in raw_offers]


@router.get("/me", response_model=List[OfferResponse])
async def get_my_offers(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all offers issued to the currently authenticated student."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    query = {
        "$or": [
            {"student_id": student_id},
            {"studentId": student_id},
            {"student_email": student_email},
        ]
    }
    raw_offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return [OfferResponse(**o) for o in raw_offers]


@router.get("/{offer_id}", response_model=OfferResponse)
async def get_offer_detail(
    offer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve a single offer document by ID with access control."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    offer = await db.offers.find_one({"$or": [{"id": offer_id}, {"offer_id": offer_id}]}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    user_role = current_user.get("role", "")
    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Student ownership check
    if user_role == "student":
        if offer.get("student_id") != user_id and offer.get("student_email", "").lower() != user_email:
            raise HTTPException(status_code=403, detail="Unauthorized access to this offer letter.")

    return OfferResponse(**offer)


@router.post("/{offer_id}/respond", response_model=OfferResponse)
async def respond_to_offer(
    offer_id: str,
    req: OfferStudentActionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Student accepts or declines an issued placement offer letter.
    If ACCEPT: captures confirmed joining date & logistics, sets status=ACCEPTED, updates application to JOINING_CONFIRMED.
    If DECLINE: captures reason, sets status=DECLINED, updates application to OFFER_DECLINED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    offer = await db.offers.find_one({"$or": [{"id": offer_id}, {"offer_id": offer_id}]})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    if offer.get("student_id") != user_id and offer.get("student_email", "").lower() != user_email:
        raise HTTPException(status_code=403, detail="Unauthorized: Only the recipient student can respond to this offer.")

    curr_status = (offer.get("status") or "OFFERED").upper()
    if curr_status in ["ACCEPTED", "DECLINED", "JOINING_CONFIRMED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This offer has already been responded to (Current status: {curr_status})."
        )

    action = req.action.upper().strip()
    if action not in ["ACCEPT", "DECLINE"]:
        raise HTTPException(status_code=400, detail="Action must be either 'ACCEPT' or 'DECLINE'.")

    now_iso = datetime.now().isoformat()
    app_id = offer.get("application_id")
    student_name = offer.get("student_name") or current_user.get("name") or "Student"
    company_name = offer.get("company_name") or "Company"
    job_title = offer.get("job_title") or "Software Engineer"
    drive_id = offer.get("drive_id")

    if action == "ACCEPT":
        joining_details = {
            "confirmed_joining_date": req.joining_date or offer.get("joining_date"),
            "preferred_location": req.preferred_location or offer.get("job_location"),
            "emergency_contact_name": req.emergency_contact_name,
            "emergency_contact_phone": req.emergency_contact_phone,
            "student_notes": req.notes,
            "accepted_at": now_iso,
        }

        await db.offers.update_one(
            {"$or": [{"id": offer_id}, {"offer_id": offer_id}]},
            {"$set": {
                "status": "ACCEPTED",
                "responded_at": now_iso,
                "joining_details": joining_details,
                "updated_at": now_iso,
            }}
        )

        # Update application state
        if app_id:
            await db.applications.update_one(
                {"$or": [{"id": app_id}, {"_id": app_id}]},
                {"$set": {
                    "status": "OFFER_ACCEPTED",
                    "stage": "JOINING_CONFIRMED",
                    "pipeline_stage": "JOINING_CONFIRMED",
                    "offer_status": "ACCEPTED",
                    "joining_date": joining_details["confirmed_joining_date"],
                    "updated_at": now_iso,
                }}
            )

        # Update student profile to placed
        await db.students.update_one(
            {"$or": [{"id": user_id}, {"email": user_email}]},
            {"$set": {
                "placementStatus": "placed",
                "selectedCompany": company_name,
                "selectedRole": job_title,
                "joiningDate": joining_details["confirmed_joining_date"],
            }}
        )

        # Dispatch student confirmation notification
        notif_id = f"notif-off-acc-{user_id}-{offer_id}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": user_id,
            "recipientRole": "student",
            "recipientName": student_name,
            "type": "OFFER_ACCEPTED",
            "title": f"🎉 Offer Accepted — {company_name}!",
            "message": (
                f"Congratulations {student_name}! You have successfully accepted the offer for {job_title} at {company_name}. "
                f"Your confirmed joining date is {joining_details['confirmed_joining_date']}. Onboarding details will follow."
            ),
            "application_id": app_id,
            "student_id": user_id,
            "drive_id": drive_id,
            "offer_id": offer_id,
            "relatedRoute": "/student/offers",
            "read": False,
            "important": True,
            "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
            "created_at": now_iso,
        })

    else:  # DECLINE
        decline_reason = req.decline_reason or req.notes or "Candidate declined the placement offer."
        await db.offers.update_one(
            {"$or": [{"id": offer_id}, {"offer_id": offer_id}]},
            {"$set": {
                "status": "DECLINED",
                "responded_at": now_iso,
                "decline_reason": decline_reason,
                "updated_at": now_iso,
            }}
        )

        if app_id:
            await db.applications.update_one(
                {"$or": [{"id": app_id}, {"_id": app_id}]},
                {"$set": {
                    "status": "OFFER_DECLINED",
                    "stage": "OFFER_DECLINED",
                    "pipeline_stage": "OFFER_DECLINED",
                    "offer_status": "DECLINED",
                    "decline_reason": decline_reason,
                    "updated_at": now_iso,
                }}
            )

        notif_id = f"notif-off-dec-{user_id}-{offer_id}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": user_id,
            "recipientRole": "student",
            "recipientName": student_name,
            "type": "OFFER_DECLINED",
            "title": f"Offer Declined — {company_name}",
            "message": f"You have formally declined the offer from {company_name} for {job_title}.",
            "application_id": app_id,
            "student_id": user_id,
            "drive_id": drive_id,
            "offer_id": offer_id,
            "relatedRoute": "/student/offers",
            "read": False,
            "important": False,
            "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
            "created_at": now_iso,
        })

    await record_audit_event(
        db=db,
        user=current_user,
        action=f"OFFER_{action}",
        entity="Offer",
        entity_id=offer_id,
        detail=f"Candidate {student_name} {'accepted' if action == 'ACCEPT' else 'declined'} offer for {job_title} at {company_name}."
    )

    updated = await db.offers.find_one({"$or": [{"id": offer_id}, {"offer_id": offer_id}]}, {"_id": 0})
    return OfferResponse(**updated)


@router.post("/{offer_id}/confirm-joining", response_model=OfferResponse)
async def confirm_joining_logistics(
    offer_id: str,
    req: JoiningConfirmationRequest,
    current_user: Dict[str, Any] = Depends(require_role(["placement_officer", "recruiter", "admin"]))
):
    """
    Placement Officer or Recruiter confirms final onboarding and joining logistics.
    Marks offer status = JOINING_CONFIRMED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    offer = await db.offers.find_one({"$or": [{"id": offer_id}, {"offer_id": offer_id}]})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if (offer.get("status") or "").upper() != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail=f"Offer must be in 'ACCEPTED' status before confirming joining. Current status: '{offer.get('status')}'."
        )

    now_iso = datetime.now().isoformat()
    officer_name = current_user.get("name") or "Placement Cell"
    joining_details = offer.get("joining_details") or {}
    joining_details.update({
        "reporting_venue_or_link": req.reporting_venue_or_link,
        "reporting_time": req.reporting_time,
        "onboarding_notes": req.onboarding_notes,
        "confirmed_by": officer_name,
        "confirmed_at": now_iso,
    })

    await db.offers.update_one(
        {"$or": [{"id": offer_id}, {"offer_id": offer_id}]},
        {"$set": {
            "status": "JOINING_CONFIRMED",
            "joining_details": joining_details,
            "updated_at": now_iso,
        }}
    )

    app_id = offer.get("application_id")
    if app_id:
        await db.applications.update_one(
            {"$or": [{"id": app_id}, {"_id": app_id}]},
            {"$set": {
                "status": "JOINING_CONFIRMED",
                "stage": "PLACEMENT_COMPLETED",
                "pipeline_stage": "PLACEMENT_COMPLETED",
                "joining_details": joining_details,
                "updated_at": now_iso,
            }}
        )

    student_id = offer.get("student_id")
    student_name = offer.get("student_name") or "Student"
    company_name = offer.get("company_name") or "Company"

    if student_id:
        notif_id = f"notif-join-conf-{student_id}-{offer_id}"
        await create_idempotent_notification(db, {
            "id": notif_id,
            "recipient_user_id": student_id,
            "recipientRole": "student",
            "recipientName": student_name,
            "type": "JOINING_CONFIRMED",
            "title": f"🚀 Onboarding & Joining Confirmed: {company_name}!",
            "message": (
                f"Congratulations {student_name}! Your onboarding logistics for {company_name} have been confirmed. "
                f"Reporting: {req.reporting_venue_or_link} at {req.reporting_time}."
            ),
            "application_id": app_id,
            "student_id": student_id,
            "drive_id": offer.get("drive_id"),
            "offer_id": offer_id,
            "relatedRoute": "/student/offers",
            "read": False,
            "important": True,
            "timestamp": datetime.now().strftime("%I:%M %p • %d %b %Y"),
            "created_at": now_iso,
        })

    await record_audit_event(
        db=db,
        user=current_user,
        action="JOINING_CONFIRMED",
        entity="Offer",
        entity_id=offer_id,
        detail=f"Joining and onboarding confirmed for {student_name} at {company_name} ({req.reporting_venue_or_link})."
    )

    updated = await db.offers.find_one({"$or": [{"id": offer_id}, {"offer_id": offer_id}]}, {"_id": 0})
    return OfferResponse(**updated)
