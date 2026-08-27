import time
from datetime import datetime
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_kpi_cards_clickable_breakdown():
    print("=================================================================")
    print("TESTING PLACEMENT OFFICER CLICKABLE KPI BREAKDOWN ENDPOINTS")
    print("=================================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    ts = int(time.time())

    # STEP 1: Login Placement Officer
    officer_email = f"officer.click{ts}@campus.edu"
    print(f"\n--- STEP 1: Register & Login Officer ({officer_email}) ---")
    client.post("/auth/register/recruiter", json={
        "name": f"Officer Click {ts}",
        "email": officer_email,
        "password": "password123",
        "companyName": "TechNova Corp",
        "companyId": "comp-click",
        "designation": "Placement Officer"
    })

    r_login = client.post("/auth/login", json={
        "email": officer_email,
        "password": "password123",
        "portalRole": "recruiter"
    })
    assert r_login.status_code == 200
    token = r_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # STEP 2: Test Active Drives Breakdown
    print("\n--- STEP 2: Test Active Drives KPI Breakdown ---")
    r_drives = client.get("/dashboard/kpi-details?kpi=active_drives", headers=headers)
    assert r_drives.status_code == 200, f"Failed active_drives: {r_drives.text}"
    drives_data = r_drives.json()
    print("   Active Drives Count:", drives_data["count"])
    print("   Formula Explanation:", drives_data["formula"]["explanation"])
    print("   Sample Active Drive:", drives_data["items"][0]["company_name"] if drives_data["items"] else "None")
    assert "formula" in drives_data
    assert "items" in drives_data
    assert isinstance(drives_data["items"], list)
    if drives_data["items"]:
        item = drives_data["items"][0]
        assert "company_name" in item
        assert "role_title" in item
        assert "deadline" in item
        assert "eligible_count" in item
        assert "applications_count" in item
        assert "shortlisted_count" in item
    print("   -> Active Drives Breakdown verified 100%!")

    # STEP 3: Test Eligible Students Breakdown
    print("\n--- STEP 3: Test Eligible Students KPI Breakdown ---")
    r_eligible = client.get("/dashboard/kpi-details?kpi=eligible_students", headers=headers)
    assert r_eligible.status_code == 200, f"Failed eligible_students: {r_eligible.text}"
    eligible_data = r_eligible.json()
    print("   Unique Eligible Students:", eligible_data["count"])
    print("   Batch Eligibility Pct:", eligible_data["batch_eligibility_pct"], "%")
    print("   Formula Explanation:", eligible_data["formula"]["explanation"])
    assert "formula" in eligible_data
    assert "items" in eligible_data
    assert "drive_breakdowns" in eligible_data
    if eligible_data["items"]:
        sample_student = eligible_data["items"][0]
        print("   Sample Evaluated Student:", sample_student["name"], "| Branch:", sample_student["branch"], "| Eligible:", sample_student["is_eligible"])
        assert "name" in sample_student
        assert "cgpa" in sample_student
        assert "reasons" in sample_student
    print("   -> Eligible Students Breakdown verified 100%!")

    # STEP 4: Test Shortlisted Candidates Breakdown
    print("\n--- STEP 4: Test Shortlisted Candidates KPI Breakdown ---")
    r_short = client.get("/dashboard/kpi-details?kpi=shortlisted_candidates", headers=headers)
    assert r_short.status_code == 200, f"Failed shortlisted_candidates: {r_short.text}"
    short_data = r_short.json()
    print("   Shortlisted Candidates Count:", short_data["count"])
    print("   Counting Mode:", short_data["counting_mode"])
    print("   Formula Explanation:", short_data["formula"]["explanation"])
    assert "formula" in short_data
    assert "items" in short_data
    if short_data["items"]:
        sample_short = short_data["items"][0]
        print("   Sample Shortlisted Candidate:", sample_short["student_name"], "->", sample_short["company_name"], "(", sample_short["job_title"], ")")
        assert "student_name" in sample_short
        assert "company_name" in sample_short
        assert "skills" in sample_short
        assert sample_short["status"] == "SHORTLISTED"
    print("   -> Shortlisted Candidates Breakdown verified 100%!")

    # STEP 5: Test Interviews Today Breakdown
    print("\n--- STEP 5: Test Interviews Today KPI Breakdown ---")
    r_intv = client.get("/dashboard/kpi-details?kpi=interviews_today", headers=headers)
    assert r_intv.status_code == 200, f"Failed interviews_today: {r_intv.text}"
    intv_data = r_intv.json()
    print("   Interviews Scheduled Today:", intv_data["count"])
    print("   Available Slots Remaining:", intv_data["available_slots_remaining"])
    print("   Formula Explanation:", intv_data["formula"]["explanation"])
    assert "formula" in intv_data
    assert "items" in intv_data
    assert "available_slots" in intv_data
    if intv_data["items"]:
        sample_intv = intv_data["items"][0]
        print("   Sample Interview Today:", sample_intv["student_name"], "| Panel:", sample_intv["panel_name"], "| Room:", sample_intv["room_number"])
        assert "panel_name" in sample_intv
        assert "room_number" in sample_intv
        assert "time_slot" in sample_intv
    print("   -> Interviews Today Breakdown verified 100%!")

    # STEP 6: Test Pending Actions Breakdown
    print("\n--- STEP 6: Test Pending Actions KPI Breakdown ---")
    r_pending = client.get("/dashboard/kpi-details?kpi=pending_actions", headers=headers)
    assert r_pending.status_code == 200, f"Failed pending_actions: {r_pending.text}"
    pending_data = r_pending.json()
    print("   Total Pending Actions:", pending_data["count"])
    print("   Categories:", pending_data["categories"])
    print("   Formula Explanation:", pending_data["formula"]["explanation"])
    assert "formula" in pending_data
    assert "items" in pending_data
    print("   -> Pending Actions Breakdown verified 100%!")

    print("\n=================================================================")
    print("ALL 5 CLICKABLE KPI BREAKDOWN ENDPOINTS VERIFIED 100% PASS!")
    print("=================================================================")

if __name__ == "__main__":
    test_kpi_cards_clickable_breakdown()
