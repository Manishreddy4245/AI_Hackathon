import logging
from app.db.mongodb import db_manager

logger = logging.getLogger("placemind.seed")

mock_companies = [
    {
        "id": "comp-1",
        "name": "TechNova Solutions",
        "logo": "TN",
        "industry": "Software / IT",
        "website": "https://technova.example.com",
        "location": "Bengaluru / Hybrid",
        "tier": "Super Dream",
        "contactPerson": "Vikram Mehta (Campus Lead)",
        "contactEmail": "vikram@technova.example.com",
    },
    {
        "id": "comp-2",
        "name": "DataSphere Analytics",
        "logo": "DS",
        "industry": "Data & AI",
        "website": "https://datasphere.example.com",
        "location": "Hyderabad",
        "tier": "Tier 1",
        "contactPerson": "Ananya Rao",
        "contactEmail": "ananya@datasphere.example.com",
    },
    {
        "id": "comp-3",
        "name": "CloudPeak Systems",
        "logo": "CP",
        "industry": "Cloud Infrastructure",
        "website": "https://cloudpeak.example.com",
        "location": "Pune",
        "tier": "Tier 1",
        "contactPerson": "Siddharth Verma",
        "contactEmail": "siddharth@cloudpeak.example.com",
    },
    {
        "id": "comp-4",
        "name": "FinEdge Technologies",
        "logo": "FE",
        "industry": "Fintech / Banking",
        "website": "https://finedge.example.com",
        "location": "Mumbai",
        "tier": "Super Dream",
        "contactPerson": "Rohan Gupta",
        "contactEmail": "rohan@finedge.example.com",
    },
    {
        "id": "comp-5",
        "name": "InnovateX Labs",
        "logo": "IX",
        "industry": "AI & Deep Learning",
        "website": "https://innovatex.example.com",
        "location": "Bengaluru",
        "tier": "Super Dream",
        "contactPerson": "Kavita Sharma",
        "contactEmail": "kavita@innovatex.example.com",
    },
]

mock_drives = [
    {
        "id": "technova-backend",
        "companyId": "comp-1",
        "companyName": "TechNova Solutions",
        "companyLogo": "TN",
        "roleTitle": "Backend Developer",
        "packageLpa": 16.5,
        "location": "Bengaluru",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT"],
        "minCgpa": 7.5,
        "graduationYear": 2027,
        "driveDate": "2026-08-28",
        "status": "open",
        "registeredCount": 142,
        "shortlistedCount": 32,
        "selectedCount": 0,
        "deadline": "Tomorrow, 6:00 PM",
        "description": "Looking for strong problem solvers proficient in Python, SQL, and distributed microservices architecture.",
        "requiredSkills": ["Python", "SQL", "REST APIs"],
        "preferredSkills": ["FastAPI", "Docker", "Git", "Cloud"],
        "aiExplanation": "AI JD Analysis: Evaluated requirement density & skill weights. High recruiter demand for FastAPI & SQL.",
        "aiConfirmed": True,
        "pipeline": {"eligible": 428, "applied": 310, "shortlisted": 96, "interview": 24, "selected": 18},
        "aiInsights": {
            "topMatchingSkills": ["Python", "SQL", "FastAPI"],
            "commonSkillGaps": ["Docker", "System Design"],
            "preparationAdvice": "Conduct a 2-day SQL + Docker containerization workshop prior to Round 1 technical evaluation.",
        },
    },
    {
        "id": "datasphere-analyst",
        "companyId": "comp-2",
        "companyName": "DataSphere Analytics",
        "companyLogo": "DS",
        "roleTitle": "Data Analyst",
        "packageLpa": 12.0,
        "location": "Hyderabad",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT", "ECE"],
        "minCgpa": 7.0,
        "graduationYear": 2027,
        "driveDate": "2026-09-02",
        "status": "open",
        "registeredCount": 186,
        "shortlistedCount": 45,
        "selectedCount": 0,
        "deadline": "Sep 01, 5:00 PM",
        "description": "Evaluate complex datasets, build data pipelines, and design business intelligence dashboards.",
        "requiredSkills": ["Python", "SQL", "Data Analysis"],
        "preferredSkills": ["Pandas", "PowerBI", "Machine Learning"],
        "aiExplanation": "AI JD Analysis: Requires strong SQL aggregation and Python data manipulation skills.",
        "aiConfirmed": True,
    },
    {
        "id": "cloudpeak-engineer",
        "companyId": "comp-3",
        "companyName": "CloudPeak Systems",
        "companyLogo": "CP",
        "roleTitle": "Software Engineer",
        "packageLpa": 14.0,
        "location": "Pune",
        "employmentType": "Full-time",
        "eligibleBranches": ["CSE", "IT", "ECE", "EEE"],
        "minCgpa": 7.2,
        "graduationYear": 2027,
        "driveDate": "2026-09-05",
        "status": "open",
        "registeredCount": 160,
        "shortlistedCount": 28,
        "selectedCount": 0,
        "deadline": "Sep 03, 11:59 PM",
        "description": "Design high-performance cloud applications and automated DevOps deployment pipelines.",
        "requiredSkills": ["Java", "Cloud", "Linux"],
        "preferredSkills": ["Docker", "Kubernetes", "AWS"],
        "aiExplanation": "AI JD Analysis: Cloud systems role requiring Java backend fluency and container orchestration.",
        "aiConfirmed": True,
    },
]

