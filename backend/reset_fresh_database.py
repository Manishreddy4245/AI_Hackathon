"""
Fresh Database Reset Script for PlaceMind
Wipes business and user records from MongoDB to ensure a fresh state for development.

SAFEGUARDS:
1. Never executes on ENV=production or ENV=staging.
2. Displays sanitized target (Host, Database, Environment) without exposing credentials.
3. Requires explicit confirmation flag: RESET_DATABASE_CONFIRM=I_UNDERSTAND_THIS_DELETES_ALL_DATA
4. Uses canonical app.core.config.settings and app.db.mongodb.connect_to_mongo.
5. Re-applies all unique constraints, compound indexes, and data integrity rules after wipe.
"""
import os
import sys
import asyncio
import logging
from typing import Dict, List, Set

from app.core.config import settings, get_safe_db_target
from app.db.mongodb import db_manager, connect_to_mongo, close_mongo_connection
from app.db.indexes import create_required_indexes
from app.db.integrity import setup_data_integrity, generate_data_integrity_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("reset_fresh_database")

REQUIRED_CONFIRMATION = "I_UNDERSTAND_THIS_DELETES_ALL_DATA"

KNOWN_APPLICATION_COLLECTIONS: List[str] = [
    "users",
    "students",
    "companies",
    "drives",
    "drive_rounds",
    "applications",
    "assessments",
    "assessment_results",
    "assessment_submissions",
    "interviews",
    "interview_slots",
    "interview_availability",
    "panels",
    "rooms",
    "notifications",
    "audit_logs",
    "communities",
    "community_messages",
    "community_responses",
    "exceptions",
    "sessions",
    "token_blacklist",
    "resumes",
    "user_adaptive_states",
    "user_topic_mastery",
    "spaced_repetition_queues",
    "copilot_queries"
]

async def execute_fresh_database_reset():
    target = get_safe_db_target()
    target_type = "MongoDB Atlas" if target["is_atlas"] else "Local MongoDB"

    print("\n=========================================================================")
    print("  PLACEMIND DATABASE RESET UTILITY")
    print("=========================================================================")
    print(f"  Target Type:        {target_type}")
    print(f"  Database Host:      {target['host']}")
    print(f"  Database Name:      {target['database']}")
    print(f"  Active Environment: {target['environment']}")
    print("=========================================================================\n")

    # Safeguard 1: Refuse to run on production or staging
    if target["environment"] in ["production", "staging"]:
        logger.critical("SAFETY VIOLATION: Database reset is strictly FORBIDDEN in '%s' environment.", target["environment"])
        print(f"ERROR: Cannot reset database when ENV={target['environment']}. Aborting.")
        sys.exit(1)

    # Safeguard 2: Require explicit confirmation
    confirm_env = os.getenv("RESET_DATABASE_CONFIRM", "").strip()
    if confirm_env != REQUIRED_CONFIRMATION:
        logger.warning("SAFETY LOCK ACTIVE: Explicit confirmation missing.")
        print("SAFETY LOCK ACTIVE:")
        print("To execute a database wipe, you must provide the exact confirmation environment variable:")
        print(f"  RESET_DATABASE_CONFIRM={REQUIRED_CONFIRMATION}")
        print("\nExample (PowerShell):")
        print(f"  $env:RESET_DATABASE_CONFIRM='{REQUIRED_CONFIRMATION}'; python reset_fresh_database.py")
        print("\nAborting without modifying any data.")
        sys.exit(1)

    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Failed to connect to MongoDB.")
        return

    # 1. Discover all active collections dynamically from MongoDB driver + combine with known schemas
    discovered_collections: List[str] = await db.list_collection_names()
    all_target_collections: Set[str] = set(KNOWN_APPLICATION_COLLECTIONS).union(
        [c for c in discovered_collections if not c.startswith("system.")]
    )

    before_counts: Dict[str, int] = {}
    after_counts: Dict[str, int] = {}
    deleted_counts: Dict[str, int] = {}

    for coll_name in sorted(all_target_collections):
        cnt = await db[coll_name].count_documents({})
        before_counts[coll_name] = cnt

    # 2. Perform complete data wipe using delete_many({})
    total_deleted = 0
    for coll_name in sorted(all_target_collections):
        coll = db[coll_name]
        cnt_before = before_counts[coll_name]
        if cnt_before > 0:
            res = await coll.delete_many({})
            del_cnt = res.deleted_count
            total_deleted += del_cnt
            deleted_counts[coll_name] = del_cnt
            logger.info("Collection '%s': Deleted %d document(s).", coll_name, del_cnt)
        else:
            deleted_counts[coll_name] = 0

        cnt_after = await coll.count_documents({})
        after_counts[coll_name] = cnt_after

    # 3. Re-apply indexes and unique constraints
    print("\n-------------------------------------------------------------------------")
    print("Re-applying and verifying database unique indexes and constraints...")
    await create_required_indexes(db)
    await setup_data_integrity(db)
    print("-------------------------------------------------------------------------\n")

    # 4. Generate post-wipe verification report
    print("=========================================================================")
    print("  PLACEMIND DATABASE WIPE AUDIT REPORT")
    print("=========================================================================")
    print(f"{'Collection Name':<30} | {'Before':<8} | {'Deleted':<8} | {'After':<8}")
    print("-" * 65)

    for coll_name in sorted(all_target_collections):
        b = before_counts.get(coll_name, 0)
        d = deleted_counts.get(coll_name, 0)
        a = after_counts.get(coll_name, 0)
        print(f"{coll_name:<30} | {b:<8} | {d:<8} | {a:<8}")

    print("-------------------------------------------------------------------------")
    print(f"TOTAL DOCUMENTS WIPED ACROSS ALL COLLECTIONS: {total_deleted}")
    print("=========================================================================\n")

    # 5. Run data integrity report
    integrity_report = await generate_data_integrity_report(db)
    print("DATA INTEGRITY VERIFICATION:")
    print(f"  - Total Violations Detected: {integrity_report.get('total_violations', 0)}")
    print(f"  - Integrity Status:          {integrity_report.get('status', 'HEALTHY')}")
    print("=========================================================================\n")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(execute_fresh_database_reset())
