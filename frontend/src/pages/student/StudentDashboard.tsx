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
            variant="brand"
            icon={<Sparkles className="w-4 h-4 text-white" />}
            onClick={() => navigate('/student/resume')}
          >
            Analyze Resume
          </Button>
        }
      />

      {/* MY PLACEMENT READINESS SCORE HERO CARD */}
      <Card className="p-6 bg-slate-900/90 border-slate-800/90 shadow-3d-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h2 className="text-xl font-black text-white">Rahul Verma</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                CSE &bull; Batch 2027
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              CGPA: <strong className="text-white">8.9</strong> &bull; Registered for Active Drives
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-md flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#3b82f6"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset="29"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-black text-white">82</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">My Placement Readiness</span>
              <span className="text-[11px] text-slate-400 block">82 / 100 Indicator</span>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 text-[11px] py-1 bg-slate-900 border-slate-700 text-slate-200 hover:text-white"
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
        <Card className="p-5 space-y-3 bg-slate-900/90 border-slate-800/90">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> My Strong Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
              ✓ Python
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
              ✓ JavaScript
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
              ✓ SQL
            </span>
          </div>
        </Card>

        {/* Skills to Improve */}
        <Card className="p-5 space-y-3 bg-slate-900/90 border-slate-800/90">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Skills to Improve
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-3 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold">
              ✕ Docker Containerization
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold">
              ✕ System Architecture
            </span>
          </div>
        </Card>

        {/* Recommended Preparation */}
        <Card className="p-5 space-y-3 bg-slate-900/90 border-slate-800/90">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-400" /> Recommended Preparation
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Advanced SQL Joins Practice
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Backend REST API Design
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Mock Technical Interview
            </li>
          </ul>
        </Card>
      </div>

      {/* AI RESUME ANALYZER PROMINENT DASHBOARD CARD */}
      <Card className="p-6 bg-slate-900/90 border-slate-800/90 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Placement Matcher
              </span>
              <span className="text-xs text-slate-400 font-semibold">&bull; Active Evaluation</span>
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">
              AI Resume Analyzer
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Upload your resume to discover the best placement opportunities and identify your skill gaps.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Resume Status</span>
                <span className="text-emerald-400 font-bold">Uploaded &amp; Analyzed</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block font-semibold">Readiness Score</span>
                <span className="text-white font-bold">82 / 100</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block font-semibold">Top Match</span>
                <span className="text-brand-300 font-bold">TechNova (91%)</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-400 block font-semibold">Skill Gaps</span>
                <span className="text-amber-300 font-bold">Docker, Power BI</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-glow-indigo py-2.5 px-4"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => navigate('/student/resume')}
            >
              Analyze Resume
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white text-xs py-2.5 px-4"
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
        <Card className="p-4 flex items-center justify-between cursor-pointer bg-slate-900/90 border-slate-800/90 hover:border-indigo-500/50 hover:shadow-3d-hover transition-all text-white" onClick={() => navigate('/student/resume')}>
          <div>
            <h4 className="text-sm font-bold text-white">AI Resume Analyzer</h4>
            <p className="text-xs text-slate-400 font-medium">Extract skills &amp; match drives</p>
          </div>
          <Sparkles className="w-5 h-5 text-brand-400" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-slate-900/90 border-slate-800/90 hover:border-indigo-500/50 hover:shadow-3d-hover transition-all text-white" onClick={() => navigate('/student/drives')}>
          <div>
            <h4 className="text-sm font-bold text-white">Active Placement Drives</h4>
            <p className="text-xs text-slate-400 font-medium">Explore eligible company recruitment drives</p>
          </div>
          <Briefcase className="w-5 h-5 text-brand-400" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-slate-900/90 border-slate-800/90 hover:border-indigo-500/50 hover:shadow-3d-hover transition-all text-white" onClick={() => navigate('/student/interviews')}>
          <div>
            <h4 className="text-sm font-bold text-white">My Interview Schedule</h4>
            <p className="text-xs text-slate-400 font-medium">View upcoming technical round slots</p>
          </div>
          <Calendar className="w-5 h-5 text-brand-400" />
        </Card>

        <Card className="p-4 flex items-center justify-between cursor-pointer bg-slate-900/90 border-slate-800/90 hover:border-indigo-500/50 hover:shadow-3d-hover transition-all text-white" onClick={() => navigate('/student/skills')}>
          <div>
            <h4 className="text-sm font-bold text-white">Skill Gap Breakdown</h4>
            <p className="text-xs text-slate-400 font-medium">Detailed target skill requirements</p>
          </div>
          <Code className="w-5 h-5 text-brand-400" />
        </Card>
      </div>
    </div>
  );
};
