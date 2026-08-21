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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Schedule Interview Slot</h3>
              <p className="text-xs text-slate-400">Automated venue, candidate & panel availability verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recruiter Company</label>
              <select
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white cursor-pointer font-medium"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.companyName}>
                    {d.companyName} ({d.roleTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate</label>
              <select
                value={candidateName}
                onChange={(e) => {
                  setCandidateName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white cursor-pointer font-medium"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Round</label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value as InterviewRound)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
              >
                <option value="Online Assessment">Online Assessment</option>
                <option value="Technical Interview">Technical Interview</option>
                <option value="HR Interview">HR Interview</option>
                <option value="Final Interview">Final Interview</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
              >
                <option value="Today">Today</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="2026-08-28">2026-08-28</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
                placeholder="10:30 AM"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Panel</label>
              <select
                value={panelName}
                onChange={(e) => {
                  setPanelName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
              >
                {panelsList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.companyName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Venue Room</label>
              <select
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setHasCheckedAvailability(false);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
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
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-900">⚠ Scheduling Conflict Detected</h4>
                  <p className="text-rose-800 mt-0.5 leading-relaxed">{conflictData.reason}</p>
                </div>
              </div>

              {/* SMART RECOMMENDATIONS SECTION */}
              <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Recommended Alternative Available Slots
                </span>
                <div className="space-y-1.5">
                  {(conflictData.suggestedSlots || ['11:30 AM – 12:15 PM', '02:00 PM – 02:45 PM']).map((slot) => (
                    <div
                      key={slot}
                      className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{slot}</span>
                        <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-semibold mt-0.5">
                          <span>✓ Candidate available</span>
                          <span>✓ Panel available</span>
                          <span>✓ Room available</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseRecommendedSlot(slot)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-brand-600 text-white rounded hover:bg-brand-500 transition-colors"
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
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ All schedules verified. Candidate, Panel, and Room are available at {startTime}.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
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
