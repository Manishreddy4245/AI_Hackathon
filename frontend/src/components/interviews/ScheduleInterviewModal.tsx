import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Check,
  Building2,
  Users,
  MapPin,
  HelpCircle,
  Loader2,
  DoorOpen,
} from 'lucide-react';
import { Interview, InterviewRound, Panel, Room } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDriveId?: string;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  initialDriveId,
}) => {
  const { drives, panelsList: ctxPanels, roomsList: ctxRooms, scheduleInterview, triggerToast } =
    usePlacement();

  const [drivesList, setDrivesList] = useState<any[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [eligibleCandidates, setEligibleCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

  // Panels & Rooms State
  const [panels, setPanels] = useState<Panel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingPanelsRooms, setLoadingPanelsRooms] = useState<boolean>(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  const [round, setRound] = useState<string>('HR Interview');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('10:30 AM');
  const [duration, setDuration] = useState<string>('45 mins');

  // Conflict Checking State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    candidate_available: boolean;
    panel_available: boolean;
    room_available: boolean;
    conflict?: string;
  } | null>(null);

  // Fetch real panels & rooms on open
  useEffect(() => {
    if (isOpen) {
      const defaultDriveId = initialDriveId || (drives.length > 0 ? drives[0].id : '');
      setSelectedDriveId(defaultDriveId);
      setSelectedPanelId('');
      setSelectedRoomId('');
      setHasCheckedAvailability(false);
      setAvailabilityResult(null);

      const loadPanelsAndRooms = async () => {
        setLoadingPanelsRooms(true);
        try {
          const [panelsData, roomsData] = await Promise.all([
            apiService.getPanels().catch(() => []),
            apiService.getRooms().catch(() => []),
          ]);
          setPanels(panelsData && panelsData.length > 0 ? panelsData : ctxPanels);
          setRooms(roomsData && roomsData.length > 0 ? roomsData : ctxRooms);
        } catch (err) {
          console.error('Failed to load panels or rooms:', err);
          setPanels(ctxPanels || []);
          setRooms(ctxRooms || []);
        } finally {
          setLoadingPanelsRooms(false);
        }
      };

      loadPanelsAndRooms();
    }
  }, [isOpen, initialDriveId, drives, ctxPanels, ctxRooms]);

  // Fetch HR-interview-eligible candidates whenever selectedDriveId changes
  useEffect(() => {
    if (!isOpen || !selectedDriveId) {
      setEligibleCandidates([]);
      setSelectedCandidateId('');
      return;
    }

    let isMounted = true;
    const fetchEligibleCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const list = await apiService.getInterviewEligibleCandidates(selectedDriveId);
        if (isMounted) {
          setEligibleCandidates(list || []);
          if (list && list.length > 0) {
            setSelectedCandidateId(list[0].student_id || list[0].id || list[0].application_id);
          } else {
            setSelectedCandidateId('');
          }
        }
      } catch (err) {
        console.error('Failed to load interview-eligible candidates:', err);
        if (isMounted) {
          setEligibleCandidates([]);
          setSelectedCandidateId('');
        }
      } finally {
        if (isMounted) setLoadingCandidates(false);
      }
    };

    fetchEligibleCandidates();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDriveId]);

  if (!isOpen) return null;

  const selectedCandidate = eligibleCandidates.find(
    (c) => (c.student_id || c.id) === selectedCandidateId
  );
  const selectedDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];
  const chosenPanel = panels.find((p) => p.id === selectedPanelId);
  const chosenRoom = rooms.find((r) => r.id === selectedRoomId);

  const handleCheckAvailability = async () => {
    if (!selectedCandidateId || !selectedCandidate) {
      triggerToast('Please select a candidate first.', 'warning');
      return;
    }
    if (!selectedPanelId) {
      triggerToast('Please manually select an Interview Panel before checking availability.', 'warning');
      return;
    }
    if (!selectedRoomId) {
      triggerToast('Please manually select a Venue Room before checking availability.', 'warning');
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const payload = {
        candidate_id: selectedCandidate.student_id || selectedCandidate.id,
        candidate_name: selectedCandidate.name || selectedCandidate.student_name,
        panel_id: selectedPanelId,
        panel_name: chosenPanel?.name,
        room_id: selectedRoomId,
        room_name: chosenRoom?.name,
        date,
        time_slot: `${startTime} – ${duration}`,
        start_time: startTime,
        duration,
      };

      const res = await apiService.checkInterviewAvailability(payload);
      setAvailabilityResult(res);
      setHasCheckedAvailability(true);
    } catch (err: any) {
      console.error('Availability check failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to check availability.';
      triggerToast(msg, 'error');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriveId || !selectedDrive) {
      triggerToast('Please select a valid recruiter company / drive.', 'error');
      return;
    }

    if (!selectedCandidateId || !selectedCandidate) {
      triggerToast('Please select an eligible candidate for HR / Interview scheduling.', 'error');
      return;
    }

    if (!selectedPanelId) {
      triggerToast('Please select an interview panel and venue room before scheduling.', 'error');
      return;
    }

    if (!selectedRoomId) {
      triggerToast('Please select an interview panel and venue room before scheduling.', 'error');
      return;
    }

    const newInt: Interview = {
      id: `int-${Date.now()}`,
      candidateId: selectedCandidate.student_id || selectedCandidate.id,
      candidateName: selectedCandidate.name || selectedCandidate.student_name || 'Candidate',
      candidateRoll: selectedCandidate.rollNumber || selectedCandidate.roll_number || 'N/A',
      companyName: selectedDrive.companyName || 'Company',
      roleTitle: selectedDrive.roleTitle || 'Software Engineer',

      driveId: selectedDrive.id,
      applicationId: selectedCandidate.application_id,
      round: 'HR' as InterviewRound,
      timeSlot: `${startTime} – ${duration}`,
      startTime,
      endTime: '11:15 AM',
      date,
      panelId: selectedPanelId,
      panelName: chosenPanel?.name || 'Interview Panel',
      panelMembers: chosenPanel?.members || [],
      roomId: selectedRoomId,
      roomName: chosenRoom?.name || 'Interview Room',
      status: 'scheduled',
      panelConfirmed: true,
    };

    try {
      await scheduleInterview(newInt);
      onClose();
    } catch (err: any) {
      console.error('Interview scheduling error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden border border-[#243650] max-h-[94vh] sm:max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight truncate">Schedule Interview Slot</h3>
              <p className="text-[10px] sm:text-xs text-[#CBD5E1] truncate">Manual panel and venue room assignment with live availability verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Recruiter Company / Job Drive</label>
              <select
                value={selectedDriveId}
                onChange={(e) => {
                  setSelectedDriveId(e.target.value);
                  setSelectedCandidateId('');
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                {drives.length === 0 && <option value="">No Drives Available</option>}
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} ({d.roleTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Candidate (Technical Qualified)</label>
              <select
                value={selectedCandidateId}
                disabled={!selectedDriveId || loadingCandidates || eligibleCandidates.length === 0}
                onChange={(e) => {
                  setSelectedCandidateId(e.target.value);
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCandidates ? (
                  <option value="">Loading HR-eligible candidates...</option>
                ) : !selectedDriveId ? (
                  <option value="">Select Recruiter Company first</option>
                ) : eligibleCandidates.length === 0 ? (
                  <option value="">No candidates eligible for HR / Interview</option>
                ) : (
                  eligibleCandidates.map((c: any) => (
                    <option key={c.application_id || c.student_id || c.id} value={c.student_id || c.id}>
                      {c.name || c.student_name} ({c.rollNumber || c.roll_number || 'N/A'} &bull; {c.branch || 'CSE'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Interview Round</label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                <option value="HR Interview">HR / Interview Round</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Interview Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg font-bold focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg font-bold focus:outline-none focus:border-[#3B82F6]"
                placeholder="10:30 AM"
              />
            </div>
          </div>

          {/* MANUAL PANEL & VENUE ROOM SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1 flex items-center justify-between">
                <span>Assigned Panel *</span>
                {loadingPanelsRooms && <span className="text-[10px] text-cyan-400">Loading panels...</span>}
              </label>
              <select
                required
                value={selectedPanelId}
                onChange={(e) => {
                  setSelectedPanelId(e.target.value);
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                <option value="">[ Select Interview Panel ▼ ]</option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.companyName ? `(${p.companyName})` : ''} {p.members && p.members.length > 0 ? `• ${p.members.length} members` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1 flex items-center justify-between">
                <span>Assigned Venue Room *</span>
                {loadingPanelsRooms && <span className="text-[10px] text-cyan-400">Loading rooms...</span>}
              </label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setHasCheckedAvailability(false);
                  setAvailabilityResult(null);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                <option value="">[ Select Venue Room ▼ ]</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.building ? `(${r.building})` : ''} {r.capacity ? `• Cap: ${r.capacity}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AVAILABILITY RESULTS PANEL */}
          {hasCheckedAvailability && availabilityResult && !availabilityResult.available && (
            <div className="p-4 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#FCA5A5]">⚠ Scheduling Conflict Detected</h4>
                  <p className="text-[#CBD5E1] mt-0.5 leading-relaxed font-medium">
                    {availabilityResult.conflict || 'Selected candidate, panel, or room is unavailable.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 text-[11px]">
                <span className={availabilityResult.candidate_available ? 'text-[#86EFAC]' : 'text-[#FCA5A5] font-bold'}>
                  {availabilityResult.candidate_available ? '✓ Candidate free' : '✕ Candidate busy'}
                </span>
                <span className={availabilityResult.panel_available ? 'text-[#86EFAC]' : 'text-[#FCA5A5] font-bold'}>
                  {availabilityResult.panel_available ? '✓ Panel free' : '✕ Panel occupied'}
                </span>
                <span className={availabilityResult.room_available ? 'text-[#86EFAC]' : 'text-[#FCA5A5] font-bold'}>
                  {availabilityResult.room_available ? '✓ Room free' : '✕ Room occupied'}
                </span>
              </div>
            </div>
          )}

          {hasCheckedAvailability && availabilityResult && availabilityResult.available && (
            <div className="p-3.5 rounded-xl border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-[#86EFAC] text-xs font-semibold space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <span className="font-bold">✓ All schedules verified available in database</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#A7F3D0] pl-6 font-medium">
                <span>✓ Candidate available</span>
                <span>✓ Panel available</span>
                <span>✓ Room available</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#243650] flex items-center justify-between">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={isCheckingAvailability || !selectedCandidateId || !selectedPanelId || !selectedRoomId}
                icon={isCheckingAvailability ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={handleCheckAvailability}
              >
                {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={
                  !selectedDriveId ||
                  !selectedCandidateId ||
                  !selectedPanelId ||
                  !selectedRoomId ||
                  loadingCandidates ||
                  eligibleCandidates.length === 0
                }
                icon={<Check className="w-3.5 h-3.5" />}
              >
                Schedule Interview
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
