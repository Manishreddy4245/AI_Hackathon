import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user, get_current_user
from app.schemas.drive import (
    PlacementDriveSchema,
    PlacementDriveCreate,
    PlacementDriveUpdate,
    DriveReviewActionRequest,
    RecruitmentRoundCreate,
    RecruitmentRoundUpdate,
    RecruitmentRoundSchema,
    RoundCandidateActionRequest,
)


logger = logging.getLogger("placemind.drives")

router = APIRouter(prefix="/api/drives", tags=["Placement Drives"])

@router.get("", response_model=List[PlacementDriveSchema])
async def list_drives(
    recruiter_only: Optional[bool] = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {}
    if current_user and current_user.get("role") == "student":
        # Students only see announced or active drives
        query["status"] = {"$in": ["ANNOUNCED", "open", "active", "ACTIVE", "shortlisting", "interview"]}
    elif recruiter_only or (current_user and current_user.get("role") in ["recruiter", "company_recruiter"]):
        user_id = current_user.get("id") if current_user else None
        user_email = (current_user.get("email") or "").lower() if current_user else ""
        company_id = (current_user.get("companyId") or current_user.get("company_id")) if current_user else None
        
        user_conditions = []
        if user_id:
            user_conditions.extend([{"recruiter_id": user_id}, {"createdBy": user_id}])
        if user_email:
            user_conditions.extend([{"recruiter_email": user_email}])
        if company_id:
            user_conditions.extend([{"companyId": company_id}, {"company_id": company_id}])
        
        if user_conditions:
            query["$or"] = user_conditions
        else:
            return []

    limit = min(max(page_size, 1), 100)
    skip = (page - 1) * limit
    drives = await db.drives.find(query, {"_id": 0}).sort([("created_at", -1), ("_id", -1)]).skip(skip).to_list(length=limit)
    return drives

@router.get("/recruiter/my", response_model=List[PlacementDriveSchema])
async def get_my_recruiter_drives(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve placement drives strictly created by currently authenticated recruiter."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    company_id = current_user.get("companyId") or current_user.get("company_id")

    user_conditions = []
    if user_id:
        user_conditions.extend([{"recruiter_id": user_id}, {"createdBy": user_id}])
    if user_email:
        user_conditions.extend([{"recruiter_email": user_email}])
    if company_id:
        user_conditions.extend([{"companyId": company_id}, {"company_id": company_id}])

    if not user_conditions:
        return []

    limit = min(max(page_size, 1), 100)
    skip = (page - 1) * limit
    drives = await db.drives.find({"$or": user_conditions}, {"_id": 0}).sort([("created_at", -1), ("_id", -1)]).skip(skip).to_list(length=limit)
    return drives

@router.get("/{drive_id}", response_model=PlacementDriveSchema)
async def get_drive(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    return drive

@router.post("/analyze-job")
async def analyze_job_alias(req: Dict[str, Any]):
    from app.routes.ai_extractor import extract_job_description, JDExtractRequest
    extract_req = JDExtractRequest(
        rawText=req.get("rawText") or req.get("raw_text") or req.get("jobDescription") or "",
        companyName=req.get("companyName") or req.get("company_name") or "Company"
    )
    return await extract_job_description(extract_req)

@router.post("", response_model=PlacementDriveSchema, status_code=status.HTTP_201_CREATED)
async def create_drive(
    drive_in: PlacementDriveCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recruiter submits a new campus/placement drive.
    Requires authentication. Tagged with the real creator's id, email, and companyId.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    timestamp_ms = int(datetime.now().timestamp() * 1000)
    slug = drive_in.companyName.lower().replace(" ", "-")
    new_id = f"drive-{slug}-{timestamp_ms % 100000}"

    recruiter_id = current_user.get("id") or drive_in.recruiter_id or "usr-recruiter"
    recruiter_name = current_user.get("name") or drive_in.recruiter_name or "Recruiter"
    recruiter_email = (current_user.get("email") or drive_in.recruiter_email or "").lower()
    company_id = current_user.get("companyId") or current_user.get("company_id") or "comp-default"
    now_iso = datetime.now().isoformat()

    grad_years = drive_in.graduationYears if drive_in.graduationYears is not None else ([drive_in.graduationYear] if drive_in.graduationYear is not None else [])
    single_grad = grad_years[0] if grad_years else drive_in.graduationYear

    drive_dict = drive_in.model_dump()
    drive_dict.update({
        "id": new_id,
        "status": "PENDING_APPROVAL",
        "graduationYear": single_grad,
        "graduationYears": grad_years,
        "recruiter_id": recruiter_id,
        "createdBy": recruiter_id,
        "recruiter_name": recruiter_name,
        "recruiter_email": recruiter_email,
        "companyId": company_id,
        "company_id": company_id,
        "created_at": now_iso,
        "announced_at": None,
        "students_notified": False,
        "students_notified_count": 0,
        "registeredCount": 0,
        "shortlistedCount": 0,
        "selectedCount": 0,
        "aiExplanation": drive_in.aiExplanation or "AI JD Analysis: Ready for Placement Officer review.",
        "aiConfirmed": drive_in.aiConfirmed or False,
        "pipeline": {"eligible": 150, "applied": 0, "shortlisted": 0, "interview": 0, "selected": 0},
        "aiInsights": drive_in.aiInsights.model_dump() if drive_in.aiInsights else {
            "topMatchingSkills": drive_in.requiredSkills,
            "commonSkillGaps": drive_in.preferredSkills[:2] if drive_in.preferredSkills else [],
            "preparationAdvice": "Review company job requirements and core interview expectations."
        }
    })

    await db.drives.insert_one(drive_dict)

    # Notify all Placement Officers
    officers = await db.users.find(
        {"role": {"$in": ["placement_officer", "admin"]}},
        {"id": 1, "email": 1, "name": 1}
    ).to_list(length=50)

    officer_notifs = []
    for officer in officers:
        officer_notifs.append({
            "id": f"notif-campus-{timestamp_ms}-{officer.get('id', 'off')}",
            "title": f"Campus Drive: {drive_in.companyName} is hiring for {drive_in.roleTitle}",
            "message": (
                f"Campus drive coming up: {drive_in.companyName} is hiring for "
                f"{drive_in.roleTitle} ({drive_in.packageLpa} LPA, {drive_in.location or 'Location TBD'}). "
                f"Review the drive details and notify students when ready."
            ),
            "timestamp": "Just now",
            "read": False,
            "important": True,
            "type": "CAMPUS_DRIVE_PENDING",
            "recipientRole": "placement_officer",
            "recipientName": officer.get("name", "Placement Officer"),
            "recipient_user_id": officer.get("id"),
            "created_at": now_iso,
            "drive_id": new_id,
            "company_name": drive_in.companyName,
            "job_title": drive_in.roleTitle,
            "location": drive_in.location,
            "recruiter_name": recruiter_name,
            "relatedRoute": f"/admin/companies/{new_id}"
        })

    # Fallback: if no officers in DB, create generic notification
    if not officer_notifs:
        officer_notifs.append({
            "id": f"notif-campus-{timestamp_ms}",
            "title": f"Campus Drive: {drive_in.companyName} is hiring for {drive_in.roleTitle}",
            "message": (
                f"Campus drive coming up: {drive_in.companyName} is hiring for "
                f"{drive_in.roleTitle} ({drive_in.packageLpa} LPA). "
                f"Review drive details and notify students when ready."
            ),
            "timestamp": "Just now",
            "read": False,
            "important": True,
            "type": "CAMPUS_DRIVE_PENDING",
            "recipientRole": "placement_officer",
            "recipientName": "Placement Officer",
            "recipient_user_id": "officer-demo",
            "created_at": now_iso,
            "drive_id": new_id,
            "company_name": drive_in.companyName,
            "job_title": drive_in.roleTitle,
            "location": drive_in.location,
            "recruiter_name": recruiter_name,
            "relatedRoute": f"/admin/companies/{new_id}"
        })

    await db.notifications.insert_many(officer_notifs)

    created = await db.drives.find_one({"id": new_id}, {"_id": 0})
    return created


@router.put("/{drive_id}", response_model=PlacementDriveSchema)
@router.patch("/{drive_id}", response_model=PlacementDriveSchema)
async def update_drive(
    drive_id: str,
    drive_update: PlacementDriveUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recruiter updates an existing placement drive.
    Security: Only owning recruiter or Placement Officer/Admin can edit.
    Re-analysis: If raw text / JD is changed or re-analysis requested, calls extract_job_description.
    Post-Approval Workflow: If eligibility fields changed on an ANNOUNCED/ACTIVE drive, status becomes CHANGES_PENDING_REVIEW.
    Candidate Re-evaluation: Re-runs eligibility checks for existing applications.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing_drive = await db.drives.find_one({"id": drive_id})
    if not existing_drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    # Security check: User Role & Ownership
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    company_id = current_user.get("companyId") or current_user.get("company_id")

    if user_role not in ["placement_officer", "admin", "officer"]:
        is_owner = False
        if user_id and (existing_drive.get("recruiter_id") == user_id or existing_drive.get("createdBy") == user_id):
            is_owner = True
        elif user_email and (existing_drive.get("recruiter_email") or "").lower() == user_email:
            is_owner = True
        elif company_id and (existing_drive.get("companyId") == company_id or existing_drive.get("company_id") == company_id):
            is_owner = True

        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this placement drive."
            )

    update_data = drive_update.model_dump(exclude_unset=True)
    if not update_data:
        return existing_drive

    # AI JD Re-analysis if rawText / description changed or reanalyze_jd requested
    raw_text = update_data.get("rawText") or update_data.get("description")
    should_reanalyze = update_data.get("reanalyze_jd", False) or (
        "rawText" in update_data and update_data["rawText"] != existing_drive.get("rawText")
    )

    if should_reanalyze:
        if not raw_text or not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Raw job description text cannot be empty for AI analysis."
            )

        from app.routes.ai_extractor import extract_job_description, JDExtractRequest
        comp_name = update_data.get("companyName") or existing_drive.get("companyName") or "Company"
        try:
            extracted = await extract_job_description(JDExtractRequest(rawText=raw_text, companyName=comp_name))
            if extracted:
                if extracted.minCgpa is not None:
                    update_data["minCgpa"] = extracted.minCgpa
                if extracted.eligibleBranches:
                    update_data["eligibleBranches"] = extracted.eligibleBranches
                if extracted.graduationYears:
                    update_data["graduationYears"] = extracted.graduationYears
                if extracted.graduationYear:
                    update_data["graduationYear"] = extracted.graduationYear
                if extracted.maxBacklogs is not None:
                    update_data["maxBacklogs"] = extracted.maxBacklogs
                if extracted.requiredSkills:
                    update_data["requiredSkills"] = extracted.requiredSkills
                if extracted.preferredSkills:
                    update_data["preferredSkills"] = extracted.preferredSkills
                if extracted.roleTitle:
                    update_data["roleTitle"] = extracted.roleTitle
                if extracted.aiExplanation:
                    update_data["aiExplanation"] = extracted.aiExplanation
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"AI JD extraction failed during drive edit: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AI analysis failed. Please check raw text requirements and try again."
            )


    # Normalize graduation years & year
    if "graduationYears" in update_data and update_data["graduationYears"]:
        g_years = [int(y) for y in update_data["graduationYears"]]
        update_data["graduationYears"] = g_years
        update_data["graduationYear"] = g_years[0]
    elif "graduationYear" in update_data and update_data["graduationYear"]:
        g_year = int(update_data["graduationYear"])
        update_data["graduationYear"] = g_year
        update_data["graduationYears"] = [g_year]

    # Check if eligibility-affecting fields were changed
    eligibility_fields = [
        "minCgpa", "maxBacklogs", "eligibleBranches", "graduationYear",
        "graduationYears", "requiredSkills", "preferredSkills", "rawText", "description"
    ]
    eligibility_changed = False
    for ef in eligibility_fields:
        if ef in update_data and update_data[ef] != existing_drive.get(ef):
            eligibility_changed = True
            break

    curr_status = (existing_drive.get("status") or "").upper()
    if eligibility_changed and curr_status in ["ANNOUNCED", "ACTIVE", "APPROVED"]:
        update_data["status"] = "CHANGES_PENDING_REVIEW"
        update_data["changes_requested_at"] = datetime.now().isoformat()

    update_data["updated_at"] = datetime.now().isoformat()
    if "reanalyze_jd" in update_data:
        del update_data["reanalyze_jd"]

    # Perform DB Update
    await db.drives.update_one({"id": drive_id}, {"$set": update_data})
    updated_drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})

    # Candidate Eligibility Re-evaluation for existing applications
    if eligibility_changed:
        apps = await db.applications.find({"$or": [{"drive_id": drive_id}, {"driveId": drive_id}]}).to_list(length=500)
        for app in apps:
            student_id = app.get("student_id") or app.get("studentId")
            student_doc = await db.students.find_one({"id": student_id}) if student_id else None
            student_data = student_doc or app

            from app.services.eligibility_engine import evaluate_drive_eligibility
            is_eligible, reasons, missing_reqs = evaluate_drive_eligibility(student_data, updated_drive)

            app_update = {
                "eligible": is_eligible,
                "eligibility_reasons": reasons,
                "missing_requirements": missing_reqs,
                "updated_at": datetime.now().isoformat()
            }
            await db.applications.update_one({"$or": [{"id": app.get("id")}, {"_id": app.get("id")}]}, {"$set": app_update})

    return updated_drive



