import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  Users,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  BookOpen,
  Building2,
  Search,
  Info,
  CheckCircle2,
  Layers,
  Download,
  Printer,
  RefreshCw,
  Award,
  DollarSign,
  Briefcase,
  FileCheck,
  CalendarCheck,
  ArrowRight,
  Filter,
  CheckCircle,
  Clock,
  Target,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { SkillGap } from '../../types';
import { SkillDetailDrawer } from '../../components/analytics/SkillDetailDrawer';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

export const SkillAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { drives } = usePlacement();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedDriveId, setSelectedDriveId] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [driveSearch, setDriveSearch] = useState('');
  const [selectedSkillGap, setSelectedSkillGap] = useState<SkillGap | null>(null);

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {};
      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedGradYear !== 'all') params.grad_year = selectedGradYear;
      if (selectedDriveId !== 'all') params.drive_id = selectedDriveId;
      if (selectedDateRange !== 'all') params.date_range = selectedDateRange;

      const res = await apiService.getAnalyticsOverview(params);
      if (res) {
        setData(res);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err?.response?.data?.detail || 'Failed to load live database analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, selectedGradYear, selectedDriveId, selectedDateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = async () => {
    try {
      const params: Record<string, any> = {};
      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedGradYear !== 'all') params.grad_year = selectedGradYear;
      if (selectedDriveId !== 'all') params.drive_id = selectedDriveId;
      if (selectedDateRange !== 'all') params.date_range = selectedDateRange;

      const blob = await apiService.downloadAnalyticsCsv(params);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PlaceMind_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const kpis = data?.kpis || {};
  const perf = data?.performance_metrics || {};
  const funnel = data?.funnel || [];
  const driveBreakdown = data?.drive_breakdown || [];
  const branchBreakdown = data?.branch_breakdown || [];
  const companyBreakdown = data?.company_breakdown || [];
  const trends = data?.trends || [];
  const skillsAnalytics = data?.skills_analytics || {};

  const filteredDrives = driveBreakdown.filter((d: any) =>
    (d.company_name || '').toLowerCase().includes(driveSearch.toLowerCase()) ||
    (d.role_title || '').toLowerCase().includes(driveSearch.toLowerCase())
  );

  const readinessMetrics = [
    { category: 'Ready', studentCount: skillsAnalytics.studentsReady || 0, fillColor: '#10b981' },
    {
      category: 'Almost Ready',
      studentCount: Math.max(0, (kpis.total_students || 0) - (skillsAnalytics.studentsReady || 0) - (skillsAnalytics.studentsNeedingImprovement || 0)),
      fillColor: '#3b82f6',
    },
    { category: 'Needs Improvement', studentCount: skillsAnalytics.studentsNeedingImprovement || 0, fillColor: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4 text-[#F8FAFC]">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B2A40] pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-[#3B82F6]" />
            <span>Institutional Placement Analytics &amp; Reports</span>
          </h1>
          <p className="text-xs text-[#CBD5E1] mt-1">
            Real-time database-driven recruitment funnel, compensation statistics, branch comparison, and skill gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrintPdf}
          >
            Print / PDF Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<BookOpen className="w-3.5 h-3.5" />}
            onClick={() => navigate('/admin/copilot')}
          >
            Placement Copilot
          </Button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650] print:hidden">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
          <Filter className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Multi-Dimensional Analytics Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Graduation Batch</label>
            <select
              value={selectedGradYear}
              onChange={(e) => setSelectedGradYear(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Batches</option>
              <option value="2027">Batch 2027</option>
              <option value="2026">Batch 2026</option>
              <option value="2025">Batch 2025</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Target Placement Drive</label>
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Placement Drives</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>{d.companyName} - {d.roleTitle}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Time Window</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Academic Year</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Scope Indicator Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#101D31] border border-[#243650] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#94A3B8] font-bold uppercase text-[10px]">Analytics Scope:</span>
          {selectedDriveId !== 'all' ? (
            <span className="font-bold text-[#60A5FA] bg-[#3B82F6]/15 px-2.5 py-1 rounded-lg border border-[#3B82F6]/30 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
              {drives.find((d) => d.id === selectedDriveId)
                ? `${drives.find((d) => d.id === selectedDriveId)?.companyName} — ${drives.find((d) => d.id === selectedDriveId)?.roleTitle}`
                : `Drive ${selectedDriveId}`}
              <span className="text-[10px] text-[#94A3B8] font-semibold">(Drive-Scoped Live Analytics)</span>
            </span>
          ) : (
            <span className="font-bold text-[#86EFAC] bg-[rgba(34,197,94,0.15)] px-2.5 py-1 rounded-lg border border-[rgba(34,197,94,0.30)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#22C55E]" />
              All Placement Drives
              <span className="text-[10px] text-[#94A3B8] font-semibold">(Institutional Aggregate)</span>
            </span>
          )}
        </div>

        {selectedDriveId !== 'all' && (
          <button
            onClick={() => setSelectedDriveId('all')}
            className="text-[11px] font-bold text-[#94A3B8] hover:text-white underline cursor-pointer"
          >
            Reset to All Drives
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4 text-blue-400" />}
          label="Total Students"
          value={loading ? '...' : `${kpis.total_students || 0}`}
          trend={`${kpis.eligible_students || 0} eligible`}
          trendType="positive"
        />
        <StatCard
          icon={<Building2 className="w-4 h-4 text-emerald-400" />}
          label="Placement Drives"
          value={loading ? '...' : `${kpis.total_drives || 0}`}
          trend={`${kpis.active_drives || 0} active drives`}
          trendType="positive"
        />
        <StatCard
          icon={<FileCheck className="w-4 h-4 text-cyan-400" />}
          label="Applications"
          value={loading ? '...' : `${kpis.total_applications || 0}`}
          trend={`${kpis.shortlisted_candidates || 0} shortlisted`}
          trendType="positive"
        />
        <StatCard
          icon={<CalendarCheck className="w-4 h-4 text-purple-400" />}
          label="Interviews Sched."
          value={loading ? '...' : `${kpis.interviews_scheduled || 0}`}
          trend={`${kpis.interviews_completed || 0} completed`}
          trendType="positive"
        />
        <StatCard
          icon={<Award className="w-4 h-4 text-amber-400" />}
          label="Final Selected"
          value={loading ? '...' : `${kpis.final_selected || 0}`}
          trend={`${kpis.offers_issued || 0} offers issued`}
          trendType="positive"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="Placement Completed"
          value={loading ? '...' : `${kpis.placement_completed || 0}`}
          trend={`${kpis.offers_accepted || 0} offers accepted`}
          trendType="positive"
        />
      </div>

      {/* 2. COMPENSATION & PERFORMANCE HIGHLIGHTS BANNER */}
      <Card className="p-5 bg-gradient-to-r from-[#0E2038] via-[#101D31] to-[#0A1A2F] border-[#243650] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1B2A40]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#38BDF8] px-2.5 py-0.5 rounded bg-[#0284C7]/20 border border-[#0284C7]/40">
              Institutional Performance Metrics
            </span>
            <h2 className="text-base font-bold text-white mt-1.5">Placement Compensation &amp; Conversion Efficiency</h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-[11px] text-[#94A3B8] font-medium">Selection Rate</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {perf.selection_rate !== null && perf.selection_rate !== undefined ? `${perf.selection_rate}%` : 'No data available'}
              </div>
            </div>
            <div className="h-8 w-px bg-[#243650]" />
            <div className="text-right">
              <div className="text-[11px] text-[#94A3B8] font-medium">Offer Acceptance</div>
              <div className="text-base font-black text-cyan-400 font-mono">
                {perf.offer_acceptance_rate !== null && perf.offer_acceptance_rate !== undefined ? `${perf.offer_acceptance_rate}%` : 'No data available'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Highest Package</div>
            <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
              {perf.highest_package_lpa !== null && perf.highest_package_lpa !== undefined ? `${perf.highest_package_lpa} LPA` : 'No data'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Average Package</div>
            <div className="text-lg font-extrabold text-blue-400 font-mono mt-0.5">
              {perf.avg_package_lpa !== null && perf.avg_package_lpa !== undefined ? `${perf.avg_package_lpa} LPA` : 'No data'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Lowest Package</div>
            <div className="text-lg font-extrabold text-slate-300 font-mono mt-0.5">
              {perf.lowest_package_lpa !== null && perf.lowest_package_lpa !== undefined ? `${perf.lowest_package_lpa} LPA` : 'No data'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Avg Applicant CGPA</div>
            <div className="text-lg font-extrabold text-purple-400 font-mono mt-0.5">
              {perf.avg_cgpa_applicants !== null && perf.avg_cgpa_applicants !== undefined ? `${perf.avg_cgpa_applicants}` : 'No data'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Avg Shortlist CGPA</div>
            <div className="text-lg font-extrabold text-indigo-400 font-mono mt-0.5">
              {perf.avg_cgpa_shortlisted !== null && perf.avg_cgpa_shortlisted !== undefined ? `${perf.avg_cgpa_shortlisted}` : 'No data'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1628] border border-[#243650]">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Avg Technical Score</div>
            <div className="text-lg font-extrabold text-amber-400 font-mono mt-0.5">
              {perf.avg_technical_score !== null && perf.avg_technical_score !== undefined ? `${perf.avg_technical_score}%` : 'No data'}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. RECRUITMENT FUNNEL VISUALIZER */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40] flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recruitment &amp; Selection Funnel</CardTitle>
            <p className="text-xs text-[#CBD5E1]">
              Live applicant conversion across recruitment milestones (No double-counting).
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#0B1628] border border-[#243650] text-[#94A3B8]">
            Total Applicants: {kpis.total_applications || 0}
          </span>
        </CardHeader>
        <CardContent className="pt-6">
          {funnel.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8]">No recruitment funnel data available.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {funnel.map((stg: any, idx: number) => (
                <div
                  key={stg.key}
                  className="p-3 rounded-xl bg-[#0B1628] border border-[#243650] flex flex-col justify-between relative group hover:border-[#3B82F6] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-bold uppercase mb-1">
                      <span>Step {idx + 1}</span>
                      <span className="text-emerald-400 font-mono">{stg.conversion_percentage}%</span>
                    </div>
                    <div className="text-xs font-bold text-white leading-tight min-h-[32px]">{stg.label}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1B2A40]">
                    <div className="text-lg font-black text-[#F8FAFC] font-mono">{stg.count}</div>
                    <div className="text-[10px] text-[#94A3B8] font-medium">{stg.percentage_of_total}% of pool</div>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full bg-[#1B2A40] h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(4, stg.percentage_of_total))}%`,
                        backgroundColor: stg.fill || '#3B82F6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. CHARTS ROW 1: BRANCH PLACEMENT RATE & PLACEMENT TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Placement Comparison */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Branch-wise Placement Performance</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Placement percentages and student selections by engineering department</p>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {branchBreakdown.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
                No branch breakdown data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchBreakdown} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A40" />
                  <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip formatter={(value: number, name: string) => [value, name === 'placement_percentage' ? 'Placement %' : 'Placed Students']} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                  <Bar dataKey="applicants" name="Applicants" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="placement_completed" name="Placed" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Placement Activity Timeline Trends */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Placement Activity Timeline &amp; Trends</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Volume of applications, shortlists, and confirmed placements over time</p>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {trends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
                No timeline activity trends available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A40" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#3B82F6" fillOpacity={1} fill="url(#colorApps)" />
                  <Area type="monotone" dataKey="placements" name="Placements" stroke="#10B981" fillOpacity={1} fill="url(#colorPlacements)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. CHARTS ROW 2: SKILL DEMAND & READINESS PROPORTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Skill Demand vs Student Proficiency */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Industry Skill Demand vs Campus Proficiency</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Demanded technical competencies vs student proficiency and placed profile alignment</p>
          </CardHeader>
          <CardContent className="h-72">
            {(skillsAnalytics.skillDemands || []).length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
                No skill demands analytics available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={skillsAnalytics.skillDemands || []} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: '#CBD5E1' }} width={110} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Value']} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                  <Bar dataKey="demandPercent" fill="#3B82F6" name="Industry Demand %" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="proficientPercent" fill="#22C55E" name="Student Proficiency %" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="placedCandidateProficiency" fill="#F59E0B" name="Placed Alignment %" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Readiness Tiers Overview */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Candidate Readiness Tiers</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Placement preparation tier distribution across registered candidates</p>
          </CardHeader>
          <CardContent className="h-72 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={readinessMetrics}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="studentCount"
                  >
                    {readinessMetrics.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fillColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const tierData = payload[0].payload;
                        return (
                          <div className="bg-[#0B1628] border border-[#243650] shadow-2xl rounded-xl p-3 text-xs text-[#F8FAFC] pointer-events-none">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tierData.fillColor }}
                              />
                              <span className="font-bold text-[#F8FAFC] text-xs">
                                {tierData.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#94A3B8] font-medium">
                              Candidate Pool: <span className="font-bold text-[#38BDF8] font-mono">{tierData.studentCount} Students</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {readinessMetrics.map((m: any) => (
                <div key={m.category} className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.fillColor }} />
                    <span className="font-bold text-[#F8FAFC]">{m.category}</span>
                  </div>
                  <span className="font-semibold text-[#CBD5E1]">{m.studentCount} Students</span>
                </div>
              ))}
              <div className="p-2.5 rounded-lg bg-[#0B1628]/60 border border-[#1B2A40] text-[11px] text-[#94A3B8]">
                Average Placement Readiness: <span className="text-white font-bold">{skillsAnalytics.avgPlacementReadiness || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. DRIVE-WISE PERFORMANCE AUDIT TABLE */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1B2A40]">
          <div>
            <CardTitle>Placement Drives Performance Ledger</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Drive-by-drive recruitment tracking across all operational stages</p>
          </div>
          <div className="relative w-full sm:w-64 print:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={driveSearch}
              onChange={(e) => setDriveSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredDrives.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8]">
              No placement drives match the selected filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
              <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
                <tr>
                  <th className="px-4 py-3">Company &amp; Role</th>
                  <th className="px-3 py-3">Package</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Applicants</th>
                  <th className="px-3 py-3 text-center">Shortlisted</th>
                  <th className="px-3 py-3 text-center">Assessment</th>
                  <th className="px-3 py-3 text-center">Interview</th>
                  <th className="px-3 py-3 text-center">Selected</th>
                  <th className="px-3 py-3 text-center">Offers Acc.</th>
                  <th className="px-3 py-3 text-center">Placed</th>
                  <th className="px-4 py-3 text-right">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243650]">
                {filteredDrives.map((d: any) => (
                  <tr key={d.drive_id || d.company_name} className="hover:bg-[#14243B] text-[#F8FAFC]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#F8FAFC]">{d.company_name}</div>
                      <div className="text-[11px] text-[#94A3B8]">{d.role_title}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-emerald-400 font-mono">
                      {d.package_lpa > 0 ? `${d.package_lpa} LPA` : 'N/A'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/30">
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">{d.total_applicants}</td>
                    <td className="px-3 py-3 text-center text-blue-400 font-semibold">{d.shortlisted}</td>
                    <td className="px-3 py-3 text-center text-cyan-400 font-semibold">{d.assessment_qualified}</td>
                    <td className="px-3 py-3 text-center text-purple-400 font-semibold">{d.interview_completed}</td>
                    <td className="px-3 py-3 text-center text-amber-400 font-semibold">{d.selected}</td>
                    <td className="px-3 py-3 text-center text-emerald-400 font-semibold">{d.offers_accepted}</td>
                    <td className="px-3 py-3 text-center text-emerald-400 font-extrabold">{d.placement_completed}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-400 font-mono">
                      {d.conversion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* SKILL DETAIL DRAWER */}
      <SkillDetailDrawer
        skillGap={selectedSkillGap}
        onClose={() => setSelectedSkillGap(null)}
      />
    </div>
  );
};
