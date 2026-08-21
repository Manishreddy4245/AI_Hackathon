from typing import List
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.db.mongodb import db_manager
from app.schemas.exception import ExceptionSchema

router = APIRouter(prefix="/api/exceptions", tags=["AI Operations Center / Exceptions"])

@router.get("", response_model=List[ExceptionSchema])
async def list_exceptions():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    exceptions = await db.exceptions.find({}, {"_id": 0}).to_list(length=100)
    return exceptions

@router.post("/{exception_id}/approve")
async def approve_exception(exception_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    target = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Exception not found")

    await db.exceptions.update_one({"id": exception_id}, {"$set": {"status": "resolved", "resolvedBy": "Placement Officer"}})

    log_entry = {
        "id": f"act-{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "title": "Recommendation approved by Placement Officer",
        "category": "Officer Approval",
        "detail": f"Approved AI recommendation for '{target.get('title')}': {target.get('suggestedActionText')}",
        "type": "officer_action"
    }
    await db.agent_activities.insert_one(log_entry)

    return {"status": "ok", "message": "AI recommendation approved & exception resolved ✓"}
