from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.db.mongodb import db_manager
from app.core.deps import require_placement_officer

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])

class AuditLogCreate(BaseModel):
    action: str
    entity: str
    entityId: Optional[str] = None
    detail: str

class AuditLogSchema(BaseModel):
    id: str
    userId: str
    userName: str
    userRole: str
    action: str
    entity: str
    entityId: Optional[str] = None
    detail: str
    timestamp: str

@router.get("", response_model=List[AuditLogSchema])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    limit = min(max(page_size, 1), 100)
    skip = (page - 1) * limit
    logs = await db.audit_logs.find({}, {"_id": 0}).sort([("timestamp", -1), ("_id", -1)]).skip(skip).to_list(length=limit)
    return logs

@router.post("", response_model=AuditLogSchema, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    log_in: AuditLogCreate,
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    import uuid
    new_id = f"aud-{uuid.uuid4().hex[:12]}"

    log_dict = {
        "id": new_id,
        "userId": current_user.get("id", "system"),
        "userName": current_user.get("name", "Officer"),
        "userRole": current_user.get("role", "placement_officer"),
        "action": log_in.action,
        "entity": log_in.entity,
        "entityId": log_in.entityId,
        "detail": log_in.detail,
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
    }

    await db.audit_logs.insert_one(log_dict)
    created = await db.audit_logs.find_one({"id": new_id}, {"_id": 0})
    return created
