from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.copilot import CopilotQueryRequest, CopilotResponseSchema
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/copilot", tags=["Placement Copilot"])

@router.post("/chat", response_model=CopilotResponseSchema)
async def process_copilot_chat(req: CopilotQueryRequest):
    q = req.query.lower()
    timestamp = datetime.now().strftime("%I:%M %p")

    db = db_manager.db
    if db is None:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="I don't have access to the database right now. Please check backend services.",
            timestamp=timestamp,
        )

    # Query MongoDB for dynamic metrics
    drives_count = await db.drives.count_documents({})
    students = await db.students.find({}, {"_id": 0}).to_list(length=100)
    exceptions = await db.exceptions.find({"status": {"$ne": "resolved"}}, {"_id": 0}).to_list(length=10)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(length=20)

    if "top candidates" in q or "candidate" in q:
        if not students:
            return CopilotResponseSchema(
                id=f"copilot-{int(datetime.now().timestamp())}",
                text="No student candidates found in the database yet.",
                timestamp=timestamp,
                actionButton={"label": "View Candidates", "route": "/candidates"}
            )
        sorted_students = sorted(students, key=lambda s: float(s.get("cgpa", 0) or 0), reverse=True)[:3]
        cards = []
        for idx, s in enumerate(sorted_students, 1):
            name = s.get("name", "Student")
            branch = s.get("branch", "N/A")
            cgpa = s.get("cgpa", 0)
            skills = ", ".join(s.get("skills", [])[:3]) or "General skills"
            score = s.get("readinessScore", 0)
            cards.append({
                "title": f"{idx}. {name}",
                "subtitle": f"{branch} • CGPA: {cgpa}",
                "detail": f"Skills: {skills} ({score}% Readiness)",
                "badge": "Top Candidate"
            })
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"Based on real MongoDB student records ({len(students)} total candidates), here are the top candidates:",
            timestamp=timestamp,
            cards=cards,
            actionButton={"label": "View Candidates", "route": "/candidates"}
        )

    elif "conflict" in q or "exception" in q:
        if not exceptions:
            return CopilotResponseSchema(
                id=f"copilot-{int(datetime.now().timestamp())}",
                text="No active scheduling conflicts or unresolved exceptions reported in the system right now.",
                timestamp=timestamp,
                actionButton={"label": "Open Operations Center", "route": "/exceptions"}
            )
        cards = []
        for exc in exceptions[:3]:
            cards.append({
                "title": exc.get("title", "Scheduling Exception"),
                "subtitle": exc.get("category", "Operations"),
                "detail": exc.get("description", "Requires officer review."),
                "badge": exc.get("severity", "Warning").capitalize()
            })
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"{len(exceptions)} unresolved operations issues require officer review:",
            timestamp=timestamp,
            cards=cards,
            actionButton={"label": "Open Operations Center", "route": "/exceptions"}
        )

    elif "room" in q or "free" in q or "venue" in q:
        if not rooms:
            return CopilotResponseSchema(
                id=f"copilot-{int(datetime.now().timestamp())}",
                text="No interview rooms registered in the database.",
                timestamp=timestamp,
                actionButton={"label": "Schedule Interview", "route": "/interviews"}
            )
        cards = []
        for r in rooms[:3]:
            cards.append({
                "title": r.get("name", "Room"),
                "subtitle": r.get("building", "Campus"),
                "detail": f"Capacity: {r.get('capacity', 0)} Seats",
                "badge": r.get("status", "available").capitalize()
            })
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"Venue status based on live MongoDB room records ({len(rooms)} total rooms):",
            timestamp=timestamp,
            cards=cards,
            actionButton={"label": "Schedule Interview", "route": "/interviews"}
        )

    elif "drive" in q or "company" in q or "job" in q:
        drives = await db.drives.find({}, {"_id": 0}).to_list(length=5)
        if not drives:
            return CopilotResponseSchema(
                id=f"copilot-{int(datetime.now().timestamp())}",
                text="No placement drives active in the database yet.",
                timestamp=timestamp,
                actionButton={"label": "View Drives", "route": "/companies"}
            )
        cards = []
        for d in drives[:3]:
            cards.append({
                "title": f"{d.get('companyName', 'Company')} ({d.get('roleTitle', 'Role')})",
                "subtitle": f"Package: ₹{d.get('packageLpa', 0)} LPA",
                "detail": f"Required Skills: {', '.join(d.get('requiredSkills', [])[:3])}",
                "badge": d.get("status", "open").upper()
            })
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"Database active placement drives ({drives_count} total placement drives):",
            timestamp=timestamp,
            cards=cards,
            actionButton={"label": "View Drives", "route": "/companies"}
        )

    else:
        if drives_count == 0 and len(students) == 0:
            return CopilotResponseSchema(
                id=f"copilot-{int(datetime.now().timestamp())}",
                text=f"I don't have enough real data to answer that yet. The database currently has 0 active drives and 0 student candidates.",
                timestamp=timestamp,
                actionButton={"label": "Operations Dashboard", "route": "/dashboard"}
            )
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"Processed query: '{req.query}'. Database confirms {drives_count} active placement drives and {len(students)} student candidate profiles.",
            timestamp=timestamp,
            actionButton={"label": "Operations Dashboard", "route": "/dashboard"}
        )