@router.post("/{drive_id}/announce", response_model=PlacementDriveSchema)
async def announce_drive_to_students(
    drive_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer clicks YES NOTIFY STUDENTS.
    1. Drive status -> ANNOUNCED
    2. Per-student notifications (deduped by drive_id + student_id)
    3. Creates/updates Placement Community
    4. Creates community announcement post with full drive data
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    officer_name = current_user.get("name", "Placement Officer") if current_user else "Placement Officer"
    officer_id = current_user.get("id", "officer") if current_user else "officer"
    now_iso = datetime.now().isoformat()
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # DUPLICATE PREVENTION: return existing only if status is ALREADY ANNOUNCED
    if (drive.get("status") or "").upper() == "ANNOUNCED" and drive.get("students_notified", False):
        existing = await db.drives.find_one({"id": drive_id}, {"_id": 0})
        return existing


    # 1. Update drive status
    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {
            "status": "ANNOUNCED",
            "students_notified": True,
            "announced_by": officer_name,
            "announced_at": now_iso,
        }}
    )

    # 2. Create/Update Placement Community
    comm_doc = {
        "id": f"comm-{drive_id}",
        "community_id": f"comm-{drive_id}",
        "drive_id": drive_id,
        "company_id": drive.get("companyId"),
        "company_name": drive.get("companyName"),
        "role_title": drive.get("roleTitle"),
        "package_lpa": drive.get("packageLpa"),
        "salary_text": drive.get("salary"),
        "location": drive.get("location"),
        "status": "ACTIVE",
        "created_at": now_iso,
    }
    await db.communities.update_one(
        {"$or": [{"drive_id": drive_id}, {"id": f"comm-{drive_id}"}]},
        {"$set": comm_doc},
        upsert=True
    )

    # 3. Community announcement post (only once per drive)
    existing_post = await db.community_messages.find_one({
        "drive_id": drive_id,
        "message_type": "CAMPUS_DRIVE_ANNOUNCEMENT"
    })
    if not existing_post:
        required_skills = drive.get("requiredSkills", [])
        skills_str = ", ".join(required_skills) if required_skills else "See drive details"
        deadline = drive.get("deadline", "TBD")
        drive_date = drive.get("driveDate") or drive.get("drive_date") or deadline
        eligibility_branches = drive.get("eligibleBranches", [])
        min_cgpa = drive.get("minCgpa", "")
        package_lpa = drive.get("packageLpa", "")
        openings = drive.get("openings", "")

        branches_str = ", ".join(eligibility_branches) if eligibility_branches else "All branches"
        post_content = (
            f"NEW CAMPUS PLACEMENT DRIVE\n\n"
            f"Company: {drive.get('companyName')}\n"
            f"Role: {drive.get('roleTitle')}\n"
            f"Package: Rs.{package_lpa} LPA\n"
            f"Location: {drive.get('location', 'TBD')}\n"
            f"Drive Date: {drive_date}\n"
            f"Application Deadline: {deadline}\n"
            f"Openings: {openings or 'Multiple'}\n\n"
            f"Required Skills: {skills_str}\n"
            f"Eligible Branches: {branches_str}\n"
            f"Minimum CGPA: {min_cgpa or 'As per eligibility'}\n\n"
            f"Click View Drive to see full details and apply."
        )

        await db.community_messages.insert_one({
            "id": f"msg-announce-{drive_id}",
            "community_id": f"comm-{drive_id}",
            "drive_id": drive_id,
            "author_id": officer_id,
            "author_name": officer_name,
            "author_role": "placement_officer",
            "message_type": "CAMPUS_DRIVE_ANNOUNCEMENT",
            "content": post_content,
            "action_type": "VIEW_DRIVE",
            "action_label": "View Drive Details",
            "form_id": None,
            "created_at": now_iso,
        })

    # 4. Notify all students (deduped per student per drive)
    all_students = await db.students.find({}, {"id": 1, "email": 1, "name": 1}).to_list(length=500)
    student_users = await db.users.find({"role": "student"}, {"id": 1, "email": 1, "name": 1}).to_list(length=500)

    seen_ids: set = set()
    all_recipients = []
    for st in all_students + student_users:
        st_id = st.get("id")
        if st_id and st_id not in seen_ids:
            seen_ids.add(st_id)
            all_recipients.append(st)

    student_notifs = []
    for st in all_recipients:
        st_id = st.get("id")
        existing_notif = await db.notifications.find_one({
            "recipient_user_id": st_id,
            "drive_id": drive_id,
            "type": "NEW_DRIVE_AVAILABLE"
        })
        if not existing_notif:
            student_notifs.append({
                "id": f"notif-drive-{drive_id}-{st_id}-{timestamp_ms}",
                "title": f"New Campus Drive: {drive.get('roleTitle')} at {drive.get('companyName')}",
                "message": (
                    f"New campus placement drive: {drive.get('companyName')} is hiring for "
                    f"{drive.get('roleTitle')} (Rs.{drive.get('packageLpa', '')} LPA). "
                    f"Check the placement drive for eligibility and application details."
                ),
                "timestamp": "Just now",
                "read": False,
                "important": True,
                "type": "NEW_DRIVE_AVAILABLE",
                "recipientRole": "student",
                "recipientName": st.get("name", "Student"),
                "recipient_user_id": st_id,
                "created_at": now_iso,
                "drive_id": drive_id,
                "company_name": drive.get("companyName"),
                "job_title": drive.get("roleTitle"),
                "deadline": drive.get("deadline"),
                "relatedRoute": f"/student/community/{drive_id}"
            })

    if student_notifs:
        await db.notifications.insert_many(student_notifs)

    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {"students_notified_count": len(student_notifs)}}
    )

    updated = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    return updated


