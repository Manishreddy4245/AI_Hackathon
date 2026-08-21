from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])

class AuditLogCreate(BaseModel):
    userId: str
    userName: str
    userRole: str
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
async def list_audit_logs():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(length=100)
    return logs

@router.post("", response_model=AuditLogSchema, status_code=status.HTTP_201_CREATED)
async def create_audit_log(log_in: AuditLogCreate):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count = await db.audit_logs.count_documents({})
    new_id = f"aud-{int(datetime.now().timestamp())}-{count + 1}"

    log_dict = log_in.model_dump()
    log_dict.update({
        "id": new_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
    })

    await db.audit_logs.insert_one(log_dict)
    created = await db.audit_logs.find_one({"id": new_id}, {"_id": 0})
    return created
