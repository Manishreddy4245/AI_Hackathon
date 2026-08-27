# PRODUCTION READINESS BASELINE AUDIT REPORT

**Project:** PlaceMind - AI-Powered Campus Placement & Assessment Platform  
**Audit Date:** August 27, 2026  
**Auditor:** Antigravity AI  

---

## 1. Executive Summary

This report establishes the baseline production readiness state of the PlaceMind full-stack repository. The codebase consists of a **FastAPI (Python)** backend, a **React + TypeScript + Vite** frontend, a **MongoDB Atlas** database layer, **Gemini AI** integrations, and a custom **code execution sandbox engine**.

The audit confirmed that **frontend typechecks and production builds succeed cleanly**, and **all backend domain logic unit tests pass**. However, multiple critical security blockers, unauthenticated sensitive endpoints, hardcoded credentials, and execution risks must be remediated prior to production deployment.

---

## 2. Current System Architecture

```
[ Frontend: React + TS + Vite ] 
       │ 
       ▼ (Axios API Service / localStorage JWT)
[ Backend: FastAPI (Python 3.12) ]
  ├── Auth & Core Security (Custom JWT, SHA-256)
  ├── Assessment & Code Sandbox Engine (Subprocess Popen)
  ├── AI Engine (Google Gemini API / JD Extractor / Copilot)
  └── DB Layer (PyMongo / AsyncMongoClient)
       │ 
       ▼ (MongoDB Atlas / mongomock Fallback)
[ Database: MongoDB ]
```

* **Frontend**: SPA built with React 18, TypeScript, Tailwind CSS, Lucide icons, Recharts, and Monaco Editor.
* **Backend**: FastAPI modular application with asynchronous MongoDB access.
* **Database**: MongoDB Atlas (`placemind` collection) with `mongomock` fallback.
* **AI Integrations**: Gemini API (`GEMINI_API_KEY`) for resume parsing, JD extraction, placement copilot, and prep bot.
* **Sandbox**: Subprocess execution for Python, JS, Java, and C++ coding assessments.

---

## 3. Baseline Audit Execution Commands & Verification Results

### Commands Executed:

1. **Backend Tests**: `python -m pytest` inside `backend/`
2. **Frontend Typecheck & Build**: `npm run build` (`tsc && vite build`) inside `frontend/`
3. **Frontend Lint Check**: `npm run lint` inside `frontend/`

### Verification Results Summary:

| Suite / Verification | Status | Details / Metrics |
| :--- | :--- | :--- |
| **Backend Unit Tests (`tests/`)** | **PASSED** | **26 / 26 passed (100%)** |
| **Backend Integration Scripts (`root`)** | **FAILED (Environment)** | 14 failed (Requires live server at `http://localhost:8000` or `pytest-asyncio` plugin) |
| **Frontend TypeScript Check (`tsc`)** | **PASSED** | **0 compilation errors** |
| **Frontend Production Build (`vite`)** | **PASSED** | Built `dist/` bundle (HTML: 0.8 kB, CSS: 90.3 kB, JS: 1,350.7 kB) |
| **Frontend Lint (`eslint`)** | **FAILED** | `eslint` executable not present in local `node_modules` |

---

## 4. Deficiencies & Risk Assessment Matrix

### 🔴 CRITICAL ISSUES (Must be resolved before production deployment)

1. **Hardcoded Database Credentials & Secrets in `.env` and Config**
   * **Location**: `backend/.env`, `backend/app/core/config.py`, `backend/app/core/security.py`
   * **Details**: 
     * Plaintext MongoDB connection string with credentials (`mongodb+srv://dipeshkumarvu98_db_user:dipesh4280@cluster0...`) stored in `.env`.
     * Live `GEMINI_API_KEY` stored in plaintext in `.env`.
     * Fallback JWT key `SECRET_KEY = "placemind-super-secret-jwt-key-change-in-production"` hardcoded in `security.py` instead of requiring environment variables.

2. **Insecure Custom Password Hashing & Auth Infrastructure**
   * **Location**: `backend/app/core/security.py`
   * **Details**:
     * Password hashing uses single-iteration SHA-256 with static salt (`placemind_salt_2026`) instead of bcrypt, Argon2, or PBKDF2 with work factor. SHA-256 without iteration loops is susceptible to rapid GPU dictionary attacks.
     * Custom JWT encoding/decoding using `hmac` and `base64` instead of standard `PyJWT` or `python-jose`.

3. **Unconfined Subprocess Code Execution in Sandbox**
   * **Location**: `backend/app/services/code_sandbox_engine.py`
   * **Details**:
     * Student code submissions for Python, JavaScript, Java, and C++ are executed directly on the host operating system via `subprocess.Popen`.
     * Lack of Docker containerization, `seccomp` profiles, unprivileged execution users, or `chroot`/namespace containment allows untrusted code to read local files or make outbound network requests.

4. **Missing Role-Based Access Control (RBAC) Enforcements on Sensitive Endpoints**
   * **Location**: `backend/app/routes/applications.py`, `backend/app/routes/drives.py`, `backend/app/routes/assessments.py`, `backend/app/routes/interviews.py`
   * **Details**:
     * `require_role` dependency in `backend/app/core/deps.py` is only used in `students.py`. Most mutating endpoints (shortlisting candidates, allocating rounds, creating drives, changing statuses) accept unauthenticated or optional tokens (`get_optional_current_user`), exposing administrative endpoints to unauthenticated users.

