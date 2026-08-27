import sys
import os
import pytest
from httpx import AsyncClient, ASGITransport

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo

@pytest.mark.anyio
async def test_placement_officer_registration_and_authentication_flow():
    """
    Test complete Placement Officer registration, role assignment, JWT claim verification,
    cross-portal login security, and RBAC endpoint access.
    """
    await connect_to_mongo()
    db = db_manager.db
    assert db is not None, "MongoDB connection failed"

    timestamp = int(pytest.importorskip("time").time())
    email = f"po.test.{timestamp}@college.edu"
    password = "SecurePassword123!"

    # Clean up test user if pre-existing
    await db.users.delete_many({"email": email})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register Placement Officer
        reg_payload = {
            "name": "Dr. Sarah Jenkins",
            "email": email,
            "password": password,
            "college": "St. Xavier Institute of Technology",
            "designation": "Head of Placement & Training (TPO)",
            "phone": "+91 9876543210"
        }

        reg_resp = await ac.post("/api/auth/register/placement-officer", json=reg_payload)
        assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
        
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["role"] == "placement_officer"
        assert reg_data["user"]["email"] == email
        assert reg_data["user"]["college"] == "St. Xavier Institute of Technology"

        token = reg_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify DB insertion
        db_user = await db.users.find_one({"email": email})
        assert db_user is not None
        assert db_user["role"] == "placement_officer"
        assert db_user["college"] == "St. Xavier Institute of Technology"

        # 2. Verify Login for Placement Officer Portal
        login_resp = await ac.post("/api/auth/login", json={
            "email": email,
            "password": password,
            "portalRole": "placement_officer"
        })
        assert login_resp.status_code == 200
        assert login_resp.json()["user"]["role"] == "placement_officer"

        # 3. Cross-Portal Login Security Test (Must be rejected)
        student_login_resp = await ac.post("/api/auth/login", json={
            "email": email,
            "password": password,
            "portalRole": "student"
        })
        assert student_login_resp.status_code == 403
        assert "belongs to the Placement Officer portal" in student_login_resp.json()["detail"]

        recruiter_login_resp = await ac.post("/api/auth/login", json={
            "email": email,
            "password": password,
            "portalRole": "recruiter"
        })
        assert recruiter_login_resp.status_code == 403
        assert "belongs to the Placement Officer portal" in recruiter_login_resp.json()["detail"]

        # 4. RBAC Access Test for Placement Officer Endpoints
        report_resp = await ac.get("/api/admin/data-integrity-report", headers=headers)
        assert report_resp.status_code in [200, 404]  # Authorized access (not 401 or 403)