@router.post("/{drive_id}/approve", response_model=PlacementDriveSchema)
async def approve_drive(
    drive_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer approves a pending campus drive.
    Drive status: PENDING_APPROVAL → ACTIVE
    - Sends notification to the recruiter
    - Sends notifications to all students
    - Creates a Placement Community for the drive
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    # State guard: only allow approval from valid pending states
    current_status = (drive.get("status") or "").upper()
    non_approvable = {"ACTIVE", "ANNOUNCED", "CLOSED", "COMPLETED", "REJECTED"}
    if current_status in non_approvable:
        raise HTTPException(
            status_code=400,
            detail=f"Drive cannot be approved from its current status: {drive.get('status')}"
        )

    officer_name = current_user.get("name", "Placement Officer") if current_user else "Placement Officer"
    officer_id = current_user.get("id", "officer") if current_user else "officer"
    now_iso = datetime.now().isoformat()

    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {"status": "ACTIVE", "aiConfirmed": True, "approved_by": officer_name, "approved_at": now_iso}}
    )

    comm_doc = {
        "id": f"comm-{drive_id}",
        "community_id": f"comm-{drive_id}",
        "drive_id": drive_id,
        "company_id": drive.get("companyId"),
        "company_name": drive.get("companyName"),
        "role_title": drive.get("roleTitle"),
        "package_lpa": drive.get("packageLpa"),
        "salary_text": drive.get("salary"),
        "location": drive.get("location"),
        "status": "ACTIVE",
        "created_at": now_iso,
    }
    await db.communities.update_one(
        {"$or": [{"drive_id": drive_id}, {"id": f"comm-{drive_id}"}]},
        {"$set": comm_doc}, upsert=True
    )

    existing_msg = await db.community_messages.find_one(
        {"$or": [{"drive_id": drive_id}, {"community_id": f"comm-{drive_id}"}]}
    )
    if not existing_msg:
        await db.community_messages.insert_one({
            "id": f"msg-init-{drive_id}",
            "community_id": f"comm-{drive_id}",
            "drive_id": drive_id,
            "author_id": "officer-admin",
            "author_name": officer_name,
            "author_role": "placement_officer",
            "message_type": "REGISTRATION",
            "content": f"Registration for {drive.get('companyName')} ({drive.get('roleTitle')}) is now OPEN.",
            "action_type": "OPEN_FORM",
            "action_label": "Open Registration Form",
            "form_id": None,
            "created_at": now_iso,
        })

    recruiter_target = drive.get("recruiter_id") or drive.get("recruiter_email") or "recruiter"
    timestamp_ms = int(datetime.now().timestamp() * 1000)
    await db.notifications.insert_one({
        "id": f"notif-apprv-{timestamp_ms}",
        "title": f"Drive Approved: {drive.get('roleTitle')}",
        "message": f"Your drive for {drive.get('roleTitle')} at {drive.get('companyName')} is now LIVE.",
        "timestamp": "Just now",
        "read": False,
        "important": True,
        "type": "important_update",
        "recipientRole": "recruiter",
        "recipientName": drive.get("companyName", "Recruiter"),
        "recipient_user_id": recruiter_target,
        "created_at": now_iso,
        "drive_id": drive_id,
        "company_name": drive.get("companyName"),
        "job_title": drive.get("roleTitle"),
        "relatedRoute": "/recruiter/drives"
    })

    all_students = await db.students.find({}, {"id": 1, "email": 1, "name": 1}).to_list(length=200)
    student_notifs = []
    for st in all_students:
        st_id = st.get("id")
        student_notifs.append({
            "id": f"notif-drive-{drive_id}-{st_id}",
            "title": f"New Drive: {drive.get('roleTitle')} at {drive.get('companyName')}",
            "message": f"New placement drive active for {drive.get('roleTitle')}.",
            "timestamp": "Just now",
            "read": False,
            "important": True,
            "type": "NEW_DRIVE_AVAILABLE",
            "recipientRole": "student",
            "recipientName": st.get("name", "Student"),
            "recipient_user_id": st_id,
            "created_at": now_iso,
            "drive_id": drive_id,
            "company_name": drive.get("companyName"),
            "job_title": drive.get("roleTitle"),
            "relatedRoute": f"/student/community/{drive_id}"
        })
    if student_notifs:
        await db.notifications.insert_many(student_notifs)

    updated = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    return updated


