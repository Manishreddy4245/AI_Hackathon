import {
  Company,
  PlacementDrive,
  Student,
  CandidateMatch,
  Panel,
  Room,
  Interview,
  ScheduleConflict,
  NotificationItem,
  AutomatedReminderConfig,
  ExceptionItem,
  AgentActivityEvent,
  SkillDemand,
  SkillGap,
  ReadinessMetric,
  BranchReadiness,
  StudentReadinessItem,
  AIInsight,
  CopilotPrompt,
  CopilotHistoryItem,
  SkillAnalyticsItem,
  DashboardStats,
  ActivityLog,
} from '../types';

export const mockDashboardStats: DashboardStats = {
  activeDrives: 12,
  eligibleStudents: 428,
  shortlistedCandidates: 96,
  interviewsToday: 24,
  pendingActions: 8,
  activeDrivesChange: '+2 this week',
  eligibleStudentsChange: '89% batch eligibility',
  shortlistedChange: '+18% vs last drive',
  interviewsChange: '3 slots remaining',
  pendingActionsChange: '4 require officer review',
};

export const mockSuggestedPrompts: CopilotPrompt[] = [
  { id: 'p-1', text: 'Who are the top candidates for TechNova?', category: 'Candidate Matching' },
  { id: 'p-2', text: "Show today's interview conflicts.", category: 'Operations & Schedules' },
  { id: 'p-3', text: 'Which students are eligible for the DataSphere drive?', category: 'Drive Eligibility' },
  { id: 'p-4', text: 'Which rooms are free at 2 PM?', category: 'Venue Availability' },
  { id: 'p-5', text: 'What are the biggest skill gaps on campus?', category: 'Skill Analytics' },
  { id: 'p-6', text: 'What placement actions need attention?', category: 'Pending Exceptions' },
];

export const mockCopilotHistory: CopilotHistoryItem[] = [
  {
    id: 'hist-1',
    title: 'TechNova candidate analysis',
    timestamp: 'Today, 09:30 AM',
    snippet: 'Ranked top candidates based on FastAPI and Python alignment.',
  },
  {
    id: 'hist-2',
    title: "Today's interview conflicts",
    timestamp: 'Today, 08:45 AM',
    snippet: 'Identified candidate overlap and Lab 101 double-booking.',
  },
  {
    id: 'hist-3',
    title: 'SQL skill gap analysis',
    timestamp: 'Yesterday',
    snippet: 'Extracted 21% SQL deficit across 126 TechNova applicants.',
  },
];

export const mockReadinessMetrics: ReadinessMetric[] = [
  { category: 'Ready', studentCount: 184, percentage: 43, fillColor: '#10b981' },
  { category: 'Almost Ready', studentCount: 148, percentage: 35, fillColor: '#3b82f6' },
  { category: 'Needs Improvement', studentCount: 96, percentage: 22, fillColor: '#f59e0b' },
];

export const mockReadinessScoreDistribution = [
  { range: '90–100', count: 68, fill: '#10b981' },
  { range: '80–89', count: 116, fill: '#3b82f6' },
  { range: '70–79', count: 148, fill: '#0284c7' },
  { range: '60–69', count: 64, fill: '#f59e0b' },
  { range: 'Below 60', count: 32, fill: '#f43f5e' },
];

export const mockSkillDemands: SkillDemand[] = [
  { skill: 'Python', demandPercent: 78, proficientPercent: 82, needingImprovementPercent: 18 },
  { skill: 'SQL', demandPercent: 72, proficientPercent: 51, needingImprovementPercent: 49 },
  { skill: 'Java', demandPercent: 64, proficientPercent: 65, needingImprovementPercent: 35 },
];

export const mockCampusSkillGaps: SkillGap[] = [
  {
    skill: 'SQL',
    industryDemand: 72,
    studentProficiency: 51,
    gapPercent: 21,
    affectedCount: 126,
    priority: 'high',
    relatedDrives: ['TechNova Solutions', 'DataSphere Analytics', 'FinEdge Technologies'],
    recommendation: 'Prioritize SQL joins, aggregation, subqueries and query optimization in the next placement preparation workshop.',
  },
];

export const mockBranchReadiness: BranchReadiness[] = [
  { branch: 'CSE', studentCount: 180, avgReadiness: 84, readyPercent: 54, needsImprovementPercent: 12 },
  { branch: 'IT', studentCount: 120, avgReadiness: 82, readyPercent: 48, needsImprovementPercent: 15 },
];

export const mockCompanySkillDemand = [
  { company: 'TechNova Solutions', skills: ['Python', 'SQL', 'FastAPI', 'Docker'] },
];

export const mockStudentsRequiringAttention: StudentReadinessItem[] = [
  {
    id: 'rahul-verma',
    name: 'Rahul Verma',
    branch: 'CSE',
    readinessScore: 74,
    topSkillGap: 'Docker',
    recommendedAction: 'Backend deployment workshop',
    status: 'Almost Ready',
  },
];

export const mockAIPlacementInsights: AIInsight[] = [
  {
    id: 'ins-1',
    text: 'SQL is the largest common skill gap among students targeting current active placement drives.',
    type: 'gap',
  },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-101',
    title: 'Technical Interview Scheduled',
    message: 'Your Technical Interview for TechNova is scheduled for today at 10:30 AM in Lab 101.',
    timestamp: '10 minutes ago',
    read: false,
    important: false,
    type: 'interview',
    recipientRole: 'students',
    recipientName: 'Rahul Verma',
  },
];

