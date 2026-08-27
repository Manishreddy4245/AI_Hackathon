"""
Development-Only Database Cleanup Script
Safely removes legacy demo business records from MongoDB without touching real user accounts or real user-created drives.
"""
import asyncio
import logging
from app.db.mongodb import db_manager, connect_to_mongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup_demo_data")

DEMO_DRIVE_IDS = [
    "technova-backend", "datasphere-analyst", "cloudpeak-engineer",
    "datasphere-data", "cloudpeak-devops", "finedge-analyst"
]

DEMO_COMPANY_IDS = [
    "comp-1", "comp-2", "comp-3", "comp-4", "comp-5"
]

DEMO_STUDENT_IDS = [
    "rahul-verma", "ananya-reddy", "aarav-sharma", "priya-singh", "karthik-rao", "neha-gupta",
    "std-1", "std-2", "std-3", "std-4", "std-5", "std-6", "std-7", "std-8", "student-demo"
]

DEMO_INTERVIEW_IDS = [
    "int-101", "int-102", "int-103", "int-rahul-verma-drive-cognizant-70113"
]

DEMO_PANEL_IDS = [
    "pnl-1", "pnl-2", "pnl-3", "pnl-4"
]

DEMO_ROOM_IDS = [
    "rm-1", "rm-2", "rm-3", "rm-4", "rm-101", "rm-102", "rm-103", "rm-104"
]

DEMO_EXCEPTION_IDS = [
    "exc-101", "exc-102", "exc-103"
]

DEMO_NOTIFICATION_IDS = [
    "notif-101", "notif-102", "notif-103", "notif-104", "notif-105"
]

DEMO_AUDIT_IDS = [
    "aud-101", "aud-102"
]

async def cleanup_demo_records():
    print("WARNING: Running development database cleanup script for demo records.")
    await connect_to_mongo()
    db = db_manager.db
    if db is None:
        logger.error("Database connection failed. Exiting.")
        return

    # Delete demo drives
    res_drives = await db.drives.delete_many({"id": {"$in": DEMO_DRIVE_IDS}})
    logger.info("Removed %d demo drive records", res_drives.deleted_count)

    # Delete demo companies
    res_companies = await db.companies.delete_many({"id": {"$in": DEMO_COMPANY_IDS}})
    logger.info("Removed %d demo company records", res_companies.deleted_count)

    # Delete demo students
    res_students = await db.students.delete_many({
        "$or": [
            {"id": {"$in": DEMO_STUDENT_IDS}},
            {"rollNumber": {"$in": ["2021CS1115", "2021IT1042", "2021CS1008", "2021EC1089", "2021CS1190"]}}
        ]
    })
    logger.info("Removed %d demo student records", res_students.deleted_count)

    # Delete demo interviews
    res_interviews = await db.interviews.delete_many({
        "$or": [
            {"id": {"$in": DEMO_INTERVIEW_IDS}},
            {"candidateId": {"$in": DEMO_STUDENT_IDS}},
            {"companyName": {"$in": ["TechNova Solutions", "DataSphere Analytics", "CloudPeak Systems", "FinEdge Technologies"]}}
        ]
    })
    logger.info("Removed %d demo interview records", res_interviews.deleted_count)

    # Delete demo panels
    res_panels = await db.panels.delete_many({"id": {"$in": DEMO_PANEL_IDS}})
    logger.info("Removed %d demo panel records", res_panels.deleted_count)

    # Delete demo rooms
    res_rooms = await db.rooms.delete_many({"id": {"$in": DEMO_ROOM_IDS}})
    logger.info("Removed %d demo room records", res_rooms.deleted_count)

    # Delete demo exceptions
    res_exceptions = await db.exceptions.delete_many({"id": {"$in": DEMO_EXCEPTION_IDS}})
    logger.info("Removed %d demo exception records", res_exceptions.deleted_count)

    # Delete demo notifications
    res_notifications = await db.notifications.delete_many({
        "$or": [
            {"id": {"$in": DEMO_NOTIFICATION_IDS}},
            {"id": {"$regex": r"^notif-10[0-9]"}},
            {"title": "Technical Interview Scheduled", "recipientName": "Rahul Verma"},
            {"message": {"$regex": r"Neha Workflow"}}
        ]
    })
    logger.info("Removed %d demo notification records", res_notifications.deleted_count)

    # Delete demo applications
    res_apps = await db.applications.delete_many({
        "$or": [
            {"drive_id": {"$in": DEMO_DRIVE_IDS}},
            {"driveId": {"$in": DEMO_DRIVE_IDS}},
            {"student_id": {"$in": DEMO_STUDENT_IDS}},
            {"studentId": {"$in": DEMO_STUDENT_IDS}}
        ]
    })
    logger.info("Removed %d demo application records", res_apps.deleted_count)

    # Delete demo audit logs
    res_audit = await db.audit_logs.delete_many({"id": {"$in": DEMO_AUDIT_IDS}})
    logger.info("Removed %d demo audit records", res_audit.deleted_count)

    print("Cleanup completed successfully.")

if __name__ == "__main__":
    asyncio.run(cleanup_demo_records())
