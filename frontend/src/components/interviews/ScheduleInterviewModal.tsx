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
} from 'lucide-react';
import { Interview, InterviewRound } from '../../types';
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
  const { drives, panelsList, roomsList, scheduleInterview, checkScheduleAvailability, triggerToast } =
    usePlacement();

  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [eligibleCandidates, setEligibleCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

  const [round, setRound] = useState<string>('HR Interview');
  const [date, setDate] = useState('Today');
  const [startTime, setStartTime] = useState('10:30 AM');
  const [duration, setDuration] = useState('45 mins');
  const [panelName, setPanelName] = useState('');
  const [roomName, setRoomName] = useState('');

  // Conflict Checking State
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [conflictData, setConflictData] = useState<{
    hasConflict: boolean;
    conflictType?: 'candidate' | 'panel' | 'room';
    reason?: string;
    suggestedSlots?: string[];
  }>({ hasConflict: false });

  // Initialize selectedDriveId, panel, room when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultDriveId = initialDriveId || (drives.length > 0 ? drives[0].id : '');
      setSelectedDriveId(defaultDriveId);
      if (panelsList.length > 0) setPanelName(panelsList[0].name);
      if (roomsList.length > 0) setRoomName(roomsList[0].name);
      setHasCheckedAvailability(false);
    }
  }, [isOpen, initialDriveId, drives, panelsList, roomsList]);

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

  const handleCheckAvailability = () => {
    const candName = selectedCandidate?.name || selectedCandidate?.student_name || '';
    const res = checkScheduleAvailability(candName, panelName, roomName, startTime);
    setConflictData(res);
    setHasCheckedAvailability(true);
  };

  const handleUseRecommendedSlot = (slot: string) => {
    setStartTime(slot.split(' – ')[0]);
    setConflictData({ hasConflict: false });
    setHasCheckedAvailability(true);
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
      panelName: panelName || (panelsList[0]?.name || 'HR Panel'),
      roomName: roomName || (roomsList[0]?.name || 'Main Venue'),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden border border-[#243650] my-6 animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Schedule Interview Slot</h3>
              <p className="text-xs text-[#CBD5E1]">Automated venue, candidate &amp; panel availability verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Recruiter Company / Job Drive</label>
              <select
                value={selectedDriveId}
                onChange={(e) => {
                  setSelectedDriveId(e.target.value);
                  setSelectedCandidateId('');
                  setHasCheckedAvailability(false);
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
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Date</label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                <option value="Today">Today</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="2026-08-28">2026-08-28</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg font-bold focus:outline-none focus:border-[#3B82F6]"
                placeholder="10:30 AM"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Assigned Panel</label>
              <select
                value={panelName}
                onChange={(e) => {
                  setPanelName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                {panelsList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.companyName || 'General Panel'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Assigned Venue Room</label>
              <select
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                {roomsList.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.building || (r as any).block || 'Main Building'})
                  </option>
                ))}
              </select>
            </div>
          </div>


          {/* CONFLICT WARNING & SMART RECOMMENDATIONS PANEL */}
          {hasCheckedAvailability && conflictData.hasConflict && (
            <div className="p-4 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#FCA5A5]">⚠ Scheduling Conflict Detected</h4>
                  <p className="text-[#CBD5E1] mt-0.5 leading-relaxed font-medium">{conflictData.reason}</p>
                </div>
              </div>

              {/* SMART RECOMMENDATIONS SECTION */}
              <div className="p-3 bg-[#101D31] rounded-lg border border-[#243650] space-y-2 text-xs">
                <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" /> Recommended Alternative Available Slots
                </span>
                <div className="space-y-1.5">
                  {(conflictData.suggestedSlots || ['11:30 AM – 12:15 PM', '02:00 PM – 02:45 PM']).map((slot) => (
                    <div
                      key={slot}
                      className="p-2 rounded bg-[#0B1628] border border-[#243650] flex items-center justify-between gap-2 text-[#F8FAFC]"
                    >
                      <div>
                        <span className="font-bold text-[#F8FAFC]">{slot}</span>
                        <div className="flex items-center gap-2 text-[10px] text-[#86EFAC] font-semibold mt-0.5">
                          <span>✓ Candidate available</span>
                          <span>✓ Panel available</span>
                          <span>✓ Room available</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseRecommendedSlot(slot)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#3B82F6] text-white rounded hover:bg-[#60A5FA] transition-colors cursor-pointer"
                      >
                        Use this slot
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasCheckedAvailability && !conflictData.hasConflict && (
            <div className="p-3 rounded-xl border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-[#86EFAC] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>✓ All schedules verified. Candidate, Panel, and Room are available at {startTime}.</span>
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
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={handleCheckAvailability}
              >
                Check Availability
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!selectedDriveId || !selectedCandidateId || loadingCandidates || eligibleCandidates.length === 0}
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

