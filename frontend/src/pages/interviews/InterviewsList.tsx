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
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Today's Interviews</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">24</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Upcoming</span>
          <div className="text-2xl font-bold text-brand-600 mt-1">18</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Completed</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">42</div>
        </div>
        <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700">Conflicts</span>
          <div className="text-2xl font-bold text-rose-800 mt-1">{conflictsList.length}</div>
        </div>
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700">Pending Confirmation</span>
          <div className="text-2xl font-bold text-amber-800 mt-1">5</div>
        </div>
      </div>

      {/* OPERATIONAL CONFLICT ALERTS STRIP (SECTION 15) */}
      <Card className="p-4 border-rose-200/80 bg-rose-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-xs">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 font-bold shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {conflictsList.length} Scheduling Conflicts Detected
              </h4>
              <p className="text-slate-600 mt-0.5">
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
      <Card className="p-4 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week View
            </button>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Showing Today's Operating Schedule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
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
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Rounds</option>
            <option value="Technical Interview">Technical Interview</option>
            <option value="HR Interview">HR Interview</option>
            <option value="Online Assessment">Online Assessment</option>
          </select>

          <select
            value={panelFilter}
            onChange={(e) => setPanelFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Panels</option>
            <option value="Panel A">Panel A</option>
            <option value="Panel B">Panel B</option>
            <option value="Panel C">Panel C</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Interview Sessions Timeline</CardTitle>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredInterviews.length} slots</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredInterviews.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/interviews/${item.id}`)}
                className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {item.companyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{item.companyName}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.round}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Candidate: <span className="font-bold text-slate-900">{item.candidateName}</span> ({item.candidateRoll})
                    </p>
                    {item.conflictNote && (
                      <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 mt-1 inline-block">
                        ⚠ {item.conflictNote}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs shrink-0 md:self-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> {item.date} — {item.timeSlot}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {item.panelName} ({item.roomName})
                  </span>

                  {/* Panel Confirmation Action */}
                  {item.panelConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
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

                  <ChevronRight className="w-4 h-4 text-slate-400" />
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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl overflow-y-auto space-y-4 border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Active Schedule Conflicts
              </h3>
              <button onClick={() => setShowConflictsDrawer(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {conflictsList.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">{c.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{c.description}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-brand-700">Suggested: {c.suggestedSlot}</span>
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
