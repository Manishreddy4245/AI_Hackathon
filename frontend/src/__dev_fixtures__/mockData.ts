/**
 * DEVELOPMENT TEST FIXTURES ONLY
 * 
 * QUARANTINED FILE: This file is restricted to test runners and dev fixtures.
 * It MUST NOT be imported by production React components, contexts, or services.
 */
import {
  DashboardStats,
  CopilotPrompt,
  CopilotHistoryItem,
  ReadinessMetric,
  SkillDemand,
  SkillGap,
  BranchReadiness,
  StudentReadinessItem,
  AIInsight,
  NotificationItem,
  AutomatedReminderConfig,
  ExceptionItem,
  AgentActivityEvent,
  ScheduleConflict,
  Interview,
  Panel,
  Room,
  Company,
  PlacementDrive,
  Student,
  CandidateMatch,
  SkillAnalyticsItem,
} from '../types';

export const mockDashboardStats: DashboardStats = {
  activeDrives: 0,
  eligibleStudents: 0,
  shortlistedCandidates: 0,
  interviewsToday: 0,
  pendingActions: 0,
  activeDrivesChange: '0 this week',
  eligibleStudentsChange: '0% batch eligibility',
  shortlistedChange: '0%',
  interviewsChange: '0 slots remaining',
  pendingActionsChange: '0 pending',
};

export const mockSuggestedPrompts: CopilotPrompt[] = [
  { id: 'p-1', text: 'What placement actions need attention?', category: 'Pending Exceptions' },
  { id: 'p-2', text: 'Which rooms are available for interviews?', category: 'Venue Availability' },
  { id: 'p-3', text: 'Show active placement drives.', category: 'Drives' },
  { id: 'p-4', text: 'Who are the top candidates?', category: 'Candidate Matching' },
];

export const mockCopilotHistory: CopilotHistoryItem[] = [];
export const mockReadinessMetrics: ReadinessMetric[] = [];
export const mockReadinessScoreDistribution: any[] = [];
export const mockSkillDemands: SkillDemand[] = [];
export const mockCampusSkillGaps: SkillGap[] = [];
export const mockBranchReadiness: BranchReadiness[] = [];
export const mockCompanySkillDemand: any[] = [];
export const mockStudentsRequiringAttention: StudentReadinessItem[] = [];
export const mockAIPlacementInsights: AIInsight[] = [];
export const mockNotifications: NotificationItem[] = [];
export const mockAutomatedReminders: AutomatedReminderConfig[] = [];
export const mockExceptions: ExceptionItem[] = [];
export const mockAgentActivity: AgentActivityEvent[] = [];
export const mockConflicts: ScheduleConflict[] = [];
export const mockUpcomingInterviews: Interview[] = [];
export const mockPanels: Panel[] = [];
export const mockRooms: Room[] = [];
export const mockCompanies: Company[] = [];
export const mockDrives: PlacementDrive[] = [];
export const mockStudents: Student[] = [];
export const mockMatches: CandidateMatch[] = [];
export const mockSkillDemand: SkillAnalyticsItem[] = [];

export const mockAIOperationsAlerts = mockExceptions;
export const mockActivityLog = mockAgentActivity;
export const mockRecentActivity = mockActivityLog;
