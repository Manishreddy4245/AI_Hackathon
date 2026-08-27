import React, { useState, useEffect } from 'react';
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
import { SkillGap } from '../../types';
import { SkillDetailDrawer } from '../../components/analytics/SkillDetailDrawer';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

export const SkillAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { students, drives } = usePlacement();

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedReadiness, setSelectedReadiness] = useState('all');
  const [selectedSkillGap, setSelectedSkillGap] = useState<SkillGap | null>(null);

  useEffect(() => {
    apiService.getAnalyticsSummary()
      .then((res) => {
        if (res) setAnalyticsData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const readinessMetrics = analyticsData?.readinessMetrics || [];
  const readinessDistribution = analyticsData?.readinessDistribution || [];
  const skillDemands = analyticsData?.skillDemands || [];


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
          value={analyticsData ? `${analyticsData.avgPlacementReadiness || 0}%` : '0%'}
          trend={students.length > 0 ? `${students.length} total candidates` : 'No data'}
          trendType="positive"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          label="Placement Ready"
          value={analyticsData ? `${analyticsData.studentsReady || 0}` : '0'}
          trend="Score >= 80%"
          trendType="positive"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="Needing Improvement"
          value={analyticsData ? `${analyticsData.studentsNeedingImprovement || 0}` : '0'}
          trend="Score < 60%"
          trendType="warning"
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5 text-rose-600" />}
          label="Top Skill Gap"
          value={analyticsData?.topSkillGap || 'None'}
          trend={analyticsData?.topSkillGap && analyticsData.topSkillGap !== 'None' ? 'Highest deficit skill' : 'No gaps identified'}
          trendType="warning"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-brand-600" />}
          label="High-Demand Skill"
          value={analyticsData?.highDemandSkill || 'None'}
          trend="Recruiter requested"
          trendType="positive"
        />
      </div>

      {/* FILTER TOOLBAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
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
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Graduation Year</label>
            <select
              value={selectedGradYear}
              onChange={(e) => setSelectedGradYear(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Batches</option>
              <option value="2027">Batch 2027</option>
              <option value="2026">Batch 2026</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Readiness Level</label>
            <select
              value={selectedReadiness}
              onChange={(e) => setSelectedReadiness(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Readiness Levels</option>
              <option value="Ready">Ready (80%+)</option>
              <option value="Almost Ready">Almost Ready (60-79%)</option>
              <option value="Needs Improvement">Needs Improvement (&lt;60%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Target Company Drive</label>
            <select className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium">
              <option value="all">All Active Placement Drives</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>{d.companyName} - {d.roleTitle}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* GRID: PLACEMENT READINESS OVERVIEW & READINESS SCORE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placement Readiness Donut Chart */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Placement Readiness Overview</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Student qualification proportion across placement readiness tiers</p>
          </CardHeader>
          <CardContent className="h-64 flex flex-col md:flex-row items-center justify-between gap-4">
            {readinessMetrics.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
                No placement readiness data available yet.
              </div>
            ) : (
              <>
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
                      <Tooltip formatter={(value: number) => [`${value} Students`, 'Count']} />
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
                      <span className="font-semibold text-[#CBD5E1]">{m.studentCount} ({m.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Readiness Score Distribution Bar Chart */}
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Readiness Score Distribution</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Number of students within score percentile brackets</p>
          </CardHeader>
          <CardContent className="h-64 space-y-3">
            {readinessDistribution.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
                No readiness score distribution data available yet.
              </div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => [`${value} Students`, 'Count']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {readinessDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MOST REQUESTED SKILLS (HORIZONTAL BAR CHART) */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40]">
          <CardTitle>Most Requested Industry Skills vs Campus Alignment</CardTitle>
          <p className="text-xs text-[#CBD5E1]">Top technical competencies demanded by visiting recruiters</p>
        </CardHeader>
        <CardContent className="h-72">
          {skillDemands.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
              No skill demands analytics available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={skillDemands} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: '#CBD5E1' }} width={120} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Value']} />
                <Bar dataKey="demandPercent" fill="#3B82F6" name="Industry Demand %" radius={[0, 4, 4, 0]} />
                <Bar dataKey="proficientPercent" fill="#22C55E" name="Student Proficiency %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* STUDENTS REQUIRING ATTENTION TABLE */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <div>
            <CardTitle>Student Candidate Profiles</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Placement readiness indicator &amp; preparation guidance</p>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8]">
              No student candidate records found.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
              <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Readiness Indicator</th>
                  <th className="px-4 py-3">Skills</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243650]">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-[#14243B] text-[#F8FAFC]">
                    <td className="px-4 py-3 font-bold text-[#F8FAFC]">{s.name}</td>
                    <td className="px-4 py-3 font-medium text-[#CBD5E1]">{s.branch}</td>
                    <td className="px-4 py-3 font-bold text-[#60A5FA]">{s.readinessScore || 0}%</td>
                    <td className="px-4 py-3 font-semibold text-[#CBD5E1]">{(s.skills || []).join(', ') || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.10)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]">
                        {s.placementStatus || 'unplaced'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* AI PLACEMENT INSIGHTS PANEL */}
      <Card className="p-5 border-[#243650] bg-[#0B1628] text-[#F8FAFC] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1B2A40] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#06B6D4]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC]">AI Placement Insights &amp; Synthesis</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#3B82F6] text-white uppercase">
            AI-generated insight
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {(analyticsData?.insights || [
            { id: '1', text: 'Real-time skill demand insights synthesized directly from MongoDB student and drive records.' }
          ]).map((ins: any) => (
            <div key={ins.id} className="p-3.5 rounded-xl bg-[#101D31] border border-[#243650] space-y-1">
              <p className="text-[#CBD5E1] font-medium leading-relaxed">"{ins.text}"</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#94A3B8] italic pt-1 border-t border-[#1B2A40]">
          * Recommendations support placement preparation and do not determine hiring outcomes.
        </p>
      </Card>

      {/* RECOMMENDED PLACEMENT ACTIONS */}
      <Card className="p-5 space-y-4 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <h3 className="text-base font-bold text-[#F8FAFC]">Recommended Placement Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)] space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border border-[rgba(239,68,68,0.30)]">
              High Priority
            </span>
            <h4 className="font-bold text-[#F8FAFC] text-sm">Organize Technical Workshops</h4>
            <p className="text-[#CBD5E1] font-medium">Affected Candidates: {analyticsData?.studentsNeedingImprovement || 0}</p>
            <p className="text-[11px] text-[#94A3B8]">Reason: High company demand + low proficiency deficit.</p>
            <Button variant="primary" size="sm" className="w-full mt-2" onClick={() => navigate('/candidates')}>
              View Students
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border border-[rgba(245,158,11,0.30)]">
              Medium Priority
            </span>
            <h4 className="font-bold text-[#F8FAFC] text-sm">Conduct Skill Upskilling Session</h4>
            <p className="text-[#CBD5E1] font-medium">Top Deficit: {analyticsData?.topSkillGap || 'None'}</p>
            <p className="text-[11px] text-[#94A3B8]">Reason: Required by active placement drives.</p>
            <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => navigate('/candidates')}>
              Target Students
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] space-y-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
              Medium Priority
            </span>
            <h4 className="font-bold text-[#F8FAFC] text-sm">Mock Technical Interviews</h4>
            <p className="text-[#CBD5E1] font-medium">Affected Students: 64</p>
            <p className="text-[11px] text-[#94A3B8]">Reason: Improve interview confidence before Round 1.</p>
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