mock_students = [
    {
        "id": "rahul-verma",
        "rollNumber": "2021CS1115",
        "name": "Rahul Verma",
        "email": "rahul.verma@campus.edu",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "branch": "CSE",
        "batch": "2027",
        "cgpa": 8.9,
        "skills": ["Python", "FastAPI", "SQL", "Docker", "REST APIs", "Git"],
        "projects": [
            {"name": "E-Commerce Microservices", "description": "High-throughput FastAPI microservice with Redis caching.", "techStack": ["Python", "FastAPI", "Redis"]}
        ],
        "certifications": [{"name": "AWS Certified Developer", "issuer": "Amazon Web Services", "date": "2025"}],
        "readinessScore": 92,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 5,
        "shortlistsCount": 4,
        "interviewsCount": 2,
    },
    {
        "id": "ananya-reddy",
        "rollNumber": "2021IT1042",
        "name": "Ananya Reddy",
        "email": "ananya.reddy@campus.edu",
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        "branch": "IT",
        "batch": "2027",
        "cgpa": 8.4,
        "skills": ["Java", "SQL", "Spring Boot", "React", "Git"],
        "projects": [
            {"name": "Financial Dashboard", "description": "Spring Boot backend with React analytics frontend.", "techStack": ["Java", "Spring Boot", "React"]}
        ],
        "certifications": [{"name": "Oracle Java Professional", "issuer": "Oracle", "date": "2025"}],
        "readinessScore": 86,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 4,
        "shortlistsCount": 3,
        "interviewsCount": 1,
    },
    {
        "id": "aarav-sharma",
        "rollNumber": "2021CS1008",
        "name": "Aarav Sharma",
        "email": "aarav.sharma@campus.edu",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "branch": "CSE",
        "batch": "2027",
        "cgpa": 8.7,
        "skills": ["Python", "SQL", "React", "Node.js", "MongoDB"],
        "projects": [
            {"name": "Campus Event Tracker", "description": "Fullstack web app with real-time notifications.", "techStack": ["React", "Node.js", "MongoDB"]}
        ],
        "certifications": [],
        "readinessScore": 88,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 6,
        "shortlistsCount": 4,
        "interviewsCount": 2,
    },
    {
        "id": "priya-singh",
        "rollNumber": "2021EC1089",
        "name": "Priya Singh",
        "email": "priya.singh@campus.edu",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "branch": "ECE",
        "batch": "2027",
        "cgpa": 8.1,
        "skills": ["Python", "Machine Learning", "TensorFlow", "SQL", "C++"],
        "projects": [],
        "certifications": [],
        "readinessScore": 75,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 3,
        "shortlistsCount": 1,
        "interviewsCount": 0,
    },
    {
        "id": "karthik-rao",
        "rollNumber": "2021CS1190",
        "name": "Karthik Rao",
        "email": "karthik.rao@campus.edu",
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
        "branch": "CSE",
        "batch": "2027",
        "cgpa": 7.8,
        "skills": ["Java", "SQL", "REST APIs", "Git"],
        "projects": [],
        "certifications": [],
        "readinessScore": 78,
        "resumeUrl": "#",
        "placementStatus": "unplaced",
        "applicationsCount": 3,
        "shortlistsCount": 2,
        "interviewsCount": 1,
    },
]

