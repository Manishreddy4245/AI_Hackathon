import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  Code,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Welcome back, Student"
        subtitle="Track your placement journey and discover your best campus recruitment opportunities."
        icon={<GraduationCap className="w-5 h-5 text-white" />}
        action={
          <Button
            variant="primary"
            icon={<Sparkles className="w-4 h-4 text-white" />}
            onClick={() => navigate('/student/resume')}
          >
            Analyze Resume
          </Button>
        }
      />

      {/* MY PLACEMENT READINESS SCORE HERO CARD */}
      <Card className="p-6 bg-[#101D31] border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xl font-black text-[#F8FAFC]">Rahul Verma</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                CSE &bull; Batch 2027
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] font-medium">
              CGPA: <strong className="text-white">8.9</strong> &bull; Registered for Active Drives
            </p>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] shadow-md flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#17253A" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#3B82F6"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset="29"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-black text-[#FFFFFF]">82</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#F8FAFC] block">My Placement Readiness</span>
              <span className="text-[11px] text-[#94A3B8] block">82 / 100 Indicator</span>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 text-[11px] py-1 bg-[#101D31] border-[#243650] text-[#CBD5E1] hover:text-white"
                icon={<ArrowRight className="w-3 h-3" />}
                onClick={() => navigate('/student/skills')}
              >
                View My Skill Gaps
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* GRID: MY STRONG SKILLS, SKILLS TO IMPROVE & RECOMMENDED PREP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strong Skills */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> My Strong Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-3 py-1 rounded-lg bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-xs font-semibold">
              ✓ Python
            </span>
            <span className="px-3 py-1 rounded-lg bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-xs font-semibold">
              ✓ JavaScript
            </span>
            <span className="px-3 py-1 rounded-lg bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-xs font-semibold">
              ✓ SQL
            </span>
          </div>
        </Card>

        {/* Skills to Improve */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> Skills to Improve
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-3 py-1 rounded-lg bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)] text-xs font-semibold">
              ✕ Docker Containerization
            </span>
            <span className="px-3 py-1 rounded-lg bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)] text-xs font-semibold">
              ✕ System Architecture
            </span>
          </div>
        </Card>

        {/* Recommended Preparation */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#06B6D4]" /> Recommended Preparation
          </h3>
          <ul className="text-xs text-[#CBD5E1] space-y-1.5 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" /> Advanced SQL Joins Practice
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" /> Backend REST API Design
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" /> Mock Technical Interview
            </li>
          </ul>
        </Card>
      </div>

      {/* AI RESUME ANALYZER PROMINENT DASHBOARD CARD (AI CARD SURFACE - SECTION 8 & 9) */}
      <Card className="p-6 ai-card-surface text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" /> AI Placement Matcher
              </span>
              <span className="text-xs text-[#94A3B8] font-semibold">&bull; Active Evaluation</span>
            </div>
            <h3 className="text-xl font-black tracking-tight text-[#F8FAFC]">
              AI Resume Analyzer
            </h3>
            <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">
              Upload your resume to discover the best placement opportunities and identify your skill gaps.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-[#94A3B8] block font-semibold">Resume Status</span>
                <span className="text-[#86EFAC] font-bold">Uploaded &amp; Analyzed</span>
              </div>
              <div className="h-6 w-px bg-[#243650]" />
              <div>
                <span className="text-[#94A3B8] block font-semibold">Readiness Score</span>
                <span className="text-white font-bold">82 / 100</span>
              </div>
              <div className="h-6 w-px bg-[#243650]" />
              <div>
                <span className="text-[#94A3B8] block font-semibold">Top Match</span>
                <span className="text-[#60A5FA] font-bold">TechNova (91%)</span>
              </div>
              <div className="h-6 w-px bg-[#243650]" />
              <div>
                <span className="text-[#94A3B8] block font-semibold">Skill Gaps</span>
                <span className="text-[#FCD34D] font-bold">Docker, Power BI</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant="primary"
              className="py-2.5 px-4"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => navigate('/student/resume')}
            >
              Analyze Resume
            </Button>
            <Button
              variant="secondary"
              className="py-2.5 px-4"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/student/resume')}
            >
              View Recommendations
            </Button>
          </div>
        </div>
      </Card>

      {/* QUICK LINKS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]" onClick={() => navigate('/student/resume')}>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">AI Resume Analyzer</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Extract skills &amp; match drives</p>
          </div>
          <Sparkles className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]" onClick={() => navigate('/student/drives')}>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Active Placement Drives</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Explore eligible company drives</p>
          </div>
          <Briefcase className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]" onClick={() => navigate('/student/interviews')}>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">My Interview Schedule</h4>
            <p className="text-xs text-[#94A3B8] font-medium">View upcoming technical slots</p>
          </div>
          <Calendar className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]" onClick={() => navigate('/student/skills')}>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Skill Gap Breakdown</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Target skill requirements</p>
          </div>
          <Code className="w-5 h-5 text-[#3B82F6]" />
        </Card>
      </div>
    </div>
  );
};
