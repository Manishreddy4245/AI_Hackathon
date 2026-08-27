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
  BrainCircuit,
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
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [allocatedAssessments, setAllocatedAssessments] = useState<any[]>([]);
  const [selectedAllocatedModal, setSelectedAllocatedModal] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [data, apps, assess, studentAsses] = await Promise.all([
          apiService.getMyStudentDashboard().catch(() => null),
          apiService.getMyApplications().catch(() => []),
          apiService.getStudentAssessmentAnalytics().catch(() => null),
          apiService.getStudentAssessments().catch(() => []),
        ]);
        if (isMounted) {
          if (data) setDashboardData(data);
          if (apps) setMyApplications(apps);
          if (assess) setAssessmentData(assess);
          if (studentAsses) setAllocatedAssessments(studentAsses);
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
                onClick={() => navigate(hasResume ? '/student/drives' : '/student/resume')}
              >
                {hasResume ? 'Explore Placement Drives' : 'Upload Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* AI PLACEMENT ASSESSMENT / PREPBOT WIDGET */}
      <Card className="p-5 bg-[#101D31] border-[#243650] shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F8FAFC]">AI Placement Assessment &amp; PrepBot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {assessmentData?.has_data ? 'Active Benchmark' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {assessmentData?.has_data
                  ? `Completed ${assessmentData.assessments_count} personalized assessment(s). Keep practicing weak areas to optimize shortlisting.`
                  : 'Take personalized coding and aptitude tests generated from your resume skills.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Coding KPI */}
            <div className="px-3 py-2 bg-[#0B1628] rounded-xl border border-[#243650] text-center min-w-[90px]">
              <span className="text-[10px] text-[#94A3B8] block uppercase tracking-wider font-semibold">Coding</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {assessmentData?.coding_average !== null && assessmentData?.coding_average !== undefined
                  ? `${assessmentData.coding_average}%`
                  : 'Not Assessed'}
              </span>
            </div>

            {/* Aptitude KPI */}
            <div className="px-3 py-2 bg-[#0B1628] rounded-xl border border-[#243650] text-center min-w-[90px]">
              <span className="text-[10px] text-[#94A3B8] block uppercase tracking-wider font-semibold">Aptitude</span>
              <span className="text-sm font-bold text-purple-400 font-mono">
                {assessmentData?.aptitude_average !== null && assessmentData?.aptitude_average !== undefined
                  ? `${assessmentData.aptitude_average}%`
                  : 'Not Assessed'}
              </span>
            </div>

            <Button
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              className="flex items-center gap-1.5 text-xs py-2 px-4 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {assessmentData?.has_data ? 'Practice Weak Areas' : 'Launch PrepBot'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ALLOCATED APTITUDE ASSESSMENT CARD */}
      {(() => {
        const allocatedAptitude = (allocatedAssessments || []).find((a: any) => a.status === 'ALLOCATED' || a.round_type === 'APTITUDE');
        if (!allocatedAptitude) return null;
        return (
          <Card className="p-5 bg-gradient-to-r from-[#101D31] to-[#14243B] border border-cyan-500/40 shadow-lg text-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xl shrink-0 mt-0.5">
                  🧠
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#F8FAFC]">Aptitude Assessment</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Status: Allocated
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#CBD5E1]">
                    Company: <strong className="text-white">{allocatedAptitude.company || allocatedAptitude.company_name}</strong> &bull; Role: <strong className="text-[#60A5FA]">{allocatedAptitude.job_title || allocatedAptitude.role_title}</strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[#94A3B8]">
                    <span>📅 Scheduled: <strong className="text-[#F8FAFC]">{allocatedAptitude.scheduled_at || 'TBD'}</strong></span>
                    <span>⏳ Deadline: <strong className="text-[#F8FAFC]">{allocatedAptitude.deadline || 'TBD'}</strong></span>
                    <span>⏱️ Duration: <strong className="text-[#F8FAFC]">{allocatedAptitude.duration_minutes || 30} mins</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAllocatedModal(allocatedAptitude)}
                >
                  Details
                </Button>
                {allocatedAptitude.status !== 'COMPLETED' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                    icon={<Sparkles className="w-4 h-4" />}
                    onClick={() => navigate(`/student/assessments/${allocatedAptitude.id || allocatedAptitude.assessment_id}`)}
                  >
                    {allocatedAptitude.status === 'IN_PROGRESS' ? 'Continue Test' : 'Start Aptitude Test'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="text-emerald-400 border-emerald-500/40">
                    Test Completed
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ALLOCATED TECHNICAL ROUND CARD */}
      {(() => {
        const allocatedTechnical = (allocatedAssessments || []).find((a: any) => a.round_type === 'TECHNICAL' || a.type === 'TECHNICAL' || a.status === 'TECHNICAL_ALLOCATED');
        if (!allocatedTechnical) return null;
        return (
          <Card className="p-5 bg-gradient-to-r from-[#101D31] to-[#1E1B4B] border border-indigo-500/40 shadow-lg text-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-xl shrink-0 mt-0.5">
                  💻
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#F8FAFC]">Technical Round</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Status: Allocated
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#CBD5E1]">
                    Company: <strong className="text-white">{allocatedTechnical.company || allocatedTechnical.company_name}</strong> &bull; Role: <strong className="text-[#818CF8]">{allocatedTechnical.job_title || allocatedTechnical.role_title}</strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[#94A3B8]">
                    <span>📅 Scheduled: <strong className="text-[#F8FAFC]">{allocatedTechnical.scheduled_at || 'To Be Announced'}</strong></span>
                    <span>⏳ Duration: <strong className="text-[#F8FAFC]">{allocatedTechnical.duration_minutes || 45} mins</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAllocatedModal(allocatedTechnical)}
                >
                  Details
                </Button>
                {allocatedTechnical.status !== 'COMPLETED' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    icon={<Sparkles className="w-4 h-4" />}
                    onClick={() => navigate(`/student/assessments/${allocatedTechnical.id || allocatedTechnical.assessment_id}`)}
                  >
                    {allocatedTechnical.status === 'IN_PROGRESS' ? 'Continue Technical Test' : 'Start Technical Test'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="text-emerald-400 border-emerald-500/40">
                    Technical Test Completed
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ALLOCATED / SCHEDULED HR INTERVIEW CARD */}
      {(() => {
        const hrInterview = (myApplications || []).find((app: any) => 
          ['HR_INTERVIEW_ALLOCATED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(app.status) || 
          ['HR_INTERVIEW_ALLOCATED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(app.stage) ||
          app.hr_status === 'ALLOCATED'
        ) || ((dashboardData as any)?.interviews || []).find((i: any) => i.status !== 'CANCELLED');


        if (!hrInterview) return null;

        const isScheduled = hrInterview.status === 'scheduled' || hrInterview.status === 'INTERVIEW_SCHEDULED' || hrInterview.stage === 'INTERVIEW_SCHEDULED' || !!(hrInterview.date || hrInterview.scheduled_date);
        const isCompleted = hrInterview.status === 'completed' || hrInterview.status === 'COMPLETED' || hrInterview.stage === 'INTERVIEW_COMPLETED';

        return (
          <Card className="p-5 bg-gradient-to-r from-[#101D31] to-[#062C44] border border-cyan-500/40 shadow-lg text-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xl shrink-0 mt-0.5">
                  👔
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#F8FAFC]">HR / Interview Round</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isCompleted 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isScheduled 
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      Status: {isCompleted ? 'INTERVIEW COMPLETED' : (isScheduled ? 'INTERVIEW SCHEDULED' : 'Awaiting Schedule')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#CBD5E1]">
                    Company: <strong className="text-white">{hrInterview.companyName || hrInterview.company_name || hrInterview.company}</strong> &bull; Role: <strong className="text-[#60A5FA]">{hrInterview.roleTitle || hrInterview.job_title || hrInterview.role_title}</strong>
                  </div>

                  {isScheduled ? (
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[#94A3B8]">
                      <span>👥 Panel: <strong className="text-[#F8FAFC]">{hrInterview.panelName || hrInterview.panel_name || 'HR Panel'}</strong></span>
                      <span>📍 Room: <strong className="text-[#F8FAFC]">{hrInterview.roomName || hrInterview.room_name || 'Main Hall'}</strong></span>
                      <span>📅 Date: <strong className="text-[#F8FAFC]">{hrInterview.date || hrInterview.scheduled_date || 'TBD'}</strong></span>
                      <span>⏰ Time: <strong className="text-[#F8FAFC]">{hrInterview.timeSlot || hrInterview.time || hrInterview.startTime || 'TBD'}</strong></span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-[#94A3B8]">
                      <span>HR / Interview allocated by Placement Office. Panel, Room, Date & Time scheduling in progress.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAllocatedModal(hrInterview)}
                >
                  Details
                </Button>
                {isCompleted ? (
                  <Button variant="outline" size="sm" disabled className="text-emerald-400 border-emerald-500/40">
                    Interview Completed
                  </Button>
                ) : isScheduled ? (
                  <Button variant="outline" size="sm" disabled className="text-purple-300 border-purple-500/40">
                    Scheduled
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="text-cyan-300 border-cyan-500/40">
                    Awaiting Schedule
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}





      {/* ALLOCATION DETAILS MODAL */}
      {selectedAllocatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-md border border-[#243650] overflow-hidden text-[#F8FAFC]">
            <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🧠</span>
                <h3 className="text-base font-bold text-[#F8FAFC]">Aptitude Allocation Details</h3>
              </div>
              <button
                onClick={() => setSelectedAllocatedModal(null)}
                className="p-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Assessment Title</span>
                <p className="text-sm font-bold text-white">{selectedAllocatedModal.title || 'Aptitude Assessment'}</p>
                <p className="text-xs text-[#60A5FA]">{selectedAllocatedModal.job_title || selectedAllocatedModal.role_title} at {selectedAllocatedModal.company || selectedAllocatedModal.company_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650]">
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Round Type</span>
                  <span className="text-xs font-bold text-amber-400 mt-0.5 block">Aptitude Round</span>
                </div>
                <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650]">
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Status</span>
                  <span className="text-xs font-bold text-cyan-400 mt-0.5 block">Allocated</span>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-[#101D31] rounded-xl border border-[#243650]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Scheduled Time:</span>
                  <span className="font-bold text-white">{selectedAllocatedModal.scheduled_at || 'To Be Announced'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Submission Deadline:</span>
                  <span className="font-bold text-white">{selectedAllocatedModal.deadline || 'To Be Announced'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Allowed Duration:</span>
                  <span className="font-bold text-white">{selectedAllocatedModal.duration_minutes || 30} Minutes</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium leading-relaxed">
                ℹ️ Your aptitude test round has been allocated by the Placement Office. Test activation and questions will be enabled when the round session begins.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAllocatedModal(null)}
                >
                  Close
                </Button>
                {selectedAllocatedModal.status !== 'COMPLETED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                    icon={<Sparkles className="w-4 h-4" />}
                    onClick={() => {
                      const assId = selectedAllocatedModal.id || selectedAllocatedModal.assessment_id;
                      setSelectedAllocatedModal(null);
                      navigate(`/student/assessments/${assId}`);
                    }}
                  >
                    Start Test
                  </Button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}


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

      {/* MY PLACEMENT APPLICATIONS */}
      {myApplications.length > 0 && (
        <Card className="p-5 space-y-3 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#3B82F6]" /> My Placement Applications ({myApplications.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-1 px-2.5 bg-[#0B1628] border-[#243650] text-[#CBD5E1]"
              onClick={() => navigate('/student/applications')}
            >
              View All Applications &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myApplications.map((app) => {
              const isShortlisted = app.status === 'SHORTLISTED';
              return (
                <div
                  key={app.id || `${app.drive_id}-${app.applied_at}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isShortlisted
                      ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.30)]'
                      : 'bg-[#0B1628] border-[#243650]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#F8FAFC]">{app.company_name}</h4>
                        {app.source === 'external' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30">
                            External
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94A3B8] font-medium">{app.job_title}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 shrink-0 ${
                        isShortlisted
                          ? 'bg-[rgba(34,197,94,0.20)] text-[#86EFAC] border-[rgba(34,197,94,0.40)]'
                          : app.status === 'EXTERNAL_APPLICATION_COMPLETED'
                          ? 'bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border-[rgba(34,197,94,0.30)]'
                          : app.status === 'APPLICATION_STARTED'
                          ? 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border-[rgba(245,158,11,0.30)]'
                          : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]'
                      }`}
                    >
                      {isShortlisted ? <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" /> : null}
                      {isShortlisted
                        ? 'Shortlisted'
                        : app.status === 'EXTERNAL_APPLICATION_COMPLETED'
                        ? '✓ Application Completed'
                        : app.status === 'APPLICATION_STARTED'
                        ? 'Application Started'
                        : 'Applied'}
                    </span>
                  </div>
                  {app.interview && (
                    <div className="mt-2 p-2 bg-[#101D31] rounded-lg border border-[rgba(34,197,94,0.30)] text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-[#86EFAC] font-bold">
                        <span>📅 {app.interview.date}</span>
                        <span>⏰ {app.interview.time}</span>
                      </div>
                      <div className="text-[#CBD5E1] text-[9px] flex items-center justify-between">
                        <span>👥 {app.interview.panel_name}</span>
                        <span>🏢 {app.interview.block ? `${app.interview.block}, ` : ''}{app.interview.room_number || app.interview.room_name}</span>
                      </div>
                      {app.interview.panel_members && app.interview.panel_members.length > 0 && (
                        <div className="text-[8.5px] text-[#94A3B8] truncate">
                          Members: {app.interview.panel_members.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-[#243650]/60 flex items-center justify-between text-[10px] text-[#94A3B8]">
                    <span>Applied: <strong className="text-[#CBD5E1]">{app.applied_at}</strong></span>
                    {app.verification_type === 'self_confirmed' && (
                      <span className="text-[10px] text-[#86EFAC] font-semibold">Self-confirmed ✓</span>
                    )}
                    {isShortlisted && (
                      <span className="text-[#86EFAC] font-bold">Interview Ready ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
          onClick={() => navigate('/student/applications')}
        >
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">My Applications</h4>
            <p className="text-xs text-[#94A3B8] font-medium">Track your recruitment status</p>
          </div>
          <Briefcase className="w-5 h-5 text-[#22C55E]" />
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
      </div>
    </div>
  );
};
