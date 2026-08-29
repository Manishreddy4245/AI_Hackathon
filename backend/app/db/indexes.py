"""MongoDB Index Management and Unique Constraint Enforcer for PlaceMind."""
import logging
from pymongo import ASCENDING
from app.core.config import settings

logger = logging.getLogger("placemind.indexes")

async def create_required_indexes(db) -> None:
    """Create canonical unique and compound indexes across all collections."""
    logger.info("Verifying and applying MongoDB unique constraints and indexes...")
    try:
        # 1. Users Collection
        await db.users.create_index([("email", ASCENDING)], unique=True, sparse=True)
        await db.users.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 2. Students Collection
        await db.students.create_index([("email", ASCENDING)], unique=True, sparse=True)
        await db.students.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 3. Companies Collection
        await db.companies.create_index([("company_key", ASCENDING)], unique=True, sparse=True)
        await db.companies.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 4. Applications Collection (Canonical student_id + drive_id compound uniqueness)
        await db.applications.create_index(
            [("student_id", ASCENDING), ("drive_id", ASCENDING)],
            unique=True,
            sparse=True
        )
        await db.applications.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 5. Notifications Collection
        await db.notifications.create_index([("notification_key", ASCENDING)], unique=True, sparse=True)
        await db.notifications.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.notifications.create_index([("recipient_id", ASCENDING)])
        await db.notifications.create_index([("student_id", ASCENDING)])

        # 6. Placement Drives Collection
        await db.drives.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.drives.create_index([("company_id", ASCENDING)])
        await db.drives.create_index([("status", ASCENDING)])

        # 7. Resumes Collection (One canonical resume per student)
        await db.resumes.create_index([("student_id", ASCENDING)], unique=True, sparse=True)

        # 8. Interviews Collection
        await db.interviews.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.interviews.create_index([("application_id", ASCENDING)])
        await db.interviews.create_index([("student_id", ASCENDING)])
        await db.interviews.create_index([("drive_id", ASCENDING)])
        await db.interviews.create_index([("slot_id", ASCENDING)])

        # 9. Interview Availability Slots
        if hasattr(db, "interview_availability"):
            await db.interview_availability.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 10. Rooms and Panels
        await db.rooms.create_index([("room_key", ASCENDING)], unique=True, sparse=True)
        await db.rooms.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.panels.create_index([("panel_key", ASCENDING)], unique=True, sparse=True)
        await db.panels.create_index([("id", ASCENDING)], unique=True, sparse=True)

        # 11. Assessments & Assessment Results
        await db.assessments.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.assessments.create_index([("student_id", ASCENDING)])
        await db.assessment_results.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.assessment_results.create_index([("assessment_id", ASCENDING)], unique=True, sparse=True)
        await db.assessment_results.create_index([("student_id", ASCENDING)])

        # 12. Placement Communities, Messages & Responses
        await db.communities.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.communities.create_index([("drive_id", ASCENDING)], unique=True, sparse=True)
        await db.community_messages.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.community_messages.create_index([("community_id", ASCENDING)])
        await db.community_messages.create_index([("drive_id", ASCENDING)])
        await db.community_responses.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.community_responses.create_index(
            [("student_id", ASCENDING), ("drive_id", ASCENDING)],
            unique=True,
            sparse=True
        )

        # 13. Offers & Joining Collection
        await db.offers.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.offers.create_index([("offer_id", ASCENDING)], unique=True, sparse=True)
        await db.offers.create_index([("application_id", ASCENDING)])
        await db.offers.create_index([("student_id", ASCENDING)])
        await db.offers.create_index([("drive_id", ASCENDING)])
        await db.offers.create_index([("status", ASCENDING)])

        # 14. Audit Logs Collection
        await db.audit_logs.create_index([("id", ASCENDING)], unique=True, sparse=True)
        await db.audit_logs.create_index([("userId", ASCENDING)])
        await db.audit_logs.create_index([("action", ASCENDING)])
        await db.audit_logs.create_index([("entity", ASCENDING)])
        await db.audit_logs.create_index([("created_at", ASCENDING)])
        await db.audit_logs.create_index([("timestamp", ASCENDING)])

        logger.info("MongoDB unique indexes and compound constraints created successfully.")
    except Exception as e:
        is_prod = getattr(settings, "ENVIRONMENT", "development") in ["production", "staging"]
        if is_prod:
            logger.critical("CRITICAL: Failed to initialize MongoDB indexes in %s: %s", getattr(settings, "ENVIRONMENT", "production"), str(e))
            raise RuntimeError(f"Critical MongoDB index initialization failed: {str(e)}") from e
        else:
            logger.warning("Warning: Could not apply indexes (non-production/test mode): %s", str(e))
