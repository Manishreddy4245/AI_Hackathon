from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.mongodb import db_manager
from app.schemas.notification import NotificationSchema, NotificationCreate

router = APIRouter(prefix="/api/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationSchema])
async def list_notifications():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    notifs = await db.notifications.find({}, {"_id": 0}).to_list(length=100)
    return notifs

@router.post("", response_model=NotificationSchema, status_code=status.HTTP_201_CREATED)
async def create_notification(notif_in: NotificationCreate):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count = await db.notifications.count_documents({})
    new_id = f"notif-{100 + count + 1}"
    n_dict = notif_in.model_dump()
    n_dict.update({
        "id": new_id,
        "timestamp": "Just now",
        "read": False,
        "important": False,
    })

    await db.notifications.insert_one(n_dict)
    created = await db.notifications.find_one({"id": new_id}, {"_id": 0})
    return created

@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    await db.notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"status": "ok", "message": "Notification marked as read"}
