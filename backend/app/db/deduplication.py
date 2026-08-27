"""MongoDB Deduplication and Reference Migration Engine for PlaceMind.
Safely detects duplicate documents, re-maps foreign keys to canonical records, and removes duplicates in bulk.
"""
import logging
from typing import Dict, Any, List, Set
from app.db.normalization import (
    normalize_email,
    build_company_key,
    build_room_key,
    build_panel_key,
    build_notification_key,
)

logger = logging.getLogger("placemind.dedup")

async def deduplicate_users(db) -> int:
    """Deduplicate users collection by normalized email in bulk.
    Re-maps any student/recruiter profile links to canonical user.
    """
    removed_count = 0
    try:
        users = await db.users.find({}).to_list(length=5000)
        email_map: Dict[str, List[Dict[str, Any]]] = {}

        for u in users:
            raw_email = u.get("email") or ""
            norm_email = normalize_email(raw_email)
            if not norm_email:
                continue
            email_map.setdefault(norm_email, []).append(u)

        dup_ids_to_delete = []
        for norm_email, group in email_map.items():
            if len(group) <= 1:
                continue

            canonical = group[0]
            canonical_id = canonical.get("id") or str(canonical.get("_id"))
            duplicates = group[1:]

            for dup in duplicates:
                dup_id = dup.get("id") or str(dup.get("_id"))
                if not dup_id or dup_id == canonical_id:
                    continue

                # Re-map references across collections
                await db.students.update_many({"id": dup_id}, {"$set": {"id": canonical_id, "email": norm_email}})
                await db.applications.update_many({"student_id": dup_id}, {"$set": {"student_id": canonical_id}})
                await db.notifications.update_many({"recipient_id": dup_id}, {"$set": {"recipient_id": canonical_id}})
                await db.notifications.update_many({"student_id": dup_id}, {"$set": {"student_id": canonical_id}})
                await db.interviews.update_many({"student_id": dup_id}, {"$set": {"student_id": canonical_id}})
                await db.resumes.update_many({"student_id": dup_id}, {"$set": {"student_id": canonical_id}})

                if "_id" in dup:
                    dup_ids_to_delete.append(dup["_id"])
                elif "id" in dup:
                    dup_ids_to_delete.append(dup["id"])

        id_map: Dict[str, List[Dict[str, Any]]] = {}
        for u in users:
            uid = u.get("id")
            if uid:
                id_map.setdefault(uid, []).append(u)

        for uid, group in id_map.items():
            if len(group) > 1:
                duplicates = group[1:]
                for dup in duplicates:
                    if "_id" in dup and dup["_id"] not in dup_ids_to_delete:
                        dup_ids_to_delete.append(dup["_id"])

        if dup_ids_to_delete:
            await db.users.delete_many({"_id": {"$in": dup_ids_to_delete}})
            removed_count = len(dup_ids_to_delete)
            logger.info("Migrated & removed %d user duplicates in bulk", removed_count)

        # 2. Students Collection Deduplication
        students = await db.students.find({}).to_list(length=5000)
        stud_id_map: Dict[str, List[Dict[str, Any]]] = {}
        for s in students:
            sid = s.get("id")
            if sid:
                stud_id_map.setdefault(sid, []).append(s)

        stud_dups_to_delete = []
        for sid, group in stud_id_map.items():
            if len(group) > 1:
                for dup in group[1:]:
                    if "_id" in dup:
                        stud_dups_to_delete.append(dup["_id"])

        if stud_dups_to_delete:
            await db.students.delete_many({"_id": {"$in": stud_dups_to_delete}})
            logger.info("Removed %d student duplicates in bulk", len(stud_dups_to_delete))
    except Exception as e:
        logger.warning("Error during users deduplication: %s", str(e))
    return removed_count

