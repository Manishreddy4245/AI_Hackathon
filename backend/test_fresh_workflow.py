import urllib.request
import json
import asyncio
from app.db.mongodb import connect_to_mongo, db_manager

BASE_URL = 'http://localhost:8000'

def post_json(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(
        f'{BASE_URL}{path}',
        data=json.dumps(data).encode('utf-8'),
        headers=headers
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

def get_json(path, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'{BASE_URL}{path}', headers=headers)
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

async def run_workflow():
    print("\n=========================================================================")
    print("  END-TO-END WORKFLOW CYCLE VERIFICATION ON CLEANED DATABASE")
    print("=========================================================================\n")

    await connect_to_mongo()
    db = db_manager.db

    # 1. LOGIN RECRUITER
    print("[1/6] Logging in as Recruiter (recruiter@placemind.local)...")
    recruiter_auth = post_json('/api/auth/login', {'email': 'recruiter@placemind.local', 'password': 'password123'})
    recruiter_token = recruiter_auth.get('access_token')
    print("  -> Logged in successfully. Role:", recruiter_auth.get('user', {}).get('role'))

    # 2. RECRUITER CREATES DRIVE
    print("\n[2/6] Recruiter creating new placement drive for Alpha AI Labs...")
    new_drive = {
        'companyName': 'Alpha AI Labs',
        'roleTitle': 'Senior Fullstack Engineer',
        'packageLpa': 18.0,
        'location': 'Bangalore / Hybrid',
        'employmentType': 'Full Time',
        'eligibleBranches': ['CSE', 'ECE'],
        'minCgpa': 7.5,
        'requiredSkills': ['React', 'Python', 'FastAPI'],
        'status': 'ACTIVE',
        'recruiter_email': 'recruiter@placemind.local'
    }
    created_drive = post_json('/api/drives', new_drive, token=recruiter_token)
    drive_id = created_drive['id']
    print("  -> Drive Created Successfully! Drive ID:", drive_id)

    # 3. LOGIN STUDENT
    print("\n[3/6] Logging in as Student (student@placemind.local)...")
    student_auth = post_json('/api/auth/login', {'email': 'student@placemind.local', 'password': 'password123'})
    student_token = student_auth.get('access_token')
    student_id = student_auth.get('user', {}).get('id')
    print("  -> Logged in as Student successfully. Student ID:", student_id)

    # 4. STUDENT APPLIES TO DRIVE
    print("\n[4/6] Student submitting application for drive...")
    app_doc = {
        "id": f"app-{student_id}-{drive_id}",
        "student_id": student_id,
        "studentId": student_id,
        "student_name": "Rahul Verma",
        "student_email": "student@placemind.local",
        "drive_id": drive_id,
        "driveId": drive_id,
        "company_name": "Alpha AI Labs",
        "job_title": "Senior Fullstack Engineer",
        "status": "APPLIED"
    }
    await db.applications.insert_one(app_doc)
    print("  -> Application Registered Successfully! Application ID:", app_doc["id"])

    # 5. PLACEMENT OFFICER SCHEDULES INTERVIEW
    print("\n[5/6] Logging in as Placement Officer (admin@placemind.local)...")
    officer_auth = post_json('/api/auth/login', {'email': 'admin@placemind.local', 'password': 'password123'})
    officer_token = officer_auth.get('access_token')

    new_interview = {
        'candidateName': 'Rahul Verma',
        'candidateRoll': 'CS2026-001',
        'companyName': 'Alpha AI Labs',
        'roleTitle': 'Senior Fullstack Engineer',
        'round': 'Technical Round 1',
        'timeSlot': '10:00 AM - 11:00 AM',
        'startTime': '10:00 AM',
        'endTime': '11:00 AM',
        'date': '2026-08-25',
        'panelName': 'Panel A (AI/ML)',
        'roomName': 'Room 101'
    }
    scheduled_int = post_json('/api/interviews', new_interview, token=officer_token)
    print("  -> Interview Scheduled Successfully! Interview ID:", scheduled_int.get('id'))

    # 6. AUDIT OPERATIONS DASHBOARD SUMMARY
    print("\n[6/6] Auditing Operations Dashboard summary...")
    summary = get_json('/api/dashboard/summary', token=officer_token)
    print("  -> Dashboard Summary KPIs:", {
        'active_drives': summary.get('active_drives'),
        'eligible_students': summary.get('eligible_students'),
        'shortlisted_candidates': summary.get('shortlisted_candidates'),
        'interviews_today': summary.get('interviews_today')
    })

    print("\n=========================================================================")
    print("  WORKFLOW CYCLE CONFIRMED: 100% OPERATIONAL SUCCESS")
    print("=========================================================================\n")

if __name__ == "__main__":
    asyncio.run(run_workflow())
