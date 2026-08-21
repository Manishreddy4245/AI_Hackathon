import React, { useState } from 'react';
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
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  mockReadinessMetrics,
  mockReadinessScoreDistribution,
  mockSkillDemands,
  mockCampusSkillGaps,
  mockBranchReadiness,
  mockCompanySkillDemand,
  mockStudentsRequiringAttention,
  mockAIPlacementInsights,
} from '../../data/mockData';
import { SkillGap } from '../../types';
import { SkillDetailDrawer } from '../../components/analytics/SkillDetailDrawer';

export const SkillAnalytics: React.FC = () => {
  const navigate = useNavigate();

  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedReadiness, setSelectedReadiness] = useState('all');
  const [selectedSkillGap, setSelectedSkillGap] = useState<SkillGap | null>(null);

  const filteredStudents = mockStudentsRequiringAttention.filter((s) => {
    const matchesBranch = selectedBranch === 'all' || s.branch.toUpperCase() === selectedBranch.toUpperCase();
    const matchesReadiness = selectedReadiness === 'all' || s.status.toLowerCase() === selectedReadiness.toLowerCase();
    return matchesBranch && matchesReadiness;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Skill Gap & Placement Analytics"
        subtitle="Understand student readiness, industry skill demand and preparation gaps."
        icon={<BarChart2 className="w-5 h-5" />}
        action={
          <Button variant="outline" icon={<BookOpen className="w-4 h-4" />} onClick={() => navigate('/copilot')}>
            Placement Prep Copilot
          </Button>
        }
      />

      {/* TOP 5 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="Avg Placement Readiness"
          value="78%"
          trend="+4% vs last batch"
          trendType="positive"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          label="Placement Ready"
          value="184"
          trend="43% of total batch"
          trendType="positive"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="Needing Improvement"
          value="96"
          trend="22% of total batch"
          trendType="warning"
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5 text-rose-600" />}
          label="Top Skill Gap"
          value="SQL"
          trend="21% deficit across 126 students"
          trendType="warning"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-brand-600" />}
          label="High-Demand Skill"
          value="Python"
          trend="78% recruiter demand"
          trendType="positive"
        />
      </div>

      {/* FILTER TOOLBAR */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Graduation Year</label>
            <select
              value={selectedGradYear}
              onChange={(e) => setSelectedGradYear(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Batches</option>
              <option value="2027">Batch 2027</option>
              <option value="2026">Batch 2026</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Readiness Level</label>
            <select
              value={selectedReadiness}
              onChange={(e) => setSelectedReadiness(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Readiness Levels</option>
              <option value="Ready">Ready (80%+)</option>
              <option value="Almost Ready">Almost Ready (70-79%)</option>
              <option value="Needs Improvement">Needs Improvement (&lt;70%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Company</label>
            <select className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium">
              <option value="all">All Visiting Recruiters</option>
              <option value="technova">TechNova Solutions</option>
              <option value="datasphere">DataSphere Analytics</option>
              <option value="cloudpeak">CloudPeak Systems</option>
            </select>
          </div>
        </div>
      </Card>

      {/* GRID: PLACEMENT READINESS OVERVIEW & READINESS SCORE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placement Readiness Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Placement Readiness Overview</CardTitle>
            <p className="text-xs text-slate-500">Student qualification proportion across placement readiness tiers</p>
          </CardHeader>
          <CardContent className="h-64 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockReadinessMetrics}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="studentCount"
                  >
                    {mockReadinessMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fillColor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} Students`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {mockReadinessMetrics.map((m) => (
                <div key={m.category} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.fillColor }} />
                    <span className="font-bold text-slate-900">{m.category}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{m.studentCount} ({m.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Readiness Score Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Readiness Score Distribution</CardTitle>
            <p className="text-xs text-slate-500">Number of students within score percentile brackets</p>
          </CardHeader>
          <CardContent className="h-64 space-y-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockReadinessScoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [`${value} Students`, 'Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {mockReadinessScoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium leading-relaxed">
              "Most students currently fall between 70–89, indicating a strong base with targeted skill gaps."
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MOST REQUESTED SKILLS (HORIZONTAL BAR CHART) */}
      <Card>
        <CardHeader>
          <CardTitle>Most Requested Industry Skills vs Campus Alignment</CardTitle>
          <p className="text-xs text-slate-500">Top technical competencies demanded by visiting recruiters</p>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={mockSkillDemands} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
              <Tooltip formatter={(value: number) => [`${value}%`, 'Value']} />
              <Bar dataKey="demandPercent" fill="#0284c7" name="Industry Demand %" radius={[0, 4, 4, 0]} />
              <Bar dataKey="proficientPercent" fill="#10b981" name="Student Proficiency %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* CAMPUS SKILL GAPS TABLE / CARDS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campus Skill Gaps & Deficit Breakdown</CardTitle>
            <p className="text-xs text-slate-500">Click any skill item to open deep-dive analytics</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">Click to expand details</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Technical Skill</th>
                <th className="px-4 py-3">Industry Demand</th>
                <th className="px-4 py-3">Student Proficiency</th>
                <th className="px-4 py-3">Skill Deficit Gap</th>
                <th className="px-4 py-3">Affected Students</th>
                <th className="px-4 py-3">Priority Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockCampusSkillGaps.map((sg) => (
                <tr
                  key={sg.skill}
                  onClick={() => setSelectedSkillGap(sg)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-bold text-slate-900">{sg.skill}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{sg.industryDemand}%</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{sg.studentProficiency}%</td>
                  <td className="px-4 py-3 font-bold text-amber-700">{sg.gapPercent}%</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{sg.affectedCount} Candidates</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        sg.priority === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : sg.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {sg.priority} Priority
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs font-bold text-brand-600 hover:text-brand-700">View Detail →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* GRID: BRANCH READINESS & COMPANY SKILL DEMAND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Readiness */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" /> Branch-Wise Placement Readiness
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {mockBranchReadiness.map((b) => (
              <div key={b.branch} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{b.branch}</span>
                  <span className="text-xs font-bold text-brand-600">{b.avgReadiness}% Avg</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>Ready: <strong className="text-emerald-700">{b.readyPercent}%</strong></span>
                  <span>Improvement: <strong className="text-amber-700">{b.needsImprovementPercent}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Company Skill Demand */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" /> Recruiter Skill Demand Matrix
          </h3>
          <div className="space-y-2.5">
            {mockCompanySkillDemand.map((c) => (
              <div key={c.company} className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-xs">{c.company}</span>
                <div className="flex flex-wrap gap-1">
                  {c.skills.map((s) => (
                    <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* STUDENTS REQUIRING ATTENTION TABLE */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Students Requiring Preparation Attention</CardTitle>
            <p className="text-xs text-slate-500">Placement readiness indicator & preparation guidance</p>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded">
            Non-binding Guidance
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Readiness Indicator</th>
                <th className="px-4 py-3">Top Skill Gap</th>
                <th className="px-4 py-3">Recommended Preparation</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{s.branch}</td>
                  <td className="px-4 py-3 font-bold text-brand-600">{s.readinessScore}%</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{s.topSkillGap}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.recommendedAction}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* AI PLACEMENT INSIGHTS PANEL (SECTION 11 REQUIREMENT) */}
      <Card className="p-5 border-brand-200 bg-gradient-to-br from-slate-900 to-slate-850 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">AI Placement Insights & Synthesis</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-brand-600 text-white uppercase">
            AI-generated insight
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {mockAIPlacementInsights.map((ins) => (
            <div key={ins.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <p className="text-slate-200 font-medium leading-relaxed">"{ins.text}"</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
          * Recommendations support placement preparation and do not determine hiring outcomes.
        </p>
      </Card>

      {/* RECOMMENDED PLACEMENT ACTIONS (SECTION 12 REQUIREMENT) */}
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Recommended Placement Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              High Priority
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Organize SQL Workshop</h4>
            <p className="text-slate-600 font-medium">Affected Students: 126</p>
            <p className="text-[11px] text-slate-500">Reason: High company demand + low proficiency deficit.</p>
            <Button variant="primary" size="sm" className="w-full mt-2" onClick={() => navigate('/candidates')}>
              View Students
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              Medium Priority
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Conduct Docker Session</h4>
            <p className="text-slate-600 font-medium">Affected Students: 82</p>
            <p className="text-[11px] text-slate-500">Reason: Required by TechNova & CloudPeak drives.</p>
            <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => setSelectedSkillGap(mockCampusSkillGaps[1])}>
              View Skill Gap
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Medium Priority
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Mock Technical Interviews</h4>
            <p className="text-slate-600 font-medium">Affected Students: 64</p>
            <p className="text-[11px] text-slate-500">Reason: Improve interview confidence before Round 1.</p>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/interviews')}>
              Schedule Interviews
            </Button>
          </div>
        </div>
      </Card>

      {/* SKILL DETAIL DRAWER */}
      <SkillDetailDrawer
        skillGap={selectedSkillGap}
        onClose={() => setSelectedSkillGap(null)}
      />
    </div>
  );
};
