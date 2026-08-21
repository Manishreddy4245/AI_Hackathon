import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlacementProvider } from './context/PlacementContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ToastContainer } from './components/ui/ToastContainer';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Auth Pages
import { PortalSelect } from './pages/auth/PortalSelect';
import { PortalLogin } from './pages/auth/PortalLogin';

// Placement Officer Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { CompaniesList } from './pages/companies/CompaniesList';
import { CompanyDetail } from './pages/companies/CompanyDetail';
import { CandidatesList } from './pages/candidates/CandidatesList';
import { CandidateDetail } from './pages/candidates/CandidateDetail';
import { AIMatching } from './pages/matching/AIMatching';
import { InterviewsList } from './pages/interviews/InterviewsList';
import { InterviewDetail } from './pages/interviews/InterviewDetail';
import { PanelsList } from './pages/panels/PanelsList';
import { NotificationsList } from './pages/notifications/NotificationsList';
import { SkillAnalytics } from './pages/analytics/SkillAnalytics';
import { ExceptionsList } from './pages/exceptions/ExceptionsList';
import { PlacementCopilot } from './pages/copilot/PlacementCopilot';
import { AuditLogs } from './pages/audit/AuditLogs';

// Recruiter Portal Pages
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';

// Student Portal Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentDrives } from './pages/student/StudentDrives';
import { StudentInterviews } from './pages/student/StudentInterviews';
import { StudentSkills } from './pages/student/StudentSkills';
import { ResumeAnalyzer } from './pages/student/ResumeAnalyzer';

export function App() {
  return (
    <AuthProvider>
      <PlacementProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public Authentication Routes - Exactly 3 Portals */}
            <Route path="/login" element={<PortalSelect />} />
            <Route path="/login/:portalType" element={<PortalLogin />} />

            {/* ========================================================================= */}
            {/* 1. STUDENT PORTAL (Strictly for Student Role)                             */}
            {/* ========================================================================= */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['student']} portalName="Student Portal" fallbackLoginPath="/login/student">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/drives" element={<StudentDrives />} />
              <Route path="/student/resume" element={<ResumeAnalyzer />} />
              <Route path="/student/interviews" element={<StudentInterviews />} />
              <Route path="/student/skills" element={<StudentSkills />} />
              <Route path="/student/copilot" element={<PlacementCopilot />} />
            </Route>

            {/* ========================================================================= */}
            {/* 2. RECRUITER PORTAL (Strictly for Recruiter Role)                         */}
            {/* ========================================================================= */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['recruiter']} portalName="Recruiter Portal" fallbackLoginPath="/login/recruiter">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/recruiter" element={<Navigate to="/recruiter/dashboard" replace />} />
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
              <Route path="/recruiter/drives" element={<CompaniesList />} />
              <Route path="/recruiter/candidates" element={<CandidatesList />} />
              <Route path="/recruiter/interviews" element={<InterviewsList />} />
              <Route path="/recruiter/copilot" element={<PlacementCopilot />} />
              <Route path="/recruiter/notifications" element={<NotificationsList />} />
            </Route>

            {/* ========================================================================= */}
            {/* 3. PLACEMENT OFFICER PORTAL (Strictly for Placement Officers)             */}
            {/* ========================================================================= */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['placement_officer']} portalName="Placement Officer Portal" fallbackLoginPath="/login/placement-officer">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/companies" element={<CompaniesList />} />
              <Route path="/admin/companies/:id" element={<CompanyDetail />} />
              <Route path="/admin/candidates" element={<CandidatesList />} />
              <Route path="/admin/candidates/:id" element={<CandidateDetail />} />
              <Route path="/admin/matching" element={<AIMatching />} />
              <Route path="/admin/interviews" element={<InterviewsList />} />
              <Route path="/admin/interviews/:id" element={<InterviewDetail />} />
              <Route path="/admin/panels" element={<PanelsList />} />
              <Route path="/admin/notifications" element={<NotificationsList />} />
              <Route path="/admin/analytics" element={<SkillAnalytics />} />
              <Route path="/admin/exceptions" element={<ExceptionsList />} />
              <Route path="/admin/copilot" element={<PlacementCopilot />} />
              <Route path="/admin/audit" element={<AuditLogs />} />

              {/* Backward compatibility aliases */}
              <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/companies" element={<Navigate to="/admin/companies" replace />} />
              <Route path="/companies/:id" element={<Navigate to="/admin/companies" replace />} />
              <Route path="/candidates" element={<Navigate to="/admin/candidates" replace />} />
              <Route path="/matching" element={<Navigate to="/admin/matching" replace />} />
              <Route path="/interviews" element={<Navigate to="/admin/interviews" replace />} />
              <Route path="/panels" element={<Navigate to="/admin/panels" replace />} />
              <Route path="/rooms" element={<Navigate to="/admin/panels" replace />} />
              <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
              <Route path="/analytics" element={<Navigate to="/admin/analytics" replace />} />
              <Route path="/exceptions" element={<Navigate to="/admin/exceptions" replace />} />
              <Route path="/copilot" element={<Navigate to="/admin/copilot" replace />} />
              <Route path="/audit" element={<Navigate to="/admin/audit" replace />} />
            </Route>

            {/* Default Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </PlacementProvider>
    </AuthProvider>
  );
}

export default App;
