import axios from 'axios';
import {
  PlacementDrive,
  Student,
  CandidateMatch,
  Interview,
  Panel,
  Room,
  NotificationItem,
  ExceptionItem,
  AgentActivityEvent,
  CopilotMessage,
  Company,
  RecruitmentRound,
  DriveRecruiterDashboardData,
  CandidatePoolStats,
} from '../types';

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  detail: string;
  timestamp: string;
}

export interface JDExtractResult {
  roleTitle?: string;
  companyName?: string;
  eligibleBranches?: string[];
  minCgpa?: number | null;
  maxBacklogs?: number;
  graduationYear?: number;
  graduationYears?: number[];
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities?: string[];
  qualifications?: string[];
  experience?: string;
  rounds?: string[];
  location?: string;
  packageLpa?: number;
  openings?: number | null;
  summary?: string;
  aiExplanation?: string;
  rawText?: string;
}


export interface CategorizedSkill {
  name: string;
  category: string;
  status: string;
}

export interface ExtractedProfile {
  name?: string;
  email?: string;
  phone?: string;
  education?: string;
  branch?: string;
  graduation_year?: number;
  cgpa?: number;
  skills: CategorizedSkill[];
  raw_skills: string[];
  projects: Array<{ name: string; description?: string; techStack?: string[] }>;
  certifications: Array<{ name: string; issuer?: string; date?: string }>;
  experience: Array<{ role: string; company?: string; duration?: string; description?: string }>;
}