export const mockAutomatedReminders: AutomatedReminderConfig[] = [
  { id: 'rem-1', title: 'Interview reminder', timing: '24 hours before', enabled: true },
];

export const mockExceptions: ExceptionItem[] = [
  {
    id: 'exc-101',
    title: 'Interview scheduling conflict',
    description: 'Rahul Verma has two interviews scheduled at overlapping times.',
    severity: 'critical',
    status: 'open',
    category: 'scheduling',
    timestamp: '10 minutes ago',
    affectedEntity: 'Rahul Verma & TechNova',
    aiRecommendation: 'Move the TechNova interview to 11:30 AM. Candidate, Panel A and Lab 102 are available.',
    suggestedActionText: 'Move TechNova interview slot to 11:30 AM – 12:15 PM',
  },
];

export const mockAgentActivity: AgentActivityEvent[] = [
  {
    id: 'act-101',
    timestamp: '09:42 AM',
    title: 'Detected candidate scheduling conflict',
    category: 'Scheduling Exception',
    detail: 'Flagged overlapping interview slots for candidate Rahul Verma.',
    type: 'autonomous_ai',
  },
];

export const mockConflicts: ScheduleConflict[] = [];

export const mockUpcomingInterviews: Interview[] = [
  {
    id: 'int-101',
    candidateId: 'rahul-verma',
    candidateName: 'Rahul Verma',
    candidateRoll: '2021CS1115',
    companyName: 'TechNova Solutions',
    roleTitle: 'Backend Developer',
    round: 'Technical Interview',
    timeSlot: '10:30 AM – 11:15 AM',
    startTime: '10:30',
    endTime: '11:15',
    date: 'Today',
    panelId: 'pnl-1',
    panelName: 'Panel A',
    roomId: 'rm-1',
    roomName: 'Lab 101',
    status: 'scheduled',
    panelConfirmed: false,
  },
];

export const mockPanels: Panel[] = [
  {
    id: 'pnl-1',
    name: 'Panel A',
    members: ['Dr. Suresh (Lead)', 'Prof. Mehta'],
    companyName: 'TechNova Solutions',
    roomNumber: 'Lab 101',
    expertise: ['Backend', 'Python', 'Cloud'],
    availability: 'available',
    interviewsScheduled: 4,
    confirmed: false,
  },
];

export const mockRooms: Room[] = [
  {
    id: 'rm-1',
    name: 'Lab 101',
    building: 'Tech Block A',
    capacity: 30,
    hasVideoConf: true,
    status: 'occupied',
    currentInterview: 'TechNova Technical Interview',
    nextAvailable: '11:15 AM',
  },
];

export const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'TechNova Solutions',
    logo: 'TN',
    industry: 'Software / IT',
    website: 'https://technova.example.com',
    location: 'Bengaluru / Hybrid',
    tier: 'Super Dream',
    contactPerson: 'Vikram Mehta (Campus Lead)',
    contactEmail: 'vikram@technova.example.com',
  },
];

export const mockDrives: PlacementDrive[] = [
  {
    id: 'technova-backend',
    companyId: 'comp-1',
    companyName: 'TechNova Solutions',
    companyLogo: 'TN',
    roleTitle: 'Backend Developer',
    packageLpa: 16.5,
    location: 'Bengaluru',
    employmentType: 'Full-time',
    eligibleBranches: ['CSE', 'IT'],
    minCgpa: 7.5,
    graduationYear: 2027,
    driveDate: '2026-08-28',
    status: 'open',
    registeredCount: 142,
    shortlistedCount: 32,
    selectedCount: 0,
    deadline: 'Tomorrow, 6:00 PM',
    description: 'Looking for strong problem solvers proficient in Python, SQL, and distributed microservices architecture.',
    requiredSkills: ['Python', 'SQL', 'REST APIs'],
    preferredSkills: ['FastAPI', 'Docker', 'Git', 'Cloud'],
  },
];

export const mockStudents: Student[] = [
  {
    id: 'rahul-verma',
    rollNumber: '2021CS1115',
    name: 'Rahul Verma',
    email: 'rahul.verma@campus.edu',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    branch: 'CSE',
    batch: '2027',
    cgpa: 8.9,
    skills: ['Python', 'FastAPI', 'SQL', 'Docker', 'REST APIs', 'Git'],
    readinessScore: 92,
    resumeUrl: '#',
    placementStatus: 'unplaced',
    applicationsCount: 5,
    shortlistsCount: 4,
    interviewsCount: 2,
    projects: [],
    certifications: [],
  },
];

export const mockMatches: CandidateMatch[] = [
  {
    studentId: 'rahul-verma',
    studentName: 'Rahul Verma',
    studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    branch: 'CSE',
    cgpa: 8.9,
    driveId: 'technova-backend',
    companyName: 'TechNova Solutions',
    roleTitle: 'Backend Developer',
    matchScore: 92,
    skillMatchPercent: 90,
    matchedSkills: ['Python', 'SQL', 'FastAPI', 'REST APIs'],
    missingSkills: ['Docker'],
    relevantProjects: [],
    status: 'eligible',
    aiRecommendation: 'Strong candidate for backend role.',
  },
];

export const mockSkillDemand: SkillAnalyticsItem[] = [
  { skill: 'Python', demandPercentage: 78, studentProficiencyPercentage: 82, gapPercentage: 6, affectedStudentsCount: 28 },
];

export const mockAIOperationsAlerts = mockExceptions;
export const mockActivityLog = mockAgentActivity;
export const mockRecentActivity = mockActivityLog;
