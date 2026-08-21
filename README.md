# PlaceMind — AI Campus Placement Operations & Interview Coordination Agent

**PlaceMind** is a full-stack, AI-powered campus placement operations platform built with **FastAPI (Python)**, **MongoDB**, **React (TypeScript)**, and **Tailwind CSS**.

It automates end-to-end college placement workflows: job description requirement extraction, student eligibility verification, candidate match ranking, interview/panel/room scheduling, conflict detection, student readiness analytics, human-in-the-loop approvals, and audit trail tracking.

---

## 🚀 Quick Start (Fresh Clone Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- MongoDB (Optional — includes an automatic in-memory fallback if MongoDB server is offline)

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
# Activate environment:
# On Windows PowerShell: .venv\Scripts\Activate.ps1
# On Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
pip install mongomock

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **API Health Endpoint**: `http://localhost:8000/api/health`
- **Swagger Documentation**: `http://localhost:8000/docs`

### 2. Frontend Setup (React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
- **Web App UI**: `http://localhost:5173`

---

## 🔐 Pre-Seeded Development Demo Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Placement Officer** | `admin@placemind.local` | `password123` | Full placement operations, JD extract, AI match approvals, scheduling & conflicts, analytics, audit logs |
| **Student Candidate** | `student@placemind.local` | `password123` | View eligible placement drives, interview schedules, readiness score (82%), skill gap breakdown, notifications |
| **Company Recruiter** | `recruiter@placemind.local` | `password123` | View company placement drives, applicant shortlists, update candidate interview outcomes (`selected`/`rejected`) |
| **Panel Member** | `panel@placemind.local` | `password123` | View assigned panel interview schedules and room assignments |

*Note: You can also use the Student Registration modal on the login page to sign up a new student account.*

---

## 🏛️ System Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite, React Router v6.
- **Backend API**: FastAPI (Python 3.12), Pydantic v2 validation, PyMongo Async.
- **Database**: MongoDB Collections (`users`, `students`, `companies`, `placement_drives`, `interviews`, `panels`, `rooms`, `notifications`, `exceptions`, `audit_logs`). Includes automatic in-memory Mongo fallback engine for instant evaluation.
- **Security**: Password hashing (SHA-256 + salt), HMAC-SHA256 JWT tokens, Role-Based Access Control (RBAC).
- **AI Services**: Structured Job Description Requirement Extractor with regex fallback parser, candidate match scoring algorithm, scheduling conflict detector, Placement Copilot assistant.

---

## 🔄 Complete End-to-End Demo Flow

1. **Login**: Go to `http://localhost:5173/login`, select **Placement Officer**, and sign in.
2. **Companies & Drives**: Navigate to `/companies`, create a company drive, paste a raw job description, and run **AI JD Requirement Extraction**.
3. **Candidate Matching & Shortlisting**: Navigate to `/matching`, view student eligibility breakdown, AI match scores (e.g., Rahul Verma - 92%), and approve candidate shortlists.
4. **Scheduling & Room Allocation**: Navigate to `/interviews` and `/panels`, schedule interview slots, and assign interview panels and rooms (`Lab 101`, `Lab 102`).
5. **Conflict Resolution**: Navigate to `/exceptions`, view AI conflict alerts, and click **Approve Recommendation** for human-in-the-loop resolution.
6. **Student Experience**: Log in as Student (`student@placemind.local`). View interview time slots, room location, readiness score (82%), and skill gap advice.
7. **Recruiter Evaluation**: Log in as Recruiter (`recruiter@placemind.local`). Review candidates assigned to TechNova, and click **Select Candidate**.
8. **Audit Trail & Analytics**: Log back in as Placement Officer, navigate to `/audit` to review activity logs, and view skill gap analytics at `/analytics`.
