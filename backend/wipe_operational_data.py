"""
Complete Operational Data Wipe Script
Wipes 100% of operational and transactional collections in MongoDB Atlas so the placement workflow starts fresh from zero,
while preserving all user authentication accounts in `db.users` completely untouched.
"""
import asyncio
import logging
from typing import Dict, List, Any

from app.core.config import settings
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("wipe_operational_data")

# Collections explicitly identified for user authentication & login accounts
USER_AUTH_COLLECTIONS = {"users", "students"}

async def execute_operational_wipe():
    print("\n=========================================================================")
    print("  LIVE MONGODB ATLAS — FULL OPERATIONAL DATA WIPE EXECUTION")
    print("=========================================================================\n")

    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Failed to connect to MongoDB using project configuration.")
        return

    # 1. Discover all collections dynamically at runtime from MongoDB driver
    all_collections = await db.list_collection_names()
    logger.info("Retrieved %d active collections dynamically from database driver.", len(all_collections))

    before_counts: Dict[str, int] = {}
    after_counts: Dict[str, int] = {}
    deleted_counts: Dict[str, int] = {}

    operational_collections: List[str] = []
    auth_collections: List[str] = []

    for coll_name in sorted(all_collections):
        if coll_name.startswith("system."):
            continue
        count = await db[coll_name].count_documents({})
        before_counts[coll_name] = count

        if coll_name in USER_AUTH_COLLECTIONS:
            auth_collections.append(coll_name)
        else:
            operational_collections.append(coll_name)

    print(f"AUTHENTICATION COLLECTIONS TO PRESERVE ({len(auth_collections)}): {auth_collections}")
    print(f"OPERATIONAL COLLECTIONS TO WIPE ({len(operational_collections)}): {operational_collections}\n")

    # 2. Perform wipe on operational collections ONLY
    total_wiped = 0
    for coll_name in operational_collections:
        coll = db[coll_name]
        before_cnt = before_counts[coll_name]
        
        if before_cnt > 0:
            res = await coll.delete_many({})
            del_cnt = res.deleted_count
            deleted_counts[coll_name] = del_cnt
            total_wiped += del_cnt
            logger.info("Collection '%s': Wiped %d operational document(s).", coll_name, del_cnt)
        else:
            deleted_counts[coll_name] = 0
            logger.info("Collection '%s': Already 0 documents.", coll_name)

        after_cnt = await coll.count_documents({})
        after_counts[coll_name] = after_cnt

    # 3. Verify user authentication collections were untouched
    for coll_name in auth_collections:
        after_cnt = await db[coll_name].count_documents({})
        after_counts[coll_name] = after_cnt
        deleted_counts[coll_name] = 0
        logger.info("Collection '%s' (USER AUTH): Preserved untouched (%d documents).", coll_name, after_cnt)

    print("\n=========================================================================")
    print("  BEFORE / AFTER DOCUMENT COUNTS REPORT PER COLLECTION")
    print("=========================================================================")
    print(f"{'Collection Name':<28} | {'Type':<12} | {'Before':<8} | {'Deleted':<8} | {'After':<8}")
    print("-" * 75)

    all_target_colls = sorted(list(before_counts.keys()))
    for coll_name in all_target_colls:
        coll_type = "USER AUTH" if coll_name in USER_AUTH_COLLECTIONS else "OPERATIONAL"
        b_cnt = before_counts.get(coll_name, 0)
        d_cnt = deleted_counts.get(coll_name, 0)
        a_cnt = after_counts.get(coll_name, 0)
        print(f"{coll_name:<28} | {coll_type:<12} | {b_cnt:<8} | {d_cnt:<8} | {a_cnt:<8}")

    print("-------------------------------------------------------------------------")
    print(f"TOTAL OPERATIONAL DOCUMENTS WIPED: {total_wiped}")
    print("=========================================================================\n")

    # 4. Final integrity check
    any_operational_remaining = any(after_counts[c] > 0 for c in operational_collections)
    auth_preserved = all(after_counts[c] == before_counts[c] for c in auth_collections)

    if not any_operational_remaining and auth_preserved:
        print("VERIFICATION SUCCESS: All operational collections confirmed at 0 documents.")
        print("VERIFICATION SUCCESS: User authentication collection(s) confirmed 100% untouched.")
    else:
        print("VERIFICATION WARNING: Operational wipe or auth preservation issue detected!")

if __name__ == "__main__":
    asyncio.run(execute_operational_wipe())
