"""
Dynamic Seed Data Discovery & Cleanup Script
Identifies and purges seed/demo records directly from Python seed definitions and runtime MongoDB collections.
Supports --dry-run mode for safe preview prior to deletion.
"""
import argparse
import asyncio
import importlib
import logging
from typing import Dict, List, Any, Set

from app.core.config import settings
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("dynamic_seed_cleanup")


def discover_seed_sources() -> Dict[str, List[Dict[str, Any]]]:
    """
    Programmatically inspects the app.db.seed module and extracts all mock/seed data structures.
    Does not hardcode any seed lists, IDs, or record counts.
    """
    logger.info("Discovering seed data sources dynamically from app.db.seed...")
    seed_module = importlib.import_module("app.db.seed")

    seed_datasets: Dict[str, List[Dict[str, Any]]] = {}

    # Inspect all module attributes matching mock_* or seed_*
    for attr_name in dir(seed_module):
        if attr_name.startswith("mock_") or attr_name.startswith("seed_"):
            attr_val = getattr(seed_module, attr_name)
            if isinstance(attr_val, list):
                # Infer collection name from variable name (e.g. mock_companies -> companies)
                coll_name = attr_name.replace("mock_", "").replace("seed_", "")
                seed_datasets[coll_name] = attr_val
                logger.info("Discovered seed dataset '%s' (%s) with %d items", attr_name, coll_name, len(attr_val))

    return seed_datasets


def extract_identifiers(items: List[Dict[str, Any]]) -> Dict[str, Set[Any]]:
    """
    Extracts all identifying fields (id, _id, email, rollNumber) from a list of dicts.
    """
    ids: Set[Any] = set()
    emails: Set[Any] = set()
    roll_numbers: Set[Any] = set()

    for item in items:
        if not isinstance(item, dict):
            continue
        if "id" in item and item["id"]:
            ids.add(item["id"])
        if "_id" in item and item["_id"]:
            ids.add(item["_id"])
        if "email" in item and item["email"]:
            emails.add(item["email"])
        if "rollNumber" in item and item["rollNumber"]:
            roll_numbers.add(item["rollNumber"])

    return {"ids": ids, "emails": emails, "roll_numbers": roll_numbers}


def build_collection_query(coll_name: str, seed_datasets: Dict[str, List[Dict[str, Any]]], include_users: bool = False) -> Dict[str, Any]:
    """
    Dynamically constructs MongoDB query for a collection based on extracted seed identifiers and legacy patterns.
    """
    if coll_name == "users" and not include_users:
        return {}

    items = seed_datasets.get(coll_name, [])
    extracted = extract_identifiers(items)

    ids = list(extracted["ids"])
    emails = list(extracted["emails"])
    roll_numbers = list(extracted["roll_numbers"])

    or_clauses: List[Dict[str, Any]] = []

    if ids:
        or_clauses.extend([
            {"id": {"$in": ids}},
            {"_id": {"$in": ids}}
        ])

    if emails and coll_name in ["users", "students", "candidates"]:
        or_clauses.extend([
            {"email": {"$in": emails}},
            {"student_email": {"$in": emails}},
            {"studentEmail": {"$in": emails}}
        ])

    if roll_numbers and coll_name in ["students", "candidates"]:
        or_clauses.append({"rollNumber": {"$in": roll_numbers}})

    # Check related fields in applications or interviews that reference seed drive/student IDs
    if coll_name == "applications" and "drives" in seed_datasets and "students" in seed_datasets:
        drive_ids = list(extract_identifiers(seed_datasets["drives"])["ids"])
        student_ids = list(extract_identifiers(seed_datasets["students"])["ids"])
        if drive_ids:
            or_clauses.extend([{"drive_id": {"$in": drive_ids}}, {"driveId": {"$in": drive_ids}}])
        if student_ids:
            or_clauses.extend([{"student_id": {"$in": student_ids}}, {"studentId": {"$in": student_ids}}])
        or_clauses.extend([
            {"id": {"$regex": r"^demo-app"}},
            {"id": {"$regex": r"^mock-app"}}
        ])

    if coll_name == "interviews" and "students" in seed_datasets:
        student_ids = list(extract_identifiers(seed_datasets["students"])["ids"])
        if student_ids:
            or_clauses.extend([{"candidateId": {"$in": student_ids}}, {"student_id": {"$in": student_ids}}])

    if coll_name == "notifications":
        or_clauses.extend([
            {"id": {"$regex": r"^notif-10[0-9]"}},
            {"title": "Technical Interview Scheduled", "recipientName": "Rahul Verma"},
            {"message": {"$regex": r"Neha Workflow"}}
        ])

    if not or_clauses:
        return {}

    return {"$or": or_clauses} if len(or_clauses) > 1 else or_clauses[0]


