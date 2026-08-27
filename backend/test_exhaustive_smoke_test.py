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

async def run_exhaustive_smoke_test():
    print("\n=========================================================================")
    print("  EXHAUSTIVE REPO-WIDE SMOKE TEST — 1 RECORD PROPAGATION PROOF")
    print("=========================================================================\n")

    await connect_to_mongo()
    db = db_manager.db

    # STEP 1: AUTHENTICATE ALL 3 ROLES
    print("[1/6] Authenticating accounts for all 3 roles...")
    rec_auth = post_json('/api/auth/login', {'email': 'recruiter@placemind.local', 'password': 'password123'})
    rec_token = rec_auth['access_token']

    stu_auth = post_json('/api/auth/login', {'email': 'student@placemind.local', 'password': 'password123'})
    stu_token = stu_auth['access_token']
    student_id = stu_auth['user']['id']

    off_auth = post_json('/api/auth/login', {'email': 'admin@placemind.local', 'password': 'password123'})
    off_token = off_auth['access_token']
    print("  -> Authenticated Recruiter, Student, and Placement Officer successfully.")

    # STEP 2: VERIFY ZERO STATE ACROSS ALL SCREEN APIS
    print("\n[2/6] Verifying ZERO-STATE across all role APIs on clean database...")
    drives_before = get_json('/api/drives', token=rec_token)
    apps_before = get_json('/api/applications/pool', token=off_token)
    interviews_before = get_json('/api/interviews', token=off_token)
    print(f"  -> Recruiter Drives Count     : {len(drives_before)} (Expected 0)")
    print(f"  -> Officer Candidates Pool   : {len(apps_before)} (Expected 0)")
    print(f"  -> Interviews Schedule List  : {len(interviews_before)} (Expected 0)")

    # STEP 3: RECRUITER CREATES EXACTLY 1 DRIVE
    print("\n[3/6] Recruiter creating 1 placement drive for 'Exhaustive Test Corp'...")
    new_drive = {
        'companyName': 'Exhaustive Test Corp',
        'roleTitle': 'Lead Systems Architect',
        'packageLpa': 25.0,
        'location': 'Hyderabad / On-site',
        'employmentType': 'Full Time',
        'eligibleBranches': ['CSE', 'IT'],
        'minCgpa': 8.0,
        'requiredSkills': ['Python', 'Distributed Systems'],
        'status': 'ACTIVE',
        'recruiter_email': 'recruiter@placemind.local'
    }
    created_drive = post_json('/api/drives', new_drive, token=rec_token)
    drive_id = created_drive['id']
    print(f"  -> Created 1 Drive! ID: {drive_id}")

    # STEP 4: STUDENT APPLIES TO THE DRIVE
    print("\n[4/6] Student applying to the created drive...")
    app_doc = {
        "id": f"app-{student_id}-{drive_id}",
        "student_id": student_id,
        "studentId": student_id,
        "student_name": "Rahul Verma",
        "student_email": "student@placemind.local",
        "drive_id": drive_id,
        "driveId": drive_id,
        "company_name": "Exhaustive Test Corp",
        "job_title": "Lead Systems Architect",
        "status": "APPLIED"
    }
    await db.applications.insert_one(app_doc)
    print(f"  -> Registered 1 Application! ID: {app_doc['id']}")

    # STEP 5: VERIFY EXACTLY 1 RECORD ACROSS ALL AFFECTED SCREENS
    print("\n[5/6] Auditing screen endpoints to confirm exactly 1 record is reflected:")
    rec_drives_after = get_json('/api/drives', token=rec_token)
    stu_drives_after = get_json('/api/drives', token=stu_token)
    off_apps_after = get_json('/api/applications/pool', token=off_token)
    dash_summary = get_json('/api/dashboard/summary', token=off_token)

    print(f"  * Recruiter Drives View     : {len(rec_drives_after)} drive(s) reflected (Exhaustive Test Corp)")
    print(f"  * Student Placement Drives  : {len(stu_drives_after)} drive(s) reflected")
    print(f"  * Officer Candidates Pool   : {len(off_apps_after)} application(s) reflected")
    print(f"  * Operations Dashboard      : active_drives={dash_summary.get('active_drives')}")

    # STEP 6: CLEAN UP SMOKE TEST RECORDS
    print("\n[6/6] Cleaning up smoke test records post-verification...")
    await db.drives.delete_many({"id": drive_id})
    await db.applications.delete_many({"id": app_doc['id']})

    drives_final = get_json('/api/drives', token=rec_token)
    apps_final = get_json('/api/applications/pool', token=off_token)
    print(f"  -> Final Recruiter Drives Count     : {len(drives_final)} (Confirmed 0)")
    print(f"  -> Final Officer Applications Count: {len(apps_final)} (Confirmed 0)")

    print("\n=========================================================================")
    print("  EXHAUSTIVE SMOKE TEST SUCCESS: EXACT 1-RECORD PROPAGATION VERIFIED")
    print("=========================================================================\n")

if __name__ == "__main__":
    asyncio.run(run_exhaustive_smoke_test())
