import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  Users,
  CheckCircle2,
  UserCheck,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Edit3,
  Check,
  X,
  Play,
  Bot,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mockDrives } from '../../data/mockData';
import { PlacementDrive } from '../../types';

export const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find drive by ID or fallback to first drive
  const initialDrive = mockDrives.find((d) => d.id === id) || mockDrives[0];
  const [drive, setDrive] = useState<PlacementDrive>(initialDrive);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Editable Skill Tags state
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [newRequiredSkill, setNewRequiredSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');

  const triggerAction = (message: string) => {
    setActionNotice(message);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAddRequiredSkill = () => {
    if (newRequiredSkill.trim() && !drive.requiredSkills.includes(newRequiredSkill.trim())) {
      setDrive({
        ...drive,
        requiredSkills: [...drive.requiredSkills, newRequiredSkill.trim()],
      });
      setNewRequiredSkill('');
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    setDrive({
      ...drive,
      requiredSkills: drive.requiredSkills.filter((s) => s !== skill),
    });
  };

  const handleAddPreferredSkill = () => {
    if (newPreferredSkill.trim() && !drive.preferredSkills.includes(newPreferredSkill.trim())) {
      setDrive({
        ...drive,
        preferredSkills: [...drive.preferredSkills, newPreferredSkill.trim()],
      });
      setNewPreferredSkill('');
    }
  };

  const handleRemovePreferredSkill = (skill: string) => {
    setDrive({
      ...drive,
      preferredSkills: drive.preferredSkills.filter((s) => s !== skill),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back Navigation & Page Header */}
      <PageHeader
        title={`${drive.companyName} — ${drive.roleTitle}`}
        subtitle="Detailed drive requirements, placement pipeline, and AI candidate matching."
        icon={<Building2 className="w-5 h-5" />}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/companies')}
          >
            Back to Companies
          </Button>
        }
      />

      {/* Dynamic Action Toast Feedback */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DRIVE OVERVIEW BANNER CARD */}
      <Card className="p-6 border-[#243650] bg-[#101D31] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
              {drive.companyLogo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#F8FAFC] tracking-tight">{drive.companyName}</h2>
                <StatusBadge status={drive.status} />
                {drive.aiConfirmed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                    <Sparkles className="w-3 h-3 text-[#06B6D4]" /> AI JD Parser
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[#CBD5E1] mt-1">
                {drive.roleTitle} &bull; <span className="text-[#94A3B8]">{drive.employmentType}</span>
              </p>
              <div className="flex items-center gap-4 text-xs text-[#CBD5E1] mt-3 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> {drive.location}
                </span>
                <span className="flex items-center gap-1 text-[#86EFAC] font-bold">
                  <Briefcase className="w-3.5 h-3.5 text-[#22C55E]" /> ₹{drive.packageLpa} LPA
                </span>
                <span className="flex items-center gap-1 text-[#FCD34D] font-bold">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Deadline: {drive.deadline}
                </span>
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => triggerAction(`Eligibility check run for ${drive.companyName}: 180 students qualify.`)}
            >
              Check Eligibility
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />}
              onClick={() => {
                triggerAction(`AI Candidate Matching launched for ${drive.roleTitle}.`);
                navigate('/matching');
              }}
            >
              Run AI Matching
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Calendar className="w-3.5 h-3.5" />}
              onClick={() => {
                triggerAction(`Navigating to Interview Scheduler for ${drive.companyName}.`);
                navigate('/interviews');
              }}
            >
              Schedule Interviews
            </Button>
          </div>
        </div>
      </Card>

      {/* PLACEMENT PIPELINE PROGRESSION */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40]">
          <CardTitle>Drive Recruitment Pipeline</CardTitle>
          <p className="text-xs text-[#CBD5E1]">Student transition stages for this drive</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-[#243650] bg-[#0B1628]">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Eligible</span>
              <div className="text-2xl font-black text-[#F8FAFC] mt-1">{drive.pipeline?.eligible || 180}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(59,130,246,0.30)] bg-[rgba(59,130,246,0.10)]">
              <span className="text-[10px] font-bold text-[#60A5FA] uppercase">Applied</span>
              <div className="text-2xl font-black text-[#60A5FA] mt-1">{drive.registeredCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(168,85,247,0.30)] bg-[rgba(168,85,247,0.10)]">
              <span className="text-[10px] font-bold text-[#C084FC] uppercase">Shortlisted</span>
              <div className="text-2xl font-black text-[#C084FC] mt-1">{drive.shortlistedCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)]">
              <span className="text-[10px] font-bold text-[#FCD34D] uppercase">Interview</span>
              <div className="text-2xl font-black text-[#FCD34D] mt-1">{drive.pipeline?.interview || 12}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)]">
              <span className="text-[10px] font-bold text-[#86EFAC] uppercase">Selected</span>
              <div className="text-2xl font-black text-[#86EFAC] mt-1">{drive.selectedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRID: JOB REQUIREMENTS & AI INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* JOB REQUIREMENTS (2 cols) */}
        <Card className="lg:col-span-2 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
            <div>
              <CardTitle>Job Requirements &amp; Criteria</CardTitle>
              <p className="text-xs text-[#CBD5E1]">Extracted &amp; verified eligibility rules</p>
            </div>
            <Button
              variant={isEditingSkills ? 'primary' : 'outline'}
              size="sm"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditingSkills(!isEditingSkills)}
            >
              {isEditingSkills ? 'Done Editing' : 'Edit Requirements'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Eligibility Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#0B1628] rounded-xl border border-[#243650]">
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Minimum CGPA</span>
                <span className="text-base font-black text-[#F8FAFC]">{drive.minCgpa}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Eligible Branches</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {drive.eligibleBranches.map((b) => (
                    <span key={b} className="text-xs font-semibold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Graduation Batch</span>
                <span className="text-base font-black text-[#F8FAFC]">{drive.graduationYear || 2027}</span>
              </div>
            </div>

            {/* Required Skills Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Required Skills</h4>
              <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-wrap gap-2">
                {drive.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14243B] border border-[#243650] text-[#F8FAFC] text-xs font-bold"
                  >
                    {skill}
                    {isEditingSkills && (
                      <button onClick={() => handleRemoveRequiredSkill(skill)} className="hover:text-[#EF4444] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditingSkills && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add required skill..."
                    value={newRequiredSkill}
                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                    className="text-xs p-2 border border-[#243650] bg-[#0B1628] text-[#F8FAFC] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <Button variant="primary" size="sm" onClick={handleAddRequiredSkill}>
                    + Add
                  </Button>
                </div>
              )}
            </div>

            {/* Preferred Skills Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Preferred Skills</h4>
              <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-wrap gap-2">
                {drive.preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] text-xs font-bold"
                  >
                    {skill}
                    {isEditingSkills && (
                      <button onClick={() => handleRemovePreferredSkill(skill)} className="hover:text-[#EF4444] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditingSkills && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add preferred skill..."
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    className="text-xs p-2 border border-[#243650] bg-[#0B1628] text-[#F8FAFC] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddPreferredSkill}>
                    + Add
                  </Button>
                </div>
              )}
            </div>

            {/* Raw Description Preview */}
            <div className="space-y-1 pt-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Full Job Description</h4>
              <p className="text-xs text-[#CBD5E1] bg-[#0B1628] p-3 rounded-xl border border-[#243650] leading-relaxed font-medium">
                {drive.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI INSIGHTS & RECOMMENDATIONS (1 col) */}
        <Card className="border-[#243650] bg-[#101D31] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#3B82F6] text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <CardTitle>AI Drive Insights</CardTitle>
            </div>
            <p className="text-xs text-[#CBD5E1]">Autonomous student skill match analysis</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top Matching Skills */}
            <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Top Matching Student Skills
              </span>
              <div className="flex flex-wrap gap-1">
                {(drive.aiInsights?.topMatchingSkills || drive.requiredSkills).map((s) => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Common Skill Gaps */}
            <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" /> Common Student Skill Gaps
              </span>
              <div className="flex flex-wrap gap-1">
                {(drive.aiInsights?.commonSkillGaps || ['Docker', 'FastAPI']).map((s) => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Preparation Strategy Advice */}
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#3B82F6]" /> Recommended Action Strategy
              </span>
              <p className="text-xs text-[#CBD5E1] leading-relaxed mt-1 font-medium">
                {drive.aiInsights?.preparationAdvice || 'Schedule a 1-day revision workshop covering REST API standards and database querying.'}
              </p>
            </div>

            {/* AI Summary Box */}
            {drive.aiExplanation && (
              <div className="p-3 bg-[#07111F] text-[#F8FAFC] rounded-xl text-xs space-y-1 border border-[#243650]">
                <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">AI Rationale</span>
                <p className="text-[#CBD5E1] leading-relaxed text-[11px] font-medium">{drive.aiExplanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
