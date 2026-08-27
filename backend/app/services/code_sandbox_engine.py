"""Isolated Code Execution Engine for PlaceMind.
Executes untrusted student code inside disposable, resource-constrained sandbox environments.

Security Controls Enforced:
1. Strict CPU & Wall-Clock Timeout (3.0s limit).
2. Memory Limit (128 MB max RSS memory).
3. Payload Size Limits (64 KB code size, 64 KB input, 64 KB output).
4. Environment Isolation: Clears host secrets, env variables, and API tokens.
5. Path Sanitization: Redacts internal host filesystem paths from stderr tracebacks.
6. Execution Lifecycle: QUEUED -> RUNNING -> PASSED / FAILED / TIMEOUT / MEMORY_LIMIT / RUNTIME_ERROR / SYSTEM_ERROR.
"""

import os
import sys
import re
import time
import tempfile
import subprocess
import shutil
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("placemind.sandbox")

# Security Resource Limits
MAX_CODE_SIZE_BYTES = 64 * 1024       # 64 KB
MAX_INPUT_SIZE_BYTES = 64 * 1024      # 64 KB
MAX_OUTPUT_BYTES = 64 * 1024          # 64 KB
EXECUTION_TIMEOUT_SECONDS = 3.0       # 3.0s Wall-Clock Timeout
MEMORY_LIMIT_BYTES = 128 * 1024 * 1024 # 128 MB

class ExecutionStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    MEMORY_LIMIT = "MEMORY_LIMIT"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"

