import React, { useState, useEffect } from 'react';
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
  FileText,
  Loader2,
  Award,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { ProfileCompletionWidget } from '../../components/student/ProfileCompletionWidget';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const data = await apiService.getMyStudentDashboard();
        if (isMounted && data) {
          setDashboardData(data);
        }
      } catch (err) {
        console.warn('Failed to load dynamic student dashboard, using auth identity fallback');
        if (isMounted) {
          setDashboardData({
            student: {
              name: user?.name || 'Student Candidate',
              email: user?.email || '',
              branch: 'CSE',
              batch: '2027',
              cgpa: 0,
              skills: [],
              projects: [],
              experience: [],
              certifications: [],
              readinessScore: 0,
            },
            hasResume: false,
            appliedDriveIds: [],
            interviews: [],
            isNewUser: true,
            profileCompletion: 0,
            isProfileComplete: false,
            missingRequirements: ['Upload and analyze your resume in the Resume Analyzer'],
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  const student = dashboardData?.student || {
    name: user?.name || 'Student Candidate',
    email: user?.email || '',
    branch: 'CSE',
    batch: '2027',
    cgpa: 0,
    skills: [],
    projects: [],
    experience: [],
    certifications: [],
    readinessScore: 0,
  };

  const hasResume = dashboardData?.hasResume || false;
  const isProfileComplete = dashboardData?.isProfileComplete ?? (student.skills?.length > 0 && hasResume);
  const profileCompletion = dashboardData?.profileCompletion ?? (hasResume ? (isProfileComplete ? 100 : 75) : 0);
  const readinessScore = student.readinessScore || 0;
  const studentSkills: string[] = student.skills || [];
  const studentProjects: any[] = student.projects || [];
  const studentExperience: any[] = student.experience || [];
  const studentCertifications: any[] = student.certifications || [];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-xs font-semibold">Loading your personalized student placement workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Welcome back, ${student.name.split(' ')[0]}`}
        subtitle="Track your personalized placement journey and discover your best campus recruitment opportunities."
        icon={<GraduationCap className="w-5 h-5 text-white" />}
        action={
          <Button
            variant="primary"
            icon={<Sparkles className="w-4 h-4 text-white" />}
            onClick={() => navigate('/student/resume')}
          >
            {hasResume ? 'Update Resume' : 'Upload Resume'}
          </Button>
        }
      />

      {/* PROFILE COMPLETION & PLACEMENT ELIGIBILITY GAUGE */}
      <ProfileCompletionWidget
        completion={profileCompletion}
        isComplete={isProfileComplete}
        missingRequirements={dashboardData?.missingRequirements}
        checklist={dashboardData?.checklist}
      />

      {/* MY PLACEMENT READINESS SCORE HERO CARD */}
      <Card className="p-6 bg-[#101D31] border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xl font-black text-[#F8FAFC]">{student.name}</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                {student.branch || 'CSE'} &bull; Batch {student.batch || '2027'}
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] font-medium">
              {student.cgpa > 0 ? (
                <>
                  CGPA: <strong className="text-white">{student.cgpa}</strong> &bull;{' '}
                </>
              ) : null}
              {dashboardData?.appliedDriveIds?.length > 0 ? (
                <span>Applied to {dashboardData.appliedDriveIds.length} Active Drive(s)</span>
              ) : (
                <span className="text-[#94A3B8]">0 Drive Applications Submitted</span>
              )}
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
                  stroke={readinessScore > 0 ? '#3B82F6' : '#64748B'}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * Math.min(100, Math.max(0, readinessScore))) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-black text-[#FFFFFF]">
                {readinessScore > 0 ? readinessScore : '--'}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#F8FAFC] block">Placement Readiness</span>
              <span className="text-[11px] text-[#94A3B8] block">
                {readinessScore > 0 ? `${readinessScore} / 100 Score` : 'Not Calculated Yet'}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 text-[11px] py-1 bg-[#101D31] border-[#243650] text-[#CBD5E1] hover:text-white"
                icon={<ArrowRight className="w-3 h-3" />}
                onClick={() => navigate(hasResume ? '/student/skills' : '/student/resume')}
              >
                {hasResume ? 'View My Skill Gaps' : 'Upload Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* GRID: VERIFIED SKILLS, PROJECTS & EXPERIENCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verified Skills */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Verified Technical Skills
          </h3>
          {studentSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {studentSkills.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-xs font-semibold"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-1.5">
              <Code className="w-6 h-6 text-[#64748B] mx-auto" />
              <p className="text-xs font-bold text-[#F8FAFC]">No skills detected yet</p>
              <p className="text-[11px] text-[#94A3B8]">Upload your resume to extract verified skills.</p>
              <button
                onClick={() => navigate('/student/resume')}
                className="text-xs font-bold text-[#60A5FA] hover:underline block pt-1"
              >
                Upload Resume &rarr;
              </button>
            </div>
          )}
        </Card>

        {/* Projects Extracted */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#06B6D4]" /> Technical Projects
          </h3>
          {studentProjects.length > 0 ? (
            <div className="space-y-2">
              {studentProjects.map((p: any, i: number) => (
                <div key={i} className="p-2.5 bg-[#0B1628] rounded-lg border border-[#243650] text-xs">
                  <span className="font-bold text-[#F8FAFC] block">{p.name || p.title}</span>
                  {p.description && <p className="text-[11px] text-[#94A3B8] line-clamp-1">{p.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-1.5">
              <Layers className="w-6 h-6 text-[#64748B] mx-auto" />
              <p className="text-xs font-bold text-[#F8FAFC]">No projects detected yet</p>
              <p className="text-[11px] text-[#94A3B8]">Highlighted projects from your resume will appear here.</p>
            </div>
          )}
        </Card>

        {/* Certifications & Experience */}
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650]">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F59E0B]" /> Certifications &amp; Experience
          </h3>
          {studentCertifications.length > 0 || studentExperience.length > 0 ? (
            <div className="space-y-2">
              {studentCertifications.map((c: any, i: number) => (
                <div key={i} className="p-2 bg-[#0B1628] rounded-lg border border-[#243650] text-xs">
                  <span className="font-bold text-[#FCD34D] block">{c.name}</span>
                  {c.issuer && <span className="text-[10px] text-[#94A3B8]">{c.issuer}</span>}
                </div>
              ))}
              {studentExperience.map((e: any, i: number) => (
                <div key={i} className="p-2 bg-[#0B1628] rounded-lg border border-[#243650] text-xs">
                  <span className="font-bold text-[#86EFAC] block">{e.role} &bull; {e.company}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-1.5">
              <Award className="w-6 h-6 text-[#64748B] mx-auto" />
              <p className="text-xs font-bold text-[#F8FAFC]">No experience or certs detected</p>
              <p className="text-[11px] text-[#94A3B8]">Extracted credentials will populate upon resume analysis.</p>
            </div>
          )}
        </Card>
      </div>

      {/* AI RESUME ANALYZER PROMINENT DASHBOARD CARD */}
      <Card className="p-6 ai-card-surface text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" /> AI Resume Profile Builder
              </span>
              <span className="text-xs text-[#94A3B8] font-semibold">
                &bull; {hasResume ? 'Active Profile Analysis' : 'Resume Required for Application Gate'}
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight text-[#F8FAFC]">
              AI Resume Analyzer
            </h3>
            <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">
              Upload your resume to automatically extract your skills, calculate your placement readiness score, and unlock placement drive applications.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-[#94A3B8] block font-semibold">Resume Status</span>
                <span className={hasResume ? 'text-[#86EFAC] font-bold' : 'text-[#FCD34D] font-bold'}>
                  {hasResume ? 'Uploaded & Analyzed' : 'No Resume Uploaded'}
                </span>
              </div>
              <div className="h-6 w-px bg-[#243650]" />
              <div>
                <span className="text-[#94A3B8] block font-semibold">Readiness Score</span>
                <span className="text-white font-bold">{readinessScore > 0 ? `${readinessScore} / 100` : 'Not Calculated'}</span>
              </div>
              <div className="h-6 w-px bg-[#243650]" />
              <div>
                <span className="text-[#94A3B8] block font-semibold">Application Eligibility</span>
                <span className={isProfileComplete ? 'text-[#86EFAC] font-bold' : 'text-[#FCD34D] font-bold'}>
                  {isProfileComplete ? 'Eligible to Apply' : 'Gated (Incomplete Profile)'}
                </span>
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
              {hasResume ? 'Re-Analyze Resume' : 'Upload Resume Now'}
            </Button>
            <Button
              variant="secondary"
              className="py-2.5 px-4"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/student/drives')}
            >
              View Drives
            </Button>
          </div>
        </div>
      </Card>

      {/* QUICK LINKS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]"
          onClick={() => navigate('/student/resume')}
        >
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">AI Resume Analyzer</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Extract skills &amp; build profile</p>
          </div>
          <Sparkles className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card
          className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]"
          onClick={() => navigate('/student/drives')}
        >
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Active Placement Drives</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Explore company opportunities</p>
          </div>
          <Briefcase className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card
          className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]"
          onClick={() => navigate('/student/interviews')}
        >
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">My Interview Schedule</h4>
            <p className="text-xs text-[#94A3B8] font-medium">View scheduled technical slots</p>
          </div>
          <Calendar className="w-5 h-5 text-[#3B82F6]" />
        </Card>

        <Card
          className="p-4 flex items-center justify-between cursor-pointer bg-[#101D31] border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] transition-all text-[#F8FAFC]"
          onClick={() => navigate('/student/skills')}
        >
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Skill Gap Breakdown</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Analyze role requirements</p>
          </div>
          <Code className="w-5 h-5 text-[#3B82F6]" />
        </Card>
      </div>
    </div>
  );
};
