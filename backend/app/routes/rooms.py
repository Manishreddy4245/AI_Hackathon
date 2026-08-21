from typing import List
from fastapi import APIRouter, HTTPException
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/rooms", tags=["Venue & Rooms"])

@router.get("")
async def list_rooms():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(length=100)
    return rooms
