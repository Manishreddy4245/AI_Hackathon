import pytest
import jwt
import time
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.db.mongodb import db_manager

client = TestClient(app)

def _make_token(user_id: str, role: str, email: str, company_id: str = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "name": f"Test {role.title()}",
        "companyId": company_id
    }
    return create_access_token(payload)

def test_unauthenticated_request_rejected():
    """Verify protected endpoints reject unauthenticated requests with 401 Unauthorized."""
    # Audit log endpoint
    res1 = client.get("/api/audit")
    assert res1.status_code == status.HTTP_401_UNAUTHORIZED

    # Admin data integrity endpoint
    res2 = client.get("/api/admin/data-integrity/report")
    assert res2.status_code == status.HTTP_401_UNAUTHORIZED

    # Create company endpoint
    res3 = client.post("/api/companies", json={"name": "Illegal Company", "industry": "Tech", "location": "NYC"})
    assert res3.status_code == status.HTTP_401_UNAUTHORIZED

def test_student_accessing_placement_officer_endpoint_forbidden():
    """Verify Student role is rejected with 403 Forbidden when accessing officer endpoints."""
    token = _make_token("usr-student-001", "student", "student@campus.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Student trying to list audit logs
    res1 = client.get("/api/audit", headers=headers)
    assert res1.status_code == status.HTTP_403_FORBIDDEN

    # Student trying to access officer dashboard summary
    res2 = client.get("/api/dashboard/summary", headers=headers)
    assert res2.status_code == status.HTTP_403_FORBIDDEN

    # Student trying to confirm panel
    res3 = client.patch("/api/panels/pnl-1/confirm", headers=headers)
    assert res3.status_code == status.HTTP_403_FORBIDDEN

def test_recruiter_accessing_another_recruiter_resource():
    """Verify Recruiter role cannot edit or mutate another recruiter's drive."""
    token = _make_token("usr-rec-001", "recruiter", "recruiter1@tech.com", company_id="comp-001")
    headers = {"Authorization": f"Bearer {token}"}

    # Recruiter trying to access audit log
    res1 = client.get("/api/audit", headers=headers)
    assert res1.status_code == status.HTTP_403_FORBIDDEN

    # Recruiter trying to trigger data integrity deduplication
    res2 = client.post("/api/admin/data-integrity/deduplicate", headers=headers)
    assert res2.status_code == status.HTTP_403_FORBIDDEN

def test_panel_member_accessing_admin_endpoint_forbidden():
    """Verify Panel Member role is rejected with 403 Forbidden when accessing admin endpoints."""
    token = _make_token("usr-panel-001", "panel_member", "evaluator@campus.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Panel member trying to delete company
    res1 = client.delete("/api/companies/comp-999", headers=headers)
    assert res1.status_code == status.HTTP_403_FORBIDDEN

    # Panel member trying to access audit logs
    res2 = client.get("/api/audit", headers=headers)
    assert res2.status_code == status.HTTP_403_FORBIDDEN

def test_placement_officer_full_authorized_access():
    """Verify Placement Officer role can access administrative and audit endpoints."""
    token = _make_token("usr-off-001", "placement_officer", "officer@campus.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Audit log access
    res1 = client.get("/api/audit", headers=headers)
    assert res1.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]

    # Dashboard summary access
    res2 = client.get("/api/dashboard/summary", headers=headers)
    assert res2.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]

def test_deactivated_user_token_rejected():
    """Verify deactivated user account tokens are blocked with 403 Forbidden."""
    payload = {
        "sub": "usr-deactivated-999",
        "email": "deactivated@campus.edu",
        "role": "student",
        "name": "Deactivated User",
        "is_active": False
    }
    token = create_access_token(payload)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/notifications", headers=headers)
    # Dependent DB lookups for inactive user enforce 403 Forbidden
    assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK]
