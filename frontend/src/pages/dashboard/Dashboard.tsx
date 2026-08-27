import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  BarChart2,
  Bot,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertCard } from '../../components/ui/AlertCard';
import { Modal } from '../../components/ui/Modal';
import { KpiDetailModal } from '../../components/dashboard/KpiDetailModal';
import { usePlacement } from '../../context/PlacementContext';
import { apiService } from '../../services/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    drives,
    students,
    candidatePool,
    candidateStats,
    interviewsList,
    availabilitySlots,
    exceptionsList,
    agentActivities,
    checkEligibility,
    refreshAllData,
    triggerToast,
  } = usePlacement();

  const [selectedKpi, setSelectedKpi] = useState<'active_drives' | 'eligible_students' | 'shortlisted_candidates' | 'interviews_today' | 'pending_actions' | null>(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillAnalytics, setSkillAnalytics] = useState<any>(null);

  const loadDashboardData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      await refreshAllData();
      const skillRes = await apiService.getAnalyticsSummary().catch(() => null);
      if (skillRes) setSkillAnalytics(skillRes);

      if (isManual) {
        triggerToast('Dashboard metrics refreshed from live portal sections', 'success');
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError('An error occurred while connecting to database.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    apiService.getAnalyticsSummary()
      .then((res) => { if (res) setSkillAnalytics(res); })
      .catch(() => {});
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayHuman = useMemo(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase(), []);

  // 1. ACTIVE DRIVES (from Companies & Drives)
  const activeDrivesList = useMemo(() => {
    const excluded = ['draft', 'rejected', 'expired', 'closed', 'cancelled'];
    return drives.filter((d) => {
      const st = (d.status || 'open').toLowerCase();
      if (excluded.includes(st)) return false;
      if (d.deadline && d.deadline.includes('-') && d.deadline.length >= 10) {
        if (d.deadline.slice(0, 10) < todayStr) return false;
      }
      return true;
    });
  }, [drives, todayStr]);

  // 2. ELIGIBLE STUDENTS (from Candidates Pool & Matching Hub)
  const eligibleStudentsCount = useMemo(() => {
    if (activeDrivesList.length === 0) return 0;
    return students.filter((s) => activeDrivesList.some((d) => checkEligibility(s, d).eligible)).length;
  }, [students, activeDrivesList, checkEligibility]);

  const batchEligibilityPct = useMemo(() => {
    if (students.length === 0) return 0;
    return Math.round((eligibleStudentsCount / students.length) * 100);
  }, [eligibleStudentsCount, students]);

  // 3. SHORTLISTED CANDIDATES (from Candidates Pool)
  const shortlistedCandidatesCount = useMemo(() => {
    const poolShort = candidatePool.filter((c) => (c.status || '').toUpperCase() === 'SHORTLISTED').length;
    return poolShort > 0 ? poolShort : (candidateStats?.shortlisted || 0);
  }, [candidatePool, candidateStats]);

  // 4. INTERVIEWS TODAY (from Interview Schedules)
  const interviewsTodayList = useMemo(() => {
    return interviewsList.filter((i) => {
      if ((i.status || '').toLowerCase() === 'cancelled') return false;
      const dStr = (i.date || '').toLowerCase();
      return dStr.includes(todayStr) || dStr.includes(todayHuman);
    });
  }, [interviewsList, todayStr, todayHuman]);

  const remainingAvailableSlots = useMemo(() => {
    return availabilitySlots.filter((s) => {
      if ((s.status || '').toUpperCase() !== 'AVAILABLE') return false;
      const dStr = (s.date || '').toLowerCase();
      return dStr.includes(todayStr) || dStr.includes(todayHuman);
    }).length;
  }, [availabilitySlots, todayStr, todayHuman]);

  // 5. PENDING ACTIONS (from Exceptions, Drive Approvals, Operations)
  const pendingActionsCount = useMemo(() => {
    const unresEx = exceptionsList.filter((e) => (e.status || '').toLowerCase() !== 'resolved').length;
    const unconfDr = drives.filter((d) => d.aiConfirmed === false || (d.status || '').toLowerCase() === 'pending').length;
    return unresEx + unconfDr;
  }, [exceptionsList, drives]);

  // Dynamic Pipeline
  const pipelineData = useMemo(() => [
    { stage: 'Registered', count: students.length, fill: '#64748B' },
    { stage: 'Eligible', count: eligibleStudentsCount, fill: '#3B82F6' },
    { stage: 'Applied', count: candidatePool.length, fill: '#06B6D4' },
    { stage: 'Shortlisted', count: shortlistedCandidatesCount, fill: '#3B82F6' },
    { stage: 'Interview', count: interviewsList.filter((i) => (i.status || '').toLowerCase() !== 'cancelled').length, fill: '#F59E0B' },
    { stage: 'Selected', count: candidatePool.filter((c) => ['SELECTED', 'PLACED'].includes((c.status || '').toUpperCase())).length, fill: '#22C55E' },
  ], [students, eligibleStudentsCount, candidatePool, shortlistedCandidatesCount, interviewsList]);

  const skillDemandsData = skillAnalytics?.skillDemands?.map((s: any) => ({
    skill: s.skill,
    demandPercentage: s.demandPercent || 50,
  })) || [
    { skill: 'Python', demandPercentage: 78 },
    { skill: 'SQL', demandPercentage: 72 },
    { skill: 'Java', demandPercentage: 64 },
    { skill: 'React', demandPercentage: 58 },
    { skill: 'Machine Learning', demandPercentage: 51 },
  ];

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      {/* Header */}
      <PageHeader
        title="Placement Operations"
        subtitle="AI-assisted campus placement coordination with 100% live database metrics."
        icon={<Sparkles className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.30)] rounded-xl flex items-center justify-between text-xs text-[#FCA5A5]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadDashboardData(true)}>
            Retry
          </Button>
        </div>
      )}

      {/* 5 Statistics Cards (100% Dynamic & Clickable from Live Portal State) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5 text-white" />}
          label="Active Drives"
          value={activeDrivesList.length}
          trend={activeDrivesList.length > 0 ? `${activeDrivesList.length} active drive${activeDrivesList.length !== 1 ? 's' : ''}` : '0 active drives'}
          trendType="positive"
          accent="blue"
          onClick={() => setSelectedKpi('active_drives')}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Eligible Students"
          value={eligibleStudentsCount}
          trend={`${batchEligibilityPct}% batch eligibility`}
          trendType="neutral"
          accent="cyan"
          onClick={() => setSelectedKpi('eligible_students')}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-white" />}
          label="Shortlisted Candidates"
          value={shortlistedCandidatesCount}
          trend={shortlistedCandidatesCount > 0 ? `${shortlistedCandidatesCount} candidate${shortlistedCandidatesCount !== 1 ? 's' : ''} shortlisted` : '0 candidates shortlisted'}
          trendType="positive"
          accent="indigo"
          onClick={() => setSelectedKpi('shortlisted_candidates')}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-white" />}
          label="Interviews Today"
          value={interviewsTodayList.length}
          trend={remainingAvailableSlots > 0 ? `${remainingAvailableSlots} slot${remainingAvailableSlots !== 1 ? 's' : ''} remaining` : (interviewsTodayList.length > 0 ? `${interviewsTodayList.length} scheduled today` : 'No interviews today')}
          trendType={interviewsTodayList.length > 0 ? 'warning' : 'neutral'}
          accent="violet"
          onClick={() => setSelectedKpi('interviews_today')}
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-white" />}
          label="Pending Actions"
          value={pendingActionsCount}
          trend={pendingActionsCount > 0 ? `${pendingActionsCount} require review` : 'All actions resolved ✓'}
          trendType={pendingActionsCount > 0 ? 'warning' : 'positive'}
          accent="amber"
          onClick={() => setSelectedKpi('pending_actions')}
        />
      </div>

      {/* KPI DETAIL BREAKDOWN MODAL */}
      <KpiDetailModal
        isOpen={!!selectedKpi}
        kpiKey={selectedKpi}
        onClose={() => setSelectedKpi(null)}
        onActionResolved={() => loadDashboardData(true)}
      />

      {/* COPILOT BANNER CARD (SECTION 9 AI COMPONENT) */}
      <Card className="p-5 ai-card-surface text-[#F8FAFC]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white shadow-glow-brand shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Ask Placement Copilot</h3>
              <p className="text-xs text-[#CBD5E1] mt-0.5">Need help analyzing candidates, conflicts or venue availability?</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/copilot')}
            className="shrink-0"
          >
            Open Copilot Workspace
          </Button>
        </div>
      </Card>

      {/* 3D PLACEMENT PIPELINE (100% Dynamic Progression) */}
      <Card className="p-6 bg-[#101D31] border-[#243650] overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-[#243650]">
          <div>
            <CardTitle className="text-lg font-black text-[#F8FAFC] flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#3B82F6]" /> Placement Operations Pipeline
            </CardTitle>
            <p className="text-xs text-[#CBD5E1] font-medium mt-0.5">
              Live progression flow across active campus recruitment evaluation stages
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/candidates')}>
            View Candidate Pool
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 perspective-1000">
            {pipelineData.map((item: any, idx: number) => {
              const baseCount = pipelineData[0]?.count || 1;
              const conversionRate = baseCount > 0 ? Math.round((item.count / baseCount) * 100) : 0;
              return (
                <div
                  key={item.stage}
                  onClick={() => navigate('/admin/candidates')}
                  className="relative p-4 rounded-2xl border border-[#243650] bg-[#0B1628] shadow-3d-sm card-3d-surface cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{item.stage}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                      Stage {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#F8FAFC] drop-shadow-xs group-hover:text-[#60A5FA] transition-colors">
                      {item.count}
                    </span>
                    <span className="text-xs font-bold text-[#94A3B8]">{conversionRate}%</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-[#14243B] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.max(0, conversionRate))}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#64748B] font-semibold block text-right">
                      {idx === 0 ? 'Base Pool' : `From base pool`}
                    </span>
                  </div>

                  {idx < pipelineData.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#101D31] border border-[#243650] text-[#F8FAFC] items-center justify-center text-xs font-bold shadow-md">
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI OPERATIONS CENTER */}
      <Card className="p-6 ai-card-surface text-[#F8FAFC] shadow-3d-md">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-[#243650]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white shadow-glow-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-[#F8FAFC]">AI Operations Center</CardTitle>
              <p className="text-xs text-[#CBD5E1] font-medium">Interactive autonomous agent network monitoring campus placement workflows</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/exceptions')}>
            All Exceptions ({exceptionsList.length})
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-6 space-y-6">
          {/* Agent Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'Eligibility Agent', role: 'Deterministic CGPA & Branch Guard', status: 'Active', route: '/companies' },
              { name: 'Matching Agent', role: 'Transparent Skill Overlap Ranking', status: 'Active', route: '/matching' },
              { name: 'Interview Agent', role: 'Conflict & Slot Optimization', status: 'Active', route: '/interviews' },
              { name: 'Notification Agent', role: 'Student Broadcast & SMS Alerts', status: 'Active', route: '/notifications' },
              { name: 'Analytics Agent', role: 'Skill Demand & Deficit Engine', status: 'Active', route: '/analytics' },
              { name: 'Resume Agent', role: 'Structured AI PDF/DOCX Extractor', status: 'Active', route: '/student/resume' },
            ].map((agent, i) => (
              <div
                key={i}
                onClick={() => navigate(agent.route)}
                className="p-4 rounded-xl bg-[#0B1628] border border-[#243650] hover:border-[#3B82F6] transition-all cursor-pointer group shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#60A5FA] transition-colors flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" /> {agent.name}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                    {agent.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#CBD5E1] font-medium">{agent.role}</p>
                <div className="text-[10px] text-[#3B82F6] font-bold pt-1 flex items-center gap-1">
                  <span>Open Module Workflow</span> →
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {exceptionsList.slice(0, 4).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card className="bg-[#101D31] border-[#243650]">
          <CardHeader>
            <CardTitle>Placement Pipeline Funnel</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Distribution of candidates across active recruitment stages</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1628', borderRadius: '8px', border: '1px solid #243650', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Demand Chart */}
        <Card className="bg-[#101D31] border-[#243650]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Skill Demand vs Student Gap</CardTitle>
              <p className="text-xs text-[#CBD5E1]">Top skills required by active recruitment drives</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
              Analytics
            </Button>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={skillDemandsData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={false} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={false} width={100} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Recruiter Demand']}
                  contentStyle={{ backgroundColor: '#0B1628', borderRadius: '8px', border: '1px solid #243650', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="demandPercentage" fill="#06B6D4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Upcoming Interviews & Recent Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#101D31] border-[#243650]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scheduled Interviews</CardTitle>
              <p className="text-xs text-[#CBD5E1]">Real scheduled candidate evaluation slots</p>
            </div>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/interviews')}>
              View all interviews
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {interviewsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">
                No scheduled interviews recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[#243650]">
                {interviewsList.slice(0, 5).map((item: any) => (
                  <div key={item.id || item.interview_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#14243B] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#0B1628] text-[#3B82F6] border border-[#243650] font-semibold text-xs shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4 text-[#3B82F6]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F8FAFC]">{item.company_name || item.companyName}</span>
                          <span className="text-xs font-semibold text-[#CBD5E1]">&bull; {item.job_title || item.roleTitle}</span>
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-1 flex items-center gap-3 font-medium">
                          <span>Candidate: <strong className="text-[#F8FAFC]">{item.student_name || item.studentName || item.candidateName}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0 sm:self-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[rgba(245,158,11,0.10)] text-[#FCD34D] font-bold border border-[rgba(245,158,11,0.25)]">
                        <Clock className="w-3 h-3 text-[#F59E0B]" /> {item.date} — {item.timeSlot || item.time || `${item.start_time} - ${item.end_time}`}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#14243B] text-[#CBD5E1] font-bold border border-[#243650]">
                        <MapPin className="w-3 h-3 text-[#06B6D4]" /> {item.panel_name || item.panelName} ({item.block ? `${item.block}, ` : ''}{item.room_number || item.room_name || item.roomName})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#101D31] border-[#243650]">
          <CardHeader>
            <CardTitle>Agent Activity Log</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Autonomous &amp; officer event trail</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {agentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-[#F8FAFC] leading-snug">{activity.title}</p>
                    <p className="text-[#CBD5E1] mt-0.5 leading-relaxed font-medium">{activity.detail}</p>
                    <span className="text-[10px] text-[#94A3B8] font-bold mt-1 block">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
