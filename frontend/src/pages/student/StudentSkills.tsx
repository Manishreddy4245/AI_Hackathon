import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  ArrowLeft,
  Target,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const StudentSkills: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Your Skill Gap Analysis"
        subtitle="Targeted technical competencies and personalized preparation guidance."
        icon={<Code className="w-5 h-5 text-white" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      {/* READINESS HEADER HERO CARD */}
      <Card className="p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Personalized Preparation Blueprint</h2>
            <p className="text-xs text-slate-300 font-medium">
              Calculated against requirements from <strong className="text-white">12 Active Placement Drives</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-4 shrink-0 shadow-md">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <span className="text-lg font-black text-white">82</span>
              <span className="text-[10px] text-slate-400 font-semibold absolute bottom-1">/ 100</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Placement Readiness Indicator</span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800 mt-1 inline-block">
                High Match Alignment
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* TARGET SKILL BREAKDOWN CARDS */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-white">Target Skills Based on Active Drives</h3>

        {/* Docker Card */}
        <Card className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-black text-white">Docker Containerization</h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">Current: Basic</span>
              <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-200 border border-indigo-700">
                Target: Intermediate
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-300 font-medium">
              <strong className="text-cyan-300">Why it matters:</strong> Required or preferred by 4 active placement drives including TechNova Solutions and CloudPeak Systems.
            </p>
            {/* White Recommendation Box with Dark Text (#0F172A / #1E293B) as specified in requirement 10 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium leading-relaxed shadow-xs">
              <span className="font-extrabold text-[#0F172A] block mb-0.5">Recommendation:</span>
              <span className="text-[#1E293B]">
                "Practice containerizing a small FastAPI application with a multi-stage Dockerfile and test running postgres on docker-compose."
              </span>
            </div>
          </div>
        </Card>

        {/* System Design Card */}
        <Card className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-black text-white">System Design & Microservices</h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">Current: Introductory</span>
              <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-200 border border-indigo-700">
                Target: Intermediate
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-300 font-medium">
              <strong className="text-cyan-300">Why it matters:</strong> Key evaluation topic in TechNova Round 2 Technical Interview.
            </p>
            {/* White Recommendation Box with Dark Text (#0F172A / #1E293B) as specified in requirement 10 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium leading-relaxed shadow-xs">
              <span className="font-extrabold text-[#0F172A] block mb-0.5">Recommendation:</span>
              <span className="text-[#1E293B]">
                "Review database indexing, caching strategies with Redis, and load balancer routing patterns."
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
