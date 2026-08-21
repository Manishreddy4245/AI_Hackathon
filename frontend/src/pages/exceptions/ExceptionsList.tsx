import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Bot,
  Filter,
  Check,
  UserCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { ExceptionItem } from '../../types';
import { ExceptionDetailModal } from '../../components/exceptions/ExceptionDetailModal';
import { AgentActivityTimeline } from '../../components/exceptions/AgentActivityTimeline';

export const ExceptionsList: React.FC = () => {
  const navigate = useNavigate();
  const { exceptionsList, toastNotice, approveExceptionRecommendation, updateExceptionStatus } =
    usePlacement();

  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);

  const filteredExceptions = exceptionsList.filter((item) => {
    const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSeverity && matchesStatus && matchesCategory;
  });

  const criticalCount = exceptionsList.filter((e) => e.severity === 'critical' && e.status !== 'resolved').length;
  const warningCount = exceptionsList.filter((e) => e.severity === 'warning' && e.status !== 'resolved').length;
  const resolvedCount = exceptionsList.filter((e) => e.status === 'resolved').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="AI Operations Center"
        subtitle="Monitor placement operations, detect exceptions and review recommended actions."
        icon={<ShieldAlert className="w-5 h-5 text-brand-600" />}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Operational Agent Online
            </span>
          </div>
        }
      />

      {/* Dynamic Toast Feedback */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* COMMAND CENTER EXCEPTION SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700">Critical Exceptions</span>
          <div className="text-2xl font-bold text-rose-900 mt-1">{criticalCount}</div>
        </div>
        <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700">Warnings</span>
          <div className="text-2xl font-bold text-amber-900 mt-1">{warningCount}</div>
        </div>
        <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700">Resolved</span>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{resolvedCount}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Pending Review</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">6</div>
        </div>
      </div>

      {/* EXCEPTION FILTER CONTROLS BAR */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Information</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Categories</option>
              <option value="scheduling">Scheduling</option>
              <option value="candidate">Candidate</option>
              <option value="panel">Panel</option>
              <option value="room">Room</option>
              <option value="drive">Drive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* GRID: EXCEPTION CARDS & AGENT TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EXCEPTION CARDS LIST (2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Detected Operational Exceptions</h3>
            <span className="text-xs text-slate-500 font-medium">Showing {filteredExceptions.length} items</span>
          </div>

          {filteredExceptions.map((item) => {
            const isResolved = item.status === 'resolved';

            return (
              <Card
                key={item.id}
                className={`p-5 transition-all ${
                  item.severity === 'critical' && !isResolved
                    ? 'border-rose-300 bg-rose-50/10'
                    : isResolved
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                        item.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : item.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-medium">{item.timestamp}</span>
                </div>

                <div className="mt-3 space-y-1">
                  <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.description}</p>
                </div>

                {/* AI RECOMMENDATION BOX */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-brand-900 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" /> AI Recommendation
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">{item.aiRecommendation}</p>
                  <div className="p-2 rounded bg-white border border-slate-200 font-semibold text-slate-900 text-[11px]">
                    Proposed Action: {item.suggestedActionText}
                  </div>
                </div>

                {/* HUMAN-IN-THE-LOOP CONTROL ACTION BAR */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                    Requires Placement Officer Approval
                  </span>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isResolved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Resolved ✓
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateExceptionStatus(item.id, 'ignored')}
                        >
                          Ignore
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedException(item)}
                        >
                          Review Detail
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => approveExceptionRecommendation(item.id)}
                        >
                          Approve Action
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* AGENT ACTIVITY TIMELINE (1 COL) */}
        <div className="space-y-6">
          <Card className="p-5">
            <AgentActivityTimeline />
          </Card>
        </div>
      </div>

      {/* EXCEPTION DETAIL MODAL WITH HUMAN-IN-THE-LOOP APPROVAL */}
      <ExceptionDetailModal
        exception={selectedException}
        onClose={() => setSelectedException(null)}
      />
    </div>
  );
};
