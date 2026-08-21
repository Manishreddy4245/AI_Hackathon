import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  Users,
  Search,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePlacement } from '../../context/PlacementContext';
import { ScheduleInterviewModal } from '../../components/interviews/ScheduleInterviewModal';

export const InterviewsList: React.FC = () => {
  const navigate = useNavigate();
  const { interviewsList, conflictsList, toastNotice, confirmPanel } = usePlacement();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showConflictsDrawer, setShowConflictsDrawer] = useState(false);

  // Filters State
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roundFilter, setRoundFilter] = useState('all');
  const [panelFilter, setPanelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInterviews = interviewsList.filter((item) => {
    const matchesCompany = companyFilter === 'all' || item.companyName.includes(companyFilter);
    const matchesRound = roundFilter === 'all' || item.round === roundFilter;
    const matchesPanel = panelFilter === 'all' || item.panelName === panelFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesCompany && matchesRound && matchesPanel && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Interview Operations"
        subtitle="Coordinate interviews, panels, candidates and venues from one workspace."
        icon={<CalendarCheck className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => alert('New Interview Round template created!')}
            >
              Create Interview Round
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsScheduleModalOpen(true)}
            >
              Schedule Interview
            </Button>
          </div>
        }
      />

      {/* Dynamic Toast Feedback */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CalendarCheck className="w-4 h-4 text-brand-400" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* PIPELINE SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Today's Interviews</span>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">24</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Upcoming</span>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">18</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-black text-[#86EFAC] mt-1">42</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[rgba(239,68,68,0.25)] shadow-sm">
          <span className="text-xs font-bold text-[#FCA5A5] uppercase tracking-wider">Conflicts</span>
          <div className="text-2xl font-black text-[#EF4444] mt-1">{conflictsList.length}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[rgba(245,158,11,0.25)] shadow-sm">
          <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider">Pending Confirmation</span>
          <div className="text-2xl font-black text-[#F59E0B] mt-1">5</div>
        </div>
      </div>

      {/* OPERATIONAL CONFLICT ALERTS STRIP */}
      <Card className="p-4 border-[rgba(239,68,68,0.30)] bg-[#101D31]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border border-[rgba(239,68,68,0.30)] font-bold shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F8FAFC]">
                {conflictsList.length} Scheduling Conflicts Detected
              </h4>
              <p className="text-[#CBD5E1] mt-0.5 font-medium">
                Candidate overlaps, double-booked panels, and room capacity issues require officer review.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowConflictsDrawer(true)}
            className="shrink-0"
          >
            Review Conflicts ({conflictsList.length})
          </Button>
        </div>
      </Card>

      {/* DAY / WEEK VIEW TOGGLE & FILTERS */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1B2A40]">
          <div className="flex items-center gap-1 bg-[#0B1628] p-1 rounded-xl w-fit border border-[#243650]">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-[#3B82F6] text-white shadow-xs' : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'week' ? 'bg-[#3B82F6] text-white shadow-xs' : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              Week View
            </button>
          </div>
          <span className="text-xs text-[#94A3B8] font-semibold">Showing Today's Operating Schedule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Companies</option>
            <option value="TechNova">TechNova Solutions</option>
            <option value="DataSphere">DataSphere Analytics</option>
            <option value="CloudPeak">CloudPeak Systems</option>
            <option value="FinEdge">FinEdge Technologies</option>
          </select>

          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Rounds</option>
            <option value="Technical Interview">Technical Interview</option>
            <option value="HR Interview">HR Interview</option>
            <option value="Online Assessment">Online Assessment</option>
          </select>

          <select
            value={panelFilter}
            onChange={(e) => setPanelFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Panels</option>
            <option value="Panel A">Panel A</option>
            <option value="Panel B">Panel B</option>
            <option value="Panel C">Panel C</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="needs_attention">Needs Attention</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* SCHEDULE TIMELINE LIST */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <CardTitle>Interview Sessions Timeline</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredInterviews.length} slots</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1B2A40]">
            {filteredInterviews.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/interviews/${item.id}`)}
                className="p-4 hover:bg-[#14243B] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    {item.companyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#F8FAFC]">{item.companyName}</h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                        {item.round}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                      Candidate: <span className="font-bold text-[#F8FAFC]">{item.candidateName}</span> ({item.candidateRoll})
                    </p>
                    {item.conflictNote && (
                      <p className="text-[11px] font-bold text-[#FCA5A5] bg-[rgba(239,68,68,0.10)] px-2.5 py-0.5 rounded border border-[rgba(239,68,68,0.25)] mt-1 inline-block">
                        ⚠ {item.conflictNote}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs shrink-0 md:self-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(245,158,11,0.10)] text-[#FCD34D] font-bold border border-[rgba(245,158,11,0.25)]">
                    <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> {item.date} — {item.timeSlot}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14243B] text-[#CBD5E1] font-semibold border border-[#243650]">
                    <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" /> {item.panelName} ({item.roomName})
                  </span>

                  {/* Panel Confirmation Action */}
                  {item.panelConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#86EFAC] bg-[rgba(34,197,94,0.10)] px-2.5 py-1 rounded-lg border border-[rgba(34,197,94,0.25)]">
                      Confirmed ✓
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmPanel(item.panelName);
                      }}
                    >
                      Confirm Panel
                    </Button>
                  )}

                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SCHEDULE INTERVIEW MODAL */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      {/* REVIEW CONFLICTS DRAWER */}
      {showConflictsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0B1628] text-[#F8FAFC] h-full p-6 shadow-[0_12px_35px_rgba(0,0,0,0.5)] overflow-y-auto space-y-4 border-l border-[#243650]">
            <div className="flex items-center justify-between pb-3 border-b border-[#243650]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> Active Schedule Conflicts
              </h3>
              <button onClick={() => setShowConflictsDrawer(false)} className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {conflictsList.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-[rgba(239,68,68,0.30)] bg-[#101D31] space-y-2">
                  <h4 className="text-xs font-bold text-[#FCA5A5] uppercase tracking-wider">{c.title}</h4>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">{c.description}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#60A5FA]">Suggested: {c.suggestedSlot}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        alert(`Conflict resolved! Slot reallocated to ${c.suggestedSlot}.`);
                        setShowConflictsDrawer(false);
                      }}
                    >
                      Resolve Conflict
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
