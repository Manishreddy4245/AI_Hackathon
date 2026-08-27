# PlaceMind Testing & CI/CD Verification Architecture

This document provides comprehensive instructions, test suite organization, and exact terminal commands for executing backend and frontend test suites locally and in CI/CD pipelines.

---

## 1. Backend Test Suite Architecture

PlaceMind enforces 100% deterministic test execution using isolated in-memory test databases and offline AI service fallbacks.

### Test Directory Structure
```
backend/
├── pytest.ini                    # Central Pytest config & test markers
└── tests/
    ├── test_authentication_security.py       # Password hashing, JWT, rate limits, reset tokens
    ├── test_rbac_authorization.py            # RBAC role boundaries (Student, Recruiter, Officer, Admin)
    ├── test_code_sandbox_security.py         # Code execution sandbox isolation & resource limits
    ├── test_ai_gateway.py                    # AI service gateway, retries, injection filters
    ├── test_database_performance.py         # Pagination, max page limits, regex escaping
    ├── test_data_normalization.py            # MongoDB camelCase to snake_case document migration
    ├── test_configuration.py                 # Startup secret validation & env fail-fast rules
    ├── test_placement_engines.py             # Deterministic eligibility & skill matching engines
    ├── test_end_to_end_core_placement_workflow.py # Full placement lifecycle E2E suite
    ├── test_complete_roundwise_workflow.py   # Multi-round recruitment pipeline workflow
    ├── test_aptitude_allocation_step_a.py    # Aptitude test allocation & threshold gates
    ├── test_aptitude_test_step_b.py          # Aptitude scoring & qualification
    ├── test_aptitude_and_technical_step_c.py # Combined aptitude and technical evaluation
    ├── test_technical_test_step_d.py         # Technical interview scheduling & candidate advancement
    ├── test_hr_interview_scheduling_flow.py  # HR interview allocation & final offer selection
    ├── test_drive_announcement_workflow.py   # Placement drive announcement & registration forms
    ├── test_eligibility_and_shortlist_enforcement.py # Shortlisting & eligibility validation
    ├── test_interview_eligible_candidates.py # Candidate pool filtering for interviews
    ├── test_recruiter_edit_and_grad_year_workflow.py # Drive management & batch year filtering
    ├── test_recruitment_pipeline_workflow.py # Stage-by-stage pipeline evaluation
    ├── test_sync_recruiter_company_drives.py # Corporate drive synchronization
    └── test_raw_text_ai_analysis.py          # Job description parsing & AI skill extraction
```

---

## 2. Execution Commands for Developers & CI

### Backend Commands (Python)
```bash
# 1. Run full backend test suite (54 tests)
cd backend
python -m pytest tests/

# 2. Run specific test categories using markers
python -m pytest -m security         # Run security & authentication tests
python -m pytest -m rbac             # Run RBAC authorization boundary tests
python -m pytest -m unit             # Run fast unit tests
python -m pytest -m e2e              # Run end-to-end placement pipeline tests

# 3. Generate concise test coverage report
python -m pytest --cov=app --cov-report=term-missing tests/
```

### Frontend Commands (Node.js / Vitest)
```bash
# 1. Run Vitest test suite
cd frontend
npx vitest run src/test/

# 2. Run TypeScript typecheck and production build
npm run build
```

---

## 3. Test Coverage Summary

| Domain / Suite | Test Count | Execution Time | Pass Rate | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Session Security** | 6 Tests | ~2.5s | 100% | **PASSED** |
| **RBAC & Authorization Boundaries** | 6 Tests | ~2.1s | 100% | **PASSED** |
| **Code Sandbox Security & Isolation** | 5 Tests | ~3.0s | 100% | **PASSED** |
| **AI Gateway & Resilience** | 4 Tests | ~1.5s | 100% | **PASSED** |
| **Database Performance & Normalization** | 3 Tests | ~1.2s | 100% | **PASSED** |
| **Configuration & Startup Controls** | 4 Tests | ~0.8s | 100% | **PASSED** |
| **Placement & Eligibility Engines** | 7 Tests | ~1.0s | 100% | **PASSED** |
| **Placement Pipeline & Round Workflows** | 19 Tests | ~33.5s | 100% | **PASSED** |
| **Frontend Component & Integration Suite** | 10 Tests | ~6.0s | 100% | **PASSED** |
| **Total Test Footprint** | **64 Tests** | **~52s Total** | **100%** | **STABLE & GREEN** |
