import re
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.db.mongodb import db_manager
from app.core.deps import require_placement_officer
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


class AuditLogCreate(BaseModel):
    action: str
    entity: str
    entityId: Optional[str] = None
    detail: str
    metadata: Optional[Dict[str, Any]] = None


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
    status: Optional[str] = "SUCCESS"
    metadata: Optional[Dict[str, Any]] = None


@router.get("", response_model=List[AuditLogSchema])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    """
    Returns real immutable audit logs from db.audit_logs with search, role/action/entity filters,
    and newest-first sorting.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    query: Dict[str, Any] = {}

    if role and role != "all":
        query["userRole"] = {"$regex": f"^{re.escape(role)}$", "$options": "i"}

    if action and action != "all":
        query["action"] = {"$regex": f"^{re.escape(action)}$", "$options": "i"}

    if entity and entity != "all":
        query["entity"] = {"$regex": f"^{re.escape(entity)}$", "$options": "i"}

    if search and search.strip():
        s_clean = re.escape(search.strip())
        query["$or"] = [
            {"userName": {"$regex": s_clean, "$options": "i"}},
            {"detail": {"$regex": s_clean, "$options": "i"}},
            {"action": {"$regex": s_clean, "$options": "i"}},
            {"entity": {"$regex": s_clean, "$options": "i"}},
            {"entityId": {"$regex": s_clean, "$options": "i"}}
        ]

    limit = min(max(page_size, 1), 100)
    skip = (page - 1) * limit
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort([("created_at", -1), ("timestamp", -1), ("_id", -1)]).skip(skip).to_list(length=limit)
    return logs


@router.post("", response_model=AuditLogSchema, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    log_in: AuditLogCreate,
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    """Explicitly records an administrative audit event."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    log_doc = await record_audit_event(
        db=db,
        user=current_user,
        action=log_in.action,
        entity=log_in.entity,
        entity_id=log_in.entityId,
        detail=log_in.detail,
        metadata=log_in.metadata
    )

    if not log_doc:
        raise HTTPException(status_code=500, detail="Failed to record audit log")

    return log_doc
