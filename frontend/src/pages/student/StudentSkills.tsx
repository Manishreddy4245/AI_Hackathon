import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  ArrowLeft,
  Target,
  Sparkles,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

export const StudentSkills: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentStudentId = user?.id || 'student-demo';

  const [loading, setLoading] = useState(true);
  const [skillGapData, setSkillGapData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const [gaps, dash] = await Promise.allSettled([
          apiService.getSkillGaps(currentStudentId),
          apiService.getMyStudentDashboard(),
        ]);
        if (isMounted) {
          if (gaps.status === 'fulfilled' && gaps.value) setSkillGapData(gaps.value);
          if (dash.status === 'fulfilled' && dash.value) setDashboardData(dash.value);
        }
      } catch (err) {
        console.warn('Failed to load dynamic skill gaps', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSkills();
    return () => {
      isMounted = false;
    };
  }, [currentStudentId]);

  const student = dashboardData?.student || {
    name: user?.name || 'Student Candidate',
    readinessScore: 0,
    skills: [],
  };

  const hasResume = dashboardData?.hasResume || false;
  const readinessScore = student.readinessScore || 0;
  const isNewUser = readinessScore === 0 && !hasResume && (student.skills?.length || 0) === 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-xs font-semibold">Calculating skill gaps against active recruitment drives...</p>
      </div>
    );
  }

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
      <Card className="p-6 bg-gradient-to-r from-[rgba(59,130,246,0.16)] to-[rgba(6,182,212,0.08)] border-[rgba(59,130,246,0.30)] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <h2 className="text-xl font-black text-[#F8FAFC]">Personalized Preparation Blueprint</h2>
            </div>
            <p className="text-xs text-[#CBD5E1] font-medium">
              Calculated for <strong className="text-white">{student.name}</strong> against active campus recruitment drives
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
                  strokeDashoffset={138 - (138 * Math.min(100, Math.max(0, readinessScore))) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-base font-black text-[#FFFFFF]">
                {readinessScore > 0 ? readinessScore : '--'}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#F8FAFC] block">Placement Readiness Indicator</span>
              <span className="text-[11px] text-[#CBD5E1] block mt-0.5">
                {readinessScore > 0 ? `${readinessScore} / 100 Indicator` : 'Analysis Pending'}
              </span>
              <span className="text-[10px] text-[#86EFAC] font-bold bg-[rgba(34,197,94,0.10)] px-2 py-0.5 rounded border border-[rgba(34,197,94,0.25)] mt-1 inline-block">
                {readinessScore >= 80 ? 'High Match Alignment' : readinessScore > 0 ? 'Moderate Alignment' : 'Resume Required'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* TARGET SKILL BREAKDOWN CARDS */}
      {isNewUser ? (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-4 text-[#F8FAFC]">
          <BookOpen className="w-12 h-12 text-[#3B82F6] mx-auto opacity-70" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#F8FAFC]">Upload Resume to Generate Skill-Gap Analysis</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              PlaceMind AI extracts your technical competencies, compares them against active placement job descriptions, and builds a targeted preparation roadmap.
            </p>
          </div>
          <Button variant="primary" icon={<Sparkles className="w-4 h-4" />} onClick={() => navigate('/student/resume')}>
            Upload Resume Now
          </Button>
        </Card>
      ) : (
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
                <strong className="text-[#06B6D4]">Why it matters:</strong> Required or preferred by active placement drives including TechNova Solutions and CloudPeak Systems.
              </p>
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
                <strong className="text-[#06B6D4]">Why it matters:</strong> Key evaluation topic in technical interview rounds.
              </p>
              <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[rgba(59,130,246,0.30)] text-[#CBD5E1] font-medium leading-relaxed shadow-sm">
                <span className="font-extrabold text-[#60A5FA] block mb-0.5">Recommendation:</span>
                <span className="text-[#CBD5E1]">
                  "Review database indexing, caching strategies with Redis, and load balancer routing patterns."
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
