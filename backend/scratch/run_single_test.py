import asyncio
import json
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo
from app.core.security import create_access_token
from app.routes.drives import _get_or_init_drive_rounds

async def main():
    await connect_to_mongo()
    db = db_manager.db
    timestamp_ms = int(datetime.now().timestamp() * 1000)

    # Cleanup
    await db.interviews.delete_many({"candidateId": {"$regex": "^stu-debug"}})
    await db.assessments.delete_many({"student_id": {"$regex": "^stu-debug"}})
    await db.applications.delete_many({"student_id": {"$regex": "^stu-debug"}})
    await db.students.delete_many({"id": {"$regex": "^stu-debug"}})
    await db.drives.delete_many({"id": {"$regex": "^drive-debug"}})

    drive_id = f"drive-debug-{timestamp_ms}"
    await db.drives.insert_one({
        "id": drive_id,
        "companyName": "ByteXL",
        "roleTitle": "React Developer",
        "packageLpa": 12.0,
        "status": "APPROVED"
    })

    rounds = await _get_or_init_drive_rounds(db, drive_id)
    print("ROUNDS CREATED FOR DRIVE:", json.dumps(rounds, indent=2))

    stu_id = f"stu-debug-{timestamp_ms}"
    app_id = f"app-{stu_id}-{drive_id}"

    await db.students.insert_one({
        "id": stu_id,
        "name": "Rahul Verma",
        "email": f"rahul_{timestamp_ms}@campus.edu",
        "rollNumber": "CS991",
        "branch": "CSE",
        "cgpa": 8.8,
        "graduationYear": 2027,
        "placementStatus": "unplaced",
        "status": "active"
    })
    await db.applications.insert_one({
        "id": app_id,
        "student_id": stu_id,
        "drive_id": drive_id,
        "company_name": "ByteXL",
        "job_title": "React Developer",
        "student_name": "Rahul Verma",
        "student_email": f"rahul_{timestamp_ms}@campus.edu",
        "status": "APTITUDE_QUALIFIED",
        "stage": "APTITUDE_QUALIFIED",
        "pipeline_stage": "APTITUDE_QUALIFIED",
        "aptitude_status": "QUALIFIED",
        "round_evaluations": {
            rounds[0]["id"]: {"status": "PASSED", "score": 90.0}
        }
    })

    officer_token = create_access_token({"sub": "usr-admin-demo", "id": "usr-admin-demo", "role": "placement_officer", "name": "Placement Officer"})
    headers = {"Authorization": f"Bearer {officer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        print("\n1. Allocating Technical Round...")
        res_alloc = await client.post(f"/api/applications/{app_id}/allocate-technical", headers=headers)
        print("ALLOCATE STATUS:", res_alloc.status_code)

        ass_doc = await db.assessments.find_one({"$or": [{"application_id": app_id}, {"applicationId": app_id}]})
        print("ASSESSMENT DOC BEFORE SUBMIT:", json.dumps(ass_doc, default=str, indent=2))
        ass_id = ass_doc["id"]

        question_id = "q-tech-dsa-001"
        await db.assessments.update_one({"id": ass_id}, {"$set": {
            "questions": [{
                "id": question_id,
                "type": "technical",
                "topic": "Data Structures",
                "difficulty": "Easy",
                "question": "What is the time complexity of binary search?",
                "options": ["O(N)", "O(log N)", "O(N^2)", "O(1)"],
                "correct_answer": "O(log N)",
                "points": 10
            }]
        }})

        student_token = create_access_token({"sub": stu_id, "id": stu_id, "role": "student", "name": "Rahul Verma"})
        print("\n2. Submitting Technical Assessment...")
        res_sub = await client.post(f"/api/assessments/{ass_id}/submit", json={
            "answers": [{
                "question_id": question_id,
                "type": "technical",
                "selected_option": "O(log N)"
            }],
            "time_taken_seconds": 120
        }, headers={"Authorization": f"Bearer {student_token}"})
        print("SUBMIT STATUS:", res_sub.status_code)
        print("SUBMIT RESPONSE:", res_sub.json())

        app_after = await db.applications.find_one({"id": app_id})
        print("\n3. APPLICATION DOC AFTER TECHNICAL SUBMIT:")
        print(json.dumps(app_after, default=str, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
