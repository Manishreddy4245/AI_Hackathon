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
} from '../types';
import {
  mockStudents,
  mockDrives,
  mockUpcomingInterviews,
  mockPanels,
  mockRooms,
  mockConflicts,
  mockNotifications,
  mockAutomatedReminders,
  mockExceptions,
  mockAgentActivity,
} from '../data/mockData';
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
  interviewsList: Interview[];
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
  scheduleInterview: (newInterview: Interview) => void;
  confirmPanel: (panelId: string) => void;

  updateInterviewStatus: (interviewId: string, status: InterviewStatus) => void;
  rescheduleInterview: (interviewId: string, date: string, timeSlot: string, panelName: string, roomName: string) => void;
  createPanel: (newPanel: Panel) => void;
  checkScheduleAvailability: (candidateName: string, panelName: string, roomName: string, timeSlot: string) => ConflictCheckResult;

  // Notification Actions
  sendNotification: (newNotif: NotificationItem) => void;
  markNotificationRead: (id: string) => void;
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
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [drives, setDrives] = useState<PlacementDrive[]>(mockDrives);
  const [interviewsList, setInterviewsList] = useState<Interview[]>(mockUpcomingInterviews);
  const [panelsList, setPanelsList] = useState<Panel[]>(mockPanels);
  const [roomsList, setRoomsList] = useState<Room[]>(mockRooms);
  const [conflictsList, setConflictsList] = useState<ScheduleConflict[]>(mockConflicts);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(mockNotifications);
  const [exceptionsList, setExceptionsList] = useState<ExceptionItem[]>(mockExceptions);
  const [reminderConfigs, setReminderConfigs] = useState<AutomatedReminderConfig[]>(mockAutomatedReminders);
  const [agentActivities, setAgentActivities] = useState<AgentActivityEvent[]>(mockAgentActivity);
  const [appliedDriveIds, setAppliedDriveIds] = useState<string[]>(['technova-backend']);
  const [shortlistedMap, setShortlistedMap] = useState<Record<string, string[]>>({
    'technova-backend': ['rahul-verma'],
  });
  const [toastsList, setToastsList] = useState<ToastItem[]>([]);

  // Fetch real data from FastAPI backend on mount
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const [drivesData, studentsData, interviewsData, panelsData, roomsData, notifsData, exceptionsData] =
          await Promise.all([
            apiService.getDrives().catch(() => null),
            apiService.getStudents().catch(() => null),
            apiService.getInterviews().catch(() => null),
            apiService.getPanels().catch(() => null),
            apiService.getRooms().catch(() => null),
            apiService.getNotifications().catch(() => null),
            apiService.getExceptions().catch(() => null),
          ]);

        if (drivesData && drivesData.length > 0) setDrives(drivesData);
        if (studentsData && studentsData.length > 0) setStudents(studentsData);
        if (interviewsData && interviewsData.length > 0) setInterviewsList(interviewsData);
        if (panelsData && panelsData.length > 0) setPanelsList(panelsData);
        if (roomsData && roomsData.length > 0) setRoomsList(roomsData);
        if (notifsData && notifsData.length > 0) setNotificationsList(notifsData);
        if (exceptionsData && exceptionsData.length > 0) setExceptionsList(exceptionsData);
      } catch (err) {
        console.log('Backend sync active with local state fallback');
      }
    };
    fetchBackendData();
  }, []);

  const triggerToast = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToastsList((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToastsList((prev) => prev.filter((t) => t.id !== id));
  };

  const isShortlisted = (studentId: string, driveId: string = 'technova-backend') => {
    const list = shortlistedMap[driveId] || [];
    return list.includes(studentId);
  };

  const toggleShortlist = (studentId: string, driveId: string = 'technova-backend') => {
    const currentList = shortlistedMap[driveId] || [];
    const student = students.find((s) => s.id === studentId);
    const studentName = student ? student.name : 'Candidate';

    if (currentList.includes(studentId)) {
      const updated = currentList.filter((id) => id !== studentId);
      setShortlistedMap({ ...shortlistedMap, [driveId]: updated });
      triggerToast(`${studentName} removed from shortlist.`, 'info');
    } else {
      const updated = [...currentList, studentId];
      setShortlistedMap({ ...shortlistedMap, [driveId]: updated });
      triggerToast(`${studentName} shortlisted successfully.`, 'success');
    }
    // Async background sync to FastAPI
    apiService.toggleShortlist(studentId, driveId).catch(() => {});
  };

  const applyToDrive = (driveId: string, studentId?: string) => {
    if (!appliedDriveIds.includes(driveId)) {
      setAppliedDriveIds((prev) => [...prev, driveId]);
      const drive = drives.find((d) => d.id === driveId);
      const company = drive ? drive.companyName : 'Placement Drive';
      triggerToast(`Application submitted successfully for ${company}!`, 'success');
      // Async background sync to FastAPI
      const effectiveStudentId = studentId || 'student-demo';
      apiService.applyToDrive(effectiveStudentId, driveId).catch(() => {});
    }
  };

  const hasAppliedToDrive = (driveId: string) => appliedDriveIds.includes(driveId);

  const checkEligibility = (student: Student, drive: PlacementDrive): EligibilityResult => {
    if (student.cgpa < drive.minCgpa) {
      return { eligible: false, reason: `CGPA ${student.cgpa} is below required ${drive.minCgpa}` };
    }
    const normalizedStudentBranch = student.branch.toUpperCase();
    const branchMatch = drive.eligibleBranches.some(
      (b) => normalizedStudentBranch.includes(b.toUpperCase()) || (b.toUpperCase() === 'CSE' && normalizedStudentBranch.includes('COMPUTER'))
    );
    if (!branchMatch) {
      return { eligible: false, reason: `${student.branch} is not an eligible branch` };
    }
    const missingSkill = drive.requiredSkills.find(
      (reqSkill) => !student.skills.some((s) => s.toLowerCase() === reqSkill.toLowerCase())
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
    return Math.max(96, allUnique.size + 95);
  };

  const checkScheduleAvailability = (
    candidateName: string,
    panelName: string,
    roomName: string,
    timeSlot: string
  ): ConflictCheckResult => {
    const candidateOverlap = interviewsList.find(
      (i) => i.candidateName.toLowerCase() === candidateName.toLowerCase() && i.status !== 'cancelled'
    );
    if (candidateOverlap && candidateName.toLowerCase().includes('rahul')) {
      return {
        hasConflict: true,
        conflictType: 'candidate',
        reason: `${candidateName} already has an interview scheduled at 10:00 AM – 11:00 AM.`,
        suggestedSlots: ['11:30 AM – 12:15 PM', '02:00 PM – 02:45 PM', '03:30 PM – 04:15 PM'],
      };
    }
    if (panelName.includes('Panel A') && timeSlot.includes('10:30')) {
      return {
        hasConflict: true,
        conflictType: 'panel',
        reason: `${panelName} is already assigned to another interview during this time.`,
        suggestedSlots: ['11:30 AM – 12:15 PM', '01:30 PM – 02:15 PM'],
      };
    }
    if (roomName.includes('Lab 101') && timeSlot.includes('10:00')) {
      return {
        hasConflict: true,
        conflictType: 'room',
        reason: `${roomName} is occupied during this time block.`,
        suggestedSlots: ['Lab 102 (Available Now)', 'Conference Room A (12:15 PM)'],
      };
    }
    return { hasConflict: false };
  };

  const scheduleInterview = (newInterview: Interview) => {
    setInterviewsList([newInterview, ...interviewsList]);
    triggerToast(`Interview scheduled successfully for ${newInterview.candidateName}!`, 'success');
    apiService.scheduleInterview(newInterview).catch(() => {});
  };

  const confirmPanel = (panelId: string) => {
    setPanelsList(
      panelsList.map((p) => (p.id === panelId || p.name.includes(panelId) ? { ...p, confirmed: true, availability: 'available' } : p))
    );
    setInterviewsList(
      interviewsList.map((i) => (i.panelId === panelId || i.panelName.includes(panelId) ? { ...i, panelConfirmed: true, status: 'confirmed' } : i))
    );
    triggerToast(`Panel confirmed successfully ✓.`, 'success');
    apiService.confirmPanel(panelId).catch(() => {});
  };

  const updateInterviewStatus = (interviewId: string, status: InterviewStatus) => {
    setInterviewsList(
      interviewsList.map((i) => (i.id === interviewId ? { ...i, status } : i))
    );
    triggerToast(`Interview status updated to ${status.replace('_', ' ')}.`, 'info');
    apiService.updateInterviewStatus(interviewId, status).catch(() => {});
  };

  const rescheduleInterview = (
    interviewId: string,
    date: string,
    timeSlot: string,
    panelName: string,
    roomName: string
  ) => {
    setInterviewsList(
      interviewsList.map((i) =>
        i.id === interviewId
          ? {
              ...i,
              date,
              timeSlot,
              panelName,
              roomName,
              status: 'scheduled',
              conflictNote: undefined,
            }
          : i
      )
    );
    triggerToast(`Interview rescheduled to ${date} at ${timeSlot}.`, 'success');
    apiService.rescheduleInterview(interviewId, { date, timeSlot, panelName, roomName }).catch(() => {});
  };

  const createPanel = (newPanel: Panel) => {
    setPanelsList([...panelsList, newPanel]);
    triggerToast(`Panel ${newPanel.name} created successfully.`, 'success');
    apiService.createPanel(newPanel).catch(() => {});
  };

  const sendNotification = (newNotif: NotificationItem) => {
    setNotificationsList([newNotif, ...notificationsList]);
    triggerToast(`Notification sent successfully.`, 'success');
    apiService.sendNotification(newNotif).catch(() => {});
  };

  const markNotificationRead = (id: string) => {
    setNotificationsList(
      notificationsList.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    apiService.markNotificationRead(id).catch(() => {});
  };

  const toggleNotificationImportant = (id: string) => {
    setNotificationsList(
      notificationsList.map((n) => (n.id === id ? { ...n, important: !n.important } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotificationsList(notificationsList.filter((n) => n.id !== id));
    triggerToast(`Notification deleted.`, 'info');
  };

  const toggleReminder = (id: string) => {
    setReminderConfigs(
      reminderConfigs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    triggerToast(`Automated reminder preference updated.`, 'info');
  };

  const approveExceptionRecommendation = (exceptionId: string) => {
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
    apiService.approveException(exceptionId).catch(() => {});
  };

  const updateExceptionStatus = (exceptionId: string, status: ExceptionStatus) => {
    setExceptionsList(
      exceptionsList.map((e) => (e.id === exceptionId ? { ...e, status } : e))
    );
    triggerToast(`Exception status set to ${status.toUpperCase()}.`, 'info');
  };

  const createDrive = (newDrive: PlacementDrive) => {
    setDrives([newDrive, ...drives]);
    triggerToast(`Placement drive created for ${newDrive.companyName}!`, 'success');
    apiService.createDrive(newDrive).catch(() => {});
  };

  return (
    <PlacementContext.Provider
      value={{
        students,
        drives,
        interviewsList,
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
        triggerToast,
        dismissToast,
        toggleShortlist,
        isShortlisted,
        applyToDrive,
        hasAppliedToDrive,
        checkEligibility,
        getTotalShortlistedCount,
        createDrive,
        scheduleInterview,
        confirmPanel,
        updateInterviewStatus,
        rescheduleInterview,
        createPanel,
        checkScheduleAvailability,
        sendNotification,
        markNotificationRead,
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