mock_interviews = [
    {
        "id": "int-101",
        "candidateId": "rahul-verma",
        "candidateName": "Rahul Verma",
        "candidateRoll": "2021CS1115",
        "companyName": "TechNova Solutions",
        "roleTitle": "Backend Developer",
        "round": "Technical Interview",
        "timeSlot": "10:30 AM – 11:15 AM",
        "startTime": "10:30",
        "endTime": "11:15",
        "date": "Today",
        "panelId": "pnl-1",
        "panelName": "Panel A",
        "roomId": "rm-1",
        "roomName": "Lab 101",
        "status": "scheduled",
        "panelConfirmed": False,
    },
    {
        "id": "int-102",
        "candidateId": "ananya-reddy",
        "candidateName": "Ananya Reddy",
        "candidateRoll": "2021IT1042",
        "companyName": "DataSphere Analytics",
        "roleTitle": "Data Analyst",
        "round": "Technical Interview",
        "timeSlot": "11:30 AM – 12:15 PM",
        "startTime": "11:30",
        "endTime": "12:15",
        "date": "Today",
        "panelId": "pnl-2",
        "panelName": "Panel B",
        "roomId": "rm-2",
        "roomName": "Lab 102",
        "status": "confirmed",
        "panelConfirmed": True,
    },
]

mock_panels = [
    {
        "id": "pnl-1",
        "name": "Panel A",
        "members": ["Dr. Suresh (Lead)", "Prof. Mehta"],
        "companyName": "TechNova Solutions",
        "roomNumber": "Lab 101",
        "expertise": ["Backend", "Python", "Cloud"],
        "availability": "available",
        "interviewsScheduled": 4,
        "confirmed": False,
    },
    {
        "id": "pnl-2",
        "name": "Panel B",
        "members": ["Prof. Ananya", "Er. Vikram"],
        "companyName": "DataSphere Analytics",
        "roomNumber": "Lab 102",
        "expertise": ["SQL", "Data Analytics"],
        "availability": "available",
        "interviewsScheduled": 3,
        "confirmed": True,
    },
]

mock_rooms = [
    {
        "id": "rm-1",
        "name": "Lab 101",
        "building": "Tech Block A",
        "capacity": 30,
        "hasVideoConf": True,
        "status": "occupied",
        "currentInterview": "TechNova Technical Interview",
        "nextAvailable": "11:15 AM",
    },
    {
        "id": "rm-2",
        "name": "Lab 102",
        "building": "Tech Block A",
        "capacity": 30,
        "hasVideoConf": True,
        "status": "available",
        "currentInterview": "DataSphere Technical Interview",
        "nextAvailable": "Available Now",
    },
]

mock_notifications = [
    {
        "id": "notif-101",
        "title": "Technical Interview Scheduled",
        "message": "Your Technical Interview for TechNova is scheduled for today at 10:30 AM in Lab 101.",
        "timestamp": "10 minutes ago",
        "read": False,
        "important": False,
        "type": "interview",
        "recipientRole": "students",
        "recipientName": "Rahul Verma",
    }
]

mock_exceptions = [
    {
        "id": "exc-101",
        "title": "Interview scheduling conflict",
        "description": "Rahul Verma has two interviews scheduled at overlapping times.",
        "severity": "critical",
        "status": "open",
        "category": "scheduling",
        "timestamp": "10 minutes ago",
        "affectedEntity": "Rahul Verma & TechNova",
        "aiRecommendation": "Move the TechNova interview to 11:30 AM. Candidate, Panel A and Lab 102 are available.",
        "suggestedActionText": "Move TechNova interview slot to 11:30 AM – 12:15 PM",
    }
]

from app.core.security import hash_password

