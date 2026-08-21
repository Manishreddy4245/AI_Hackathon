import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  ArrowLeft,
  Target,
  Sparkles,
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

      {/* READINESS HEADER HERO CARD (SECTION 21 & 22) */}
      <Card className="p-6 bg-gradient-to-r from-[rgba(59,130,246,0.16)] to-[rgba(6,182,212,0.08)] border-[rgba(59,130,246,0.30)] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <h2 className="text-xl font-black text-[#F8FAFC]">Personalized Preparation Blueprint</h2>
            </div>
            <p className="text-xs text-[#CBD5E1] font-medium">
              Calculated against requirements from <strong className="text-white">12 Active Placement Drives</strong>
            </p>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center gap-4 shrink-0 shadow-md">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle cx="28" cy="28" r="22" stroke="#17253A" strokeWidth="4" fill="transparent" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="#3B82F6"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="138"
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-base font-black text-[#FFFFFF]">82</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#F8FAFC] block">Placement Readiness Indicator</span>
              <span className="text-[11px] text-[#CBD5E1] block mt-0.5">82 / 100 Indicator</span>
              <span className="text-[10px] text-[#86EFAC] font-bold bg-[rgba(34,197,94,0.10)] px-2 py-0.5 rounded border border-[rgba(34,197,94,0.25)] mt-1 inline-block">
                High Match Alignment
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* TARGET SKILL BREAKDOWN CARDS */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-[#F8FAFC]">Target Skills Based on Active Drives</h3>

        {/* Docker Card */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#F59E0B]" />
              <h4 className="text-base font-black text-[#F8FAFC]">Docker Containerization</h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="px-2.5 py-1 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">Current: Basic</span>
              <span className="px-2.5 py-1 rounded bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border border-[rgba(6,182,212,0.30)]">
                Target: Intermediate
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[#CBD5E1] font-medium">
              <strong className="text-[#06B6D4]">Why it matters:</strong> Required or preferred by 4 active placement drives including TechNova Solutions and CloudPeak Systems.
            </p>
            {/* Recommendation Box */}
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[rgba(59,130,246,0.30)] text-[#CBD5E1] font-medium leading-relaxed shadow-sm">
              <span className="font-extrabold text-[#60A5FA] block mb-0.5">Recommendation:</span>
              <span className="text-[#CBD5E1]">
                "Practice containerizing a small FastAPI application with a multi-stage Dockerfile and test running postgres on docker-compose."
              </span>
            </div>
          </div>
        </Card>

        {/* System Design Card */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#F59E0B]" />
              <h4 className="text-base font-black text-[#F8FAFC]">System Design &amp; Microservices</h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="px-2.5 py-1 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">Current: Introductory</span>
              <span className="px-2.5 py-1 rounded bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border border-[rgba(6,182,212,0.30)]">
                Target: Intermediate
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[#CBD5E1] font-medium">
              <strong className="text-[#06B6D4]">Why it matters:</strong> Key evaluation topic in TechNova Round 2 Technical Interview.
            </p>
            {/* Recommendation Box */}
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[rgba(59,130,246,0.30)] text-[#CBD5E1] font-medium leading-relaxed shadow-sm">
              <span className="font-extrabold text-[#60A5FA] block mb-0.5">Recommendation:</span>
              <span className="text-[#CBD5E1]">
                "Review database indexing, caching strategies with Redis, and load balancer routing patterns."
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
