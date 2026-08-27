import asyncio
from app.db.mongodb import connect_to_mongo, db_manager

async def debug():
    await connect_to_mongo()
    db = db_manager.db
    
    print("=== 1. SEARCHING DRIVES FOR BYTEXL OR ALL DRIVES ===")
    drives = await db.drives.find({"companyName": {"$regex": "ByteXL", "$options": "i"}}, {"_id": 0}).to_list(length=10)
    if not drives:
        print("No ByteXL drives found by regex 'ByteXL'. Listing first 10 drives:")
        drives = await db.drives.find({}, {"_id": 0}).to_list(length=10)
    
    for d in drives:
        print(f"Drive ID: {d.get('id')}, Company: {d.get('companyName') or d.get('company_name')}, Role: {d.get('roleTitle') or d.get('role_title')}")

    print("\n=== 2. INSPECTING APPLICATIONS IN DB ===")
    apps = await db.applications.find({}, {"_id": 0}).to_list(length=50)
    print(f"Total applications found: {len(apps)}")
    
    tech_qualified_apps = []
    for a in apps:
        print(f"App ID: {a.get('id')}, Student: {a.get('student_name') or a.get('student_id')}, Drive: {a.get('drive_id') or a.get('driveId')}, Status: {a.get('status')}, Stage: {a.get('stage')}, TechStatus: {a.get('technical_status')}, AptStatus: {a.get('aptitude_status')}")
        if "TECHNICAL" in str(a.get("status", "")).upper() or "TECHNICAL" in str(a.get("stage", "")).upper() or "HR" in str(a.get("status", "")).upper() or "HR" in str(a.get("stage", "")).upper() or a.get("technical_status") == "QUALIFIED":
            tech_qualified_apps.append(a)

    print(f"\nTech / HR related applications count: {len(tech_qualified_apps)}")
    for ta in tech_qualified_apps:
        print("Detailed App Record:", ta)

if __name__ == "__main__":
    asyncio.run(debug())
