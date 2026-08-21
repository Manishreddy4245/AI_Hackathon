import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  ArrowLeft,
  Clock,
  MapPin,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePlacement } from '../../context/PlacementContext';
import { MatchScore } from '../../components/ui/MatchScore';

export const InterviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    interviewsList,
    students,
    panelsList,
    roomsList,
    confirmPanel,
    updateInterviewStatus,
    rescheduleInterview,
  } = usePlacement();

  const interview = interviewsList.find((i) => i.id === id) || interviewsList[0];
  const student = students.find((s) => s.name === interview.candidateName) || students[0];
  const panel = panelsList.find((p) => p.name === interview.panelName) || panelsList[0];

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [reschedDate, setReschedDate] = useState('Tomorrow');
  const [reschedTime, setReschedTime] = useState('11:30 AM – 12:15 PM');
  const [reschedPanel, setReschedPanel] = useState(interview.panelName);
  const [reschedRoom, setReschedRoom] = useState(interview.roomName);

  const handleApplyReschedule = () => {
    rescheduleInterview(interview.id, reschedDate, reschedTime, reschedPanel, reschedRoom);
    setIsRescheduling(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={`Interview Session #${interview.id.substring(0, 6)}`}
        subtitle={`${interview.companyName} — ${interview.round}`}
        icon={<CalendarCheck className="w-5 h-5" />}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/interviews')}
          >
            Back to Interviews
          </Button>
        }
      />

      {/* OVERVIEW HERO BANNER */}
      <Card className="p-6 bg-gradient-to-r from-white via-slate-50 to-brand-50/20 border-brand-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
              {interview.companyName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{interview.companyName}</h2>
                <StatusBadge status={interview.status} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {interview.round} &bull; <span className="text-slate-500">{interview.roleTitle}</span>
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-3 flex-wrap font-medium">
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-bold">
                  <Clock className="w-3.5 h-3.5" /> {interview.date} at {interview.timeSlot}
                </span>
                <span className="flex items-center gap-1 text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 font-semibold">
                  <MapPin className="w-3.5 h-3.5" /> {interview.panelName} ({interview.roomName})
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {interview.status !== 'completed' && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => updateInterviewStatus(interview.id, 'completed')}
              >
                Mark Completed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => setIsRescheduling(true)}
            >
              Reschedule
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => updateInterviewStatus(interview.id, 'cancelled')}
            >
              Cancel Interview
            </Button>
          </div>
        </div>
      </Card>

      {/* GRID: CANDIDATE SUMMARY & PANEL DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Profile Summary */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" /> Candidate Summary
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/candidates/${student.id}`)}>
              Full Profile
            </Button>
          </div>

          <div className="flex items-start gap-4">
            <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
            <div>
              <h4 className="text-base font-bold text-slate-900">{student.name}</h4>
              <p className="text-xs text-slate-500 font-semibold">Roll: {student.rollNumber} &bull; {student.branch}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">CGPA: {student.cgpa}</span>
                <MatchScore score={student.readinessScore || 85} />
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Technical Skills</span>
            <div className="flex flex-wrap gap-1">
              {student.skills.map((s) => (
                <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Panel Members & Confirmation Status */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" /> Assigned Panel & Venue
            </h3>
            {interview.panelConfirmed ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                Confirmed ✓
              </span>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => confirmPanel(interview.panelName)}>
                Confirm Panel
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900">{interview.panelName}</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs font-medium text-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Roster Members</span>
              <ul className="list-disc list-inside space-y-0.5">
                {(panel ? panel.members : ['Dr. Suresh (Lead)', 'Prof. Mehta']).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Venue Room</span>
            <p className="text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              {interview.roomName} (Capacity: 30 seats &bull; Video Conf Enabled)
            </p>
          </div>
        </Card>
      </div>

      {/* RESCHEDULE MODAL DIALOG */}
      {isRescheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md space-y-4 border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reschedule Interview Session</h3>
              <button onClick={() => setIsRescheduling(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Date</label>
                <input
                  type="text"
                  value={reschedDate}
                  onChange={(e) => setReschedDate(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Time Slot</label>
                <input
                  type="text"
                  value={reschedTime}
                  onChange={(e) => setReschedTime(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Change Panel</label>
                <select
                  value={reschedPanel}
                  onChange={(e) => setReschedPanel(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50"
                >
                  {panelsList.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Change Room</label>
                <select
                  value={reschedRoom}
                  onChange={(e) => setReschedRoom(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50"
                >
                  {roomsList.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setIsRescheduling(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyReschedule}>
                Save Rescheduled Slot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