async def deduplicate_companies(db) -> int:
    """Deduplicate companies collection by canonical companyKey in bulk.
    Re-maps drives, applications, and recruiter profiles to canonical companyId.
    """
    removed_count = 0
    try:
        companies = await db.companies.find({}).to_list(length=2000)
        key_map: Dict[str, List[Dict[str, Any]]] = {}

        for c in companies:
            name = c.get("name") or c.get("companyName") or ""
            c_key = c.get("companyKey") or build_company_key(name)
            if not c_key:
                continue
            key_map.setdefault(c_key, []).append(c)

        dup_ids_to_delete = []
        for c_key, group in key_map.items():
            if len(group) <= 1:
                continue

            canonical = group[0]
            canonical_id = canonical.get("id") or canonical.get("companyId") or str(canonical.get("_id"))
            duplicates = group[1:]

            for dup in duplicates:
                dup_id = dup.get("id") or dup.get("companyId") or str(dup.get("_id"))
                if not dup_id or dup_id == canonical_id:
                    continue

                # Re-map references across drives and applications
                await db.drives.update_many({"companyId": dup_id}, {"$set": {"companyId": canonical_id, "company_id": canonical_id}})
                await db.drives.update_many({"company_id": dup_id}, {"$set": {"companyId": canonical_id, "company_id": canonical_id}})
                await db.applications.update_many({"company_id": dup_id}, {"$set": {"company_id": canonical_id, "companyId": canonical_id}})
                await db.users.update_many({"companyId": dup_id}, {"$set": {"companyId": canonical_id}})

                if "_id" in dup:
                    dup_ids_to_delete.append(dup["_id"])
                elif "id" in dup:
                    dup_ids_to_delete.append(dup["id"])

        if dup_ids_to_delete:
            await db.companies.delete_many({"$or": [{"_id": {"$in": dup_ids_to_delete}}, {"id": {"$in": dup_ids_to_delete}}]})
            removed_count = len(dup_ids_to_delete)
            logger.info("Migrated & removed %d company duplicates in bulk", removed_count)
    except Exception as e:
        logger.warning("Error during companies deduplication: %s", str(e))
    return removed_count

async def deduplicate_applications(db) -> int:
    """Deduplicate applications by (student_id + drive_id) in bulk.
    Preserves most advanced status (e.g. SHORTLISTED > APPLIED).
    """
    removed_count = 0
    try:
        apps = await db.applications.find({}).to_list(length=5000)
        pair_map: Dict[str, List[Dict[str, Any]]] = {}

        for a in apps:
            student_id = a.get("student_id") or a.get("studentId") or ""
            drive_id = a.get("drive_id") or a.get("driveId") or ""
            if not student_id or not drive_id:
                continue
            key = f"{student_id}::{drive_id}"
            pair_map.setdefault(key, []).append(a)

        status_priority = {
            "SELECTED": 5,
            "PLACED": 5,
            "SHORTLISTED": 4,
            "INTERVIEW_SCHEDULED": 4,
            "UNDER_REVIEW": 3,
            "APPLIED": 2,
            "EXTERNAL_APPLICATION_COMPLETED": 2,
            "APPLICATION_STARTED": 1,
            "REJECTED": 0,
        }

        dup_ids_to_delete = []
        for key, group in pair_map.items():
            if len(group) <= 1:
                continue

            group.sort(
                key=lambda x: (
                    status_priority.get(str(x.get("status", "")).upper(), 1),
                    x.get("created_at") or x.get("applied_at") or ""
                ),
                reverse=True
            )

            canonical = group[0]
            canonical_id = canonical.get("id") or canonical.get("applicationId") or str(canonical.get("_id"))
            duplicates = group[1:]

            for dup in duplicates:
                dup_id = dup.get("id") or dup.get("applicationId") or str(dup.get("_id"))
                if not dup_id or dup_id == canonical_id:
                    continue

                await db.interviews.update_many({"application_id": dup_id}, {"$set": {"application_id": canonical_id}})
                await db.notifications.update_many({"application_id": dup_id}, {"$set": {"application_id": canonical_id}})

                if "_id" in dup:
                    dup_ids_to_delete.append(dup["_id"])
        # Clean up orphaned applications with broken drive references
        drives = await db.drives.find({}).to_list(length=5000)
        valid_drive_ids = {d.get("id") for d in drives if d.get("id")}
        users = await db.users.find({}).to_list(length=5000)
        valid_student_ids = {u.get("id") for u in users if u.get("id")}

        for a in apps:
            did = a.get("drive_id") or a.get("driveId")
            sid = a.get("student_id") or a.get("studentId")
            if did and did not in valid_drive_ids and not did.startswith("ext-") and not did.startswith("gh-") and not did.startswith("mock-") and not did.startswith("drive-"):
                if "_id" in a and a["_id"] not in dup_ids_to_delete:
                    dup_ids_to_delete.append(a["_id"])
            if sid and sid not in valid_student_ids and not sid.startswith("usr-") and not sid.startswith("student-"):
                if "_id" in a and a["_id"] not in dup_ids_to_delete:
                    dup_ids_to_delete.append(a["_id"])

        if dup_ids_to_delete:
            await db.applications.delete_many({"_id": {"$in": dup_ids_to_delete}})
            removed_count = len(dup_ids_to_delete)
            logger.info("Migrated & removed %d application duplicates/broken references in bulk", removed_count)
    except Exception as e:
        logger.warning("Error during applications deduplication: %s", str(e))
    return removed_count

