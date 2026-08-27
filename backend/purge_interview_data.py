"""
Comprehensive Interview Data Elimination & Unset Utility
Deletes all documents in interview collections (interviews, interview_slots, interview_availability, panels, rooms)
and unsets all interview-related embedded fields on db.applications documents.
"""
import asyncio
import logging
from typing import Dict, List, Any

from app.core.config import settings
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("purge_interview_data")

INTERVIEW_COLLECTIONS = [
    "interviews",
    "interview_slots",
    "interview_availability",
    "panels",
    "rooms"
]

INTERVIEW_APPLICATION_FIELDS = [
    "interview",
    "interview_slot_id",
    "interview_status",
    "interview_date",
    "interview_time",
    "panel_name",
    "room_name",
    "panel_members",
    "scheduled_slot"
]

async def execute_interview_purge():
    print("\n=========================================================================")
    print("  LIVE MONGODB ATLAS — COMPLETE INTERVIEW DATA PURGE & UNSET")
    print("=========================================================================\n")

    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Failed to connect to MongoDB using project configuration.")
        return

    # 1. Audit before counts
    before_counts: Dict[str, int] = {}
    for coll_name in INTERVIEW_COLLECTIONS:
        before_counts[coll_name] = await db[coll_name].count_documents({})

    app_total_before = await db.applications.count_documents({})
    app_with_int_field = await db.applications.count_documents({
        "$or": [{f: {"$exists": True}} for f in INTERVIEW_APPLICATION_FIELDS]
    })

    print(f"INTERVIEW COLLECTIONS BEFORE PURGE:")
    for c, cnt in before_counts.items():
        print(f"  - {c:<25}: {cnt} documents")
    print(f"APPLICATIONS WITH EMBEDDED INTERVIEW FIELDS: {app_with_int_field} (out of {app_total_before} applications)\n")

    # 2. Delete all interview collection documents
    deleted_counts: Dict[str, int] = {}
    for coll_name in INTERVIEW_COLLECTIONS:
        res = await db[coll_name].delete_many({})
        deleted_counts[coll_name] = res.deleted_count

    # 3. Unset embedded interview fields on db.applications
    unset_query = {f: "" for f in INTERVIEW_APPLICATION_FIELDS}
    app_unset_res = await db.applications.update_many(
        {"$or": [{f: {"$exists": True}} for f in INTERVIEW_APPLICATION_FIELDS]},
        {"$unset": unset_query}
    )

    # 4. Audit after counts
    after_counts: Dict[str, int] = {}
    for coll_name in INTERVIEW_COLLECTIONS:
        after_counts[coll_name] = await db[coll_name].count_documents({})

    app_with_int_field_after = await db.applications.count_documents({
        "$or": [{f: {"$exists": True}} for f in INTERVIEW_APPLICATION_FIELDS]
    })

    print("=========================================================================")
    print("  BEFORE / AFTER PURGE & UNSET REPORT")
    print("=========================================================================")
    print(f"{'Target Source':<32} | {'Before':<8} | {'Modified/Deleted':<18} | {'After':<8}")
    print("-" * 72)
    for c in INTERVIEW_COLLECTIONS:
        print(f"{'Collection: ' + c:<32} | {before_counts[c]:<8} | {deleted_counts[c]:<18} | {after_counts[c]:<8}")

    print(f"{'App Embedded Fields (db.apps)':<32} | {app_with_int_field:<8} | {app_unset_res.modified_count:<18} | {app_with_int_field_after:<8}")
    print("-------------------------------------------------------------------------")
    print(f"UNSET FIELDS ON APPLICATIONS: {INTERVIEW_APPLICATION_FIELDS}")
    print("=========================================================================\n")

    if all(cnt == 0 for cnt in after_counts.values()) and app_with_int_field_after == 0:
        print("VERIFICATION SUCCESS: All interview collections and embedded application fields confirmed at 0.")
    else:
        print("VERIFICATION WARNING: Lingering interview documents or embedded fields detected.")

if __name__ == "__main__":
    asyncio.run(execute_interview_purge())
