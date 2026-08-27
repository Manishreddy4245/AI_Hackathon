import pytest
import os
from app.services.code_sandbox_engine import execute_code_submission, ExecutionStatus

def test_sandbox_infinite_loop_timeout():
    """Verify infinite loops trigger TIMEOUT status within 3.0s limit."""
    malicious_code = "while True:\n    pass"
    res = execute_code_submission(malicious_code, "python", [{"input": "", "expected": ""}])
    
    assert res["status"] == ExecutionStatus.TIMEOUT.value
    assert "Time Limit Exceeded" in res["stderr"]

def test_sandbox_environment_secret_isolation():
    """Verify code execution environment strips sensitive host env variables."""
    test_code = "import os\nprint('DB_URI:' + str(os.environ.get('MONGODB_URI')))\nprint('JWT:' + str(os.environ.get('JWT_SECRET')))"
    res = execute_code_submission(test_code, "python", [{"input": "", "expected": ""}])
    
    assert "DB_URI:None" in res["stdout"]
    assert "JWT:None" in res["stdout"]

def test_sandbox_output_truncation():
    """Verify huge output generation is capped at 64 KB limit."""
    huge_output_code = "print('A' * 200000)"
    res = execute_code_submission(huge_output_code, "python", [{"input": "", "expected": ""}])
    
    assert len(res["stdout"]) <= 66000
    assert "[Output Truncated: Exceeded 64KB Limit]" in res["stdout"]

def test_sandbox_host_path_sanitization():
    """Verify error tracebacks do not leak host file paths."""
    error_code = "raise Exception('Host system vulnerability attempt')"
    res = execute_code_submission(error_code, "python", [{"input": "", "expected": ""}])
    
    assert "C:\\Users\\" not in res["stderr"]
    assert "/home/" not in res["stderr"]

def test_sandbox_oversized_code_rejection():
    """Verify code submissions exceeding 64 KB are rejected instantly."""
    oversized_code = "# " + ("X" * (70 * 1024))
    res = execute_code_submission(oversized_code, "python", [{"input": "", "expected": ""}])
    
    assert res["status"] == ExecutionStatus.FAILED.value
    assert "Code size exceeds maximum limit of 64 KB" in res["stderr"]
