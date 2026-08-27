from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_optional_current_user, get_current_user
from app.schemas.notification import NotificationSchema, NotificationCreate

router = APIRouter(prefix="/api/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationSchema])
async def list_notifications(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """
    List notifications for currently authenticated user.
    Strictly filters by recipient_user_id. Returns empty list if no notifications exist.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if not current_user:
        return []

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Query notifications specifically addressed to this authenticated user
    query = {
        "$or": [
            {"recipient_user_id": user_id},
            {"recipient_user_id": user_email},
            {"recipient_id": user_id},
            {"recipient_id": user_email},
            {"recipientId": user_id},
            {"recipientId": user_email},
        ]
    }
    if current_user.get("role") == "student" or current_user.get("portalRole") == "student":
        query["$or"].extend([
            {"student_id": user_id},
            {"studentId": user_id},
            {"student_email": user_email},
            {"studentEmail": user_email},
        ])

    raw_notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)

    # Ensure valid timestamp string
    for n in raw_notifs:
        if "timestamp" not in n or not n["timestamp"]:
            n["timestamp"] = "Just now"

    return raw_notifs

@router.get("/stats")
async def get_notification_stats(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """
    Calculate real notification statistics dynamically from MongoDB for the authenticated user:
    - unread
    - today
    - scheduled
    - important
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if not current_user:
        return {"unread": 0, "today": 0, "scheduled": 0, "important": 0}

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    base_match = {
        "$or": [
            {"recipient_user_id": user_id},
            {"recipient_user_id": user_email}
        ]
    }

    # 1. Unread count
    unread_count = await db.notifications.count_documents({
        "$and": [
            base_match,
            {"read": False}
        ]
    })

    # 2. Today count (matching ISO date YYYY-MM-DD or formatted timestamp)
    today_str = date.today().isoformat()
    today_count = await db.notifications.count_documents({
        "$and": [
            base_match,
            {
                "$or": [
                    {"created_at": {"$regex": f"^{today_str}"}},
                    {"timestamp": {"$in": ["Just now", "today", "Today"]}}
                ]
            }
        ]
    })

    # 3. Scheduled count
    scheduled_count = await db.notifications.count_documents({
        "$and": [
            base_match,
            {"scheduled": True}
        ]
    })

    # 4. Important count
    important_count = await db.notifications.count_documents({
        "$and": [
            base_match,
            {"important": True}
        ]
    })

    return {
        "unread": unread_count,
        "today": today_count,
        "scheduled": scheduled_count,
        "important": important_count
    }

@router.get("/unread-count")
async def get_unread_count(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Get total unread notifications count for the authenticated user."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if not current_user:
        return {"unread_count": 0}

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    count = await db.notifications.count_documents({
        "$or": [
            {"recipient_user_id": user_id},
            {"recipient_user_id": user_email}
        ],
        "read": False
    })
    return {"unread_count": count}

@router.post("", response_model=NotificationSchema, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notif_in: NotificationCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count = await db.notifications.count_documents({})
    new_id = f"notif-{int(datetime.now().timestamp() * 1000)}"
    n_dict = notif_in.model_dump()
    n_dict.update({
        "id": new_id,
        "timestamp": "Just now",
        "read": False,
        "created_at": datetime.now().isoformat(),
    })

    await db.notifications.insert_one(n_dict)
    created = await db.notifications.find_one({"id": new_id}, {"_id": 0})
    return created

@router.patch("/read-all")
async def mark_all_notifications_read(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Mark all notifications for the authenticated user as read."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if not current_user:
        return {"status": "ok", "modified_count": 0}

    user_id = current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    query = {
        "$or": [
            {"recipient_user_id": user_id},
            {"recipient_user_id": user_email}
        ]
    }

    result = await db.notifications.update_many(query, {"$set": {"read": True}})
    return {"status": "ok", "modified_count": result.modified_count, "message": "All notifications marked as read"}

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {"$or": [{"id": notification_id}, {"_id": notification_id}]}
    if current_user:
        user_id = current_user.get("id")
        user_email = (current_user.get("email") or "").lower()
        query = {
            "$and": [
                {"$or": [{"id": notification_id}, {"_id": notification_id}]},
                {"$or": [{"recipient_user_id": user_id}, {"recipient_user_id": user_email}]}
            ]
        }

    notif = await db.notifications.find_one(query)
    new_read_val = True if not notif else not notif.get("read", False)
    await db.notifications.update_one(query, {"$set": {"read": new_read_val}})
    return {"status": "ok", "read": new_read_val, "message": "Notification read status updated"}

@router.patch("/{notification_id}/important")
async def toggle_notification_important(
    notification_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {"$or": [{"id": notification_id}, {"_id": notification_id}]}
    if current_user:
        user_id = current_user.get("id")
        user_email = (current_user.get("email") or "").lower()
        query = {
            "$and": [
                {"$or": [{"id": notification_id}, {"_id": notification_id}]},
                {"$or": [{"recipient_user_id": user_id}, {"recipient_user_id": user_email}]}
            ]
        }

    notif = await db.notifications.find_one(query)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    new_val = not notif.get("important", False)
    await db.notifications.update_one(query, {"$set": {"important": new_val}})
    return {"status": "ok", "important": new_val}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query: Dict[str, Any] = {"$or": [{"id": notification_id}, {"_id": notification_id}]}
    if current_user:
        user_id = current_user.get("id")
        user_email = (current_user.get("email") or "").lower()
        query = {
            "$and": [
                {"$or": [{"id": notification_id}, {"_id": notification_id}]},
                {"$or": [{"recipient_user_id": user_id}, {"recipient_user_id": user_email}]}
            ]
        }

    await db.notifications.delete_one(query)
    return {"status": "ok", "message": "Notification deleted"}
