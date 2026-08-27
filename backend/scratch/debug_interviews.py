import asyncio
from app.db.mongodb import connect_to_mongo, db_manager
from httpx import AsyncClient, ASGITransport
from app.main import app

async def debug():
    await connect_to_mongo()
    db = db_manager.db

    print("=== 1. CHECKING INTERVIEWS IN DB ===")
    ints = await db.interviews.find({}, {"_id": 0}).to_list(length=50)
    print(f"Total interviews in db.interviews: {len(ints)}")
    for i in ints:
        print("Interview Record:", i)

    print("\n=== 2. CALLING GET /api/interviews/eligible-candidates?drive_id=drive-bytexl-6281 ===")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get("/api/interviews/eligible-candidates?drive_id=drive-bytexl-6281")
        print("Status code:", res.status_code)
        print("Response JSON:", res.json())

    print("\n=== 3. CHECKING ALL DRIVES AND THEIR APPLICATIONS ===")
    drives = await db.drives.find({}, {"_id": 0}).to_list(length=50)
    for d in drives:
        d_id = d.get("id")
        comp = d.get("companyName") or d.get("company_name")
        role = d.get("roleTitle") or d.get("job_title")
        apps = await db.applications.find({"$or": [{"drive_id": d_id}, {"driveId": d_id}]}, {"_id": 0}).to_list(length=50)
        print(f"Drive {d_id} ({comp} - {role}): {len(apps)} applications")
        for a in apps:
            print(f"   App {a.get('id')}: student={a.get('student_name') or a.get('student_id')}, status={a.get('status')}, stage={a.get('stage')}, tech_status={a.get('technical_status')}")

if __name__ == "__main__":
    asyncio.run(debug())