export interface ResumeUploadResponse {
  resume_id: string;
  student_id: string;
  profile: ExtractedProfile;
  readiness_score: number;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

export interface PlacementRecommendation {
  drive_id: string;
  company: string;
  role: string;
  company_logo?: string;
  package_lpa?: number;
  salary_text?: string;
  location?: string;
  employment_type?: string;
  source: string;
  source_type: 'college' | 'external';
  source_label: string;
  application_url?: string;
  source_url?: string;
  posted_at?: string;
  description?: string;
  min_cgpa?: number;
  eligible_branches?: string[];
  graduation_year?: number;
  deadline?: string;
  match_score: number;
  eligible: boolean;
  eligibility_reasons: string[];
  missing_requirements: string[];
  matched_skills: string[];
  skill_gaps: string[];
  matched_preferred_skills: string[];
  recommendation: string;
}

export interface CompanyOpportunityGroup {
  company: string;
  company_logo?: string;
  source: string;
  source_type: 'college' | 'external';
  source_label: string;
  total_jobs: number;
  eligible_jobs: number;
  ineligible_jobs: number;
  best_match_score: number;
  location?: string;
  opportunities: PlacementRecommendation[];
}

export interface UnifiedOpportunitiesResponse {
  total_opportunities: number;
  eligible_count: number;
  ineligible_count: number;
  total_companies: number;
  page: number;
  page_size: number;
  total_pages: number;
  opportunities: PlacementRecommendation[];
  company_groups: CompanyOpportunityGroup[];
}

export interface SkillGapItem {
  skill: string;
  category: string;
  demand: number;
  student_status: string;
  importance: 'Critical' | 'Important' | 'Optional';
}

export interface SkillGapResponse {
  student_id: string;
  total_drives_analyzed: number;
  skill_gaps: SkillGapItem[];
}

export interface PlacementFormField {
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface PlacementForm {
  id: string;
  title: string;
  description?: string;
  drive_id?: string;
  created_by: string;
  created_by_name: string;
  fields: PlacementFormField[];
  is_published: boolean;
  created_at: string;
  submission_count: number;
  community_post_id?: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  drive_id?: string;
  student_id: string;
  student_name: string;
  student_email: string;
  answers: Record<string, any>;
  submitted_at: string;
  status: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-hackathon-3-j57k.onrender.com";
const NORMALIZED_API_URL = API_BASE_URL.replace(/\/+$/, '').endsWith('/api')
  ? API_BASE_URL.replace(/\/+$/, '')
  : `${API_BASE_URL.replace(/\/+$/, '')}/api`;

export const apiClient = axios.create({
  baseURL: NORMALIZED_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('placemind_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic Token Refresh & Rotation Interceptor for 401 responses
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('placemind_refresh_token');
        const res = await axios.post(
          `${NORMALIZED_API_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken || undefined },
          { withCredentials: true }
        );

        const newAccessToken = res.data?.access_token;
        const newRefreshToken = res.data?.refresh_token;

        if (newAccessToken) {
          localStorage.setItem('placemind_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('placemind_refresh_token', newRefreshToken);
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('placemind_token');
        localStorage.removeItem('placemind_refresh_token');
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Authentication
  async login(payload: { email: string; password: string; portalRole?: string }) {
    const res = await apiClient.post('/auth/login', payload);
    if (res.data?.access_token) {
      localStorage.setItem('placemind_token', res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem('placemind_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },

  async registerStudent(payload: {
    name: string;
    email: string;
    password: string;
    rollNumber: string;
    branch: string;
    college?: string;
    graduationYear?: number;
    cgpa?: number;
  }) {
    const res = await apiClient.post('/auth/register/student', payload);
    if (res.data?.access_token) {
      localStorage.setItem('placemind_token', res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem('placemind_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },

  async registerRecruiter(payload: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    designation: string;
    phone?: string;
  }) {
    const res = await apiClient.post('/auth/register/recruiter', payload);
    if (res.data?.access_token) {
      localStorage.setItem('placemind_token', res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem('placemind_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },

  async registerPlacementOfficer(payload: {
    name: string;
    email: string;
    password: string;
    college: string;
    designation?: string;
    phone?: string;
  }) {
    const res = await apiClient.post('/auth/register/placement-officer', payload);
    if (res.data?.access_token) {
      localStorage.setItem('placemind_token', res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem('placemind_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },

  async refreshToken(refreshToken?: string) {
    const stored = refreshToken || localStorage.getItem('placemind_refresh_token') || undefined;
    const res = await apiClient.post('/auth/refresh', { refreshToken: stored });
    if (res.data?.access_token) {
      localStorage.setItem('placemind_token', res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem('placemind_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },

  async forgotPassword(payload: { email: string; portalRole?: string }) {
    const res = await apiClient.post('/auth/forgot-password', payload);
    return res.data;
  },

  async resetPassword(payload: { token: string; newPassword: string }) {
    const res = await apiClient.post('/auth/reset-password', payload);
    return res.data;
  },

  async getCurrentUser() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('placemind_token');
      localStorage.removeItem('placemind_refresh_token');
    }
    return { status: 'ok' };
  },

  // Companies
  async getCompanies(): Promise<Company[]> {
    const res = await apiClient.get<Company[]>('/companies');
    return res.data;
  },

  async searchCompanies(query: string): Promise<Company[]> {
    const res = await apiClient.get<Company[]>(`/companies/search?query=${encodeURIComponent(query)}`);
    return res.data;
  },

  async createCompany(data: Partial<Company>): Promise<Company> {
    const res = await apiClient.post<Company>('/companies', data);
    return res.data;
  },

  // Drives
  async getDrives(): Promise<PlacementDrive[]> {
    const res = await apiClient.get<PlacementDrive[]>('/drives');
    return res.data;
  },

  async getDriveById(id: string): Promise<PlacementDrive> {
    const res = await apiClient.get<PlacementDrive>(`/drives/${id}`);
    return res.data;
  },

  async getDrive(id: string): Promise<PlacementDrive> {
    const res = await apiClient.get<PlacementDrive>(`/drives/${id}`);
    return res.data;
  },

  async createDrive(data: Partial<PlacementDrive>): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>('/drives', data);
    return res.data;
  },

  async submitDriveToOfficer(driveId: string): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>(`/drives/${driveId}/submit`);
    return res.data;
  },

  async updateDrive(id: string, data: Partial<PlacementDrive>): Promise<PlacementDrive> {
    const res = await apiClient.put<PlacementDrive>(`/drives/${id}`, data);
    return res.data;
  },

  async approveDrive(driveId: string): Promise<PlacementDrive> {
    // POST /drives/{id}/approve — sets status ACTIVE, notifies recruiter & students
    const res = await apiClient.post<PlacementDrive>(`/drives/${driveId}/approve`);
    return res.data;
  },

  async announceDrive(driveId: string): Promise<PlacementDrive> {
    // POST /drives/{id}/announce — used to notify students about an already-approved drive
    const res = await apiClient.post<PlacementDrive>(`/drives/${driveId}/announce`);
    return res.data;
  },

  async rejectDrive(driveId: string, reason?: string): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>(`/drives/${driveId}/reject`, { reason });
    return res.data;
  },

  async requestDriveChanges(driveId: string, feedback?: string): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>(`/drives/${driveId}/request-changes`, { feedback });
    return res.data;
  },

  async confirmDriveRequirements(id: string): Promise<void> {
    await apiClient.patch(`/drives/${id}/confirm-requirements`);
  },

  async getMyRecruiterDrives(): Promise<PlacementDrive[]> {
    const res = await apiClient.get<PlacementDrive[]>('/drives/recruiter/my');
    return res.data;
  },

  async getDriveRounds(driveId: string): Promise<RecruitmentRound[]> {
    const res = await apiClient.get<RecruitmentRound[]>(`/drives/${driveId}/rounds`);
    return res.data;
  },

  async createDriveRound(driveId: string, data: Partial<RecruitmentRound>): Promise<RecruitmentRound> {
    const res = await apiClient.post<RecruitmentRound>(`/drives/${driveId}/rounds`, data);
    return res.data;
  },

  async updateDriveRound(driveId: string, roundId: string, data: Partial<RecruitmentRound>): Promise<RecruitmentRound> {
    const res = await apiClient.put<RecruitmentRound>(`/drives/${driveId}/rounds/${roundId}`, data);
    return res.data;
  },

  async deleteDriveRound(driveId: string, roundId: string): Promise<void> {
    await apiClient.delete(`/drives/${driveId}/rounds/${roundId}`);
  },

  async getDriveRecruiterMetrics(driveId: string): Promise<DriveRecruiterDashboardData> {
    const res = await apiClient.get<DriveRecruiterDashboardData>(`/drives/${driveId}/recruiter-metrics`);
    return res.data;
  },

  async executeRoundAction(applicationId: string, action: string, roundId?: string, notes?: string): Promise<any> {
    const res = await apiClient.post(`/applications/${applicationId}/round-action`, { action, round_id: roundId, notes });
    return res.data;
  },

  async extractJd(rawText: string, companyName: string = 'Company', signal?: AbortSignal): Promise<JDExtractResult> {
    const res = await apiClient.post<JDExtractResult>('/ai/extract-jd', { rawText, companyName }, { signal, timeout: 30000 });
    return res.data;
  },


  // Students & Shortlisting
  async getStudents(): Promise<Student[]> {
    const res = await apiClient.get<Student[]>('/students');
    return res.data;
  },

  async toggleShortlist(studentId: string, driveId: string = ''): Promise<void> {
    await apiClient.post('/students/shortlist', { studentId, driveId });
  },

  async applyToDrive(studentId: string, driveId: string, details?: { name?: string; mobile?: string; college_name?: string; location?: string }): Promise<any> {
    const res = await apiClient.post('/students/apply', { studentId, driveId, ...details });
    return res.data;
  },

  async submitApplicationForm(formData: FormData): Promise<any> {
    const res = await apiClient.post('/students/apply-form', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // AI Matching
  async getMatchesForDrive(driveId: string): Promise<CandidateMatch[]> {
    const res = await apiClient.get<CandidateMatch[]>(`/matching/drive/${driveId}`);
    return res.data;
  },

  // Interviews
  async getInterviews(driveId?: string): Promise<Interview[]> {
    const url = driveId ? `/interviews?drive_id=${encodeURIComponent(driveId)}` : '/interviews';
    const res = await apiClient.get<Interview[]>(url);
    return res.data;
  },

  async checkInterviewAvailability(payload: {
    candidate_id?: string;
    candidate_name?: string;
    panel_id?: string;
    panel_name?: string;
    room_id?: string;
    room_name?: string;
    date: string;
    time_slot?: string;
    start_time?: string;
    end_time?: string;
    duration?: string;
  }): Promise<{
    available: boolean;
    candidate_available: boolean;
    panel_available: boolean;
    room_available: boolean;
    conflict?: string;
  }> {
    const res = await apiClient.post('/interviews/check-availability', payload);
    return res.data;
  },

  async scheduleInterview(data: Partial<Interview> | any): Promise<Interview> {
    const res = await apiClient.post<Interview>('/interviews', data);
    return res.data;
  },

  async rescheduleInterview(id: string, data: { date: string; timeSlot: string; panelName: string; roomName: string }): Promise<void> {
    await apiClient.patch(`/interviews/${id}/reschedule`, data);
  },

  async updateInterviewStatus(id: string, status: string): Promise<void> {
    await apiClient.patch(`/interviews/${id}/status`, { status });
  },

  // Panels & Rooms
  async getPanels(): Promise<Panel[]> {
    const res = await apiClient.get<Panel[]>('/panels');
    return res.data;
  },

  async createPanel(data: Partial<Panel>): Promise<Panel> {
    const res = await apiClient.post<Panel>('/panels', data);
    return res.data;
  },

  async confirmPanel(id: string): Promise<void> {
    await apiClient.patch(`/panels/${id}/confirm`);
  },

  async getRooms(): Promise<Room[]> {
    const res = await apiClient.get<Room[]>('/rooms');
    return res.data;
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await apiClient.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  async sendNotification(data: Partial<NotificationItem>): Promise<NotificationItem> {
    const res = await apiClient.post<NotificationItem>('/notifications', data);
    return res.data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  async toggleNotificationImportant(id: string): Promise<{ status: string; important: boolean }> {
    const res = await apiClient.patch<{ status: string; important: boolean }>(`/notifications/${id}/important`);
    return res.data;
  },

  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async getNotificationStats(): Promise<{ unread: number; today: number; scheduled: number; important: number }> {
    const res = await apiClient.get<{ unread: number; today: number; scheduled: number; important: number }>('/notifications/stats');
    return res.data;
  },

  // Applications & Candidate Pool
  async getMyApplications(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/applications/me');
    return res.data;
  },

  async getCandidatePool(driveId?: string): Promise<any[]> {
    const url = driveId ? `/applications/pool?drive_id=${encodeURIComponent(driveId)}` : '/applications/pool';
    const res = await apiClient.get<any[]>(url);
    return res.data;
  },

  async getCandidatePoolStats(driveId?: string): Promise<CandidatePoolStats> {
    const url = driveId ? `/applications/stats?drive_id=${encodeURIComponent(driveId)}` : '/applications/stats';
    const res = await apiClient.get<CandidatePoolStats>(url);
    return res.data;
  },

  async getApplicationDetail(applicationId: string): Promise<any> {
    const res = await apiClient.get<any>(`/applications/${applicationId}`);
    return res.data;
  },

  async shortlistApplication(applicationId: string, payload?: any): Promise<any> {
    const res = await apiClient.post(`/applications/${applicationId}/shortlist`, payload || {});
    return res.data;
  },

  async rejectApplication(applicationId: string, reason?: string): Promise<any> {
    const res = await apiClient.post(`/applications/${applicationId}/reject`, { reason });
    return res.data;
  },

  async allocateAptitude(payload: {
    application_id: string;
    drive_id?: string;
    student_id?: string;
    round_type?: string;
    title?: string;
    scheduled_at?: string;
    deadline?: string;
    duration_minutes?: number;
  } | string): Promise<any> {
    const applicationId = typeof payload === 'string' ? payload : payload.application_id;
    const body = typeof payload === 'object' ? payload : {};
    try {
      const res = await apiClient.post(`/applications/${applicationId}/allocate-aptitude`, body);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 405 || err?.response?.status === 404) {
        const res = await apiClient.post('/assessments/allocate', typeof payload === 'object' ? payload : { application_id: applicationId });
        return res.data;
      }
      throw err;
    }
  },

  async allocateTechnicalRound(payload: {
    application_id: string;
    scheduled_at?: string;
    deadline?: string;
    duration_minutes?: number;
  } | string): Promise<any> {
    const applicationId = typeof payload === 'string' ? payload : payload.application_id;
    const body = typeof payload === 'object' ? payload : {};
    const res = await apiClient.post(`/applications/${applicationId}/allocate-technical`, body);
    return res.data;
  },

  async allocateHRRound(payload: {
    application_id: string;
  } | string): Promise<any> {
    const applicationId = typeof payload === 'string' ? payload : payload.application_id;
    const body = typeof payload === 'object' ? payload : {};
    const res = await apiClient.post(`/applications/${applicationId}/allocate-hr`, body);
    return res.data;
  },

  async getInterviewEligibleCandidates(driveId?: string, companyName?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (driveId) params.append('drive_id', driveId);
    if (companyName) params.append('company_name', companyName);
    const url = params.toString() ? `/interviews/eligible-candidates?${params.toString()}` : '/interviews/eligible-candidates';
    const res = await apiClient.get<any[]>(url);
    return res.data;
  },



  async getStudentAssessments(roundType?: string): Promise<any[]> {
    const url = roundType ? `/assessments/student/me?round_type=${encodeURIComponent(roundType)}` : '/assessments/student/me';
    const res = await apiClient.get<any[]>(url);
    return res.data;
  },



  async getAssessmentDetail(assessmentId: string): Promise<any> {
    const res = await apiClient.get(`/assessments/${assessmentId}`);
    return res.data;
  },

  async startAssessment(assessmentId: string): Promise<any> {
    const res = await apiClient.post(`/assessments/${assessmentId}/start`);
    return res.data;
  },

  async saveAssessmentAnswer(assessmentId: string, questionId: string, selectedOption?: string, code?: string): Promise<any> {
    const res = await apiClient.post(`/assessments/${assessmentId}/answers`, {
      question_id: questionId,
      selected_option: selectedOption,
      code,
    });
    return res.data;
  },




  async evaluateAptitude(applicationId: string, passed: boolean = true, score: number = 85): Promise<any> {
    const res = await apiClient.post(`/applications/${applicationId}/evaluate-aptitude`, { passed, score });
    return res.data;
  },


  // Exceptions / AI Operations
  async getExceptions(params?: {
    severity?: string;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<ExceptionItem[]> {
    const res = await apiClient.get<ExceptionItem[]>('/exceptions', { params });
    return res.data;
  },

  async approveException(id: string): Promise<void> {
    await apiClient.post(`/exceptions/${id}/approve`);
  },

  async updateExceptionStatus(id: string, status: string, notes?: string): Promise<ExceptionItem> {
    const res = await apiClient.patch<ExceptionItem>(`/exceptions/${id}/status`, { status, notes });
    return res.data;
  },

  async scanExceptions(): Promise<ExceptionItem[]> {
    const res = await apiClient.post<ExceptionItem[]>('/exceptions/scan');
    return res.data;
  },

  async getAgentActivities(): Promise<AgentActivityEvent[]> {
    const res = await apiClient.get<AgentActivityEvent[]>('/exceptions/agent-activity');
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    role?: string;
    action?: string;
    entity?: string;
    search?: string;
  }): Promise<AuditLogItem[]> {
    const res = await apiClient.get<AuditLogItem[]>('/audit', { params });
    return res.data;
  },

  async createAuditLog(data: Partial<AuditLogItem>): Promise<AuditLogItem> {
    const res = await apiClient.post<AuditLogItem>('/audit', data);
    return res.data;
  },

  // Placement Copilot
  async sendCopilotQuery(query: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<CopilotMessage> {
    const res = await apiClient.post<CopilotMessage>('/copilot/chat', {
      query,
      conversation_history: conversationHistory
    });
    return res.data;
  },

  async executeCopilotAction(payload: { action_type: string; details: Record<string, any> }): Promise<{ status: string; message: string; interview?: any }> {
    const res = await apiClient.post<{ status: string; message: string; interview?: any }>('/copilot/execute-action', payload);
    return res.data;
  },

  // Current Student Dashboard
  async getMyStudentDashboard(): Promise<any> {
    const res = await apiClient.get<any>('/students/me/dashboard');
    return res.data;
  },

  async getMyStudentProfile(): Promise<any> {
    const res = await apiClient.get<any>('/students/me');
    return res.data;
  },

  // AI Resume Analyzer & Matching
  async uploadResume(file: File, studentId?: string): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (studentId) {
      formData.append('student_id', studentId);
    }
    const res = await apiClient.post<ResumeUploadResponse>('/resumes/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async getLatestResume(studentId?: string): Promise<ResumeUploadResponse | null> {
    if (!studentId) return null;
    const res = await apiClient.get<ResumeUploadResponse | null>(`/resumes/latest/${studentId}`);
    return res.data;
  },

  async getPlacementRecommendations(studentId?: string): Promise<PlacementRecommendation[]> {
    const target = studentId && studentId !== 'me' ? `/students/${studentId}/placement-recommendations` : '/students/me/placement-recommendations';
    const res = await apiClient.get<PlacementRecommendation[]>(target);
    return res.data;
  },

  async getOpportunities(
    sourceType: string = 'all',
    eligibilityFilter: string = 'all',
    page: number = 1,
    pageSize: number = 20,
    search: string = ''
  ): Promise<UnifiedOpportunitiesResponse> {
    const res = await apiClient.get<UnifiedOpportunitiesResponse>('/opportunities', {
      params: {
        source_type: sourceType,
        eligibility_filter: eligibilityFilter,
        page,
        page_size: pageSize,
        search
      }
    });
    return res.data;
  },

  async getOpportunitySkillGap(opportunityId: string): Promise<any> {
    const res = await apiClient.get<any>(`/opportunities/${opportunityId}/skill-gap`);
    return res.data;
  },

  async getSkillGaps(studentId?: string): Promise<SkillGapResponse> {
    const target = studentId && studentId !== 'me' ? `/students/${studentId}/skill-gaps` : '/students/me/skill-gaps';
    const res = await apiClient.get<SkillGapResponse>(target);
    return res.data;
  },

  // Interview Availability Slots
  async getInterviewAvailability(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/interviews/availability');
    return res.data;
  },

  async getAvailableInterviewSlots(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/interviews/availability/available');
    return res.data;
  },

  async createInterviewAvailability(data: any): Promise<any> {
    const res = await apiClient.post<any>('/interviews/availability', data);
    return res.data;
  },

  async updateInterviewAvailability(id: string, data: any): Promise<any> {
    const res = await apiClient.put<any>(`/interviews/availability/${id}`, data);
    return res.data;
  },

  async deleteInterviewAvailability(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/interviews/availability/${id}`);
    return res.data;
  },

  async getMyInterviews(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/interviews/student/me');
    return res.data;
  },


  async getDashboardSummary(): Promise<{
    active_drives: number;
    eligible_students: number;
    shortlisted_candidates: number;
    interviews_today: number;
    pending_actions: number;
    active_drives_change: string;
    eligible_students_change: string;
    shortlisted_change: string;
    interviews_change: string;
    pending_actions_change: string;
    available_slots_today: number;
    total_registered_students: number;
    unresolved_exceptions_count: number;
    pipeline: Array<{ stage: string; count: number; fill: string }>;
  }> {
    const res = await apiClient.get<any>('/dashboard/summary');
    return res.data;
  },

  async getAnalyticsSummary(params?: Record<string, any>): Promise<any> {
    const res = await apiClient.get<any>('/analytics/summary', { params });
    return res.data;
  },

  async getAnalyticsOverview(params?: Record<string, any>): Promise<any> {
    const res = await apiClient.get<any>('/analytics/overview', { params });
    return res.data;
  },

  async downloadAnalyticsCsv(params?: Record<string, any>): Promise<Blob> {
    const res = await apiClient.get('/analytics/export/csv', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },

  async getKpiDetails(kpi: string): Promise<any> {
    const res = await apiClient.get<any>(`/dashboard/kpi-details?kpi=${encodeURIComponent(kpi)}`);
    return res.data;
  },

  // =========================================================================
  // AI PLACEMENT ASSESSMENT & PREPBOT APIS
  // =========================================================================
  async chatWithPrepBot(message: string, context?: any): Promise<{
    id: string;
    reply: string;
    suggested_actions?: Array<{ label: string; action: string; [key: string]: any }>;
    assessment_config_preset?: any;
    timestamp: string;
  }> {
    const res = await apiClient.post<any>('/assessments/chat', { message, context });
    return res.data;
  },

  async generateAssessment(data: {
    type?: string;
    difficulty?: string;
    topics?: string[];
    question_count?: number;
    duration_minutes?: number;
    prompt?: string;
  }): Promise<AssessmentSession> {
    const res = await apiClient.post<AssessmentSession>('/assessments/generate', data);
    return res.data;
  },

  async getAssessmentSession(assessmentId: string): Promise<AssessmentSession> {
    const res = await apiClient.get<AssessmentSession>(`/assessments/${assessmentId}`);
    return res.data;
  },

  async runAssessmentCode(assessmentId: string, data: {
    question_id: string;
    code: string;
    language?: string;
    custom_input?: string;
  }): Promise<{
    status: string;
    stdout: string;
    stderr?: string;
    execution_time_ms: number;
    passed_sample_cases: number;
    total_sample_cases: number;
    test_results: any[];
  }> {
    const res = await apiClient.post<any>(`/assessments/${assessmentId}/run-code`, data);
    return res.data;
  },

  async submitAssessment(assessmentId: string, data: {
    answers: Array<{
      question_id: string;
      type: string;
      selected_option?: string;
      code?: string;
      language?: string;
    }>;
    time_taken_seconds?: number;
  }): Promise<AssessmentResult> {
    const res = await apiClient.post<AssessmentResult>(`/assessments/${assessmentId}/submit`, data);
    return res.data;
  },

  async getAssessmentResult(assessmentId: string): Promise<AssessmentResult> {
    const res = await apiClient.get<AssessmentResult>(`/assessments/${assessmentId}/results`);
    return res.data;
  },

  async getMyAssessmentsHistory(roundType?: string): Promise<AssessmentHistoryItem[]> {
    const url = roundType ? `/assessments/student/me?round_type=${encodeURIComponent(roundType)}` : '/assessments/student/me';
    const res = await apiClient.get<AssessmentHistoryItem[]>(url);
    return res.data;
  },


  async analyzeCodeComplexity(assessmentId: string, data: {
    question_id: string;
    code: string;
    language?: string;
  }): Promise<{
    complexity_time: string;
    complexity_space: string;
    optimization_tip: string;
    summary: string;
  }> {
    const res = await apiClient.post<any>(`/assessments/${assessmentId}/analyze-complexity`, data);
    return res.data;
  },

  async getAssessmentHint(assessmentId: string, data: {
    question_id: string;
    code?: string;
    language?: string;
    hint_level?: number;
  }): Promise<{
    hint_level: number;
    hint_text: string;
    title: string;
  }> {
    const res = await apiClient.post<any>(`/assessments/${assessmentId}/hint`, data);
    return res.data;
  },

  async evaluateAdaptiveSubmission(data: {
    question_id: string;
    topic: string;
    difficulty?: string;
    passed_test_cases?: number;
    total_test_cases?: number;
    hints_used?: number;
    time_taken_seconds?: number;
  }): Promise<{
    attempt_score: number;
    accuracy: number;
    hint_penalty: number;
    current_difficulty: string;
    difficulty_transition: string;
    transition_message: string;
    topic_mastery: { topic: string; mastery_percentage: number; status: string; total_attempts: number; clean_submissions: number };
    spaced_repetition_queued: boolean;
    next_review_date?: string;
    recommended_next_topic: string;
  }> {
    const res = await apiClient.post<any>('/assessments/adaptive/evaluate', data);
    return res.data;
  },

  async getSpacedRevisionSummary(): Promise<{
    due_reviews: Array<{ question_id: string; topic_tag: string; repetition_count: number; interval_days: number; ease_factor: number; next_review_date: string; last_score: number }>;
    topic_mastery_index: Array<{ topic: string; mastery_percentage: number; status: string; total_attempts: number; clean_submissions: number }>;
    active_difficulty: string;
    recommended_next_topic: string;
  }> {
    const res = await apiClient.get<any>('/assessments/adaptive/spaced-revision');
    return res.data;
  },

  async getStudentAssessmentAnalytics(): Promise<{
    assessments_count: number;
    coding_average?: number | null;
    aptitude_average?: number | null;
    overall_average?: number | null;
    topics: Array<{ topic: string; average_percentage: number; status: string }>;
    strengths: string[];
    weaknesses: string[];
    has_data: boolean;
  }> {
    const res = await apiClient.get<any>('/assessments/student/analytics');
    return res.data;
  },

  // =========================================================================
  // PLACEMENT COMMUNITY & FORMS APIS
  // =========================================================================
  async getPlacementCommunities(): Promise<CommunityItem[]> {
    const res = await apiClient.get<CommunityItem[]>('/communities');
    return res.data;
  },

  async getPlacementCommunity(driveId: string): Promise<CommunityItem> {
    const res = await apiClient.get<CommunityItem>(`/communities/${driveId}`);
    return res.data;
  },

  async getCommunityMessages(driveId: string): Promise<CommunityMessage[]> {
    const res = await apiClient.get<CommunityMessage[]>(`/communities/${driveId}/messages`);
    return res.data;
  },

  async postCommunityMessage(driveId: string, data: {
    content: string;
    message_type?: string;
    action_type?: string;
    action_label?: string;
    form_schema?: any;
  }): Promise<CommunityMessage> {
    const res = await apiClient.post<CommunityMessage>(`/communities/${driveId}/messages`, data);
    return res.data;
  },

  async registerForCommunityDrive(driveId: string, data: {
    name?: string;
    email?: string;
    roll_number?: string;
    branch?: string;
    cgpa?: number;
    phone?: string;
    preferred_location?: string;
    custom_answers?: Record<string, any>;
  }): Promise<{ status: string; message: string; application_id: string; registered_count: number }> {
    const res = await apiClient.post<any>(`/communities/${driveId}/register`, data);
    return res.data;
  },

  async getCommunityResponses(driveId: string): Promise<CommunityResponseItem[]> {
    const res = await apiClient.get<CommunityResponseItem[]>(`/communities/${driveId}/responses`);
    return res.data;
  },



  // =========================================================================
  // PLACEMENT FORMS
  // =========================================================================
  async createForm(data: {
    title: string;
    description?: string;
    drive_id?: string;
    fields?: PlacementFormField[];
    is_published?: boolean;
  }): Promise<PlacementForm> {
    const res = await apiClient.post<PlacementForm>('/forms', data);
    return res.data;
  },

  async getForms(driveId?: string): Promise<PlacementForm[]> {
    const url = driveId ? `/forms?drive_id=${encodeURIComponent(driveId)}` : '/forms';
    const res = await apiClient.get<PlacementForm[]>(url);
    return res.data;
  },

  async getForm(formId: string): Promise<PlacementForm> {
    const res = await apiClient.get<PlacementForm>(`/forms/${formId}`);
    return res.data;
  },

  async submitForm(formId: string, answers: Record<string, any>): Promise<FormSubmission> {
    const res = await apiClient.post<FormSubmission>(`/forms/${formId}/submit`, { answers });
    return res.data;
  },

  async getFormSubmissions(formId: string): Promise<FormSubmission[]> {
    const res = await apiClient.get<FormSubmission[]>(`/forms/${formId}/submissions`);
    return res.data;
  },

  async getMyFormSubmissions(): Promise<FormSubmission[]> {
    const res = await apiClient.get<FormSubmission[]>('/forms/student/me/submissions');
    return res.data;
  },

  // =========================================================================
  // AI MOCK INTERVIEW LIVE CHAT API
  // =========================================================================
  async sendInterviewChatMessage(payload: MockInterviewChatPayload): Promise<MockInterviewChatResponse> {
    const res = await apiClient.post<MockInterviewChatResponse>('/interview/chat', payload);
    return res.data;
  },

  // =========================================================================
  // AI INTERVIEW PRACTICE STUDIO API
  // =========================================================================
  async startPracticeSession(payload: PracticeSessionCreatePayload): Promise<PracticeSessionDetail> {
    const res = await apiClient.post<PracticeSessionDetail>('/interviews/practice/start', payload);
    return res.data;
  },

  async submitPracticeAnswer(payload: PracticeAnswerSubmitPayload): Promise<PracticeSessionDetail> {
    const res = await apiClient.post<PracticeSessionDetail>('/interviews/practice/answer', payload);
    return res.data;
  },

  async finishPracticeSession(sessionId: string): Promise<PracticeSessionDetail> {
    const res = await apiClient.post<PracticeSessionDetail>(`/interviews/practice/finish?session_id=${sessionId}`);
    return res.data;
  },

  async getPracticeSession(sessionId: string): Promise<PracticeSessionDetail> {
    const res = await apiClient.get<PracticeSessionDetail>(`/interviews/practice/session/${sessionId}`);
    return res.data;
  },

  async getPracticeInterviewHistory(): Promise<PracticeSessionSummaryItem[]> {
    const res = await apiClient.get<PracticeSessionSummaryItem[]>('/interviews/practice/history');
    return res.data;
  },

  async abandonPracticeSession(sessionId: string): Promise<any> {
    const res = await apiClient.post<any>(`/interviews/practice/abandon/${sessionId}`);
    return res.data;
  },

  async deletePracticeSession(sessionId: string): Promise<{ status: string; message: string; session_id: string }> {
    const res = await apiClient.delete<{ status: string; message: string; session_id: string }>(`/interviews/practice/${sessionId}`);
    return res.data;
  },

  // =========================================================================
  // OFFERS & JOINING WORKFLOW API
  // =========================================================================
  async createOffer(payload: any): Promise<any> {
    const res = await apiClient.post<any>('/offers', payload);
    return res.data;
  },

  async getOffers(params?: { drive_id?: string; status?: string; student_id?: string }): Promise<any[]> {
    const res = await apiClient.get<any[]>('/offers', { params });
    return res.data;
  },

  async getMyOffers(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/offers/me');
    return res.data;
  },

  async getOfferDetail(offerId: string): Promise<any> {
    const res = await apiClient.get<any>(`/offers/${offerId}`);
    return res.data;
  },

  async respondToOffer(offerId: string, payload: {
    action: 'ACCEPT' | 'DECLINE';
    joining_date?: string;
    preferred_location?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    decline_reason?: string;
    notes?: string;
  }): Promise<any> {
    const res = await apiClient.post<any>(`/offers/${offerId}/respond`, payload);
    return res.data;
  },

  async confirmJoining(offerId: string, payload: {
    reporting_venue_or_link?: string;
    reporting_time?: string;
    onboarding_notes?: string;
  }): Promise<any> {
    const res = await apiClient.post<any>(`/offers/${offerId}/confirm-joining`, payload);
    return res.data;
  },
};

export interface MockInterviewChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MockInterviewChatPayload {
  history: MockInterviewChatMessage[];
  userMessage: string;
  company: string;
  topics: string[];
  experienceLevel: string;
  format?: string;
}

export interface MockInterviewChatResponse {
  response: string;
  reply?: string;
  company?: string;
  experienceLevel?: string;
  status?: string;
}

export interface PracticeSessionCreatePayload {
  company: string;
  role: string;
  job_description?: string;
  interview_style: string;
  topics: string[];
  custom_topics?: string[];
  experience_level: string;
  difficulty: string;
  total_questions: number;
  mode: 'text' | 'video' | 'hybrid';
  voice_gender?: string;
  voice_accent?: string;
  voice_id?: string;
}

export interface PracticeAnswerSubmitPayload {
  session_id: string;
  question_index: number;
  answer_text: string;
  transcript?: string;
  audio_video_metadata?: Record<string, any>;
  time_taken_seconds?: number;
  is_skipped?: boolean;
}

export interface TopicScoreItem {
  topic: string;
  score: number;
  feedback: string;
}

export interface PracticeSessionEvaluation {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  readiness_level: string;
  topic_scores: TopicScoreItem[];
  strengths: string[];
  weaknesses: string[];
  missed_concepts: string[];
  recommendations: string[];
  detailed_feedback: string;
  suggested_next_topics: string[];
  video_feedback?: Record<string, any>;
}

export interface PracticeQuestionItem {
  question_index: number;
  question_text: string;
  topic: string;
  question_type: string;
  difficulty: string;
}

export interface PracticeAnswerItem {
  question_index: number;
  answer_text: string;
  transcript?: string;
  is_skipped: boolean;
  time_taken_seconds: number;
  audio_video_metadata?: Record<string, any>;
  submitted_at: string;
}

export interface PracticeSessionDetail {
  session_id: string;
  student_id: string;
  student_name?: string;
  config: Record<string, any>;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  started_at: string;
  completed_at?: string;
  current_question_index: number;
  total_questions: number;
  questions: PracticeQuestionItem[];
  answers: PracticeAnswerItem[];
  current_question?: PracticeQuestionItem;
  evaluation?: PracticeSessionEvaluation;
}

export interface PracticeSessionSummaryItem {
  session_id: string;
  student_id: string;
  company: string;
  role: string;
  mode: string;
  topics: string[];
  status: string;
  started_at: string;
  completed_at?: string;
  questions_count: number;
  answers_count: number;
  overall_score?: number;
}



export interface CommunityItem {
  id: string;
  community_id: string;
  drive_id: string;
  company_id?: string;
  company_name: string;
  role_title: string;
  package_lpa?: number;
  salary_text?: string;
  location?: string;
  status: string;
  registered_count: number;
  is_registered: boolean;
  created_at: string;
  drive?: PlacementDrive;
}

export interface CommunityMessage {
  id: string;
  community_id: string;
  drive_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  message_type: string;
  content: string;
  action_type?: string;
  action_label?: string;
  form_schema?: any;
  form_id?: string;
  created_at: string;
}

export interface CommunityResponseItem {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  roll_number?: string;
  branch?: string;
  cgpa?: number;
  skills: string[];
  registered_at: string;
  status: string;
  custom_answers?: Record<string, any>;
}

export interface AssessmentQuestion {
  id: string;
  type: 'coding' | 'aptitude';
  topic: string;
  difficulty: string;
  question: string;
  description?: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  code_template?: Record<string, string>;
  sample_test_cases?: Array<{ input: string; expected_output: string; is_sample: boolean }>;
  options?: string[];
  points: number;
}

export interface AssessmentSession {
  id: string;
  student_id: string;
  type: string;
  difficulty: string;
  topics: string[];
  question_count: number;
  duration_minutes: number;
  status: string;
  questions: AssessmentQuestion[];
  created_at: string;
  expires_at?: string;
}

export interface TopicPerformance {
  topic: string;
  score: number;
  total: number;
  percentage: number;
  status: string;
}

export interface AssessmentResult {
  id: string;
  assessment_id: string;
  student_id: string;
  type: string;
  difficulty: string;
  coding_score: number;
  aptitude_score: number;
  total_score: number;
  percentage: number;
  passed: boolean;
  topic_performance: TopicPerformance[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  time_taken_seconds: number;
  completed_at: string;
  questions_review?: any[];
}

export interface AssessmentHistoryItem {
  id: string;
  assessment_id: string;
  type: string;
  difficulty: string;
  topics: string[];
  total_score: number;
  percentage: number;
  status: string;
  completed_at: string;
  duration_minutes: number;
}



