import asyncio
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.config import settings

TARGET_COLLECTIONS = [
    "users", "students", "companies", "drives", "drive_rounds",
    "applications", "assessments", "assessment_submissions",
    "interviews", "panels", "rooms", "notifications",
    "audit_logs", "communities", "exceptions", "sessions", "token_blacklist"
]

DEMO_EMAILS = [
    "recruiter@demo.com", "student@demo.com", "placement@demo.com",
    "vikram@technova.example.com", "siddharth@cloudpeak.example.com"
]

async def verify_fresh_database_state():
    print("=========================================================================")
    print("  VERIFYING 100% FRESH DATABASE STATE & ZERO DEMO RECORDS")
    print("=========================================================================")

    await connect_to_mongo()
    db = db_manager.db

    # 1. Check all collections are empty
    empty_collections = True
    total_docs = 0
    for coll_name in TARGET_COLLECTIONS:
        cnt = await db[coll_name].count_documents({})
        total_docs += cnt
        if cnt > 0:
            print(f"FAILED: Collection '{coll_name}' has {cnt} documents (expected 0)!")
            empty_collections = False
        else:
            print(f"[OK] Collection '{coll_name}' is empty (0 documents)")

    assert empty_collections, "Database contains pre-existing records!"
    assert total_docs == 0, f"Total document count is {total_docs}, expected 0!"
    print("[OK] All 17 collections confirmed empty.")

    # 2. Check no demo accounts exist in users collection
    for email in DEMO_EMAILS:
        user = await db.users.find_one({"email": email})
        assert user is None, f"FAILED: Demo account '{email}' exists in database!"
    print("[OK] Confirmed zero demo accounts exist in MongoDB.")

    # 3. Create one real test company and placement drive
    test_company = {
        "id": "real-comp-1",
        "name": "Acme Innovations",
        "industry": "Software",
        "location": "Bengaluru"
    }
    await db.companies.insert_one(test_company)

    test_drive = {
        "id": "acme-backend-2026",
        "companyId": "real-comp-1",
        "companyName": "Acme Innovations",
        "roleTitle": "Software Engineer",
        "packageLpa": 14.0,
        "status": "open",
        "location": "Bengaluru"
    }
    await db.drives.insert_one(test_drive)

    # 4. Verify user-created records exist
    comp_cnt = await db.companies.count_documents({})
    drive_cnt = await db.drives.count_documents({})
    assert comp_cnt == 1, f"Expected 1 company, found {comp_cnt}"
    assert drive_cnt == 1, f"Expected 1 drive, found {drive_cnt}"
    print("[OK] Verified 1 real user-created company and 1 real placement drive in MongoDB.")

    # 5. Clean test records back to fresh state
    await db.companies.delete_many({})
    await db.drives.delete_many({})

    print("=========================================================================")
    print("  VERIFICATION SUCCESSFUL: Fresh database state validated.")
    print("=========================================================================")

if __name__ == "__main__":
    asyncio.run(verify_fresh_database_state())
