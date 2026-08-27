from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/rooms", tags=["Venue & Rooms"])

@router.get("")
async def list_rooms(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(length=100)
    return rooms
