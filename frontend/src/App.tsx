import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlacementProvider } from './context/PlacementContext';
import { AppLayout } from './layouts/AppLayout';
import { ToastContainer } from './components/ui/ToastContainer';
import { Login } from './pages/auth/Login';
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
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentDrives } from './pages/student/StudentDrives';
import { StudentInterviews } from './pages/student/StudentInterviews';
import { StudentSkills } from './pages/student/StudentSkills';
import { ResumeAnalyzer } from './pages/student/ResumeAnalyzer';

export function App() {
  return (
    <PlacementProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Application Layout Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/companies" element={<CompaniesList />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/candidates" element={<CandidatesList />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/matching" element={<AIMatching />} />
            <Route path="/interviews" element={<InterviewsList />} />
            <Route path="/interviews/:id" element={<InterviewDetail />} />
            <Route path="/panels" element={<PanelsList />} />
            <Route path="/notifications" element={<NotificationsList />} />
            <Route path="/analytics" element={<SkillAnalytics />} />
            <Route path="/exceptions" element={<ExceptionsList />} />
            <Route path="/copilot" element={<PlacementCopilot />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/resume" element={<ResumeAnalyzer />} />
            <Route path="/student/drives" element={<StudentDrives />} />
            <Route path="/student/interviews" element={<StudentInterviews />} />
            <Route path="/student/skills" element={<StudentSkills />} />
          </Route>


          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </PlacementProvider>
  );
}

export default App;

