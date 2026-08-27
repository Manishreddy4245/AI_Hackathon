# Production Mock Data & Fallback Audit Report

This document records all audited, eliminated, and upgraded mock data, fallback numbers, random generations, and fake metrics across the PlaceMind codebase.

---

## Audited & Resolved Mock Behavior Inventory

| Component / Feature | File Path | Old Behavior | New Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Custom Mock Interview Evaluation** | [`frontend/src/components/student/CustomMockInterviewModal.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/components/student/CustomMockInterviewModal.tsx#L312-L330) | Generated random evaluation ratings using `Math.floor(Math.random() * 2) + 8`. | Evaluates response length, code submission presence, and keyword coverage deterministically. Persists interview reports. | **REAL** |
| **Video Practice Eye Tracking** | [`frontend/src/components/student/VideoPracticeModal.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/components/student/VideoPracticeModal.tsx#L205-L215) | Simulated eye movement using `Math.random() < 0.15` and fake eye contact toggle. | Removed `Math.random()` simulation. Displays `Hardware AI tracking unavailable in browser` when computer vision model is not active. | **INTENTIONALLY UNAVAILABLE** |
| **Code Sandbox Memory Metrics** | [`frontend/src/pages/student/AIAssessment.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/pages/student/AIAssessment.tsx#L1768) | Fell back to static string `'34.2 MB'` when memory was unmeasured. | Displays `N/A` when memory measurement is not returned by the backend execution engine. | **REAL / UNAVAILABLE STATE** |
| **AI Candidate Matching Scores** | [`frontend/src/pages/matching/AIMatching.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/pages/matching/AIMatching.tsx#L336) | Fell back to static match score `88` (`m.match_score \|\| 88`). | Uses nullish coalescing (`m.match_score ?? m.readiness_score ?? null`). Renders explicit `N/A` state if uncalculated. | **REAL** |
| **Company Detail Candidate Scores & CGPA** | [`frontend/src/pages/companies/CompanyDetail.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/pages/companies/CompanyDetail.tsx#L798-L801) | Fell back to `cgpa \|\| 8.5` and `match_score \|\| 85`. | Displays exact database CGPA (`candidate.cgpa ?? 'N/A'`) and actual `match_score`. | **REAL** |
| **Student Community CGPA** | [`frontend/src/pages/student/StudentCommunity.tsx`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/frontend/src/pages/student/StudentCommunity.tsx#L203-L205) | Defaulted student CGPA to `8.0` and minimum CGPA to `7.0`. | Reads exact profile CGPA (`studentProfile?.cgpa ?? 0.0`) and drive requirement (`drive?.minCgpa ?? 0.0`). | **REAL** |
| **Forgot Password Flow** | [`backend/app/routes/auth.py`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/backend/app/routes/auth.py#L310-L370) | Simulated/unhandled password reset flow. | Implemented production reset token generation, SHA-256 hashed storage, 15-minute expiration, and Abstracted Email Service integration. | **REAL** |
| **Logout & Session Management** | [`backend/app/routes/auth.py`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/backend/app/routes/auth.py#L295-L308) | Client-only token removal without server revocation. | Revokes active sessions in MongoDB (`db.sessions`), invalidates JWT JTIs, and clears HttpOnly cookies. | **REAL** |
| **Dashboard Analytics & KPIs** | [`backend/app/routes/dashboard.py`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/backend/app/routes/dashboard.py#L10-L200) | Static mock counters and hardcoded cards. | Calculates 100% real dynamic KPIs directly from MongoDB collections (`drives`, `students`, `applications`, `interviews`, `exceptions`). | **REAL** |
| **Interview Slot Allocation** | [`backend/app/routes/applications.py`](file:///c:/Users/Nitesh%20Kumar/OneDrive/Desktop/Web%20Dev/D_AI_HACKATHON/AI-Campus-Placement-Agent/backend/app/routes/applications.py#L290-L320) | Hardcoded panel and venue slot strings. | Calculates available slots directly from `db.interview_slots` matching actual room and panel availability. | **REAL** |

---

## Verification & Integrity Assurance

1. **Random Number Generator Elimination**:
   * Removed all `Math.random()` calls generating candidate metrics, interview scores, and fake eye contact movement.

2. **Strict Fallback Rules**:
   * Replaced non-zero logical OR fallbacks (`|| 88`, `|| 8.5`, `|| 8.0`) with nullish coalescing operators (`?? null`) or explicit `N/A` empty state rendering.

3. **Database Single Source of Truth**:
   * All dashboard KPIs, candidate pools, interview schedules, and match calculations compute strictly from live MongoDB documents.
