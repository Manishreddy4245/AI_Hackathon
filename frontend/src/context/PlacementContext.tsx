import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  PlacementDrive,
  Interview,
  Panel,
  Room,
  ScheduleConflict,
  NotificationItem,
  AutomatedReminderConfig,
  ExceptionItem,
  AgentActivityEvent,
  InterviewStatus,
  ExceptionStatus,
  UserRole,
  CandidatePoolStats,
} from '../types';
import { apiService } from '../services/api';

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'candidate' | 'panel' | 'room';
  reason?: string;
  suggestedSlots?: string[];
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface PlacementContextType {
  students: Student[];
  drives: PlacementDrive[];
  candidatePool: any[];
  candidateStats: CandidatePoolStats;
  interviewsList: Interview[];
  availabilitySlots: any[];
  panelsList: Panel[];
  roomsList: Room[];
  conflictsList: ScheduleConflict[];
  notificationsList: NotificationItem[];
  exceptionsList: ExceptionItem[];
  reminderConfigs: AutomatedReminderConfig[];
  agentActivities: AgentActivityEvent[];
  shortlistedMap: Record<string, string[]>;
  appliedDriveIds: string[];
  toastsList: ToastItem[];
  toastNotice: string | null;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  refreshAllData: () => Promise<void>;

  triggerToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  toggleShortlist: (studentId: string, driveId?: string) => void;
  isShortlisted: (studentId: string, driveId?: string) => boolean;
  applyToDrive: (driveId: string, studentId?: string) => void;
  hasAppliedToDrive: (driveId: string) => boolean;
  checkEligibility: (student: Student, drive: PlacementDrive) => EligibilityResult;
  getTotalShortlistedCount: () => number;

  // Interview & Panel Actions
  createDrive: (newDrive: PlacementDrive) => void;
  updateDrive: (driveId: string, updatedData: Partial<PlacementDrive>) => Promise<void>;
  approveDrive: (driveId: string) => Promise<void>;
  rejectDrive: (driveId: string, reason?: string) => Promise<void>;
  requestDriveChanges: (driveId: string, feedback?: string) => Promise<void>;
  scheduleInterview: (newInterview: Interview) => void;
  confirmPanel: (panelId: string) => void;

  updateInterviewStatus: (interviewId: string, status: InterviewStatus) => void;
  rescheduleInterview: (interviewId: string, date: string, timeSlot: string, panelName: string, roomName: string) => void;
  createPanel: (newPanel: Panel) => void;
  checkScheduleAvailability: (candidateName: string, panelName: string, roomName: string, timeSlot: string) => ConflictCheckResult;

  // Notification Actions
  sendNotification: (newNotif: NotificationItem) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleNotificationImportant: (id: string) => void;
  deleteNotification: (id: string) => void;
  toggleReminder: (id: string) => void;

  // Exceptions / AI Operations Actions
  approveExceptionRecommendation: (exceptionId: string) => void;
  updateExceptionStatus: (exceptionId: string, status: ExceptionStatus) => void;
}

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export const PlacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('placement_officer');
  const [students, setStudents] = useState<Student[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [candidatePool, setCandidatePool] = useState<any[]>([]);
  const [candidateStats, setCandidateStats] = useState<CandidatePoolStats>({
    all: 0,
    applied: 0,
    shortlisted: 0,
    not_shortlisted: 0,
    interview_scheduled: 0,
    selected: 0,
  });
  const [interviewsList, setInterviewsList] = useState<Interview[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [panelsList, setPanelsList] = useState<Panel[]>([]);
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [conflictsList, setConflictsList] = useState<ScheduleConflict[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [exceptionsList, setExceptionsList] = useState<ExceptionItem[]>([]);
  const [reminderConfigs, setReminderConfigs] = useState<AutomatedReminderConfig[]>([
    { id: 'rem-1', title: 'Interview reminder', timing: '24 hours before', enabled: true }
  ]);
  const [agentActivities, setAgentActivities] = useState<AgentActivityEvent[]>([]);
  const [appliedDriveIds, setAppliedDriveIds] = useState<string[]>([]);
  const [shortlistedMap, setShortlistedMap] = useState<Record<string, string[]>>({});
  const [toastsList, setToastsList] = useState<ToastItem[]>([]);

  // Fetch all real live data from FastAPI backend
  const refreshAllData = async () => {
    try {
      const [
        drivesData,
        studentsData,
        poolData,
        poolStatsData,
        interviewsData,
        availData,
        panelsData,
        roomsData,
        notifsData,
        exceptionsData,
        activitiesData,
      ] = await Promise.all([
        apiService.getDrives().catch(() => null),
        apiService.getStudents().catch(() => null),
        apiService.getCandidatePool().catch(() => null),
        apiService.getCandidatePoolStats().catch(() => null),
        apiService.getInterviews().catch(() => null),
        apiService.getInterviewAvailability().catch(() => null),
        apiService.getPanels().catch(() => null),
        apiService.getRooms().catch(() => null),
        apiService.getNotifications().catch(() => null),
        apiService.getExceptions().catch(() => null),
        apiService.getAgentActivities().catch(() => null),
      ]);

      if (Array.isArray(drivesData)) setDrives(drivesData);
      if (Array.isArray(studentsData)) setStudents(studentsData);
      if (poolData) setCandidatePool(poolData);
      if (poolStatsData) setCandidateStats(poolStatsData);
      if (Array.isArray(interviewsData)) setInterviewsList(interviewsData);
      if (Array.isArray(availData)) setAvailabilitySlots(availData);
      if (Array.isArray(panelsData)) setPanelsList(panelsData);
      if (Array.isArray(roomsData)) setRoomsList(roomsData);
      if (Array.isArray(notifsData)) setNotificationsList(notifsData);
      if (Array.isArray(exceptionsData)) setExceptionsList(exceptionsData);
      if (Array.isArray(activitiesData) && activitiesData.length > 0) setAgentActivities(activitiesData);
    } catch (err) {
      console.log('Backend sync active');
    }
  };

  useEffect(() => {
    refreshAllData();

    // Regular polling for fresh notifications and applications
    const notifInterval = setInterval(() => {
      apiService.getNotifications()
        .then((notifs) => {
          if (Array.isArray(notifs)) {
            setNotificationsList(notifs);
          }
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(notifInterval);
  }, []);

  const triggerToast = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToastsList((prev) => {
      if (prev.some((t) => t.message === msg)) {
        return prev;
      }
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setTimeout(() => {
        dismissToast(id);
      }, 4000);
      return [...prev, { id, message: msg, type }];
    });
  };

  const dismissToast = (id: string) => {
    setToastsList((prev) => prev.filter((t) => t.id !== id));
  };

  const isShortlisted = (studentId: string, driveId: string = '') => {
    const list = shortlistedMap[driveId] || [];
    return list.includes(studentId);
  };

  const toggleShortlist = async (studentId: string, driveId: string = '') => {
    const student = students.find((s) => s.id === studentId);
    const studentName = student ? student.name : 'Candidate';

    try {
      await apiService.toggleShortlist(studentId, driveId);
      triggerToast(`Shortlist status updated for ${studentName}.`, 'success');
      await refreshAllData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to update shortlist status.';
      triggerToast(`Shortlist Error: ${detail}`, 'error');
    }
  };

  const applyToDrive = async (driveId: string, studentId?: string) => {
    const drive = drives.find((d) => d.id === driveId);
    const company = drive ? drive.companyName : 'Placement Drive';

    try {
      if (studentId) {
        await apiService.applyToDrive(studentId, driveId);
      }
      setAppliedDriveIds((prev) => Array.from(new Set([...prev, driveId])));
      triggerToast(`Application submitted successfully for ${company}!`, 'success');
      await refreshAllData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to submit application.';
      triggerToast(`Application Error: ${detail}`, 'error');
    }
  };

  const hasAppliedToDrive = (driveId: string) => appliedDriveIds.includes(driveId);

  const checkEligibility = (student: Student, drive: PlacementDrive): EligibilityResult => {
    if (student.cgpa < (drive.minCgpa || 0)) {
      return { eligible: false, reason: `CGPA ${student.cgpa} is below required ${drive.minCgpa}` };
    }
    const BRANCH_CANONICALS: Record<string, string[]> = {
      CSE: ['CSE', 'CS', 'COMPUTER SCIENCE', 'COMPUTER SCIENCE & ENGINEERING', 'COMPUTER SCIENCE AND ENGINEERING', 'COMPUTER ENGINEERING'],
      IT: ['IT', 'INFORMATION TECHNOLOGY', 'INFO TECH', 'INFORMATION SCIENCE', 'ISE'],
      ECE: ['ECE', 'ELECTRONICS', 'ELECTRONICS & COMMUNICATION', 'ELECTRONICS AND COMMUNICATION', 'ELECTRONICS & COMMUNICATION ENGINEERING', 'ELECTRONICS AND COMMUNICATION ENGINEERING', 'ETC'],
      EE: ['EE', 'EEE', 'ELECTRICAL', 'ELECTRICAL ENGINEERING', 'ELECTRICAL AND ELECTRONICS', 'ELECTRICAL & ELECTRONICS ENGINEERING', 'TECHNICAL / ELECTRICAL ENGINEERING'],
      ME: ['ME', 'MECH', 'MECHANICAL', 'MECHANICAL ENGINEERING'],
      CE: ['CE', 'CIVIL', 'CIVIL ENGINEERING'],
      AIML: ['AI', 'AIML', 'ARTIFICIAL INTELLIGENCE', 'AI & ML', 'AI/ML', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'],
      DATA_SCIENCE: ['DS', 'DATA SCIENCE', 'DATA SCIENCE AND ENGINEERING'],
    };
    const getCanonical = (bStr: string) => {
      if (!bStr) return '';
      const clean = bStr.toUpperCase().trim();
      for (const [code, syns] of Object.entries(BRANCH_CANONICALS)) {
        if (syns.includes(clean)) return code;
      }
      if (clean.includes('COMPUTER SCIENCE') || clean.includes('COMPUTER ENG')) return 'CSE';
      if (clean.includes('INFORMATION TECH') || clean.includes('INFORMATION SCI')) return 'IT';
      if (clean.includes('ELECTRONICS') && clean.includes('COMMUNICATION')) return 'ECE';
      if (clean.includes('ELECTRICAL')) return 'EE';
      if (clean.includes('MECHANICAL')) return 'ME';
      if (clean.includes('CIVIL')) return 'CE';
      return clean;
    };
    const studentCanon = getCanonical(student.branch);
    const driveCanons = new Set((drive.eligibleBranches || []).map((b) => getCanonical(b)));
    const branchMatch = (drive.eligibleBranches || []).length === 0 || driveCanons.has(studentCanon) || (drive.eligibleBranches || []).some((b) => b.toUpperCase().trim() === (student.branch || '').toUpperCase().trim());
    
    if (!branchMatch) {
      return { eligible: false, reason: `${student.branch} is not an eligible branch` };
    }
    const missingSkill = (drive.requiredSkills || []).find(
      (reqSkill) => !(student.skills || []).some((s) => s.toLowerCase() === reqSkill.toLowerCase())
    );
    if (missingSkill) {
      return { eligible: false, reason: `Required skill ${missingSkill} not found` };
    }
    return { eligible: true };
  };

  const getTotalShortlistedCount = () => {
    const allUnique = new Set<string>();
    Object.values(shortlistedMap).forEach((list) => {
      list.forEach((id) => allUnique.add(id));
    });
    return allUnique.size || candidateStats?.shortlisted || 0;
  };

  const checkScheduleAvailability = (
    candidateName: string,
    panelName: string,
    roomName: string,
    timeSlot: string
  ): ConflictCheckResult => {
    if (!candidateName.trim()) return { hasConflict: false };

    const realAvailSlots = availabilitySlots
      .filter((s: any) => s.status === 'AVAILABLE')
      .map((s: any) => `${s.start_time} - ${s.end_time}`);

    const candidateOverlap = interviewsList.find(
      (i) => i.candidateName.toLowerCase() === candidateName.toLowerCase() && i.status !== 'cancelled' && i.timeSlot === timeSlot
    );
    if (candidateOverlap) {
      return {
        hasConflict: true,
        conflictType: 'candidate',
        reason: `${candidateName} already has an interview scheduled during ${timeSlot}.`,
        suggestedSlots: realAvailSlots.length > 0 ? realAvailSlots.slice(0, 2) : undefined,
      };
    }

    if (panelName.trim()) {
      const panelOverlap = interviewsList.find(
        (i) => i.panelName.toLowerCase() === panelName.toLowerCase() && i.status !== 'cancelled' && i.timeSlot === timeSlot
      );
      if (panelOverlap) {
        return {
          hasConflict: true,
          conflictType: 'panel',
          reason: `${panelName} is already assigned to another interview during ${timeSlot}.`,
          suggestedSlots: realAvailSlots.length > 0 ? realAvailSlots.slice(0, 2) : undefined,
        };
      }
    }

    if (roomName.trim()) {
      const roomOverlap = interviewsList.find(
        (i) => i.roomName.toLowerCase() === roomName.toLowerCase() && i.status !== 'cancelled' && i.timeSlot === timeSlot
      );
      if (roomOverlap) {
        return {
          hasConflict: true,
          conflictType: 'room',
          reason: `${roomName} is occupied during ${timeSlot}.`,
        };
      }
    }

    return { hasConflict: false };
  };

  const scheduleInterview = async (newInterview: Interview) => {
    try {
      await apiService.scheduleInterview(newInterview);
      triggerToast(`Interview scheduled successfully for ${newInterview.candidateName}!`, 'success');
      await refreshAllData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to schedule interview.';
      triggerToast(`Scheduling Error: ${detail}`, 'error');
      throw err;
    }
  };

  const confirmPanel = async (panelId: string) => {
    try {
      await apiService.confirmPanel(panelId);
      triggerToast(`Panel confirmed successfully ✓.`, 'success');
      await refreshAllData();
    } catch (err: any) {
      triggerToast(`Failed to confirm panel.`, 'error');
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: InterviewStatus) => {
    try {
      await apiService.updateInterviewStatus(interviewId, status);
      triggerToast(`Interview status updated to ${status.replace('_', ' ')}.`, 'info');
      await refreshAllData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to update interview status.';
      triggerToast(`Status Error: ${detail}`, 'error');
    }
  };

  const rescheduleInterview = async (
    interviewId: string,
    date: string,
    timeSlot: string,
    panelName: string,
    roomName: string
  ) => {
    try {
      await apiService.rescheduleInterview(interviewId, { date, timeSlot, panelName, roomName });
      triggerToast(`Interview rescheduled to ${date} at ${timeSlot}.`, 'success');
      await refreshAllData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to reschedule interview.';
      triggerToast(`Reschedule Error: ${detail}`, 'error');
    }
  };

  const createPanel = async (newPanel: Panel) => {
    try {
      await apiService.createPanel(newPanel);
      triggerToast(`Panel ${newPanel.name} created successfully.`, 'success');
      await refreshAllData();
    } catch (err: any) {
      triggerToast(`Failed to create panel.`, 'error');
    }
  };


  const sendNotification = (newNotif: NotificationItem) => {
    setNotificationsList([newNotif, ...notificationsList]);
    triggerToast(`Notification sent successfully.`, 'success');
    apiService.sendNotification(newNotif).catch(() => {});
  };

  const markNotificationRead = (id: string) => {
    setNotificationsList(
      notificationsList.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
    apiService.markNotificationRead(id).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    setNotificationsList(
      notificationsList.map((n) => ({ ...n, read: true }))
    );
    apiService.markAllNotificationsRead().catch(() => {});
  };

  const toggleNotificationImportant = (id: string) => {
    setNotificationsList(
      notificationsList.map((n) => (n.id === id ? { ...n, important: !n.important } : n))
    );
    apiService.toggleNotificationImportant(id).catch(() => {});
  };

  const deleteNotification = (id: string) => {
    setNotificationsList(notificationsList.filter((n) => n.id !== id));
    triggerToast(`Notification deleted.`, 'info');
    apiService.deleteNotification(id).catch(() => {});
  };

  const toggleReminder = (id: string) => {
    setReminderConfigs(
      reminderConfigs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    triggerToast(`Automated reminder preference updated.`, 'info');
  };

  const approveExceptionRecommendation = async (exceptionId: string) => {
    const target = exceptionsList.find((e) => e.id === exceptionId);
    if (!target) return;

    setExceptionsList(
      exceptionsList.map((e) =>
        e.id === exceptionId
          ? { ...e, status: 'resolved', resolvedBy: 'Placement Officer' }
          : e
      )
    );

    const newLog: AgentActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: `Recommendation approved by Placement Officer`,
      category: 'Officer Approval',
      detail: `Approved AI recommendation for '${target.title}': ${target.suggestedActionText}`,
      type: 'officer_action',
    };
    setAgentActivities([newLog, ...agentActivities]);

    triggerToast(`Exception resolved successfully ✓.`, 'success');
    try {
      await apiService.approveException(exceptionId);
      // Re-sync drives and notifications in case a drive was approved
      apiService.getDrives().then((d) => { if (Array.isArray(d)) setDrives(d); }).catch(() => {});
      apiService.getAgentActivities().then((acts) => { if (Array.isArray(acts) && acts.length > 0) setAgentActivities(acts); }).catch(() => {});
    } catch (err) {
      console.error('Approve exception error:', err);
    }
  };

  const updateExceptionStatus = async (exceptionId: string, status: ExceptionStatus) => {
    setExceptionsList(
      exceptionsList.map((e) => (e.id === exceptionId ? { ...e, status } : e))
    );
    triggerToast(`Exception status set to ${status.toUpperCase()}.`, 'info');
    try {
      await apiService.updateExceptionStatus(exceptionId, status);
      apiService.getAgentActivities().then((acts) => { if (Array.isArray(acts) && acts.length > 0) setAgentActivities(acts); }).catch(() => {});
    } catch (err) {
      console.error('Update exception status error:', err);
    }
  };

  const createDrive = async (newDrive: PlacementDrive) => {
    try {
      const created = await apiService.createDrive(newDrive);
      const targetDrive = created || newDrive;
      setDrives((prev) => [targetDrive, ...prev.filter((d) => d.id !== targetDrive.id)]);
      triggerToast(`Placement drive created for ${newDrive.companyName}! Submitted for Officer Approval.`, 'success');
      refreshAllData().catch(() => {});
    } catch (err) {
      console.error('Failed to create drive in backend API:', err);
      setDrives((prev) => [newDrive, ...prev]);
      triggerToast(`Placement drive created for ${newDrive.companyName}!`, 'success');
    }
  };

  const updateDrive = async (driveId: string, updatedData: Partial<PlacementDrive>) => {
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, ...updatedData } : d)));
    triggerToast(`Placement drive updated successfully!`, 'success');
    try {
      await apiService.updateDrive(driveId, updatedData);
      refreshAllData().catch(() => {});
    } catch (err) {
      console.error('Failed to update drive in backend:', err);
    }
  };

  const approveDrive = async (driveId: string) => {
    try {
      const updated = await apiService.approveDrive(driveId);
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'ACTIVE' as any, aiConfirmed: true } : d)));
      triggerToast(`Drive approved & published to eligible students!`, 'success');
      refreshAllData().catch(() => {});
    } catch {
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'ACTIVE' as any } : d)));
      triggerToast(`Drive approved successfully.`, 'success');
    }
  };

  const rejectDrive = async (driveId: string, reason?: string) => {
    try {
      await apiService.rejectDrive(driveId, reason);
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'REJECTED' as any } : d)));
      triggerToast(`Placement drive rejected. Recruiter notified.`, 'info');
      refreshAllData().catch(() => {});
    } catch {
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'REJECTED' as any } : d)));
      triggerToast(`Drive marked as rejected.`, 'info');
    }
  };

  const requestDriveChanges = async (driveId: string, feedback?: string) => {
    try {
      await apiService.requestDriveChanges(driveId, feedback);
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'CHANGES_REQUESTED' as any } : d)));
      triggerToast(`Requested adjustments from recruiter.`, 'info');
      refreshAllData().catch(() => {});
    } catch {
      setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'CHANGES_REQUESTED' as any } : d)));
      triggerToast(`Changes requested.`, 'info');
    }
  };

  return (
    <PlacementContext.Provider
      value={{
        students,
        drives,
        candidatePool,
        candidateStats,
        interviewsList,
        availabilitySlots,
        panelsList,
        roomsList,
        conflictsList,
        notificationsList,
        exceptionsList,
        reminderConfigs,
        agentActivities,
        shortlistedMap,
        appliedDriveIds,
        toastsList,
        toastNotice: toastsList.length > 0 ? toastsList[toastsList.length - 1].message : null,
        currentUserRole,
        setCurrentUserRole,
        refreshAllData,
        triggerToast,
        dismissToast,
        toggleShortlist,
        isShortlisted,
        applyToDrive,
        hasAppliedToDrive,
        checkEligibility,
        getTotalShortlistedCount,
        createDrive,
        updateDrive,
        approveDrive,
        rejectDrive,
        requestDriveChanges,
        scheduleInterview,
        confirmPanel,
        updateInterviewStatus,
        rescheduleInterview,
        createPanel,
        checkScheduleAvailability,
        sendNotification,
        markNotificationRead,
        markAllNotificationsRead,
        toggleNotificationImportant,
        deleteNotification,
        toggleReminder,
        approveExceptionRecommendation,
        updateExceptionStatus,
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
};


export const usePlacement = () => {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
};