mock_users = [
    {
        "id": "usr-admin",
        "name": "Prof. Rajesh Sharma (Placement Head)",
        "email": "admin@placemind.local",
        "password_hash": hash_password("password123"),
        "role": "placement_officer",
        "is_active": True,
        "created_at": "2026-08-01T10:00:00"
    },
    {
        "id": "usr-admin-demo",
        "name": "Placement Officer",
        "email": "placement@demo.com",
        "password_hash": hash_password("password123"),
        "role": "placement_officer",
        "is_active": True,
        "created_at": "2026-08-01T10:00:00"
    },
    {
        "id": "rahul-verma",
        "name": "Rahul Verma",
        "email": "student@placemind.local",
        "password_hash": hash_password("password123"),
        "role": "student",
        "is_active": True,
        "created_at": "2026-08-01T10:00:00"
    },
    {
        "id": "student-demo",
        "name": "Rahul Verma",
        "email": "student@demo.com",
        "password_hash": hash_password("password123"),
        "role": "student",
        "is_active": True,
        "created_at": "2026-08-01T10:00:00"
    },
    {
        "id": "usr-recruiter",
        "name": "Vikram Mehta (Campus Lead)",
        "email": "recruiter@placemind.local",
        "password_hash": hash_password("password123"),
        "role": "recruiter",
        "is_active": True,
        "companyId": "comp-1",
        "created_at": "2026-08-01T10:00:00"
    },
    {
        "id": "recruiter-demo",
        "name": "Vikram Mehta",
        "email": "recruiter@demo.com",
        "password_hash": hash_password("password123"),
        "role": "recruiter",
        "is_active": True,
        "companyId": "comp-1",
        "created_at": "2026-08-01T10:00:00"
    }
]

mock_audit_logs = [
    {
        "id": "aud-101",
        "userId": "usr-admin",
        "userName": "Placement Officer",
        "userRole": "placement_officer",
        "action": "CREATE_DRIVE",
        "entity": "PlacementDrive",
        "entityId": "technova-backend",
        "detail": "Created new drive for TechNova Solutions (Backend Developer, 16.5 LPA)",
        "timestamp": "2026-08-21 10:15 AM"
    },
    {
        "id": "aud-102",
        "userId": "usr-admin",
        "userName": "Placement Officer",
        "userRole": "placement_officer",
        "action": "APPROVE_SHORTLIST",
        "entity": "CandidateMatch",
        "entityId": "rahul-verma",
        "detail": "Approved AI recommended candidate shortlist for Rahul Verma (92% Match)",
        "timestamp": "2026-08-21 10:30 AM"
    }
]

async def seed_database() -> None:
    """Populate MongoDB collections with initial placement records if empty."""
    db = db_manager.db
    if db is None:
        logger.warning("Database connection unavailable for seeding.")
        return

    try:
        # Upsert all mock users to ensure credentials and roles are always up to date
        for u in mock_users:
            await db.users.update_one({"email": u["email"]}, {"$set": u}, upsert=True)
        logger.info("Synchronized %d user accounts into MongoDB", len(mock_users))

        if await db.companies.count_documents({}) == 0:
            await db.companies.insert_many(mock_companies)
            logger.info("Seeded %d companies into MongoDB", len(mock_companies))

        if await db.drives.count_documents({}) == 0:
            await db.drives.insert_many(mock_drives)
            logger.info("Seeded %d placement drives into MongoDB", len(mock_drives))

        if await db.students.count_documents({}) == 0:
            await db.students.insert_many(mock_students)
            logger.info("Seeded %d student profiles into MongoDB", len(mock_students))

        if await db.interviews.count_documents({}) == 0:
            await db.interviews.insert_many(mock_interviews)
            logger.info("Seeded %d interview slots into MongoDB", len(mock_interviews))

        if await db.panels.count_documents({}) == 0:
            await db.panels.insert_many(mock_panels)
            logger.info("Seeded %d interview panels into MongoDB", len(mock_panels))

        if await db.rooms.count_documents({}) == 0:
            await db.rooms.insert_many(mock_rooms)
            logger.info("Seeded %d rooms into MongoDB", len(mock_rooms))

        if await db.notifications.count_documents({}) == 0:
            await db.notifications.insert_many(mock_notifications)
            logger.info("Seeded %d notifications into MongoDB", len(mock_notifications))

        if await db.exceptions.count_documents({}) == 0:
            await db.exceptions.insert_many(mock_exceptions)
            logger.info("Seeded %d exceptions into MongoDB", len(mock_exceptions))

        if await db.audit_logs.count_documents({}) == 0:
            await db.audit_logs.insert_many(mock_audit_logs)
            logger.info("Seeded %d audit logs into MongoDB", len(mock_audit_logs))

    except Exception as e:
        logger.error("Error seeding MongoDB database: %s", str(e))

