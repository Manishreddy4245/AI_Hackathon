"""Admin Data Integrity, Deduplication & Single Source of Truth Audit Endpoints."""
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import db_manager
from app.db.integrity import generate_data_integrity_report
from app.db.deduplication import run_full_deduplication
from app.core.deps import require_placement_officer

logger = logging.getLogger("placemind.admin")

router = APIRouter(prefix="/api/admin", tags=["Admin & Data Integrity"])

@router.get("/data-integrity/report")
async def get_data_integrity_report(current_user: Dict[str, Any] = Depends(require_placement_officer)):
    """Returns real-time MongoDB Data Integrity, Single Source of Truth, and Duplication Audit Report."""
    db = db_manager.db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB connection is unavailable"
        )

    report = await generate_data_integrity_report(db)
    return report

@router.post("/data-integrity/deduplicate")
async def trigger_deduplication(current_user: Dict[str, Any] = Depends(require_placement_officer)):
    """Trigger safe foreign-key reference migration and duplicate cleanup pass."""
    db = db_manager.db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB connection is unavailable"
        )

    results = await run_full_deduplication(db)
    report = await generate_data_integrity_report(db)
    return {
        "status": "ok",
        "action": "deduplication_completed",
        "migration_summary": results,
        "audit_report": report
    }
