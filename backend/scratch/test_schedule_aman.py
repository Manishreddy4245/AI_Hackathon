import asyncio
from app.db.mongodb import connect_to_mongo, db_manager
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token

async def test_schedule():
    await connect_to_mongo()
    db = db_manager.db

    officer_token = create_access_token({"sub": "usr-admin-demo", "id": "usr-admin-demo", "role": "placement_officer", "name": "Placement Officer"})
    headers = {"Authorization": f"Bearer {officer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        print("=== 1. PRE-CHECK ELIGIBLE CANDIDATES ===")
        res1 = await client.get("/api/interviews/eligible-candidates?drive_id=drive-bytexl-6281", headers=headers)
        print("Pre-check status:", res1.status_code, res1.json())
        assert len(res1.json()) > 0, "Aman Gupta should be eligible!"

        print("\n=== 2. SCHEDULING INTERVIEW FOR AMAN GUPTA ===")
        res2 = await client.post("/api/interviews", json={
            "candidateId": "usr-2024cs7866",
            "candidateName": "Aman Gupta",
            "companyName": "ByteXL",
            "roleTitle": "React Developer",
            "driveId": "drive-bytexl-6281",
            "applicationId": "app-usr-2024cs7866-drive-bytexl-6281",
            "round": "HR",
            "date": "2026-09-02",
            "timeSlot": "11:00 AM - 11:45 AM",
            "startTime": "11:00 AM",
            "endTime": "11:45 AM",
            "panelName": "ByteXL HR Panel 1",
            "roomName": "Conference Room B"
        }, headers=headers)

        print("Schedule status:", res2.status_code)
        print("Schedule response:", res2.json())
        assert res2.status_code in [200, 201]

        print("\n=== 3. VERIFYING APPLICATION STATUS IN DB ===")
        app_doc = await db.applications.find_one({"id": "app-usr-2024cs7866-drive-bytexl-6281"}, {"_id": 0})
        print("Application status:", app_doc.get("status"))
        print("Application stage:", app_doc.get("stage"))
        assert app_doc.get("status") == "INTERVIEW_SCHEDULED"

        print("\n=== 4. POST-CHECK ELIGIBLE CANDIDATES ===")
        res3 = await client.get("/api/interviews/eligible-candidates?drive_id=drive-bytexl-6281", headers=headers)
        print("Post-check status:", res3.status_code, res3.json())
        assert len(res3.json()) == 0, "Scheduled candidate should no longer be in eligible candidates list!"

if __name__ == "__main__":
    asyncio.run(test_schedule())
