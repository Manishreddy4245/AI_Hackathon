from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.mongodb import db_manager
from app.schemas.interview import InterviewSchema, InterviewCreate, InterviewRescheduleRequest

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

@router.get("", response_model=List[InterviewSchema])
async def list_interviews():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    interviews = await db.interviews.find({}, {"_id": 0}).to_list(length=100)
    return interviews

@router.post("", response_model=InterviewSchema, status_code=status.HTTP_201_CREATED)
async def schedule_interview(int_in: InterviewCreate):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count = await db.interviews.count_documents({})
    new_id = f"int-{100 + count + 1}"
    int_dict = int_in.model_dump()
    int_dict.update({
        "id": new_id,
        "status": "scheduled",
        "panelConfirmed": False,
    })

    await db.interviews.insert_one(int_dict)
    created = await db.interviews.find_one({"id": new_id}, {"_id": 0})
    return created

@router.patch("/{interview_id}/reschedule")
async def reschedule_interview(interview_id: str, req: InterviewRescheduleRequest):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    update_fields = {
        "date": req.date,
        "timeSlot": req.timeSlot,
        "panelName": req.panelName,
        "roomName": req.roomName,
        "status": "scheduled",
    }

    res = await db.interviews.update_one({"id": interview_id}, {"$set": update_fields, "$unset": {"conflictNote": ""}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview slot not found")
    return {"status": "ok", "message": "Interview slot rescheduled successfully"}

@router.patch("/{interview_id}/status")
async def update_interview_status(interview_id: str, status_val: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    res = await db.interviews.update_one({"id": interview_id}, {"$set": {"status": status_val}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview slot not found")
    return {"status": "ok", "message": f"Interview status updated to {status_val}"}
