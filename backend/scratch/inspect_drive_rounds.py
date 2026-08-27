import asyncio
import json
from bson import json_util
from app.db.mongodb import connect_to_mongo, db_manager

async def main():
    await connect_to_mongo()
    db = db_manager.db

    drive_doc = await db.drives.find_one({"companyName": {"$regex": "ByteXL", "$options": "i"}})
    if not drive_doc:
        drive_doc = await db.drives.find_one({})
    
    print("=== DRIVE DOCUMENT ===")
    print(json.dumps(json.loads(json_util.dumps(drive_doc)), indent=2))

if __name__ == "__main__":
    asyncio.run(main())
