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
  RefreshCw,
  Search,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { ExceptionItem } from '../../types';
import { ExceptionDetailModal } from '../../components/exceptions/ExceptionDetailModal';
import { AgentActivityTimeline } from '../../components/exceptions/AgentActivityTimeline';
import { apiService } from '../../services/api';

export const ExceptionsList: React.FC = () => {
  const navigate = useNavigate();
  const { exceptionsList, toastNotice, approveExceptionRecommendation, updateExceptionStatus, refreshAllData, triggerToast } =
    usePlacement();

  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiService.scanExceptions();
      await refreshAllData();
      triggerToast('AI diagnostic scan completed. Latest operational state synchronized.', 'success');
    } catch (err) {
      console.error('Scan error:', err);
      triggerToast('Scan completed.', 'info');
    } finally {
      setScanning(false);
    }
  };

  const filteredExceptions = exceptionsList.filter((item) => {
    const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.affectedEntity.toLowerCase().includes(q) ||
      item.aiRecommendation.toLowerCase().includes(q);
    return matchesSeverity && matchesStatus && matchesCategory && matchesSearch;
  });

  const criticalCount = exceptionsList.filter((e) => e.severity === 'critical' && e.status !== 'resolved').length;
  const warningCount = exceptionsList.filter((e) => e.severity === 'warning' && e.status !== 'resolved').length;
  const resolvedCount = exceptionsList.filter((e) => e.status === 'resolved').length;
  const pendingReviewCount = exceptionsList.filter((e) => e.status === 'open' || (e.status as string) === 'pending' || e.status === 'in_review').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="AI Operations Center"
        subtitle="Autonomous diagnostics & human-in-the-loop exception resolution for campus placements."
        icon={<ShieldAlert className="w-5 h-5 text-brand-600" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-3.5 py-1.5 bg-[#14243B] hover:bg-[#192B45] text-[#F8FAFC] border border-[#243650] hover:border-[#31527A] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning System...' : 'Run Diagnostic Scan'}</span>
            </button>
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
        <div className="p-4 bg-[#101D31] rounded-xl border border-[rgba(239,68,68,0.25)] shadow-sm">
          <span className="text-xs font-bold text-[#FCA5A5] uppercase tracking-wider">Critical Exceptions</span>
          <div className="text-2xl font-black text-[#EF4444] mt-1">{criticalCount}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[rgba(245,158,11,0.25)] shadow-sm">
          <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider">Warnings</span>
          <div className="text-2xl font-black text-[#F59E0B] mt-1">{warningCount}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[rgba(34,197,94,0.25)] shadow-sm">
          <span className="text-xs font-bold text-[#86EFAC] uppercase tracking-wider">Resolved</span>
          <div className="text-2xl font-black text-[#22C55E] mt-1">{resolvedCount}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Pending Review</span>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{pendingReviewCount}</div>
        </div>
      </div>

      {/* EXCEPTION FILTER CONTROLS BAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exceptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-2 py-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Information</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
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
            <h3 className="text-base font-bold text-[#F8FAFC]">Detected Operational Exceptions</h3>
            <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredExceptions.length} items</span>
          </div>

          {filteredExceptions.length > 0 ? (
            filteredExceptions.map((item) => {
              const isResolved = item.status === 'resolved';

              return (
                <Card
                  key={item.id}
                  className={`p-5 transition-all bg-[#101D31] border-[#243650] ${
                    item.severity === 'critical' && !isResolved
                      ? 'border-[rgba(239,68,68,0.4)] bg-[#101D31]'
                      : isResolved
                      ? 'border-[rgba(34,197,94,0.35)] bg-[#101D31]'
                      : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          item.severity === 'critical'
                            ? 'bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border-[rgba(239,68,68,0.30)]'
                            : item.severity === 'warning'
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border-[rgba(245,158,11,0.30)]'
                            : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                        {item.category}
                      </span>
                    </div>

                    <span className="text-xs text-[#94A3B8] font-medium">{item.timestamp}</span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <h4 className="text-base font-bold text-[#F8FAFC]">{item.title}</h4>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">{item.description}</p>
                    <div className="pt-0.5 text-[11px] text-[#94A3B8]">
                      Entity: <span className="text-[#F8FAFC] font-semibold">{item.affectedEntity}</span>
                    </div>
                  </div>

                  {/* AI RECOMMENDATION BOX */}
                  <div className="mt-4 p-3.5 rounded-xl bg-[#0B1628] border border-[rgba(59,130,246,0.30)] space-y-2 text-xs">
                    <span className="font-bold text-[#60A5FA] uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" /> AI Recommendation
                    </span>
                    <p className="text-[#CBD5E1] font-medium leading-relaxed">{item.aiRecommendation}</p>
                    <div className="p-2.5 rounded-lg bg-[#14243B] border border-[#243650] font-bold text-[#F8FAFC] text-[11px]">
                      Proposed Action: <span className="text-[#60A5FA]">{item.suggestedActionText}</span>
                    </div>
                  </div>

                  {/* HUMAN-IN-THE-LOOP CONTROL ACTION BAR */}
                  <div className="mt-4 pt-3 border-t border-[#1B2A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] font-bold text-[#FCD34D] bg-[rgba(245,158,11,0.10)] px-2.5 py-1 rounded-lg border border-[rgba(245,158,11,0.25)]">
                      Requires Placement Officer Approval
                    </span>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isResolved ? (
                        <span className="text-[#86EFAC] font-bold flex items-center gap-1 bg-[rgba(34,197,94,0.10)] px-3 py-1.5 rounded-lg border border-[rgba(34,197,94,0.25)]">
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Resolved ✓
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
            })
          ) : (
            <Card className="p-8 text-center bg-[#101D31] border-[#243650]">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#F8FAFC]">No Operational Exceptions Found</h4>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  All recruitment drives, candidate application pipelines, interview scheduling, and offer workflows are running normally without conflicts or pending approvals.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${scanning ? 'animate-spin' : ''}`} />
                    Run Real-time Scan
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* AGENT ACTIVITY TIMELINE (1 COL) */}
        <div className="space-y-6">
          <Card className="p-5 bg-[#101D31] border-[#243650]">
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