async def run_cleanup(dry_run: bool = True, include_users: bool = False):
    mode_str = "DRY-RUN (PREVIEW ONLY)" if dry_run else "REAL DELETION EXECUTION"
    print(f"\n========================================================")
    print(f"  DYNAMIC DATABASE CLEANUP — {mode_str}")
    print(f"========================================================\n")

    # Connect using existing project config
    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Failed to connect to MongoDB using project configuration.")
        return

    # 1. Discover seed sources
    seed_datasets = discover_seed_sources()

    # 2. Get real collections dynamically at runtime from MongoDB driver
    real_collections = await db.list_collection_names()
    logger.info("Retrieved %d active collections dynamically from database: %s", len(real_collections), real_collections)

    summary_report: Dict[str, Dict[str, Any]] = {}
    total_matched = 0
    total_deleted = 0

    for coll_name in real_collections:
        if coll_name.startswith("system."):
            continue

        query = build_collection_query(coll_name, seed_datasets, include_users=include_users)
        coll = db[coll_name]

        if not query:
            logger.info("Collection '%s': No matching seed query criteria generated.", coll_name)
            summary_report[coll_name] = {"matched": 0, "deleted": 0, "samples": []}
            continue

        matched_count = await coll.count_documents(query)
        total_matched += matched_count

        samples = []
        if matched_count > 0:
            samples = await coll.find(query, {"_id": 0}).to_list(length=3)

        if dry_run:
            logger.info("Collection '%s': WOULD DELETE %d seed matching document(s).", coll_name, matched_count)
            summary_report[coll_name] = {"matched": matched_count, "deleted": 0, "samples": samples}
        else:
            if matched_count > 0:
                del_res = await coll.delete_many(query)
                deleted_count = del_res.deleted_count
                total_deleted += deleted_count
                logger.info("Collection '%s': DELETED %d seed matching document(s).", coll_name, deleted_count)
                summary_report[coll_name] = {"matched": matched_count, "deleted": deleted_count, "samples": samples}
            else:
                summary_report[coll_name] = {"matched": 0, "deleted": 0, "samples": []}

    print("\n========================================================")
    print(f"  SUMMARY REPORT — {mode_str}")
    print("========================================================")
    for coll_name, stat in summary_report.items():
        if dry_run:
            print(f"Collection '{coll_name}': {stat['matched']} documents matched for deletion.")
            if stat["samples"]:
                print(f"  Sample matched documents:")
                for idx, sample in enumerate(stat["samples"], 1):
                    doc_str = str(sample)
                    if len(doc_str) > 120:
                        doc_str = doc_str[:120] + "..."
                    print(f"    [{idx}] {doc_str}")
        else:
            print(f"Collection '{coll_name}': {stat['deleted']} documents deleted (of {stat['matched']} matched).")

    print("--------------------------------------------------------")
    if dry_run:
        print(f"TOTAL MATCHED SEED DOCUMENTS ACROSS ALL COLLECTIONS: {total_matched}")
        print("Note: DRY-RUN mode completed. Zero database modifications were performed.")
    else:
        print(f"TOTAL DELETED SEED DOCUMENTS ACROSS ALL COLLECTIONS: {total_deleted}")
        # Verification post deletion
        logger.info("Verifying post-deletion state across all collections...")
        remaining_total = 0
        for coll_name in real_collections:
            if coll_name.startswith("system."):
                continue
            query = build_collection_query(coll_name, seed_datasets, include_users=include_users)
            if query:
                rem_cnt = await db[coll_name].count_documents(query)
                if rem_cnt > 0:
                    logger.warning("Collection '%s' still contains %d matching documents!", coll_name, rem_cnt)
                    remaining_total += rem_cnt
        if remaining_total == 0:
            print("VERIFICATION SUCCESS: All collections confirmed 100% free of seed matching documents.")
        else:
            print(f"VERIFICATION WARNING: {remaining_total} seed matching documents remain.")
    print("========================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dynamic MongoDB Seed Cleanup Utility")
    parser.add_argument("--dry-run", action="store_true", help="Preview seed documents to be deleted without executing deletion")
    parser.add_argument("--execute", action="store_true", help="Execute real deletion of discovered seed documents")
    parser.add_argument("--include-users", action="store_true", help="Include authentic seed login user accounts in deletion criteria")
    args = parser.parse_args()

    is_dry_run = not args.execute
    asyncio.run(run_cleanup(dry_run=is_dry_run, include_users=args.include_users))
