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
  CopilotMessage,
  Company,
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
  roleTitle: string;
  eligibleBranches: string[];
  minCgpa: number;
  maxBacklogs: number;
  requiredSkills: string[];
  preferredSkills: string[];
  rounds: string[];
  location: string;
  packageLpa: number;
  summary: string;
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
  location?: string;
  match_score: number;
  eligible: boolean;
  eligibility_reasons: string[];
  missing_requirements: string[];
  matched_skills: string[];
  skill_gaps: string[];
  matched_preferred_skills: string[];
  missing_preferred_skills: string[];
  recommendation: string;
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

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';


export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

export const apiService = {
  // Authentication
  async login(payload: { email?: string; password?: string; role?: string }) {
    const res = await apiClient.post('/auth/login', payload);
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
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },


  async getCurrentUser() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  // Companies
  async getCompanies(): Promise<Company[]> {
    const res = await apiClient.get<Company[]>('/companies');
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

  async createDrive(data: Partial<PlacementDrive>): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>('/drives', data);
    return res.data;
  },

  async confirmDriveRequirements(id: string): Promise<void> {
    await apiClient.patch(`/drives/${id}/confirm-requirements`);
  },

  // AI JD Extraction
  async extractJd(rawText: string, companyName: string = 'Company'): Promise<JDExtractResult> {
    const res = await apiClient.post<JDExtractResult>('/ai/extract-jd', { rawText, companyName });
    return res.data;
  },

  // Students & Shortlisting
  async getStudents(): Promise<Student[]> {
    const res = await apiClient.get<Student[]>('/students');
    return res.data;
  },

  async toggleShortlist(studentId: string, driveId: string = 'technova-backend'): Promise<void> {
    await apiClient.post('/students/shortlist', { studentId, driveId });
  },

  async applyToDrive(studentId: string, driveId: string): Promise<void> {
    await apiClient.post('/students/apply', { studentId, driveId });
  },

  // AI Matching
  async getMatchesForDrive(driveId: string): Promise<CandidateMatch[]> {
    const res = await apiClient.get<CandidateMatch[]>(`/matching/drive/${driveId}`);
    return res.data;
  },

  // Interviews
  async getInterviews(): Promise<Interview[]> {
    const res = await apiClient.get<Interview[]>('/interviews');
    return res.data;
  },

  async scheduleInterview(data: Partial<Interview>): Promise<Interview> {
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

  // Exceptions / AI Operations
  async getExceptions(): Promise<ExceptionItem[]> {
    const res = await apiClient.get<ExceptionItem[]>('/exceptions');
    return res.data;
  },

  async approveException(id: string): Promise<void> {
    await apiClient.post(`/exceptions/${id}/approve`);
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await apiClient.get<AuditLogItem[]>('/audit');
    return res.data;
  },

  async createAuditLog(data: Partial<AuditLogItem>): Promise<AuditLogItem> {
    const res = await apiClient.post<AuditLogItem>('/audit', data);
    return res.data;
  },

  // Placement Copilot
  async sendCopilotQuery(query: string): Promise<CopilotMessage> {
    const res = await apiClient.post<CopilotMessage>('/copilot/chat', { query });
    return res.data;
  },

  // AI Resume Analyzer & Matching
  async uploadResume(file: File, studentId: string = 'rahul-verma'): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_id', studentId);
    const res = await apiClient.post<ResumeUploadResponse>('/resumes/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async getLatestResume(studentId: string = 'rahul-verma'): Promise<ResumeUploadResponse | null> {
    const res = await apiClient.get<ResumeUploadResponse | null>(`/resumes/latest/${studentId}`);
    return res.data;
  },

  async getPlacementRecommendations(studentId: string = 'rahul-verma'): Promise<PlacementRecommendation[]> {
    const res = await apiClient.get<PlacementRecommendation[]>(`/students/${studentId}/placement-recommendations`);
    return res.data;
  },

  async getSkillGaps(studentId: string = 'rahul-verma'): Promise<SkillGapResponse> {
    const res = await apiClient.get<SkillGapResponse>(`/students/${studentId}/skill-gaps`);
    return res.data;
  },
};


