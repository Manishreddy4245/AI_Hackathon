import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Award,
  Layers,
  FileText,
  Mail,
  Building,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { ProfileCompletionWidget } from '../../components/student/ProfileCompletionWidget';

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await apiService.getMyStudentDashboard();
        if (isMounted && data) setDashboardData(data);
      } catch (err) {
        console.warn('Failed to load profile data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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
  const readinessScore = student.readinessScore || 0;
  const studentSkills: string[] = student.skills || [];
  const studentProjects: any[] = student.projects || [];
  const studentExperience: any[] = student.experience || [];
  const studentCertifications: any[] = student.certifications || [];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-xs font-semibold">Loading your verified student profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      <PageHeader
        title="Student Profile & Credentials"
        subtitle="Manage your academic records, verified technical skills, and resume profile."
        icon={<User className="w-5 h-5 text-white" />}
        action={
          <Button
            variant="primary"
            icon={<Sparkles className="w-4 h-4 text-white" />}
            onClick={() => navigate('/student/resume')}
          >
            {hasResume ? 'Re-Analyze Resume' : 'Upload Resume'}
          </Button>
        }
      />

      {/* STUDENT PROFILE CARD */}
      <Card className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-2xl shadow-glow-brand shrink-0">
              {student.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-[#F8FAFC]">{student.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                  Student Candidate
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> {student.email}
              </p>
              <p className="text-xs text-[#CBD5E1] font-semibold">
                {student.branch || 'Computer Science & Engineering'} &bull; Batch {student.batch || '2027'} &bull; CGPA: <strong className="text-white">{student.cgpa || 'N/A'}</strong>
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-xs font-bold text-[#94A3B8] block">Placement Readiness</span>
              <span className="text-lg font-black text-white">{readinessScore > 0 ? `${readinessScore} / 100` : 'Pending'}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA] font-black text-base">
              {readinessScore > 0 ? `${readinessScore}%` : '--'}
            </div>
          </div>
        </div>
      </Card>

      {/* VERIFIED SKILLS */}
      <Card className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Verified Technical Skills ({studentSkills.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="text-xs py-1 px-2.5 bg-[#0B1628] border-[#243650] text-[#CBD5E1]"
            onClick={() => navigate('/student/resume')}
          >
            Update via Resume &rarr;
          </Button>
        </div>

        {studentSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {studentSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> {skill}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-2">
            <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
            <p className="text-xs font-bold text-[#F8FAFC]">No verified skills detected</p>
            <p className="text-xs text-[#94A3B8]">Upload and analyze your resume to automatically extract your skills.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => navigate('/student/resume')}
            >
              Upload Resume Now
            </Button>
          </div>
        )}
      </Card>

      {/* PROJECTS & EXPERIENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Projects */}
        <Card className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC] space-y-3">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#06B6D4]" /> Technical Projects ({studentProjects.length})
          </h3>
          {studentProjects.length > 0 ? (
            <div className="space-y-3 pt-1">
              {studentProjects.map((proj: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] text-xs space-y-1">
                  <span className="font-bold text-[#F8FAFC] block">{proj.name || proj.title}</span>
                  {proj.description && <p className="text-[11px] text-[#94A3B8] leading-relaxed">{proj.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8] italic pt-2">No projects extracted from resume yet.</p>
          )}
        </Card>

        {/* Certifications & Experience */}
        <Card className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC] space-y-3">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F59E0B]" /> Certifications &amp; Experience
          </h3>
          {studentCertifications.length > 0 || studentExperience.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {studentCertifications.map((cert: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#0B1628] rounded-xl border border-[#243650] text-xs">
                  <span className="font-bold text-[#FCD34D] block">{cert.name}</span>
                  {cert.issuer && <span className="text-[10px] text-[#94A3B8]">{cert.issuer}</span>}
                </div>
              ))}
              {studentExperience.map((exp: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#0B1628] rounded-xl border border-[#243650] text-xs">
                  <span className="font-bold text-[#86EFAC] block">{exp.role} &bull; {exp.company}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8] italic pt-2">No certifications or internships recorded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
