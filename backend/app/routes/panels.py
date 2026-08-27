from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.panel import PanelSchema, PanelCreate
from app.core.deps import get_current_user, require_placement_officer

router = APIRouter(prefix="/api/panels", tags=["Panels"])

@router.get("", response_model=List[PanelSchema])
async def list_panels(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    panels = await db.panels.find({}, {"_id": 0}).to_list(length=100)
    return panels

@router.post("", response_model=PanelSchema, status_code=status.HTTP_201_CREATED)
async def create_panel(
    panel_in: PanelCreate,
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count = await db.panels.count_documents({})
    new_id = f"pnl-{count + 1}"
    p_dict = panel_in.model_dump()
    p_dict.update({
        "id": new_id,
        "availability": "available",
        "interviewsScheduled": 0,
        "confirmed": False,
    })

    await db.panels.insert_one(p_dict)
    created = await db.panels.find_one({"id": new_id}, {"_id": 0})
    return created

@router.patch("/{panel_id}/confirm")
async def confirm_panel(
    panel_id: str,
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    await db.panels.update_one({"id": panel_id}, {"$set": {"confirmed": True, "availability": "available"}})
    await db.interviews.update_many({"panelId": panel_id}, {"$set": {"panelConfirmed": True, "status": "confirmed"}})
    return {"status": "ok", "message": "Panel availability confirmed ✓"}