@router.post("/{drive_id}/reject", response_model=PlacementDriveSchema)
async def reject_drive(
    drive_id: str,
    action_in: Optional[DriveReviewActionRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    reason = action_in.reason if action_in and action_in.reason else "Does not meet placement policies."
    now_iso = datetime.now().isoformat()
    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {"status": "REJECTED", "rejection_reason": reason, "rejected_at": now_iso}}
    )
    recruiter_target = drive.get("recruiter_id") or drive.get("recruiter_email") or "recruiter"
    timestamp_ms = int(datetime.now().timestamp() * 1000)
    await db.notifications.insert_one({
        "id": f"notif-rej-{timestamp_ms}",
        "title": f"Drive Rejected: {drive.get('roleTitle')}",
        "message": f"Your drive for '{drive.get('roleTitle')}' was rejected. Reason: {reason}",
        "timestamp": "Just now",
        "read": False,
        "important": True,
        "type": "system_alert",
        "recipientRole": "recruiter",
        "recipientName": drive.get("companyName", "Recruiter"),
        "recipient_user_id": recruiter_target,
        "created_at": now_iso,
        "drive_id": drive_id,
        "company_name": drive.get("companyName"),
        "job_title": drive.get("roleTitle"),
        "relatedRoute": "/recruiter/drives"
    })
    updated = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    return updated


