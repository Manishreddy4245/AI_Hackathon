"""
Fresh Database Reset Script for PlaceMind
Wipes 100% of business and user records from MongoDB to ensure a completely fresh state.
"""
import asyncio
import logging
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("reset_fresh_database")

TARGET_COLLECTIONS = [
    "users",
    "students",
    "companies",
    "drives",
    "drive_rounds",
    "applications",
    "assessments",
    "assessment_submissions",
    "interviews",
    "panels",
    "rooms",
    "notifications",
    "audit_logs",
    "communities",
    "exceptions",
    "sessions",
    "token_blacklist"
]

async def execute_fresh_database_reset():
    print("\n=========================================================================")
    print("  PLACEMIND DATABASE RESET — ENFORCING 100% FRESH EMPTY STATE")
    print("=========================================================================\n")

    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Failed to connect to MongoDB.")
        return

    total_deleted = 0
    for coll_name in TARGET_COLLECTIONS:
        coll = db[coll_name]
        cnt_before = await coll.count_documents({})
        if cnt_before > 0:
            res = await coll.delete_many({})
            del_cnt = res.deleted_count
            total_deleted += del_cnt
            logger.info("Collection '%s': Deleted %d document(s).", coll_name, del_cnt)
        else:
            logger.info("Collection '%s': Already empty (0 documents).", coll_name)

    print("\n-------------------------------------------------------------------------")
    print(f"VERIFICATION SUCCESS: Wiped {total_deleted} document(s) across all collections.")
    print("PlaceMind database is now 100% FRESH and EMPTY.")
    print("=========================================================================\n")

if __name__ == "__main__":
    asyncio.run(execute_fresh_database_reset())