---

### 🟠 HIGH ISSUES

1. **Silent Fallback to In-Memory Database in Production Mode**
   * **Location**: `backend/.env`, `backend/app/core/config.py`, `backend/app/db/mongodb.py`
   * **Details**: `ALLOW_MOCK_DB=True` is enabled in config. If MongoDB Atlas connectivity drops or fails, backend switches silently to `mongomock` in-memory DB, losing all state when server restarts.

2. **JWT Storage in Browser `localStorage`**
   * **Location**: `frontend/src/services/api.ts`
   * **Details**: JWT token is stored in `localStorage.setItem('placemind_token')` and attached via Axios request interceptor, making it vulnerable to XSS token theft.

3. **Hardcoded `localhost` Origin and API URLs**
   * **Location**: `frontend/src/services/api.ts`, `backend/.env`, `backend/app/core/config.py`, `backend/app/main.py`
   * **Details**: Fallback URLs point directly to `http://localhost:8000/api` and `http://localhost:5173`. CORS allowed origins in `main.py` include explicit local ports.

4. **Synthetic / Mocked Data & Fake Metrics**
   * **Location**: `backend/app/services/code_sandbox_engine.py`, `frontend/src/data/mockData.ts`, `frontend/src/__dev_fixtures__/`
   * **Details**: `code_sandbox_engine.py` generates fake memory usage numbers (`round(32.4 + (avg_ms % 10) * 0.8, 1)`). Dev fixture mock data is imported directly into production bundle.

---

### 🟡 MEDIUM ISSUES

1. **Missing Pagination on Database Query Endpoints**
   * **Location**: `backend/app/routes/students.py`, `backend/app/routes/drives.py`, `backend/app/routes/companies.py`, `backend/app/routes/applications.py`
   * **Details**: Database queries return entire document collections using `.to_list(100)` or `.to_list(1000)` without limit/skip query pagination parameters.

2. **Broad Exception Suppression (`except Exception:`)**
   * **Location**: `backend/app/routes/drives.py`, `backend/app/routes/students.py`, `backend/app/routes/dashboard.py`, `backend/app/routes/ai_extractor.py`
   * **Details**: Multiple routes use silent `except Exception:` catch blocks without structured logging or standardized HTTP error status reporting.

3. **Large JavaScript Bundle Chunk Size**
   * **Location**: `frontend/dist/assets/index-BlYA-xHD.js`
   * **Details**: Built JavaScript bundle is 1,350.70 kB (exceeds Vite's recommended 500 kB limit). Requires code-splitting via dynamic `import()` or Rollup chunk configuration.

4. **Missing ESLint Binary in Project Dependencies**
   * **Location**: `frontend/package.json`
   * **Details**: `npm run lint` fails because `eslint` is specified in scripts but not installed in local `node_modules`.

---

### 🔵 LOW ISSUES

1. **E2E Integration Test Runner Configuration**
   * **Location**: `backend/test_*.py`
   * **Details**: Standalone E2E test scripts in backend root require a running server or `pytest-asyncio` markers.

2. **Pydantic V2 Deprecation Warnings**
   * **Location**: `backend/app/routes/assessments.py`
   * **Details**: Uses deprecated `.dict()` calls instead of Pydantic V2 `model_dump()`.

3. **Missing Frontend Unit Test Suite**
   * **Location**: `frontend/`
   * **Details**: No unit/component test setup (Vitest / React Testing Library) configured.

---

## 5. Affected Files Inventory

```
backend/.env
backend/app/core/config.py
backend/app/core/security.py
backend/app/core/deps.py
backend/app/db/mongodb.py
backend/app/main.py
backend/app/services/code_sandbox_engine.py
backend/app/routes/applications.py
backend/app/routes/assessments.py
backend/app/routes/auth.py
backend/app/routes/companies.py
backend/app/routes/drives.py
backend/app/routes/interviews.py
backend/app/routes/notifications.py
backend/app/routes/students.py
frontend/package.json
frontend/src/services/api.ts
frontend/src/context/PlacementContext.tsx
frontend/src/data/mockData.ts
```

---

## 6. Recommended Implementation Phases

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Security & Environment Hardening               │
│ - Remove hardcoded secrets & credentials                │
│ - Implement bcrypt / Argon2 password hashing           │
│ - Enforce RBAC dependencies on all mutating routes      │
│ - Disable ALLOW_MOCK_DB in production mode             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Sandbox Isolation & API Safety                │
│ - Containerize code execution engine (Docker / Sandbox)│
│ - Add query pagination (limit/skip) to all list endpoints│
│ - Standardize error handling & remove broad suppresses │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Frontend & Production Build Optimization      │
│ - Migrate JWT token storage to secure httpOnly cookies  │
│ - Dynamic code splitting (lazy loading) for Vite bundle │
│ - Fix ESLint dependencies and lint rules                │
└────────────────────────────────────────────────────────┘
```