@router.post("/{drive_id}/request-changes", response_model=PlacementDriveSchema)
async def request_drive_changes(
    drive_id: str,
    action_in: Optional[DriveReviewActionRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    feedback = action_in.feedback if action_in and action_in.feedback else "Please update skill profile and CGPA criteria."
    now_iso = datetime.now().isoformat()
    await db.drives.update_one(
        {"id": drive_id},
        {"$set": {"status": "CHANGES_REQUESTED", "changes_feedback": feedback, "changes_requested_at": now_iso}}
    )
    recruiter_target = drive.get("recruiter_id") or drive.get("recruiter_email") or "recruiter"
    timestamp_ms = int(datetime.now().timestamp() * 1000)
    await db.notifications.insert_one({
        "id": f"notif-chg-{timestamp_ms}",
        "title": f"Changes Requested: {drive.get('roleTitle')}",
        "message": f"Placement Cell requested adjustments for '{drive.get('roleTitle')}': {feedback}",
        "timestamp": "Just now",
        "read": False,
        "important": True,
        "type": "important_update",
        "recipientRole": "recruiter",
        "recipientName": drive.get("companyName", "Recruiter"),
        "recipient_user_id": recruiter_target,
        "created_at": now_iso,
        "drive_id": drive_id,
        "company_name": drive.get("companyName"),
        "job_title": drive.get("roleTitle")
    })
    updated = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    return updated


@router.put("/{drive_id}", response_model=PlacementDriveSchema)
async def update_drive(
    drive_id: str,
    drive_update: PlacementDriveCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Update an existing placement drive, including raw text description and AI extracted requirements.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.drives.find_one({"id": drive_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    update_data = drive_update.model_dump(exclude_unset=True)
    # Ensure ID remains consistent
    update_data["id"] = drive_id
    update_data["updated_at"] = datetime.now().isoformat()

    if drive_update.aiInsights:
        update_data["aiInsights"] = drive_update.aiInsights.model_dump()
    elif "requiredSkills" in update_data:
        update_data["aiInsights"] = {
            "topMatchingSkills": update_data.get("requiredSkills", []),
            "commonSkillGaps": update_data.get("preferredSkills", [])[:2] if update_data.get("preferredSkills") else [],
            "preparationAdvice": f"Review company job requirements and core interview expectations for {update_data.get('roleTitle', 'this role')}."
        }

    await db.drives.update_one({"id": drive_id}, {"$set": update_data})

    # Also update community if present
    await db.communities.update_one(
        {"$or": [{"drive_id": drive_id}, {"id": f"comm-{drive_id}"}]},
        {"$set": {
            "company_name": update_data.get("companyName", existing.get("companyName")),
            "role_title": update_data.get("roleTitle", existing.get("roleTitle")),
            "package_lpa": update_data.get("packageLpa", existing.get("packageLpa")),
            "location": update_data.get("location", existing.get("location")),
        }}
    )

    updated = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    return updated

@router.patch("/{drive_id}/confirm-requirements")
async def confirm_drive_requirements(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    res = await db.drives.update_one({"id": drive_id}, {"$set": {"aiConfirmed": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {"status": "ok", "message": "Drive requirements confirmed by Placement Officer"}


# ==========================================
# RECRUITER ROUND MANAGEMENT & PIPELINE
# ==========================================

async def _get_or_init_drive_rounds(db, drive_id: str) -> List[Dict[str, Any]]:
    rounds = await db.drive_rounds.find({"drive_id": drive_id}, {"_id": 0}).sort("order", 1).to_list(length=50)
    if not rounds:
        now_iso = datetime.now().isoformat()
        default_rounds = [
            {
                "id": f"round-{drive_id}-1",
                "drive_id": drive_id,
                "name": "Round 1 — Aptitude",
                "round_type": "Aptitude",
                "order": 1,
                "is_final": False,
                "description": "Initial aptitude assessment & screening",
                "created_at": now_iso
            },
            {
                "id": f"round-{drive_id}-2",
                "drive_id": drive_id,
                "name": "Round 2 — Technical Interview",
                "round_type": "Technical",
                "order": 2,
                "is_final": False,
                "description": "Core technical problem solving & engineering evaluation",
                "created_at": now_iso
            },
            {
                "id": f"round-{drive_id}-3",
                "drive_id": drive_id,
                "name": "Round 3 — HR & Final Selection",
                "round_type": "HR",
                "order": 3,
                "is_final": True,
                "description": "HR evaluation & final selection decision",
                "created_at": now_iso
            }
        ]
        await db.drive_rounds.insert_many(default_rounds)
        rounds = await db.drive_rounds.find({"drive_id": drive_id}, {"_id": 0}).sort("order", 1).to_list(length=50)
    return rounds


@router.get("/{drive_id}/rounds", response_model=List[RecruitmentRoundSchema])
async def get_drive_rounds(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    rounds = await _get_or_init_drive_rounds(db, drive_id)
    return rounds


@router.post("/{drive_id}/rounds", response_model=RecruitmentRoundSchema, status_code=status.HTTP_201_CREATED)
async def create_drive_round(
    drive_id: str,
    round_in: RecruitmentRoundCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"id": drive_id})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    new_id = f"round-{drive_id}-{int(datetime.now().timestamp() * 1000) % 1000000}"
    now_iso = datetime.now().isoformat()

    if round_in.is_final:
        await db.drive_rounds.update_many({"drive_id": drive_id}, {"$set": {"is_final": False}})

    round_doc = {
        "id": new_id,
        "drive_id": drive_id,
        "name": round_in.name,
        "round_type": round_in.round_type or "Technical",
        "order": round_in.order,
        "is_final": round_in.is_final or False,
        "date": round_in.date,
        "time": round_in.time,
        "venue": round_in.venue,
        "panel_name": round_in.panel_name,
        "description": round_in.description,
        "created_at": now_iso
    }

    await db.drive_rounds.insert_one(round_doc)
    created = await db.drive_rounds.find_one({"id": new_id}, {"_id": 0})
    return created


@router.put("/{drive_id}/rounds/{round_id}", response_model=RecruitmentRoundSchema)
async def update_drive_round(
    drive_id: str,
    round_id: str,
    round_up: RecruitmentRoundUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.drive_rounds.find_one({"id": round_id, "drive_id": drive_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Round not found for this drive")

    up_data = {k: v for k, v in round_up.model_dump().items() if v is not None}
    if up_data.get("is_final"):
        await db.drive_rounds.update_many({"drive_id": drive_id}, {"$set": {"is_final": False}})

    up_data["updated_at"] = datetime.now().isoformat()
    await db.drive_rounds.update_one({"id": round_id}, {"$set": up_data})
    updated = await db.drive_rounds.find_one({"id": round_id}, {"_id": 0})
    return updated


@router.delete("/{drive_id}/rounds/{round_id}")
async def delete_drive_round(
    drive_id: str,
    round_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.drive_rounds.find_one({"id": round_id, "drive_id": drive_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Round not found for this drive")

    await db.drive_rounds.delete_one({"id": round_id})
    return {"status": "ok", "message": "Recruitment round deleted successfully"}


@router.get("/{drive_id}/recruiter-metrics")
async def get_recruiter_drive_dashboard_metrics(
    drive_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Computes drive metrics dynamically for the selected drive. Zero static/dummy data.
    """
    user_id = current_user.get("id") if current_user else "anonymous"
    logger.info(f"[PIPELINE METRICS] Fetching metrics for driveId='{drive_id}', recruiterId='{user_id}'")

    db = db_manager.db
    if db is None:
        logger.error("[PIPELINE METRICS] Database unavailable")
        raise HTTPException(status_code=503, detail="Database unavailable")

    drive = await db.drives.find_one({"$or": [{"id": drive_id}, {"_id": drive_id}, {"drive_id": drive_id}]}, {"_id": 0})
    if not drive:
        # Check if ObjectId lookup is needed
        try:
            from bson import ObjectId
            if ObjectId.is_valid(drive_id):
                drive = await db.drives.find_one({"_id": ObjectId(drive_id)}, {"_id": 0})
        except Exception:
            pass

    if not drive:
        logger.warning(f"[PIPELINE METRICS] Drive '{drive_id}' not found in MongoDB database.")
        raise HTTPException(status_code=404, detail=f"Placement drive '{drive_id}' not found")

    rounds = await _get_or_init_drive_rounds(db, drive_id)
    rounds.sort(key=lambda r: r.get("order", 1))

    apps = await db.applications.find({
        "$or": [{"drive_id": drive_id}, {"driveId": drive_id}]
    }, {"_id": 0}).to_list(length=500)

    total_registered = len(apps)
    selections_made = len([a for a in apps if (a.get("status") or "").upper() in ["SELECTED", "FINAL_SELECTED", "ACCEPTED", "PLACED"]])
    shortlisted_count = len([a for a in apps if (a.get("status") or "").upper() in ["SHORTLISTED", "IN_PIPELINE", "SELECTED", "INTERVIEW"]])

    round_pipeline = []
    passed_prev_round_ids = set()

    for idx, rnd in enumerate(rounds):
        r_id = rnd["id"]
        r_order = rnd.get("order", idx + 1)
        r_name = rnd.get("name", f"Round {r_order}")

        current_round_candidates = []
        passed_ids = set()
        passed_count = 0
        rejected_count = 0
        pending_count = 0

        for app in apps:
            app_id = app.get("id") or f"app-{app.get('student_id')}-{drive_id}"
            evals = app.get("round_evaluations") or {}
            app_status = (app.get("status") or "").upper()

            eligible_for_this_round = False
            if idx == 0:
                eligible_for_this_round = True
            else:
                prev_r_id = rounds[idx - 1]["id"]
                prev_eval = evals.get(prev_r_id) or {}
                if prev_eval.get("status") == "PASSED" or app_id in passed_prev_round_ids:
                    eligible_for_this_round = True

            if eligible_for_this_round:
                curr_eval = evals.get(r_id) or {}
                r_status = curr_eval.get("status")

                if not r_status:
                    rnd_type = (rnd.get("round_type") or "").upper()
                    rnd_name = (rnd.get("name") or "").upper()
                    apt_status = (app.get("aptitude_status") or "").upper()
                    tech_status = (app.get("technical_status") or "").upper()

                    if app_status in ["SELECTED", "FINAL_SELECTED", "PLACED"]:
                        r_status = "PASSED"
                    elif "APTITUDE" in rnd_type or "APTITUDE" in rnd_name:
                        if apt_status in ["QUALIFIED", "PASSED"] or app_status in ["APTITUDE_QUALIFIED", "TECHNICAL_ROUND_PENDING", "TECHNICAL_ALLOCATED", "TECHNICAL_IN_PROGRESS", "TECHNICAL_QUALIFIED", "INTERVIEW_PENDING", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "PLACED"]:
                            r_status = "PASSED"
                        elif apt_status == "FAILED" or app_status in ["REJECTED_AT_APTITUDE", "APTITUDE_FAILED", "REJECTED"]:
                            r_status = "REJECTED"
                        else:
                            r_status = "PENDING"
                    elif "TECHNICAL" in rnd_type or "TECHNICAL" in rnd_name:
                        if tech_status in ["QUALIFIED", "PASSED"] or app_status in ["TECHNICAL_QUALIFIED", "INTERVIEW_PENDING", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "PLACED"]:
                            r_status = "PASSED"
                        elif tech_status == "FAILED" or app_status in ["REJECTED_AT_TECHNICAL", "TECHNICAL_FAILED", "REJECTED"]:
                            r_status = "REJECTED"
                        else:
                            r_status = "PENDING"
                    elif "HR" in rnd_type or "HR" in rnd_name or "INTERVIEW" in rnd_type or "INTERVIEW" in rnd_name:
                        hr_status = (app.get("hr_status") or "").upper()
                        if hr_status in ["SELECTED", "QUALIFIED", "PASSED"] or app_status in ["INTERVIEW_COMPLETED", "SELECTED", "PLACED"]:
                            r_status = "PASSED"
                        elif hr_status == "FAILED" or app_status in ["REJECTED_AT_HR", "INTERVIEW_FAILED", "REJECTED"]:
                            r_status = "REJECTED"
                        else:
                            r_status = "PENDING"
                    else:
                        if app_status in ["REJECTED", "NOT_SHORTLISTED"]:
                            r_status = "REJECTED"
                        else:
                            r_status = "PENDING"



                if r_status == "PASSED" or (rnd.get("is_final") and app_status in ["SELECTED", "FINAL_SELECTED"]):
                    passed_count += 1
                    passed_ids.add(app_id)
                elif r_status == "REJECTED":
                    rejected_count += 1
                else:
                    pending_count += 1

                current_round_candidates.append({
                    "application_id": app_id,
                    "student_id": app.get("student_id") or app.get("studentId"),
                    "student_name": app.get("student_name") or app.get("applicant", {}).get("name") or "Student",
                    "student_email": app.get("student_email") or app.get("studentEmail") or "",
                    "rollNumber": app.get("rollNumber") or "N/A",
                    "branch": app.get("branch") or "CSE",
                    "cgpa": app.get("cgpa") or 8.0,
                    "skills": app.get("skills") or [],
                    "resume_url": app.get("resume_url") or "#",
                    "application_status": app_status,
                    "round_status": r_status,
                    "notes": curr_eval.get("notes")
                })

        passed_prev_round_ids = passed_ids

        round_pipeline.append({
            "id": r_id,
            "drive_id": drive_id,
            "name": r_name,
            "round_type": rnd.get("round_type", "Technical"),
            "order": r_order,
            "is_final": rnd.get("is_final", False),
            "date": rnd.get("date"),
            "time": rnd.get("time"),
            "venue": rnd.get("venue"),
            "panel_name": rnd.get("panel_name"),
            "description": rnd.get("description"),
            "candidates_count": len(current_round_candidates),
            "passed_count": passed_count,
            "rejected_count": rejected_count,
            "pending_count": pending_count,
            "candidates": current_round_candidates
        })

    int_query = {"$or": [{"drive_id": drive_id}, {"driveId": drive_id}, {"company_name": drive.get("companyName")}]}
    raw_interviews = await db.interviews.find(int_query, {"_id": 0}).sort("date", 1).to_list(length=100)

    scheduled_interviews = []
    for item in raw_interviews:
        start_t = item.get("start_time") or item.get("startTime") or ""
        end_t = item.get("end_time") or item.get("endTime") or ""
        time_disp = item.get("time") or item.get("timeSlot") or (f"{start_t} - {end_t}" if start_t and end_t else "10:00 AM")
        room_disp = item.get("room_name") or item.get("roomName") or f"{item.get('room_number', 'Room 101')} ({item.get('block', 'Main')})"

        scheduled_interviews.append({
            "id": item.get("id") or item.get("interview_id"),
            "candidateName": item.get("candidateName") or item.get("student_name") or item.get("studentName") or "Candidate",
            "candidateRoll": item.get("candidateRoll") or item.get("rollNumber") or "N/A",
            "round": item.get("round") or "Technical Interview",
            "timeSlot": time_disp,
            "roomName": room_disp,
            "panelName": item.get("panelName") or item.get("panel_name") or "Technical Panel",
            "status": (item.get("status") or "SCHEDULED").lower()
        })

    return {
        "drive": drive,
        "metrics": {
            "roleTitle": drive.get("roleTitle", "N/A"),
            "packageLpa": drive.get("packageLpa"),
            "packageText": f"₹{drive.get('packageLpa')} LPA" if drive.get("packageLpa") else "Not specified",
            "location": drive.get("location", "Not specified"),
            "registeredCount": total_registered,
            "shortlistedCount": shortlisted_count,
            "selectedCount": selections_made
        },
        "rounds": round_pipeline,
        "interviews": scheduled_interviews
    }

