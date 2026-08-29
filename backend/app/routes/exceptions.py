import logging
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user, get_current_user
from app.schemas.exception import (
    ExceptionSchema,
    ExceptionStatusUpdateRequest,
    ExceptionCreateRequest,
    AgentActivitySchema
)
from app.services.exception_engine import scan_and_sync_exceptions
from app.services.audit_service import record_audit_event

logger = logging.getLogger("placemind.exceptions")

router = APIRouter(prefix="/api/exceptions", tags=["AI Operations Center / Exceptions"])


@router.get("", response_model=List[ExceptionSchema])
async def list_exceptions(
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Retrieves all operational AI exceptions.
    Executes autonomous sync with live placement drives, interviews, and applications.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Run autonomous sync to capture latest live exceptions
    try:
        await scan_and_sync_exceptions(db)
    except Exception as e:
        logger.warning(f"Failed to run exception diagnostic sync: {e}")

    query: Dict[str, Any] = {}
    if severity and severity != "all":
        query["severity"] = severity
    if status_filter and status_filter != "all":
        query["status"] = status_filter
    if category and category != "all":
        query["category"] = category
    if search and search.strip():
        query["$or"] = [
            {"title": {"$regex": search.strip(), "$options": "i"}},
            {"description": {"$regex": search.strip(), "$options": "i"}},
            {"affectedEntity": {"$regex": search.strip(), "$options": "i"}},
            {"aiRecommendation": {"$regex": search.strip(), "$options": "i"}},
            {"suggestedActionText": {"$regex": search.strip(), "$options": "i"}},
        ]

    exceptions = await db.exceptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    return exceptions


@router.post("/scan", response_model=List[ExceptionSchema])
async def trigger_diagnostic_scan(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Explicitly triggers an operational diagnostic scan for AI exceptions."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    results = await scan_and_sync_exceptions(db)
    return results


@router.post("", response_model=ExceptionSchema, status_code=status.HTTP_201_CREATED)
async def create_custom_exception(
    req: ExceptionCreateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Manually creates a new operational exception item."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    now = datetime.now()
    now_str = now.strftime("%I:%M %p • %d %b %Y")
    now_iso = now.isoformat()

    exc_id = f"exc-{uuid.uuid4().hex[:10]}"
    exc_doc = {
        "id": exc_id,
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
        "status": req.status,
        "category": req.category,
        "timestamp": now_str,
        "affectedEntity": req.affectedEntity,
        "aiRecommendation": req.aiRecommendation,
        "suggestedActionText": req.suggestedActionText,
        "actionRoute": req.actionRoute,
        "candidateAvailable": req.candidateAvailable,
        "panelAvailable": req.panelAvailable,
        "roomAvailable": req.roomAvailable,
        "created_at": now_iso
    }

    await db.exceptions.insert_one(exc_doc)

    await record_audit_event(
        db=db,
        user=current_user,
        action="EXCEPTION_CREATED",
        entity="Exception",
        entity_id=exc_id,
        detail=f"Created {req.severity} operational exception: {req.title}"
    )

    created = await db.exceptions.find_one({"id": exc_id}, {"_id": 0})
    return created


@router.post("/{exception_id}/approve")
async def approve_exception(
    exception_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Placement Officer human-in-the-loop approval of AI Exception recommendation.
    Marks exception resolved and executes linked actions (e.g. drive approval).
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    target = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Exception not found")

    now_iso = datetime.now().isoformat()
    officer_name = (current_user.get("name") if current_user else None) or "Placement Officer"

    # Mark exception resolved
    await db.exceptions.update_one(
        {"id": exception_id},
        {"$set": {
            "status": "resolved",
            "resolvedBy": officer_name,
            "resolved_at": now_iso,
            "updated_at": now_iso
        }}
    )

    # If linked to a pending drive, approve the drive automatically
    meta = target.get("metadata") or {}
    drive_id = meta.get("drive_id")
    if drive_id:
        await db.drives.update_one(
            {"id": drive_id},
            {"$set": {
                "status": "ANNOUNCED",
                "approved_by": officer_name,
                "approved_at": now_iso,
                "updated_at": now_iso
            }}
        )

    # Insert into agent activities log
    log_entry = {
        "id": f"act-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:4]}",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "title": "Recommendation approved by Placement Officer",
        "category": "Officer Approval",
        "detail": f"Approved AI recommendation for '{target.get('title')}': {target.get('suggestedActionText')}",
        "type": "officer_action"
    }
    await db.agent_activities.insert_one(log_entry)

    # Record in Immutable Audit Log
    await record_audit_event(
        db=db,
        user=current_user or {"id": "officer", "name": officer_name, "role": "placement_officer"},
        action="EXCEPTION_RESOLVED",
        entity="Exception",
        entity_id=exception_id,
        detail=f"Approved AI recommendation for '{target.get('title')}': {target.get('suggestedActionText')}"
    )

    return {"status": "ok", "message": "AI recommendation approved & exception resolved ✓"}


@router.patch("/{exception_id}/status")
@router.post("/{exception_id}/status")
async def update_exception_status(
    exception_id: str,
    req: ExceptionStatusUpdateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Updates exception status (open, in_review, resolved, ignored)."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    target = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Exception not found")

    now_iso = datetime.now().isoformat()
    officer_name = (current_user.get("name") if current_user else None) or "Placement Officer"

    target_status = req.status.lower()
    if target_status not in ["open", "in_review", "resolved", "ignored", "pending"]:
        raise HTTPException(status_code=400, detail=f"Invalid exception status: '{req.status}'")

    update_payload: Dict[str, Any] = {
        "status": target_status,
        "updated_at": now_iso
    }
    if target_status == "resolved":
        update_payload["resolvedBy"] = officer_name
        update_payload["resolved_at"] = now_iso

    await db.exceptions.update_one({"id": exception_id}, {"$set": update_payload})

    # Log in agent activities
    act_type = "officer_action" if target_status in ["resolved", "ignored"] else "autonomous_ai"
    log_entry = {
        "id": f"act-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:4]}",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "title": f"Exception status updated to {target_status.upper()}",
        "category": "Status Update",
        "detail": f"Exception '{target.get('title')}' status changed to {target_status} by {officer_name}.",
        "type": act_type
    }
    await db.agent_activities.insert_one(log_entry)

    # Record in Audit Log
    await record_audit_event(
        db=db,
        user=current_user or {"id": "officer", "name": officer_name, "role": "placement_officer"},
        action="EXCEPTION_STATUS_UPDATED",
        entity="Exception",
        entity_id=exception_id,
        detail=f"Exception '{target.get('title')}' status changed to {target_status}."
    )

    updated = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    return updated


@router.get("/agent-activity", response_model=List[AgentActivitySchema])
async def get_agent_activities():
    """Retrieves live real-time autonomous AI and officer activity events."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    activities = await db.agent_activities.find({}, {"_id": 0}).sort("timestamp", -1).to_list(length=50)

    # If empty, seed initial baseline autonomous events
    if not activities:
        baseline = [
            {
                "id": "act-init-1",
                "timestamp": "09:00 AM",
                "title": "Autonomous Conflict Diagnostic Completed",
                "category": "Schedule Analysis",
                "detail": "Scanned all interview venues, panels, and candidate rosters for double-booking anomalies.",
                "type": "autonomous_ai"
            },
            {
                "id": "act-init-2",
                "timestamp": "09:15 AM",
                "title": "Placement Drive Queue Health Check",
                "category": "Drive Monitoring",
                "detail": "Verified recruitment drive deadlines, registration turnouts, and pending approvals.",
                "type": "autonomous_ai"
            },
            {
                "id": "act-init-3",
                "timestamp": "09:30 AM",
                "title": "Candidate Assessment Progression Check",
                "category": "Pipeline Sync",
                "detail": "Synchronized assessment test evaluations and flagged candidates awaiting HR scheduling.",
                "type": "autonomous_ai"
            }
        ]
        await db.agent_activities.insert_many(baseline)
        activities = baseline

    return activities
