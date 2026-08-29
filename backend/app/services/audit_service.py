"""PlaceMind Centralized Audit Service.
Records immutable activity audit records for real business and security operations.
"""
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger("placemind.audit")


async def record_audit_event(
    db: Any,
    user: Optional[Dict[str, Any]],
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    detail: str = "",
    metadata: Optional[Dict[str, Any]] = None,
    status: str = "SUCCESS"
) -> Optional[Dict[str, Any]]:
    """
    Safely records a structured audit event to db.audit_logs.
    Observes existing operations without disrupting business flow on failure.
    """
    if db is None:
        return None

    try:
        user = user or {}
        user_id = str(user.get("id") or user.get("sub") or "system")
        user_name = str(user.get("name") or user.get("email") or "System User")
        user_role = str(user.get("role") or user.get("portalRole") or "system")

        new_id = f"aud-{uuid.uuid4().hex[:12]}"
        now_dt = datetime.now()
        timestamp_formatted = now_dt.strftime("%Y-%m-%d %I:%M %p")
        iso_timestamp = now_dt.isoformat()

        log_doc = {
            "id": new_id,
            "userId": user_id,
            "userName": user_name,
            "userRole": user_role,
            "action": action,
            "entity": entity,
            "entityId": str(entity_id) if entity_id else None,
            "detail": detail,
            "status": status,
            "timestamp": timestamp_formatted,
            "created_at": iso_timestamp,
            "metadata": metadata or {}
        }

        await db.audit_logs.insert_one(log_doc)
        logger.info(f"Audit log recorded: {action} on {entity}:{entity_id} by {user_name} ({user_role})")
        return log_doc
    except Exception as e:
        logger.warning(f"Non-fatal error recording audit log: {e}")
        return None
