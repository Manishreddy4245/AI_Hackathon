import React, { useState } from 'react';
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
import {
  mockDashboardStats,
  mockSkillDemand,
  mockUpcomingInterviews,
} from '../../data/mockData';
import { usePlacement } from '../../context/PlacementContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getTotalShortlistedCount, exceptionsList, agentActivities } = usePlacement();
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const dynamicShortlistedCount = getTotalShortlistedCount();
  const openExceptionsCount = exceptionsList.filter((e) => e.status !== 'resolved').length;

  const pipelineData = [
    { stage: 'Registered', count: 480, fill: '#64748b' },
    { stage: 'Eligible', count: 428, fill: '#3b82f6' },
    { stage: 'Applied', count: 310, fill: '#0284c7' },
    { stage: 'Shortlisted', count: dynamicShortlistedCount, fill: '#8b5cf6' },
    { stage: 'Interview', count: 24, fill: '#f59e0b' },
    { stage: 'Selected', count: 18, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Placement Operations"
        subtitle="AI-assisted campus placement coordination at a glance."
        icon={<Sparkles className="w-5 h-5" />}
        action={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsDriveModalOpen(true)}
          >
            Create Placement Drive
          </Button>
        }
      />

      {/* 5 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5 text-white" />}
          label="Active Drives"
          value={mockDashboardStats.activeDrives}
          trend={mockDashboardStats.activeDrivesChange}
          trendType="positive"
          accent="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Eligible Students"
          value={mockDashboardStats.eligibleStudents}
          trend={mockDashboardStats.eligibleStudentsChange}
          trendType="neutral"
          accent="cyan"
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-white" />}
          label="Shortlisted Candidates"
          value={dynamicShortlistedCount}
          trend={mockDashboardStats.shortlistedChange}
          trendType="positive"
          accent="indigo"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-white" />}
          label="Interviews Today"
          value={mockDashboardStats.interviewsToday}
          trend={mockDashboardStats.interviewsChange}
          trendType="warning"
          accent="violet"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-white" />}
          label="Pending Actions"
          value={openExceptionsCount}
          trend={`${openExceptionsCount} require officer review`}
          trendType="warning"
          accent="amber"
        />
      </div>


      {/* ASK PLACEMENT COPILOT HERO CARD (SECTION 20 REQUIREMENT) */}
      <Card className="p-5 border-brand-200 bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-600 text-white shadow-md shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ask Placement Copilot</h3>
              <p className="text-xs text-slate-300 mt-0.5">Need help analyzing candidates, conflicts or venue availability?</p>
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

      {/* 3D PLACEMENT PIPELINE (SECTION 6 REQUIREMENT) */}
      <Card className="p-6 overflow-hidden">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-600" /> Placement Operations Pipeline
            </CardTitle>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Interactive 3D progression flow across active campus recruitment evaluation stages
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/candidates')}>
            View Candidate Pool
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 perspective-1000">
            {pipelineData.map((item, idx) => {
              const conversionRate = Math.round((item.count / pipelineData[0].count) * 100);
              return (
                <div
                  key={item.stage}
                  onClick={() => navigate('/candidates')}
                  className="relative p-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 shadow-3d-sm card-3d-surface cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.stage}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Stage {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 drop-shadow-xs group-hover:text-brand-600 transition-colors">
                      {item.count}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{conversionRate}%</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${conversionRate}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold block text-right">
                      {idx === 0 ? 'Base Pool' : `From previous stage`}
                    </span>
                  </div>

                  {idx < pipelineData.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900 text-white items-center justify-center text-xs font-bold shadow-md">
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI OPERATIONS CENTER (SECTION 7 REQUIREMENT) */}
      <Card className="p-6 border-brand-200/80 bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950 text-white shadow-3d-md">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-white">AI Operations Center</CardTitle>
              <p className="text-xs text-slate-300 font-medium">Interactive autonomous agent network monitoring campus placement workflows</p>
            </div>
          </div>
          <Button variant="brand" size="sm" onClick={() => navigate('/exceptions')}>
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
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/60 transition-all cursor-pointer group shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {agent.name}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {agent.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{agent.role}</p>
                <div className="text-[10px] text-brand-400 font-semibold pt-1 flex items-center gap-1">
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


      {/* Visual Analytics Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Placement Pipeline Funnel</CardTitle>
            <p className="text-xs text-slate-500">Distribution of students across active recruitment stages</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Demand Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Skill Demand vs Student Gap</CardTitle>
              <p className="text-xs text-slate-500">Top skills required by visiting recruiters</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
              Analytics
            </Button>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={mockSkillDemand}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} width={100} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Recruiter Demand']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="demandPercentage" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Upcoming Interviews & Recent Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Interviews</CardTitle>
              <p className="text-xs text-slate-500">Scheduled candidate evaluation slots</p>
            </div>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/interviews')}>
              View all interviews
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {mockUpcomingInterviews.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60 font-semibold text-xs shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.companyName}</span>
                        <span className="text-xs font-medium text-slate-500">&bull; {item.roleTitle}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                        <span className="font-medium text-slate-800">{item.candidateName}</span>
                        <span className="text-slate-400">({item.candidateRoll})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 sm:self-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200/60">
                      <Clock className="w-3 h-3" /> {item.date} — {item.timeSlot}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      <MapPin className="w-3 h-3" /> {item.panelName} ({item.roomName})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Activity Log</CardTitle>
            <p className="text-xs text-slate-500">Autonomous & officer event trail</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {agentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 leading-snug">{activity.title}</p>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">{activity.detail}</p>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Create Placement Drive Demo */}
      <Modal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        title="Create New Placement Drive"
      >
        <form onSubmit={(e) => { e.preventDefault(); setIsDriveModalOpen(false); alert('Drive draft created!'); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g. Nexus AI Labs"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-400"
              defaultValue="TechNova Solutions"
            />
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDriveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Drive
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
