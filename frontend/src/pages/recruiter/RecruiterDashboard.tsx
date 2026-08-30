import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Filter,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  UserCheck,
  UserX,
  FileText,
  Settings,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Briefcase,
  Layers,
  RefreshCw,
  Send,
} from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  PlacementDrive,
  RecruitmentRound,
  CandidateRoundDetail,
  DriveRecruiterDashboardData,
} from '../../types';
import { CreateDriveModal } from '../../components/companies/CreateDriveModal';
import { CreateOfferModal } from '../../components/offers/CreateOfferModal';

export const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const { triggerToast, refreshAllData } = usePlacement();

  // Drives state
  const [recruiterDrives, setRecruiterDrives] = useState<PlacementDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [loadingDrives, setLoadingDrives] = useState<boolean>(true);
  const [isSubmittingDrive, setIsSubmittingDrive] = useState<boolean>(false);

  // Dashboard Data for Selected Drive
  const [dashboardData, setDashboardData] = useState<DriveRecruiterDashboardData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<boolean>(false);

  // Modal States
  const [isCreateDriveOpen, setIsCreateDriveOpen] = useState<boolean>(false);
  const [driveToEdit, setDriveToEdit] = useState<PlacementDrive | null>(null);
  const [activeRoundModal, setActiveRoundModal] = useState<RecruitmentRound | null>(null);
  const [isConfigureRoundsOpen, setIsConfigureRoundsOpen] = useState<boolean>(false);
  const [selectedCandidateForOffer, setSelectedCandidateForOffer] = useState<any | null>(null);


  // Configure Round Form Inputs
  const [newRoundName, setNewRoundName] = useState<string>('');
  const [newRoundType, setNewRoundType] = useState<string>('Technical');
  const [newRoundOrder, setNewRoundOrder] = useState<number>(1);
  const [newRoundIsFinal, setNewRoundIsFinal] = useState<boolean>(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);

  // Action Loading State per Application ID
  const [actionLoadingAppId, setActionLoadingAppId] = useState<string | null>(null);

  // Track drive IDs for which error toasts have already been shown to avoid spam
  const errorToastShownDriveIdRef = useRef<string | null>(null);

  // Fetch placement drives belonging to currently authenticated recruiter
  const loadRecruiterDrives = async () => {
    setLoadingDrives(true);
    try {
      let drivesList: PlacementDrive[] = [];
      try {
        drivesList = await apiService.getMyRecruiterDrives();
      } catch (err) {
        console.warn('getMyRecruiterDrives failed, fallback to getDrives', err);
      }

      if (!drivesList || drivesList.length === 0) {
        const allDrives = await apiService.getDrives();
        if (user) {
          drivesList = allDrives.filter(
            (d) =>
              d.recruiter_id === user.id ||
              (d as any).createdBy === user.id ||
              (user.email && d.recruiter_email === user.email) ||
              (user.companyId && d.companyId === user.companyId)
          );
        }
      }

      setRecruiterDrives(drivesList);

      if (drivesList.length > 0) {
        setSelectedDriveId((prev) => {
          if (prev && drivesList.some((d) => d.id === prev)) return prev;
          return drivesList[0].id;
        });
      } else {
        setSelectedDriveId('');
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Failed to load recruiter drives:', error);
      triggerToast('Failed to load company placement drives.', 'error');
    } finally {
      setLoadingDrives(false);
    }
  };

  // Load pipeline metrics & rounds for selected drive
  const loadDriveMetrics = async (driveId: string) => {
    if (!driveId || driveId === 'undefined' || driveId === 'null') {
      setDashboardData(null);
      setMetricsError(false);
      return;
    }

    setLoadingMetrics(true);
    setMetricsError(false);
    try {
      const data = await apiService.getDriveRecruiterMetrics(driveId);
      setDashboardData(data);
      setMetricsError(false);
      errorToastShownDriveIdRef.current = null;
    } catch (error: any) {
      console.error('Pipeline Metrics Error', {
        driveId,
        status: error?.response?.status,
        response: error?.response?.data,
      });

      setMetricsError(true);

      // Only trigger toast ONCE per failing drive ID
      if (errorToastShownDriveIdRef.current !== driveId) {
        errorToastShownDriveIdRef.current = driveId;
        triggerToast('Could not load drive pipeline metrics. Please click retry.', 'error');
      }
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadRecruiterDrives();
  }, []);

  // Fetch metrics whenever selectedDriveId changes — STABLE DEPENDENCY
  useEffect(() => {
    if (selectedDriveId && selectedDriveId !== 'undefined') {
      loadDriveMetrics(selectedDriveId);
    } else {
      setDashboardData(null);
      setMetricsError(false);
    }
  }, [selectedDriveId]);

  // Handle Candidate Round Action (PASS, REJECT, FINAL_SELECT)
  const handleCandidateAction = async (
    applicationId: string,
    action: 'PASS' | 'REJECT' | 'FINAL_SELECT',
    roundId: string,
    candidateName: string
  ) => {
    setActionLoadingAppId(applicationId);
    try {
      await apiService.executeRoundAction(applicationId, action, roundId);

      let actionText = 'passed to next round';
      if (action === 'REJECT') actionText = 'rejected';
      if (action === 'FINAL_SELECT') actionText = 'finally selected';

      triggerToast(`${candidateName} ${actionText} successfully!`, 'success');

      // Refresh drive metrics & active modal candidates
      if (selectedDriveId) {
        const freshData = await apiService.getDriveRecruiterMetrics(selectedDriveId);
        setDashboardData(freshData);
        if (activeRoundModal) {
          const updatedRound = freshData.rounds.find((r) => r.id === activeRoundModal.id);
          if (updatedRound) setActiveRoundModal(updatedRound);
        }
      }
      refreshAllData();
    } catch (error: any) {
      console.error('Round evaluation failed:', error);
      triggerToast(error?.response?.data?.detail || 'Failed to update candidate status.', 'error');
    } finally {
      setActionLoadingAppId(null);
    }
  };

  // Add / Edit Round in Selected Drive
  const handleSaveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriveId || !newRoundName.trim()) return;

    try {
      if (editingRoundId) {
        await apiService.updateDriveRound(selectedDriveId, editingRoundId, {
          name: newRoundName,
          round_type: newRoundType,
          order: newRoundOrder,
          is_final: newRoundIsFinal,
        });
        triggerToast(`Round '${newRoundName}' updated.`, 'success');
      } else {
        await apiService.createDriveRound(selectedDriveId, {
          name: newRoundName,
          round_type: newRoundType,
          order: newRoundOrder,
          is_final: newRoundIsFinal,
        });
        triggerToast(`Round '${newRoundName}' added to drive.`, 'success');
      }

      setNewRoundName('');
      setEditingRoundId(null);
      loadDriveMetrics(selectedDriveId);
    } catch (error) {
      triggerToast('Failed to save recruitment round.', 'error');
    }
  };

  // Delete Round
  const handleDeleteRound = async (roundId: string) => {
    if (!selectedDriveId) return;
    try {
      await apiService.deleteDriveRound(selectedDriveId, roundId);
      triggerToast('Recruitment round removed.', 'info');
      loadDriveMetrics(selectedDriveId);
    } catch (error: any) {
      triggerToast(error?.response?.data?.detail || 'Failed to delete round.', 'error');
    }
  };

  const selectedDrive = recruiterDrives.find((d) => d.id === selectedDriveId);

  const handleSubmitDriveToOfficer = async () => {
    if (!selectedDriveId) return;
    setIsSubmittingDrive(true);
    try {
      await apiService.submitDriveToOfficer(selectedDriveId);
      triggerToast('Drive successfully submitted to Placement Officer for review!', 'success');
      await loadRecruiterDrives();
    } catch (err: any) {
      triggerToast(err?.response?.data?.detail || 'Failed to submit drive to officer.', 'error');
    } finally {
      setIsSubmittingDrive(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner & Drive Filter */}
      <div className="bg-[#101D31] p-6 rounded-2xl border border-[#243650] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.25)] text-[#FCD34D] text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5 text-[#F59E0B]" /> Company Recruiter Workspace
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Recruiter Command Center</h1>
          <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
            Manage company placement drives, applicant pipeline, round-wise evaluations, and live candidate selections.
          </p>
        </div>

        {/* Right Action Bar: Drive Selector + Create Drive */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0B1628] p-2 rounded-xl border border-[#243650]">
            <Filter className="w-4 h-4 text-[#3B82F6] ml-1" />
            {loadingDrives ? (
              <span className="text-xs text-[#94A3B8] px-2 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading drives...
              </span>
            ) : recruiterDrives.length > 0 ? (
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#F8FAFC] focus:outline-none cursor-pointer pr-2 max-w-[260px] truncate"
              >
                {recruiterDrives.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0B1628] text-[#F8FAFC]">
                    {d.companyName} — {d.roleTitle}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-[#FCA5A5] px-2">
                No placement drives created yet
              </span>
            )}
          </div>

          {selectedDriveId && (
            <button
              onClick={async () => {
                let targetDrive: any = recruiterDrives.find((d) => d.id === selectedDriveId) || dashboardData?.drive || selectedDrive;
                if (!targetDrive && selectedDriveId) {
                  try {
                    targetDrive = await apiService.getDrive(selectedDriveId);
                  } catch (err) {
                    console.warn('Failed to fetch drive by id', err);
                  }
                }
                if (targetDrive) {
                  setDriveToEdit(targetDrive);
                  setIsCreateDriveOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#FCD34D] border border-[rgba(245,158,11,0.30)] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#F59E0B]" /> Edit Drive
            </button>
          )}

          <button
            onClick={() => {
              setDriveToEdit(null);
              setIsCreateDriveOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Placement Drive
          </button>
        </div>
      </div>


      {/* Empty State when Recruiter has 0 drives */}
      {!loadingDrives && recruiterDrives.length === 0 && (
        <div className="bg-[#101D31] p-10 rounded-2xl border border-[#243650] text-center text-[#CBD5E1] space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#F8FAFC]">No Placement Drives Created Yet</h3>
          <p className="text-xs max-w-md mx-auto text-[#94A3B8]">
            You have not posted any campus recruitment drives under your recruiter account. Submit a new drive requirements specification to begin candidate screening and round-wise hiring.
          </p>
          <button
            onClick={() => setIsCreateDriveOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Post Your First Placement Drive
          </button>
        </div>
      )}

      {/* API ERROR / RETRY BANNER */}
      {selectedDriveId && metricsError && (
        <div className="p-5 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[#FCA5A5] shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[#EF4444] shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[#F8FAFC]">Could not load drive pipeline metrics</h4>
              <p className="text-xs text-[#CBD5E1]">
                Failed to fetch live applicant data for this drive. Please click retry to make another request.
              </p>
            </div>
          </div>
          <button
            onClick={() => loadDriveMetrics(selectedDriveId)}
            className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Request
          </button>
        </div>
      )}

      {/* Selected Drive Metrics & Pipeline */}
      {selectedDriveId && (
        <>
          {/* Drive Lifecycle Status Banner */}
          <div className="p-4 bg-[#101D31] rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Drive Status:</div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize flex items-center gap-1.5 ${
                  (selectedDrive?.status || '').toUpperCase() === 'ACTIVE' || (selectedDrive?.status || '').toUpperCase() === 'ANNOUNCED'
                    ? 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border border-[rgba(34,197,94,0.3)]'
                    : (selectedDrive?.status || '').toUpperCase() === 'SUBMITTED_TO_OFFICER' || (selectedDrive?.status || '').toUpperCase() === 'PENDING_APPROVAL'
                    ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]'
                    : (selectedDrive?.status || '').toUpperCase() === 'CHANGES_REQUESTED'
                    ? 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border border-[rgba(245,158,11,0.3)]'
                    : (selectedDrive?.status || '').toUpperCase() === 'REJECTED'
                    ? 'bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border border-[rgba(239,68,68,0.3)]'
                    : 'bg-[#1E293B] text-[#CBD5E1] border border-[#334155]'
                }`}
              >
                {(selectedDrive?.status || '').toUpperCase() === 'ACTIVE' || (selectedDrive?.status || '').toUpperCase() === 'ANNOUNCED'
                  ? '● Live / Approved'
                  : (selectedDrive?.status || '').toUpperCase() === 'SUBMITTED_TO_OFFICER' || (selectedDrive?.status || '').toUpperCase() === 'PENDING_APPROVAL'
                  ? '⏳ Submitted to Placement Officer'
                  : (selectedDrive?.status || '').toUpperCase() === 'CHANGES_REQUESTED'
                  ? '⚠️ Adjustments Requested'
                  : (selectedDrive?.status || '').toUpperCase() === 'REJECTED'
                  ? '✕ Rejected by Placement Cell'
                  : '📝 Draft (Private)'}
              </span>
            </div>

            {/* Quick Action: Send to Officer if DRAFT or CHANGES_REQUESTED */}
            {((selectedDrive?.status || '').toUpperCase() === 'DRAFT' ||
              (selectedDrive?.status || '').toUpperCase() === 'CHANGES_REQUESTED') && (
              <button
                onClick={handleSubmitDriveToOfficer}
                disabled={isSubmittingDrive}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {(selectedDrive?.status || '').toUpperCase() === 'CHANGES_REQUESTED'
                  ? 'Resubmit to Placement Officer'
                  : 'Send to Placement Officer'}
              </button>
            )}
          </div>

          {/* Officer Feedback Notice Card if changes requested or rejected */}
          {Boolean(selectedDrive?.changes_feedback || (selectedDrive as any)?.changesFeedback) && (selectedDrive?.status || '').toUpperCase() === 'CHANGES_REQUESTED' && (
            <div className="p-4 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] rounded-2xl flex items-start gap-3 text-[#FCD34D]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">Placement Cell Requested Adjustments</h4>
                <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                  {selectedDrive?.changes_feedback || (selectedDrive as any)?.changesFeedback}
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  Click "Edit Drive" to adjust requirements or criteria, then click "Resubmit to Placement Officer".
                </p>
              </div>
            </div>
          )}

          {Boolean(selectedDrive?.rejection_reason || (selectedDrive as any)?.rejectionReason) && (selectedDrive?.status || '').toUpperCase() === 'REJECTED' && (
            <div className="p-4 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-2xl flex items-start gap-3 text-[#FCA5A5]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#EF4444]" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">Placement Cell Rejection Note</h4>
                <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                  {selectedDrive?.rejection_reason || (selectedDrive as any)?.rejectionReason}
                </p>
              </div>
            </div>
          )}
          {/* Drive Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Drive Role &amp; Package</div>
              <div className="text-lg font-bold text-[#F8FAFC] mt-1 truncate">
                {selectedDrive?.roleTitle || dashboardData?.metrics?.roleTitle || 'Role TBD'}
              </div>
              <div className="text-xs font-bold text-[#86EFAC] mt-0.5">
                {selectedDrive?.packageLpa ? `₹${selectedDrive.packageLpa} LPA` : dashboardData?.metrics?.packageText || 'Not specified'} &bull; {selectedDrive?.location || dashboardData?.metrics?.location || 'Location TBD'}
              </div>
            </div>

            <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Total Registered</div>
              <div className="text-2xl font-black text-[#F8FAFC] mt-1">
                {loadingMetrics ? <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" /> : dashboardData?.metrics?.registeredCount ?? 0}
              </div>
              <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">Campus candidates applied</div>
            </div>

            <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Shortlisted</div>
              <div className="text-2xl font-black text-[#3B82F6] mt-1">
                {loadingMetrics ? <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" /> : dashboardData?.metrics?.shortlistedCount ?? 0}
              </div>
              <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">In interview pipeline</div>
            </div>

            <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Selections Made</div>
              <div className="text-2xl font-black text-[#86EFAC] mt-1">
                {loadingMetrics ? <Loader2 className="w-5 h-5 animate-spin text-[#86EFAC]" /> : dashboardData?.metrics?.selectedCount ?? 0}
              </div>
              <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">Final candidate selections</div>
            </div>
          </div>

          {/* Scheduled Interviews Section */}
          <div className="bg-[#101D31] rounded-2xl border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] overflow-hidden text-[#F8FAFC]">
            <div className="p-5 border-b border-[#243650] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">Scheduled Interviews &amp; Candidates</h3>
                <p className="text-xs text-[#CBD5E1]">
                  Live interview slots scheduled for {selectedDrive?.companyName || 'this drive'} — {selectedDrive?.roleTitle}
                </p>
              </div>
              <span className="px-3 py-1 bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] text-xs font-bold rounded-full">
                {dashboardData?.interviews?.length || 0} Slots Scheduled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14243B] text-[#CBD5E1] uppercase tracking-wider font-bold border-b border-[#243650]">
                  <tr>
                    <th className="p-3.5 pl-5">Candidate</th>
                    <th className="p-3.5">Roll Number</th>
                    <th className="p-3.5">Round</th>
                    <th className="p-3.5">Time Slot &amp; Venue</th>
                    <th className="p-3.5">Panel Assigned</th>
                    <th className="p-3.5 pr-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243650] font-medium text-[#F8FAFC]">
                  {dashboardData && dashboardData.interviews.length > 0 ? (
                    dashboardData.interviews.map((intSlot) => (
                      <tr key={intSlot.id} className="hover:bg-[#14243B] transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-[#F8FAFC] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {intSlot.candidateName.charAt(0)}
                          </div>
                          <span>{intSlot.candidateName}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[#CBD5E1]">{intSlot.candidateRoll}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1628] text-[#CBD5E1] border border-[#243650]">
                            {intSlot.round}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#F8FAFC]">{intSlot.timeSlot}</div>
                          <div className="text-[11px] text-[#94A3B8]">{intSlot.roomName}</div>
                        </td>
                        <td className="p-3.5 font-bold text-[#F8FAFC]">{intSlot.panelName}</td>
                        <td className="p-3.5 pr-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                              intSlot.status === 'completed'
                                ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]'
                                : intSlot.status === 'cancelled'
                                ? 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)]'
                                : 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]'
                            }`}
                          >
                            {intSlot.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                        {loadingMetrics ? 'Loading scheduled interviews...' : 'No interviews scheduled yet for this drive.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recruitment Pipeline Section */}
          <div className="bg-[#101D31] p-6 rounded-2xl border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] text-[#F8FAFC] space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#243650] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#3B82F6]" /> Recruitment Pipeline — Round-wise Workflow
                </h3>
                <p className="text-xs text-[#CBD5E1] mt-0.5">
                  Evaluate candidates round by round. Candidates must pass each round sequentially to advance to final selection.
                </p>
              </div>

              <button
                onClick={() => setIsConfigureRoundsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1628] hover:bg-[#14243B] text-[#CBD5E1] border border-[#243650] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#3B82F6]" /> Configure Rounds
              </button>
            </div>

            {/* Round Pipeline Cards Grid */}
            {dashboardData && dashboardData.rounds && dashboardData.rounds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardData.rounds.map((rnd, idx) => (
                  <div
                    key={rnd.id}
                    className="bg-[#0B1628] p-4 rounded-xl border border-[#243650] flex flex-col justify-between space-y-4 hover:border-[#3B82F6]/50 transition-all shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(59,130,246,0.1)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]">
                          {rnd.round_type || 'Technical'}
                        </span>
                        {rnd.is_final && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border border-[rgba(34,197,94,0.3)]">
                            Final Round
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-[#F8FAFC] line-clamp-1">{rnd.name}</h4>
                      {rnd.description && (
                        <p className="text-[11px] text-[#94A3B8] line-clamp-2">{rnd.description}</p>
                      )}
                    </div>

                    {/* Round Candidates Count Breakdown */}
                    <div className="space-y-2 pt-2 border-t border-[#243650]/60">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#101D31] p-2 rounded-lg border border-[#243650]/50 text-center">
                          <div className="text-[10px] text-[#94A3B8] font-bold uppercase">Total</div>
                          <div className="text-base font-black text-[#F8FAFC]">{rnd.candidates_count || 0}</div>
                        </div>
                        <div className="bg-[#101D31] p-2 rounded-lg border border-[#243650]/50 text-center">
                          <div className="text-[10px] text-[#86EFAC] font-bold uppercase">Passed</div>
                          <div className="text-base font-black text-[#86EFAC]">{rnd.passed_count || 0}</div>
                        </div>
                        <div className="bg-[#101D31] p-2 rounded-lg border border-[#243650]/50 text-center">
                          <div className="text-[10px] text-[#FCA5A5] font-bold uppercase">Rejected</div>
                          <div className="text-base font-black text-[#FCA5A5]">{rnd.rejected_count || 0}</div>
                        </div>
                        <div className="bg-[#101D31] p-2 rounded-lg border border-[#243650]/50 text-center">
                          <div className="text-[10px] text-[#FCD34D] font-bold uppercase">Pending</div>
                          <div className="text-base font-black text-[#FCD34D]">{rnd.pending_count || 0}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveRoundModal(rnd)}
                        className="w-full py-2 bg-[#14243B] hover:bg-[#3B82F6] text-[#CBD5E1] hover:text-white border border-[#243650] hover:border-[#3B82F6] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        View Candidates <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Final Selections Summary Card */}
                <div className="bg-[rgba(34,197,94,0.05)] p-4 rounded-xl border border-[rgba(34,197,94,0.25)] flex flex-col justify-between space-y-4 text-[#F8FAFC]">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#86EFAC]">
                      <Award className="w-4 h-4 text-[#22C55E]" /> Final Selections
                    </div>
                    <h4 className="text-sm font-bold text-[#F8FAFC]">Selected Candidates</h4>
                    <p className="text-[11px] text-[#CBD5E1]">
                      Candidates who successfully passed all recruitment rounds.
                    </p>
                  </div>

                  <div className="bg-[#101D31] p-4 rounded-xl border border-[rgba(34,197,94,0.25)] text-center space-y-1">
                    <div className="text-3xl font-black text-[#86EFAC]">
                      {dashboardData.metrics.selectedCount}
                    </div>
                    <div className="text-xs font-bold text-[#CBD5E1]">Confirmed Selections</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#94A3B8] space-y-2 bg-[#0B1628] rounded-xl border border-[#243650]">
                <Layers className="w-8 h-8 mx-auto text-[#94A3B8]" />
                <p className="text-xs">No recruitment rounds configured yet for this drive.</p>
                <button
                  onClick={() => setIsConfigureRoundsOpen(true)}
                  className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Configure Recruitment Rounds
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: VIEW ROUND CANDIDATES & EVALUATION */}
      {activeRoundModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#101D31] rounded-2xl border border-[#243650] w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl text-[#F8FAFC] my-auto">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#243650] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]">
                  {activeRoundModal.round_type || 'Round'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] mt-1 truncate">
                  {activeRoundModal.name} — Candidates List
                </h3>
                <p className="text-[10px] sm:text-xs text-[#CBD5E1] truncate">
                  Evaluate candidates entering this round. Select action to pass to next round or reject.
                </p>
              </div>
              <button
                onClick={() => setActiveRoundModal(null)}
                aria-label="Close"
                className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#14243B] transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidates Table */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 min-h-0">
              {activeRoundModal.candidates && activeRoundModal.candidates.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[#243650]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#14243B] text-[#CBD5E1] uppercase tracking-wider font-bold border-b border-[#243650]">
                      <tr>
                        <th className="p-3 pl-4">Candidate</th>
                        <th className="p-3">Roll &amp; Branch</th>
                        <th className="p-3">CGPA</th>
                        <th className="p-3">Skills</th>
                        <th className="p-3">Round Status</th>
                        <th className="p-3 pr-4 text-right">Recruiter Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243650] font-medium text-[#F8FAFC]">
                      {activeRoundModal.candidates.map((cand) => (
                        <tr key={cand.application_id} className="hover:bg-[#14243B]/60 transition-colors">
                          <td className="p-3 pl-4 font-bold text-[#F8FAFC]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white font-bold flex items-center justify-center text-xs">
                                {cand.student_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-[#F8FAFC]">{cand.student_name}</div>
                                <div className="text-[11px] text-[#94A3B8]">{cand.student_email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-mono font-bold text-[#F8FAFC]">{cand.rollNumber}</div>
                            <div className="text-[11px] text-[#CBD5E1]">{cand.branch}</div>
                          </td>

                          <td className="p-3 font-bold text-[#86EFAC]">{cand.cgpa}</td>

                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {cand.skills && cand.skills.length > 0 ? (
                                cand.skills.slice(0, 3).map((sk, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-[#0B1628] text-[10px] text-[#CBD5E1] border border-[#243650]">
                                    {sk}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#94A3B8]">N/A</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                                cand.round_status === 'PASSED'
                                  ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]'
                                  : cand.round_status === 'REJECTED'
                                  ? 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)]'
                                  : 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]'
                              }`}
                            >
                              {cand.round_status}
                            </span>
                          </td>

                          <td className="p-3 pr-4 text-right space-x-1.5">
                            {actionLoadingAppId === cand.application_id ? (
                              <span className="text-xs text-[#94A3B8] inline-flex items-center gap-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                              </span>
                            ) : (
                              <>
                                {activeRoundModal.is_final ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleCandidateAction(cand.application_id, 'FINAL_SELECT', activeRoundModal.id, cand.student_name)
                                      }
                                      disabled={cand.round_status === 'PASSED'}
                                      className="px-2.5 py-1 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Final Select
                                    </button>
                                    {cand.round_status === 'PASSED' && (
                                      <button
                                        onClick={() => {
                                          setSelectedCandidateForOffer({
                                            id: cand.application_id,
                                            application_id: cand.application_id,
                                            student_id: cand.student_id,
                                            student_name: cand.student_name,
                                            drive_id: selectedDriveId,
                                            company_name: selectedDrive?.companyName,
                                            job_title: selectedDrive?.roleTitle,
                                            package_lpa: selectedDrive?.packageLpa,
                                          });
                                        }}
                                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                      >
                                        <Award className="w-3 h-3" /> Issue Offer
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleCandidateAction(cand.application_id, 'PASS', activeRoundModal.id, cand.student_name)
                                    }
                                    disabled={cand.round_status === 'PASSED'}
                                    className="px-2.5 py-1 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Pass to Next Round
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    handleCandidateAction(cand.application_id, 'REJECT', activeRoundModal.id, cand.student_name)
                                  }
                                  disabled={cand.round_status === 'REJECTED'}
                                  className="px-2.5 py-1 bg-[#14243B] hover:bg-[rgba(239,68,68,0.20)] text-[#CBD5E1] hover:text-[#FCA5A5] border border-[#243650] disabled:opacity-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-[#94A3B8] space-y-2 bg-[#0B1628] rounded-xl border border-[#243650]">
                  <Users className="w-8 h-8 mx-auto text-[#94A3B8]" />
                  <p className="text-xs">No candidates currently active in this round.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE RECRUITMENT ROUNDS */}
      {isConfigureRoundsOpen && selectedDrive && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#101D31] rounded-2xl border border-[#243650] w-full max-w-2xl p-6 space-y-6 shadow-2xl text-[#F8FAFC]">
            <div className="flex items-center justify-between border-b border-[#243650] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">Configure Recruitment Rounds</h3>
                <p className="text-xs text-[#CBD5E1]">
                  Customize hiring workflow for {selectedDrive.companyName} — {selectedDrive.roleTitle}
                </p>
              </div>
              <button
                onClick={() => setIsConfigureRoundsOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#14243B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Rounds List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Configured Drive Rounds</h4>
              {dashboardData?.rounds && dashboardData.rounds.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.rounds.map((r, i) => (
                    <div
                      key={r.id}
                      className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#14243B] text-[#CBD5E1] font-bold flex items-center justify-center text-xs border border-[#243650]">
                          {r.order || i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-[#F8FAFC] flex items-center gap-2">
                            {r.name}
                            {r.is_final && (
                              <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-[rgba(34,197,94,0.15)] text-[#86EFAC]">
                                Final Round
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">{r.round_type}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRoundId(r.id);
                            setNewRoundName(r.name);
                            setNewRoundType(r.round_type);
                            setNewRoundOrder(r.order);
                            setNewRoundIsFinal(r.is_final);
                          }}
                          className="p-1.5 text-[#60A5FA] hover:bg-[#14243B] rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRound(r.id)}
                          className="p-1.5 text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.15)] rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8]">No rounds configured yet.</p>
              )}
            </div>

            {/* Add / Edit Round Form */}
            <form onSubmit={handleSaveRound} className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] space-y-4">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                {editingRoundId ? 'Edit Recruitment Round' : 'Add New Round'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#CBD5E1] font-bold mb-1">Round Name</label>
                  <input
                    type="text"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    placeholder="e.g. Technical Interview Round 1"
                    className="w-full p-2.5 bg-[#101D31] text-[#F8FAFC] border border-[#243650] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#CBD5E1] font-bold mb-1">Round Type</label>
                  <select
                    value={newRoundType}
                    onChange={(e) => setNewRoundType(e.target.value)}
                    className="w-full p-2.5 bg-[#101D31] text-[#F8FAFC] border border-[#243650] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="Aptitude">Aptitude / Screening</option>
                    <option value="Technical">Technical Interview</option>
                    <option value="Coding">Coding Assessment</option>
                    <option value="HR">HR &amp; Behavioral</option>
                    <option value="GD">Group Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#CBD5E1] font-bold mb-1">Round Order Sequence</label>
                  <input
                    type="number"
                    min="1"
                    value={newRoundOrder}
                    onChange={(e) => setNewRoundOrder(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#101D31] text-[#F8FAFC] border border-[#243650] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#F8FAFC]">
                    <input
                      type="checkbox"
                      checked={newRoundIsFinal}
                      onChange={(e) => setNewRoundIsFinal(e.target.checked)}
                      className="w-4 h-4 accent-[#3B82F6] rounded"
                    />
                    Set as Final Selection Round
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingRoundId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoundId(null);
                      setNewRoundName('');
                    }}
                    className="px-3 py-1.5 text-xs text-[#CBD5E1] hover:text-white"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {editingRoundId ? 'Update Round' : 'Add Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DRIVE MODAL */}
      <CreateDriveModal
        isOpen={isCreateDriveOpen}
        onClose={() => {
          setIsCreateDriveOpen(false);
          setDriveToEdit(null);
        }}
        initialDrive={driveToEdit}
        onDriveUpdated={async (updatedDrive) => {
          setIsCreateDriveOpen(false);
          setDriveToEdit(null);
          triggerToast(`Placement drive '${updatedDrive.companyName} - ${updatedDrive.roleTitle}' updated!`, 'success');
          await loadRecruiterDrives();
          setSelectedDriveId(updatedDrive.id);
        }}
        onDriveCreated={async (newDrive) => {
          setIsCreateDriveOpen(false);
          setDriveToEdit(null);
          triggerToast(`Placement drive '${newDrive.roleTitle}' created!`, 'success');
          await loadRecruiterDrives();
          setSelectedDriveId(newDrive.id);
        }}
      />

      {/* ISSUE OFFICIAL OFFER MODAL */}
      <CreateOfferModal
        isOpen={!!selectedCandidateForOffer}
        onClose={() => setSelectedCandidateForOffer(null)}
        candidate={selectedCandidateForOffer}
        onOfferIssued={() => {
          if (selectedDriveId) loadDriveMetrics(selectedDriveId);
          refreshAllData();
        }}
      />
    </div>
  );
};

