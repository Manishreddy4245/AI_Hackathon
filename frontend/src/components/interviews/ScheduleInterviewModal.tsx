import React, { useState } from 'react';
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
} from 'lucide-react';
import { Interview, InterviewRound } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { Button } from '../ui/Button';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { drives, students, panelsList, roomsList, scheduleInterview, checkScheduleAvailability } =
    usePlacement();

  const [companyName, setCompanyName] = useState('TechNova Solutions');
  const [candidateName, setCandidateName] = useState('Rahul Verma');
  const [round, setRound] = useState<InterviewRound>('Technical Interview');
  const [date, setDate] = useState('Today');
  const [startTime, setStartTime] = useState('10:30 AM');
  const [duration, setDuration] = useState('45 mins');
  const [panelName, setPanelName] = useState('Panel A');
  const [roomName, setRoomName] = useState('Lab 101');

  // Conflict Checking State
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [conflictData, setConflictData] = useState<{
    hasConflict: boolean;
    conflictType?: 'candidate' | 'panel' | 'room';
    reason?: string;
    suggestedSlots?: string[];
  }>({ hasConflict: false });

  if (!isOpen) return null;

  const handleCheckAvailability = () => {
    const res = checkScheduleAvailability(candidateName, panelName, roomName, startTime);
    setConflictData(res);
    setHasCheckedAvailability(true);
  };

  const handleUseRecommendedSlot = (slot: string) => {
    setStartTime(slot.split(' – ')[0]);
    setConflictData({ hasConflict: false });
    setHasCheckedAvailability(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStudent = students.find((s) => s.name === candidateName) || students[0];

    const newInt: Interview = {
      id: `int-${Date.now()}`,
      candidateId: selectedStudent.id,
      candidateName: selectedStudent.name,
      candidateRoll: selectedStudent.rollNumber,
      companyName,
      roleTitle: 'Backend Developer',
      round,
      timeSlot: `${startTime} – ${duration}`,
      startTime,
      endTime: '11:15 AM',
      date,
      panelName,
      roomName,
      status: 'scheduled',
      panelConfirmed: false,
    };

    scheduleInterview(newInt);
    onClose();
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
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Recruiter Company</label>
              <select
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.companyName}>
                    {d.companyName} ({d.roleTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Candidate</label>
              <select
                value={candidateName}
                onChange={(e) => {
                  setCandidateName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.rollNumber} &bull; {s.branch})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Interview Round</label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value as InterviewRound)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
              >
                <option value="Online Assessment">Online Assessment</option>
                <option value="Technical Interview">Technical Interview</option>
                <option value="HR Interview">HR Interview</option>
                <option value="Final Interview">Final Interview</option>
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
                    {p.name} ({p.companyName})
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
                    {r.name} ({r.building})
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
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-3.5 h-3.5" />}>
                Schedule Interview
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
