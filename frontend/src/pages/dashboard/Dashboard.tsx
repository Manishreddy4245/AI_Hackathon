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
    { stage: 'Registered', count: 480, fill: '#64748B' },
    { stage: 'Eligible', count: 428, fill: '#3B82F6' },
    { stage: 'Applied', count: 310, fill: '#06B6D4' },
    { stage: 'Shortlisted', count: dynamicShortlistedCount, fill: '#3B82F6' },
    { stage: 'Interview', count: 24, fill: '#F59E0B' },
    { stage: 'Selected', count: 18, fill: '#22C55E' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Placement Operations"
        subtitle="AI-assisted campus placement coordination at a glance."
        icon={<Sparkles className="w-5 h-5 text-white" />}
        action={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4 text-white" />}
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

      {/* 3D PLACEMENT PIPELINE */}
      <Card className="p-6 bg-[#101D31] border-[#243650] overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-[#243650]">
          <div>
            <CardTitle className="text-lg font-black text-[#F8FAFC] flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#3B82F6]" /> Placement Operations Pipeline
            </CardTitle>
            <p className="text-xs text-[#CBD5E1] font-medium mt-0.5">
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
                          width: `${conversionRate}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#64748B] font-semibold block text-right">
                      {idx === 0 ? 'Base Pool' : `From previous stage`}
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

      {/* AI OPERATIONS CENTER (SECTION 7 REQUIREMENT) */}
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

      {/* Visual Analytics Charts Section (Recharts - SECTION 30 CHART COLORS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card className="bg-[#101D31] border-[#243650]">
          <CardHeader>
            <CardTitle>Placement Pipeline Funnel</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Distribution of students across active recruitment stages</p>
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
                  {pipelineData.map((entry, index) => (
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
              <p className="text-xs text-[#CBD5E1]">Top skills required by visiting recruiters</p>
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
              <CardTitle>Upcoming Interviews</CardTitle>
              <p className="text-xs text-[#CBD5E1]">Scheduled candidate evaluation slots</p>
            </div>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/interviews')}>
              View all interviews
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#243650]">
              {mockUpcomingInterviews.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#14243B] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0B1628] text-[#3B82F6] border border-[#243650] font-semibold text-xs shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F8FAFC]">{item.companyName}</span>
                        <span className="text-xs font-semibold text-[#CBD5E1]">&bull; {item.roleTitle}</span>
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-1 flex items-center gap-3 font-medium">
                        <span>Candidate: <strong className="text-[#F8FAFC]">{item.candidateName}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 sm:self-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[rgba(245,158,11,0.10)] text-[#FCD34D] font-bold border border-[rgba(245,158,11,0.25)]">
                      <Clock className="w-3 h-3 text-[#F59E0B]" /> {item.date} — {item.timeSlot}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#14243B] text-[#CBD5E1] font-bold border border-[#243650]">
                      <MapPin className="w-3 h-3 text-[#06B6D4]" /> {item.panelName} ({item.roomName})
                    </span>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Modal: Create Placement Drive Demo */}
      <Modal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        title="Create New Placement Drive"
      >
        <form onSubmit={(e) => { e.preventDefault(); setIsDriveModalOpen(false); alert('Drive draft created!'); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g. Nexus AI Labs"
              className="w-full text-xs p-2.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] font-medium"
              defaultValue="TechNova Solutions"
            />
          </div>
          <div className="pt-3 border-t border-[#243650] flex items-center justify-end gap-2">
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
