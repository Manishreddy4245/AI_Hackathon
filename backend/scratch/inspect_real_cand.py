import asyncio
import json
from bson import json_util
from app.db.mongodb import connect_to_mongo, db_manager

async def main():
    await connect_to_mongo()
    db = db_manager.db

    print("=================== 1. FINDING REAL CANDIDATES ===================")
    # Find applications where technical_status is QUALIFIED or status/stage relates to TECHNICAL / HR
    apps = await db.applications.find({
        "$or": [
            {"technical_status": "QUALIFIED"},
            {"status": {"$regex": "TECHNICAL", "$options": "i"}},
            {"status": {"$regex": "HR", "$options": "i"}},
            {"stage": {"$regex": "TECHNICAL", "$options": "i"}},
            {"stage": {"$regex": "HR", "$options": "i"}}
        ]
    }).to_list(length=10)

    print(f"Found {len(apps)} technical/HR candidate applications.\n")

    for app_doc in apps:
        app_id = app_doc.get("id")
        student_id = app_doc.get("student_id") or app_doc.get("studentId")
        drive_id = app_doc.get("drive_id") or app_doc.get("driveId")
        
        print("------------------------------------------------------------------")
        print("1. APPLICATION DOCUMENT:")
        print(json.dumps(json.loads(json_util.dumps(app_doc)), indent=2))

        print("\n2. DRIVE DOCUMENT:")
        drive_doc = await db.drives.find_one({"id": drive_id})
        if drive_doc:
            print(json.dumps(json.loads(json_util.dumps(drive_doc)), indent=2))
        else:
            print("No drive doc found for drive_id:", drive_id)

        print("\n3. ASSESSMENT DOCUMENT(S):")
        ass_docs = await db.assessments.find({"$or": [{"application_id": app_id}, {"applicationId": app_id}, {"student_id": student_id}]}).to_list(length=10)
        print(json.dumps(json.loads(json_util.dumps(ass_docs)), indent=2))

        print("\n4. ASSESSMENT RESULTS / SUBMISSIONS DOCUMENT(S):")
        sub_docs = await db.assessment_submissions.find({"$or": [{"application_id": app_id}, {"applicationId": app_id}, {"student_id": student_id}]}).to_list(length=10)
        print(json.dumps(json.loads(json_util.dumps(sub_docs)), indent=2))

        print("\n5. INTERVIEW DOCUMENT(S):")
        int_docs = await db.interviews.find({"$or": [{"application_id": app_id}, {"applicationId": app_id}, {"candidateId": student_id}]}).to_list(length=10)
        print(json.dumps(json.loads(json_util.dumps(int_docs)), indent=2))
        print("------------------------------------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(main())