async def deduplicate_notifications(db) -> int:
    """Deduplicate notifications collection by deterministic notificationKey in bulk."""
    removed_count = 0
    try:
        notifications = await db.notifications.find({}).to_list(length=10000)
        key_map: Dict[str, List[Dict[str, Any]]] = {}

        for n in notifications:
            n_key = n.get("notificationKey")
            if not n_key:
                n_key = build_notification_key(
                    notification_type=n.get("type") or n.get("notification_type") or "",
                    recipient_id=n.get("recipient_id") or n.get("recipient_user_id") or n.get("user_id") or "",
                    application_id=n.get("application_id") or "",
                    student_id=n.get("student_id") or "",
                    drive_id=n.get("drive_id") or "",
                )
            key_map.setdefault(n_key, []).append(n)

        dup_ids_to_delete = []
        for n_key, group in key_map.items():
            if len(group) <= 1:
                continue

            duplicates = group[1:]
            for dup in duplicates:
                if "_id" in dup:
                    dup_ids_to_delete.append(dup["_id"])
                elif "id" in dup:
                    dup_ids_to_delete.append(dup["id"])

        if dup_ids_to_delete:
            await db.notifications.delete_many({"$or": [{"_id": {"$in": dup_ids_to_delete}}, {"id": {"$in": dup_ids_to_delete}}]})
            removed_count = len(dup_ids_to_delete)
            logger.info("Removed %d notification duplicates in bulk", removed_count)
    except Exception as e:
        logger.warning("Error during notifications deduplication: %s", str(e))
    return removed_count

async def deduplicate_rooms_and_panels(db) -> int:
    """Deduplicate interview rooms and panels in bulk."""
    removed_count = 0
    try:
        # 1. Rooms
        rooms = await db.rooms.find({}).to_list(length=1000)
        room_map: Dict[str, List[Dict[str, Any]]] = {}
        for r in rooms:
            rk = r.get("room_key") or build_room_key(r.get("block"), r.get("room_number") or r.get("roomNumber"))
            room_map.setdefault(rk, []).append(r)

        room_dups = []
        for rk, group in room_map.items():
            if len(group) > 1:
                canonical = group[0]
                canonical_id = canonical.get("id") or str(canonical.get("_id"))
                for dup in group[1:]:
                    dup_id = dup.get("id") or str(dup.get("_id"))
                    await db.interviews.update_many({"room_id": dup_id}, {"$set": {"room_id": canonical_id}})
                    if "_id" in dup:
                        room_dups.append(dup["_id"])
                    elif "id" in dup:
                        room_dups.append(dup["id"])

        if room_dups:
            await db.rooms.delete_many({"$or": [{"_id": {"$in": room_dups}}, {"id": {"$in": room_dups}}]})
            removed_count += len(room_dups)

        # 2. Panels
        panels = await db.panels.find({}).to_list(length=1000)
        panel_map: Dict[str, List[Dict[str, Any]]] = {}
        for p in panels:
            pk = p.get("panel_key") or build_panel_key(p.get("panel_name") or p.get("name"))
            panel_map.setdefault(pk, []).append(p)

        panel_dups = []
        for pk, group in panel_map.items():
            if len(group) > 1:
                canonical = group[0]
                canonical_id = canonical.get("id") or str(canonical.get("_id"))
                for dup in group[1:]:
                    dup_id = dup.get("id") or str(dup.get("_id"))
                    await db.interviews.update_many({"panel_id": dup_id}, {"$set": {"panel_id": canonical_id}})
                    if "_id" in dup:
                        panel_dups.append(dup["_id"])
                    elif "id" in dup:
                        panel_dups.append(dup["id"])

        if panel_dups:
            await db.panels.delete_many({"$or": [{"_id": {"$in": panel_dups}}, {"id": {"$in": panel_dups}}]})
            removed_count += len(panel_dups)
    except Exception as e:
        logger.warning("Error during rooms/panels deduplication: %s", str(e))
    return removed_count

