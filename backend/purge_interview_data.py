"""
Comprehensive Interview Data Elimination & Unset Utility
Deletes all documents in interview collections (interviews, interview_slots, interview_availability, panels, rooms)
and unsets all interview-related embedded fields on db.applications documents.

SAFEGUARDS:
1. Never executes on ENV=production or ENV=staging.
2. Displays sanitized target (Host, Database, Environment) without exposing credentials.
3. Requires explicit confirmation flag: PURGE_INTERVIEWS_CONFIRM=I_UNDERSTAND_THIS_DELETES_INTERVIEW_DATA
4. Uses canonical app.core.config.settings and app.db.mongodb.connect_to_mongo.
"""
import os
import sys
import asyncio
import logging
from typing import Dict, List, Any

from app.core.config import settings, get_safe_db_target
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("purge_interview_data")

REQUIRED_CONFIRMATION = "I_UNDERSTAND_THIS_DELETES_INTERVIEW_DATA"

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
    target = get_safe_db_target()
    target_type = "MongoDB Atlas" if target["is_atlas"] else "Local MongoDB"

    print("\n=========================================================================")
    print("  PLACEMIND INTERVIEW DATA PURGE UTILITY")
    print("=========================================================================")
    print(f"  Target Type:        {target_type}")
    print(f"  Database Host:      {target['host']}")
    print(f"  Database Name:      {target['database']}")
    print(f"  Active Environment: {target['environment']}")
    print("=========================================================================\n")

    # Safeguard 1: Refuse to run on production or staging
    if target["environment"] in ["production", "staging"]:
        logger.critical("SAFETY VIOLATION: Interview purge is strictly FORBIDDEN in '%s' environment.", target["environment"])
        print(f"ERROR: Cannot purge interview data when ENV={target['environment']}. Aborting.")
        sys.exit(1)

    # Safeguard 2: Require explicit confirmation
    confirm_env = os.getenv("PURGE_INTERVIEWS_CONFIRM", "").strip()
    if confirm_env != REQUIRED_CONFIRMATION:
        logger.warning("SAFETY LOCK ACTIVE: Explicit confirmation missing.")
        print("SAFETY LOCK ACTIVE:")
        print("To execute an interview data purge, you must provide the exact confirmation environment variable:")
        print(f"  PURGE_INTERVIEWS_CONFIRM={REQUIRED_CONFIRMATION}")
        print("\nExample (PowerShell):")
        print(f"  $env:PURGE_INTERVIEWS_CONFIRM='{REQUIRED_CONFIRMATION}'; python purge_interview_data.py")
        print("\nAborting without modifying any data.")
        sys.exit(1)

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