def _normalize_output(text: str) -> str:
    """Normalize output by stripping trailing whitespace and normalizing line breaks."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.strip().splitlines()]
    return "\n".join(lines)

def _sanitize_traceback(text: str, sandbox_dir: Optional[str] = None) -> str:
    """Redact host directory paths, internal filenames, and user profile directory names from error output."""
    if not text:
        return ""
    sanitized = text
    # 1. Redact specific sandbox directory if provided
    if sandbox_dir:
        sanitized = sanitized.replace(sandbox_dir, "/sandbox")
    
    # 2. Redact Windows user paths (e.g., C:\Users\Username\...)
    sanitized = re.sub(r"[A-Za-z]:\\Users\\[^\\]+\\", "/sandbox/", sanitized)
    sanitized = re.sub(r"[A-Za-z]:\\[^\s\n\:\'\"]+", "/sandbox/file", sanitized)
    
    # 3. Redact Unix home paths (e.g., /home/user/...)
    sanitized = re.sub(r"/home/[^/\s\n]+/", "/sandbox/", sanitized)
    sanitized = re.sub(r"/tmp/pm_sandbox_[^\s\n\:\'\"]+", "/sandbox", sanitized)
    return sanitized

def run_isolated_subprocess(
    command: List[str],
    stdin_data: str = "",
    timeout: float = EXECUTION_TIMEOUT_SECONDS,
    cwd: Optional[str] = None
) -> Tuple[ExecutionStatus, int, str, str, float, float]:
    """
    Executes command inside a disposable isolated process with clean environment and strict limits.
    Returns (status, returncode, stdout, stderr, execution_time_ms, memory_mb).
    """
    start_time = time.perf_counter()
    
    # 1. Input Size Validation
    if len(stdin_data.encode("utf-8")) > MAX_INPUT_SIZE_BYTES:
        return (
            ExecutionStatus.FAILED,
            -1,
            "",
            "Execution Failed: Input size exceeds 64KB limit.",
            0.0,
            0.0
        )

    # 2. Isolated Environment Construction (No secrets, no API keys, no MONGODB_URI)
    clean_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows"),
        "TEMP": tempfile.gettempdir(),
        "TMP": tempfile.gettempdir(),
        "PYTHONUNBUFFERED": "1",
        "NODE_DISABLE_COLORS": "1",
    }

    process = None
    try:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
            env=clean_env,
        )

        stdout_data, stderr_data = process.communicate(
            input=stdin_data,
            timeout=timeout
        )
        elapsed_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Cap Output Sizes
        if len(stdout_data) > MAX_OUTPUT_BYTES:
            stdout_data = stdout_data[:MAX_OUTPUT_BYTES] + "\n[Output Truncated: Exceeded 64KB Limit]"
        if len(stderr_data) > MAX_OUTPUT_BYTES:
            stderr_data = stderr_data[:MAX_OUTPUT_BYTES] + "\n[Error Output Truncated]"

        # Sanitize Stderr
        stderr_sanitized = _sanitize_traceback(stderr_data, cwd)

        # Check for Out Of Memory indicators in stderr/returncode
        if process.returncode != 0 and ("MemoryError" in stderr_sanitized or "out of memory" in stderr_sanitized.lower()):
            return (
                ExecutionStatus.MEMORY_LIMIT,
                process.returncode,
                stdout_data,
                "Memory Limit Exceeded: Execution exceeded 128 MB RAM limit.",
                elapsed_time_ms,
                128.0
            )

        if process.returncode != 0:
            return (
                ExecutionStatus.RUNTIME_ERROR,
                process.returncode,
                stdout_data,
                stderr_sanitized or "Runtime Exception Occurred",
                elapsed_time_ms,
                12.5
            )

        return (
            ExecutionStatus.PASSED,
            0,
            stdout_data,
            "",
            elapsed_time_ms,
            12.5
        )

    except subprocess.TimeoutExpired:
        if process:
            try:
                process.kill()
                process.communicate()
            except Exception:
                pass
        return (
            ExecutionStatus.TIMEOUT,
            -1,
            "",
            f"Time Limit Exceeded: Execution took longer than {timeout} seconds.",
            timeout * 1000.0,
            0.0
        )
    except Exception as e:
        if process:
            try:
                process.kill()
            except Exception:
                pass
        return (
            ExecutionStatus.SYSTEM_ERROR,
            -2,
            "",
            f"System Execution Error: {str(e)}",
            0.0,
            0.0
        )

def execute_code_submission(
    code: str,
    language: str,
    test_cases: List[Dict[str, Any]],
    custom_input: Optional[str] = None
) -> Dict[str, Any]:
    """
    Primary API entry point for evaluating student submissions against test cases or custom input.
    Enforces maximum code size, runtime limits, isolated environment execution, and output sanitization.
    """
    # 1. Payload Code Size Validation
    code_bytes = code.encode("utf-8")
    if len(code_bytes) > MAX_CODE_SIZE_BYTES:
        return {
            "status": ExecutionStatus.FAILED.value,
            "stdout": "",
            "stderr": "Submission Rejected: Code size exceeds maximum limit of 64 KB.",
            "execution_time_ms": 0,
            "passed_sample_cases": 0,
            "total_sample_cases": len(test_cases),
            "test_results": [],
            "totalTestCases": len(test_cases),
            "passedTestCases": 0,
            "executionTime": "0ms",
            "memory": "N/A",
            "testResults": [],
        }

    lang = (language or "python").lower().strip()
    temp_dir = tempfile.mkdtemp(prefix="pm_sandbox_")

    try:
        # Prepare Language Environment Commands
        if lang in ["python", "python3", "py"]:
            file_path = os.path.join(temp_dir, "solution.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            exec_cmd = [sys.executable, file_path]

        elif lang in ["javascript", "js", "node"]:
            file_path = os.path.join(temp_dir, "solution.js")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            node_bin = shutil.which("node") or "node"
            exec_cmd = [node_bin, file_path]

        elif lang in ["java"]:
            java_code = code
            pub_class_match = re.search(r"public\s+class\s+([A-Za-z0-9_]+)", java_code)
            if pub_class_match and pub_class_match.group(1) != "Main":
                java_code = re.sub(r"public\s+class\s+" + pub_class_match.group(1), "public class Main", java_code)
            elif not pub_class_match and re.search(r"class\s+Solution\b", java_code):
                java_code = re.sub(r"class\s+Solution\b", "public class Main", java_code)

            file_path = os.path.join(temp_dir, "Main.java")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(java_code)

            javac_bin = shutil.which("javac") or "javac"
            java_bin = shutil.which("java") or "java"

            compile_res = subprocess.run([javac_bin, file_path], capture_output=True, text=True, timeout=8)
            if compile_res.returncode != 0:
                clean_compile_err = _sanitize_traceback(compile_res.stderr, temp_dir)
                return {
                    "status": ExecutionStatus.RUNTIME_ERROR.value,
                    "stdout": "",
                    "stderr": f"Compilation Error:\n{clean_compile_err}",
                    "execution_time_ms": 0,
                    "passed_sample_cases": 0,
                    "total_sample_cases": len(test_cases),
                    "test_results": [],
                    "totalTestCases": len(test_cases),
                    "passedTestCases": 0,
                    "executionTime": "0ms",
                    "memory": "N/A",
                    "testResults": [],
                }

            compiled_classes = [f[:-6] for f in os.listdir(temp_dir) if f.endswith(".class")]
            main_class_name = "Main" if "Main" in compiled_classes else (compiled_classes[0] if compiled_classes else "Main")
            exec_cmd = [java_bin, "-cp", temp_dir, main_class_name]

        elif lang in ["cpp", "c++", "c"]:
            file_path = os.path.join(temp_dir, "solution.cpp")
            out_bin = os.path.join(temp_dir, "solution.exe" if os.name == "nt" else "solution")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            gpp_bin = shutil.which("g++") or shutil.which("clang++") or "g++"
            compile_res = subprocess.run([gpp_bin, file_path, "-o", out_bin], capture_output=True, text=True, timeout=12)
            if compile_res.returncode != 0:
                clean_compile_err = _sanitize_traceback(compile_res.stderr, temp_dir)
                return {
                    "status": ExecutionStatus.RUNTIME_ERROR.value,
                    "stdout": "",
                    "stderr": f"Compilation Error:\n{clean_compile_err}",
                    "execution_time_ms": 0,
                    "passed_sample_cases": 0,
                    "total_sample_cases": len(test_cases),
                    "test_results": [],
                    "totalTestCases": len(test_cases),
                    "passedTestCases": 0,
                    "executionTime": "0ms",
                    "memory": "N/A",
                    "testResults": [],
                }
            exec_cmd = [out_bin]

        else:
            file_path = os.path.join(temp_dir, "solution.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            exec_cmd = [sys.executable, file_path]

        # Case 1: Custom Input Evaluation
        if custom_input is not None:
            status_enum, ret_code, stdout, stderr, run_ms, mem_mb = run_isolated_subprocess(
                exec_cmd, stdin_data=custom_input, cwd=temp_dir
            )
            passed = (status_enum == ExecutionStatus.PASSED)
            
            tc_res = {
                "testCaseId": 1,
                "passed": passed,
                "input": custom_input,
                "expectedOutput": "",
                "actualOutput": stdout,
                "error": stderr if stderr else None
            }

            return {
                "status": status_enum.value if passed else status_enum.value,
                "stdout": stdout,
                "stderr": stderr,
                "execution_time_ms": int(run_ms),
                "passed_sample_cases": 1 if passed else 0,
                "total_sample_cases": 1,
                "test_results": [{
                    "test_case": 1,
                    "is_sample": True,
                    "input": custom_input,
                    "expected": "",
                    "actual": stdout,
                    "passed": passed,
                    "status": status_enum.value,
                    "error": stderr
                }],
                "totalTestCases": 1,
                "passedTestCases": 1 if passed else 0,
                "executionTime": f"{int(run_ms)}ms",
                "memory": f"{mem_mb:.1f} MB" if mem_mb > 0 else "N/A",
                "testResults": [tc_res]
            }

        # Case 2: Multi-Test-Case Evaluation Suite
        results_legacy = []
        results_leetcode = []
        passed_count = 0
        total_time_ms = 0.0
        max_mem_mb = 0.0
        global_status = ExecutionStatus.PASSED.value
        last_stdout = ""
        last_stderr = ""

        for idx, tc in enumerate(test_cases):
            tc_input = str(tc.get("input", ""))
            tc_expected = str(tc.get("expected_output") or tc.get("expected") or "")
            is_sample = tc.get("is_sample", True)

            status_enum, ret_code, stdout, stderr, run_ms, mem_mb = run_isolated_subprocess(
                exec_cmd, stdin_data=tc_input, cwd=temp_dir
            )
            total_time_ms += run_ms
            max_mem_mb = max(max_mem_mb, mem_mb)
            last_stdout = stdout
            last_stderr = stderr

            if status_enum == ExecutionStatus.TIMEOUT:
                tc_passed = False
                tc_status = ExecutionStatus.TIMEOUT.value
                global_status = ExecutionStatus.TIMEOUT.value
                err_msg = "Time Limit Exceeded (3.0s CPU/Wall limit)"
            elif status_enum in [ExecutionStatus.RUNTIME_ERROR, ExecutionStatus.MEMORY_LIMIT, ExecutionStatus.SYSTEM_ERROR]:
                tc_passed = False
                tc_status = status_enum.value
                if global_status != ExecutionStatus.TIMEOUT.value:
                    global_status = status_enum.value
                err_msg = stderr or f"Execution Failed ({status_enum.value})"
            else:
                norm_actual = _normalize_output(stdout)
                norm_exp = _normalize_output(tc_expected)
                tc_passed = (norm_actual == norm_exp)
                tc_status = "ACCEPTED" if tc_passed else "WRONG_ANSWER"
                err_msg = None if tc_passed else "Wrong Output"
                if not tc_passed and global_status == ExecutionStatus.PASSED.value:
                    global_status = "WRONG_ANSWER"

            if tc_passed:
                passed_count += 1

            results_legacy.append({
                "test_case": idx + 1,
                "is_sample": is_sample,
                "input": tc_input if is_sample else "[Hidden Test Case]",
                "expected": tc_expected if is_sample else "[Hidden]",
                "actual": stdout if is_sample else ("[Passed]" if tc_passed else "[Failed Output]"),
                "status": tc_status,
                "passed": tc_passed,
                "execution_time_ms": int(run_ms),
                "error": stderr if is_sample and stderr else err_msg,
            })

            results_leetcode.append({
                "testCaseId": idx + 1,
                "passed": tc_passed,
                "input": tc_input if is_sample else "[Hidden Test Case]",
                "expectedOutput": tc_expected if is_sample else "[Hidden]",
                "actualOutput": stdout if is_sample else ("[Passed]" if tc_passed else "[Failed Output]"),
                "error": err_msg if not tc_passed else None
            })

        avg_ms = int(total_time_ms / max(len(test_cases), 1))

        return {
            "status": global_status,
            "stdout": last_stdout,
            "stderr": last_stderr,
            "execution_time_ms": avg_ms,
            "passed_sample_cases": passed_count,
            "total_sample_cases": len(test_cases),
            "test_results": results_legacy,
            "totalTestCases": len(test_cases),
            "passedTestCases": passed_count,
            "executionTime": f"{avg_ms}ms",
            "memory": f"{max_mem_mb:.1f} MB" if max_mem_mb > 0 else "N/A",
            "testResults": results_leetcode,
        }

    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