async def sync_recruiter_company_drives(db) -> int:
    """Synchronize recruiter ownership, company IDs, and company names across db.users, db.companies, and db.drives safely."""
    updated_count = 0
    try:
        # 1. Map existing recruiters by id, email, companyId, companyName
        recruiters = await db.users.find({"role": {"$in": ["recruiter", "company_recruiter"]}}).to_list(length=1000)
        recruiter_by_id = {u.get("id"): u for u in recruiters if u.get("id")}
        recruiter_by_email = {u.get("email").lower(): u for u in recruiters if u.get("email")}
        recruiter_by_comp_name = {u.get("companyName").lower(): u for u in recruiters if u.get("companyName")}
        recruiter_by_comp_id = {u.get("companyId"): u for u in recruiters if u.get("companyId")}

        # 2. Inspect drives and backfill missing recruiter_id / companyId / companyName
        drives = await db.drives.find({}).to_list(length=5000)
        for drive in drives:
            drive_id = drive.get("id")
            if not drive_id:
                continue

            updates = {}
            rec_id = drive.get("recruiter_id") or drive.get("createdBy")
            rec_email = (drive.get("recruiter_email") or "").lower()
            comp_name = drive.get("companyName") or drive.get("company_name")
            comp_id = drive.get("companyId") or drive.get("company_id")

            # Try finding matching recruiter
            matched_rec = None
            if rec_id and rec_id in recruiter_by_id:
                matched_rec = recruiter_by_id[rec_id]
            elif rec_email and rec_email in recruiter_by_email:
                matched_rec = recruiter_by_email[rec_email]
            elif comp_id and comp_id in recruiter_by_comp_id:
                matched_rec = recruiter_by_comp_id[comp_id]
            elif comp_name and comp_name.lower() in recruiter_by_comp_name:
                matched_rec = recruiter_by_comp_name[comp_name.lower()]

            if matched_rec:
                m_id = matched_rec.get("id")
                m_email = matched_rec.get("email")
                m_name = matched_rec.get("name")
                m_comp_id = matched_rec.get("companyId") or comp_id or f"comp-{m_id}"
                m_comp_name = matched_rec.get("companyName") or comp_name

                if not drive.get("recruiter_id"):
                    updates["recruiter_id"] = m_id
                if not drive.get("createdBy"):
                    updates["createdBy"] = m_id
                if not drive.get("recruiter_email") and m_email:
                    updates["recruiter_email"] = m_email
                if not drive.get("recruiter_name") and m_name:
                    updates["recruiter_name"] = m_name
                if not drive.get("companyId") and m_comp_id:
                    updates["companyId"] = m_comp_id
                    updates["company_id"] = m_comp_id
                if not drive.get("companyName") and m_comp_name:
                    updates["companyName"] = m_comp_name

                # Synchronize company record in db.companies
                if m_comp_id and m_comp_name:
                    await db.companies.update_one(
                        {"id": m_comp_id},
                        {
                            "$setOnInsert": {
                                "id": m_comp_id,
                                "name": m_comp_name,
                                "logo": "".join([w[0].upper() for w in m_comp_name.split()[:2]]),
                                "industry": "Technology / Software",
                                "location": drive.get("location") or "Bengaluru / Hybrid",
                                "tier": "Tier 1",
                                "contactPerson": m_name,
                                "contactEmail": m_email
                            }
                        },
                        upsert=True
                    )

            if updates:
                await db.drives.update_one({"id": drive_id}, {"$set": updates})
                updated_count += 1

    except Exception as e:
        logger.warning("Error during recruiter/company/drive sync: %s", str(e))
    return updated_count

async def run_full_deduplication(db) -> Dict[str, int]:
    """Execute complete deduplication and reference migration pass across all collections."""
    logger.info("Executing PlaceMind MongoDB Data Deduplication and Reference Migration pass...")
    u_count = await deduplicate_users(db)
    c_count = await deduplicate_companies(db)
    a_count = await deduplicate_applications(db)
    n_count = await deduplicate_notifications(db)
    rp_count = await deduplicate_rooms_and_panels(db)
    sync_count = await sync_recruiter_company_drives(db)

    total_cleaned = u_count + c_count + a_count + n_count + rp_count + sync_count
    logger.info("Deduplication completed in bulk. Total duplicate/synced records: %d", total_cleaned)
    return {
        "users_merged": u_count,
        "companies_merged": c_count,
        "applications_merged": a_count,
        "notifications_merged": n_count,
        "rooms_and_panels_merged": rp_count,
        "drives_synced": sync_count,
        "total_merged": total_cleaned,
    }

