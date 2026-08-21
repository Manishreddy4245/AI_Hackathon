export type UserRole = 'placement_officer' | 'student' | 'recruiter' | 'panel_member';


export type DriveStatus = 'draft' | 'open' | 'shortlisting' | 'interview' | 'closed' | 'completed' | 'ongoing' | 'upcoming';

export type CandidateStatus = 'registered' | 'eligible' | 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

export type ExceptionSeverity = 'critical' | 'warning' | 'info';

export type ExceptionStatus = 'open' | 'in_review' | 'resolved' | 'ignored';

export type ExceptionCategory = 'scheduling' | 'candidate' | 'panel' | 'room' | 'drive' | 'notification';

export type NotificationType = 'interview' | 'eligibility' | 'reminder' | 'important_update' | 'system_alert' | 'ai_alert';

export type RecipientRole = 'all' | 'students' | 'staff' | 'panel';

export type InterviewRound = 'Online Assessment' | 'Technical Interview' | 'HR Interview' | 'Final Interview';

export type InterviewStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'needs_attention';

export interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  website: string;
  location: string;
  tier: 'Tier 1' | 'Tier 2' | 'Super Dream';
  contactPerson: string;
  contactEmail: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  techStack: string[];
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
}

export interface DrivePipelineStats {
  eligible: number;
  applied: number;
  shortlisted: number;
  interview: number;
  selected: number;
}

export interface DriveAIInsights {
  topMatchingSkills: string[];
  commonSkillGaps: string[];
  preparationAdvice: string;
}

export interface PlacementDrive {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  roleTitle: string;
  packageLpa: number;
  location: string;
  employmentType: 'Full-time' | 'Internship' | 'PPO';
  eligibleBranches: string[];
  minCgpa: number;
  graduationYear: number;
  driveDate: string;
  status: DriveStatus;
  registeredCount: number;
  shortlistedCount: number;
  selectedCount: number;
  deadline: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  aiExplanation?: string;
  aiConfirmed?: boolean;
  pipeline?: DrivePipelineStats;
  aiInsights?: DriveAIInsights;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  avatar: string;
  branch: string;
  batch: string;
  cgpa: number;
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  readinessScore: number;
  resumeUrl: string;
  placementStatus: 'unplaced' | 'placed' | 'opted_out' | 'shortlisted';
  placedCompany?: string;
  placedPackage?: number;
  applicationsCount: number;
  shortlistsCount: number;
  interviewsCount: number;
}

export interface CandidateMatch {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  branch: string;
  cgpa: number;
  driveId: string;
  companyName: string;
  roleTitle: string;
  matchScore: number;
  skillMatchPercent: number;
  matchedSkills: string[];
  preferredSkillsMatched?: string[];
  missingSkills: string[];
  relevantProjects: ProjectItem[];
  status: CandidateStatus;
  aiRecommendation: string;
  whyDetails?: {
    eligibilitySatisfied: boolean;
    skillMatchCount: string;
    projectRelevanceCount: number;
    strengths: string[];
    gaps: string[];
  };
}

export interface Panel {
  id: string;
  name: string;
  members: string[];
  companyName: string;
  roomNumber: string;
  expertise: string[];
  availability: 'available' | 'busy' | 'pending_confirmation';
  interviewsScheduled: number;
  confirmed: boolean;
}

export interface RoomBookingBlock {
  time: string;
  status: 'free' | 'occupied';
  driveName?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  hasVideoConf: boolean;
  status: 'available' | 'occupied' | 'reserved';
  currentInterview?: string;
  nextAvailable?: string;
  bookings?: RoomBookingBlock[];
}

export interface Interview {
  id: string;
  candidateId?: string;
  candidateName: string;
  candidateRoll: string;
  companyName: string;
  roleTitle: string;
  round: InterviewRound;
  timeSlot: string;
  startTime: string;
  endTime: string;
  date: string;
  panelId?: string;
  panelName: string;
  roomId?: string;
  roomName: string;
  status: InterviewStatus;
  panelConfirmed: boolean;
  conflictNote?: string;
  score?: number;
  feedback?: string;
}

export interface ScheduleConflict {
  id: string;
  title: string;
  description: string;
  type: 'candidate' | 'panel' | 'room';
  suggestedSlot: string;
  resolved: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  important: boolean;
  type: NotificationType;
  recipientRole: RecipientRole;
  recipientName: string;
  relatedRoute?: string;
  relatedDriveName?: string;
  relatedCandidateName?: string;
}

export interface AutomatedReminderConfig {
  id: string;
  title: string;
  timing: string;
  enabled: boolean;
}

export interface ExceptionItem {
  id: string;
  title: string;
  description: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  category: ExceptionCategory;
  timestamp: string;
  affectedEntity: string;
  aiRecommendation: string;
  suggestedActionText: string;
  recommendedAction?: string;
  actionText?: string;
  actionRoute?: string;
  candidateAvailable?: boolean;
  panelAvailable?: boolean;
  roomAvailable?: boolean;
  resolvedBy?: string;
}

export interface AgentActivityEvent {
  id: string;
  timestamp: string;
  title: string;
  category: string;
  detail: string;
  type: 'autonomous_ai' | 'officer_action' | 'system';
}

export interface SkillDemand {
  skill: string;
  demandPercent: number;
  proficientPercent: number;
  needingImprovementPercent: number;
}

export interface SkillGap {
  skill: string;
  industryDemand: number;
  studentProficiency: number;
  gapPercent: number;
  affectedCount: number;
  priority: 'high' | 'medium' | 'low';
  relatedDrives: string[];
  recommendation: string;
}

export interface ReadinessMetric {
  category: 'Ready' | 'Almost Ready' | 'Needs Improvement';
  studentCount: number;
  percentage: number;
  fillColor: string;
}

export interface BranchReadiness {
  branch: string;
  studentCount: number;
  avgReadiness: number;
  readyPercent: number;
  needsImprovementPercent: number;
}

export interface StudentReadinessItem {
  id: string;
  name: string;
  branch: string;
  readinessScore: number;
  topSkillGap: string;
  recommendedAction: string;
  status: 'Ready' | 'Almost Ready' | 'Needs Improvement';
}

export interface AIInsight {
  id: string;
  text: string;
  type: 'gap' | 'alignment' | 'action';
}

export interface CopilotCard {
  title: string;
  subtitle?: string;
  detail?: string;
  badge?: string;
  status?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  cards?: CopilotCard[];
  actionButton?: {
    label: string;
    route: string;
  };
}

export interface CopilotPrompt {
  id: string;
  text: string;
  category: string;
}

export interface CopilotHistoryItem {
  id: string;
  title: string;
  timestamp: string;
  snippet: string;
}

export interface SkillAnalyticsItem {
  skill: string;
  demandPercentage: number;
  studentProficiencyPercentage: number;
  gapPercentage: number;
  affectedStudentsCount: number;
}

export interface DashboardStats {
  activeDrives: number;
  eligibleStudents: number;
  shortlistedCandidates: number;
  interviewsToday: number;
  pendingActions: number;
  activeDrivesChange: string;
  eligibleStudentsChange: string;
  shortlistedChange: string;
  interviewsChange: string;
  pendingActionsChange: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  type: 'ai' | 'drive' | 'interview' | 'student' | 'system';
}
