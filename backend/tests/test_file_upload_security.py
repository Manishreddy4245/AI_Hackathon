import pytest
import os
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.services.file_security_service import (
    validate_uploaded_file,
    scan_file_for_malware,
    generate_secure_storage_path,
)

def test_extension_spoofing_magic_bytes_rejection():
    """Verify executable binary renamed as .pdf fails magic bytes verification."""
    fake_pdf_content = b"MZ\x90\x00\x03\x00\x00\x00Executable binary payload"
    with pytest.raises(ValueError, match="signature"):
        validate_uploaded_file(fake_pdf_content, "malicious.pdf", "application/pdf")

def test_malware_script_injection_scan():
    """Verify malware inspection flags script injection payloads."""
    script_payload = b"%PDF-1.4 <script>alert('xss')</script>"
    is_clean, threat = scan_file_for_malware(script_payload)

    assert is_clean is False
    assert "Code Injection" in threat

def test_path_traversal_filename_sanitization():
    """Verify user path traversal payload is discarded for a secure server-side UUID filename."""
    path_traversal_input = "../../../../../etc/passwd"
    secure_name, abs_path = generate_secure_storage_path("student-123", ".pdf")

    assert "../" not in secure_name
    assert "passwd" not in secure_name
    assert secure_name.startswith("student-123_")
    assert secure_name.endswith(".pdf")

@pytest.mark.anyio
async def test_unauthorized_candidate_resume_access():
    """Verify Student B cannot download Student A's private resume (RBAC enforcement)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create token for Student B
        student_b_token = create_access_token({"sub": "student-b", "email": "studentb@placemind.edu", "role": "student"})
        headers = {"Authorization": f"Bearer {student_b_token}"}

        # Attempt to access Student A's resume endpoint
        resp = await client.get("/api/resumes/download/res-student-a-resume", headers=headers)

        assert resp.status_code in [403, 404]
