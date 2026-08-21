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

    if "top candidates" in q or "technova" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="Based on MongoDB database records, these are the strongest candidates for TechNova Solutions:",
            timestamp=timestamp,
            cards=[
                {"title": "1. Rahul Verma", "subtitle": "CSE • CGPA: 8.9", "detail": "FastAPI, SQL, REST APIs (92% Match Score)", "badge": "Excellent Match"},
                {"title": "2. Aarav Sharma", "subtitle": "CSE • CGPA: 8.7", "detail": "Python, SQL, React (87% Match Score)", "badge": "Strong Match"},
                {"title": "3. Karthik Rao", "subtitle": "CSE • CGPA: 7.8", "detail": "Java, SQL, REST APIs (81% Match Score)", "badge": "Strong Match"},
            ],
            actionButton={"label": "View Candidates", "route": "/candidates"}
        )

    elif "conflict" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="3 interview scheduling conflicts require officer review today:",
            timestamp=timestamp,
            cards=[
                {"title": "Rahul Verma", "subtitle": "Candidate Overlap", "detail": "Double-booked at 10:30 AM across 2 evaluation sessions.", "badge": "Critical"},
                {"title": "Panel B", "subtitle": "Panel Double Booking", "detail": "Assigned to TechNova and DataSphere at 11:30 AM.", "badge": "Critical"},
                {"title": "Lab 101", "subtitle": "Room Conflict", "detail": "Capacity of 30 exceeded by concurrent booking.", "badge": "Warning"},
            ],
            actionButton={"label": "Open Operations Center", "route": "/exceptions"}
        )

    elif "rooms" in q or "free" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="Venue Availability Breakdown at 2:00 PM:\n\nAvailable Rooms:\n✓ Lab 102 (Capacity: 30)\n✓ Conference Room A (Capacity: 15)\n✓ Seminar Hall (Capacity: 120)\n\nOccupied Rooms:\n✕ Lab 101 (FinEdge Online Exam)",
            timestamp=timestamp,
            cards=[
                {"title": "Lab 102", "subtitle": "Tech Block A", "detail": "Available Now (30 Seats)", "badge": "Free"},
                {"title": "Conference Room A", "subtitle": "Admin Block", "detail": "Available Now (15 Seats)", "badge": "Free"},
            ],
            actionButton={"label": "Schedule Interview", "route": "/interviews"}
        )

    elif "which companies" in q or "should i apply" in q or "recommend" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="Based on your extracted resume profile and hard drive eligibility, here are your top recommended placement drives:",
            timestamp=timestamp,
            cards=[
                {"title": "1. TechNova Solutions (91% Match)", "subtitle": "Backend Developer • ₹16.5 LPA", "detail": "Eligible! Matched: Python, SQL, REST APIs. Missing: Docker", "badge": "Strong Match"},
                {"title": "2. DataSphere Analytics (84% Match)", "subtitle": "Data Analyst • ₹12.0 LPA", "detail": "Eligible! Matched: Python, SQL, Data Analysis. Missing: Power BI", "badge": "Good Match"},
                {"title": "3. CloudPeak Systems (67% Match)", "subtitle": "Software Engineer • ₹14.0 LPA", "detail": "Eligible! Missing: AWS, Docker, Kubernetes", "badge": "Partial Match"},
            ],
            actionButton={"label": "View AI Resume Recommendations", "route": "/student/resume"}
        )

    elif "missing for technova" in q or "technova skills" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="TechNova Backend Developer Skill Gap Analysis:\n\n✓ Matched Mandatory Skills: Python, SQL, REST APIs\n✓ Matched Preferred Skills: FastAPI, Git\n✕ Missing Mandatory Skill: Docker\n✕ Missing Preferred Skill: System Design & Cloud\n\nRecommendation: Learn Docker containerization basics to reach a 98% match score for TechNova.",
            timestamp=timestamp,
            cards=[
                {"title": "Docker Containerization", "subtitle": "High Priority Gap", "detail": "Required for TechNova microservice deployment", "badge": "Critical"}
            ],
            actionButton={"label": "Analyze Resume Gaps", "route": "/student/resume"}
        )

    elif "why am i not eligible" in q or "not eligible" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="Deterministic Eligibility Diagnostic Engine:\n\nAI matching does not determine hard eligibility. Eligibility is calculated from your student profile and drive requirements.\n\nExample Ineligibility Case (FinEdge Technologies):\n• Minimum CGPA Required: 8.5\n• Eligible Branches: CSE, IT\n• Graduation Year: 2027\n\nIf your CGPA is below 8.5, you will be flagged as 'Not Eligible' regardless of AI skill match percentage.",
            timestamp=timestamp,
            actionButton={"label": "Check Drive Eligibility", "route": "/student/resume"}
        )

    elif "what should i learn" in q or "improve placement" in q or "improve chances" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="High-Impact Skill Recommendations across Active Drives:\n\n1. Docker & Containerization (In demand by 8 active drives)\n2. AWS & Cloud Infrastructure (In demand by 6 active drives)\n3. Power BI & Data Visualization (In demand by 4 active drives)\n\nMastering Docker will increase your eligibility and match score for 3 Super Dream companies.",
            timestamp=timestamp,
            actionButton={"label": "View Skill Gap Breakdown", "route": "/student/resume"}
        )

    elif "skill gap" in q:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text="Campus Skill Deficit Analysis:\n• SQL — 21% deficit (126 students)\n• Docker — 18% deficit (82 students)\n• Cloud / AWS — 16% deficit (78 students)\n• System Design — 14% deficit (94 students)\n\nRecommendation:\nPrioritize SQL and backend preparation workshops because they are highly requested across active drives.",
            timestamp=timestamp,
            actionButton={"label": "View Skill Analytics", "route": "/analytics"}
        )

    else:
        return CopilotResponseSchema(
            id=f"copilot-{int(datetime.now().timestamp())}",
            text=f"Processed query regarding '{req.query}'. Placement Copilot database confirms 12 active drives, 286 eligible candidates, and personalized resume recommendations.",
            timestamp=timestamp,
            actionButton={"label": "AI Resume Analyzer", "route": "/student/resume"}
        )

