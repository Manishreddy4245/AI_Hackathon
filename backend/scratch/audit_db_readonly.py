import asyncio
from app.db.mongodb import db_manager, connect_to_mongo

TARGET_COLLECTIONS = [
    "users", "students", "companies", "drives", "drive_rounds",
    "applications", "assessments", "assessment_submissions",
    "interviews", "panels", "rooms", "notifications",
    "audit_logs", "communities", "exceptions", "sessions", "token_blacklist"
]

async def audit():
    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        print("Database: UNAVAILABLE")
        return

    print("Database is_mock:", db_manager.is_mock)
    
    print("Auditing target collections...")
    
    total_records = 0
    record_counts = {}
    for coll_name in TARGET_COLLECTIONS:
        cnt = await db[coll_name].count_documents({})
        record_counts[coll_name] = cnt
        total_records += cnt
        print(f"Collection '{coll_name}': {cnt} records")
        
        if cnt > 0:
            sample_docs = await db[coll_name].find({}, {"_id": 0}).to_list(length=10)
            print(f"  Sample docs in '{coll_name}':", sample_docs)
            
    print("\nTOTAL RECORDS IN DATABASE:", total_records)

if __name__ == "__main__":
    asyncio.run(audit())
