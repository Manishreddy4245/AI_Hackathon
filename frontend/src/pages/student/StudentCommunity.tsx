import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Briefcase,
  MapPin,
  FileText,
  Send,
  Loader2,
  ShieldCheck,
  BrainCircuit,
  MessageSquare,
  Award,
  ChevronRight,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { useAuth } from '../../context/AuthContext';
import { usePlacement } from '../../context/PlacementContext';
import {
  apiService,
  CommunityItem,
  CommunityMessage,
  CommunityResponseItem,
  PlacementForm,
} from '../../services/api';
import { PlacementDrive } from '../../types';
import { ClipboardList } from 'lucide-react';

export const StudentCommunity: React.FC = () => {
  const { driveId: paramDriveId } = useParams<{ driveId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerToast } = usePlacement();

  const [allCommunities, setAllCommunities] = useState<CommunityItem[]>([]);
  const activeDriveId = paramDriveId || searchParams.get('drive_id') || (allCommunities[0]?.drive_id || '');

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [community, setCommunity] = useState<CommunityItem | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [skillGap, setSkillGap] = useState<any>(null);
  const [responses, setResponses] = useState<CommunityResponseItem[]>([]);
  const [forms, setForms] = useState<PlacementForm[]>([]);

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerFormData, setRegisterFormData] = useState({
    name: '',
    email: '',
    roll_number: '',
    branch: 'CSE',
    cgpa: 8.0,
    phone: '',
    preferred_location: '',
    cover_note: '',
  });
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  // Active Tab: 'overview' | 'announcements' | 'forms' | 'preparation' | 'responses'
  const [activeTab, setActiveTab] = useState<'overview' | 'announcements' | 'forms' | 'preparation' | 'responses'>('overview');

  const isOfficer = user?.role === 'placement_officer' || user?.role === ('admin' as any);

  // Load Data
  useEffect(() => {
    let isMounted = true;
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        const [commRes, msgsRes, profileRes, listRes, formsRes] = await Promise.allSettled([
          apiService.getPlacementCommunity(activeDriveId),
          apiService.getCommunityMessages(activeDriveId),
          apiService.getMyStudentProfile(),
          apiService.getPlacementCommunities(),
          apiService.getForms(activeDriveId),
        ]);

        if (isMounted) {
          if (commRes.status === 'fulfilled' && commRes.value) {
            setCommunity(commRes.value);
          }
          if (msgsRes.status === 'fulfilled' && msgsRes.value) {
            setMessages(msgsRes.value);
          }
          if (listRes.status === 'fulfilled' && listRes.value) {
            setAllCommunities(listRes.value);
          }
          if (formsRes.status === 'fulfilled' && formsRes.value) {
            setForms(formsRes.value);
          }
          if (profileRes.status === 'fulfilled' && profileRes.value) {
            const p = profileRes.value;
            setStudentProfile(p);
            setRegisterFormData((prev) => ({
              ...prev,
              name: p.name || user?.name || '',
              email: p.email || user?.email || '',
              roll_number: p.rollNumber || p.roll_number || '',
              branch: p.branch || 'CSE',
              cgpa: p.cgpa ?? 0.0,
              phone: p.phone || p.mobile || '',
              preferred_location: p.preferred_location || 'Bengaluru',
            }));
          }

          // Fetch Skill Gap for this drive
          try {
            const gap = await apiService.getOpportunitySkillGap(activeDriveId);
            if (gap) setSkillGap(gap);
          } catch {
            // Optional skill gap
          }

          // Fetch responses if officer
          if (isOfficer) {
            try {
              const resps = await apiService.getCommunityResponses(activeDriveId);
              if (resps) setResponses(resps);
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load community data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCommunityData();
    return () => {
      isMounted = false;
    };
  }, [activeDriveId, user?.id, isOfficer]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;

    setIsSubmittingReg(true);
    try {
      const res = await apiService.registerForCommunityDrive(activeDriveId, {
        name: registerFormData.name,
        email: registerFormData.email,
        roll_number: registerFormData.roll_number,
        branch: registerFormData.branch,
        cgpa: Number(registerFormData.cgpa),
        phone: registerFormData.phone,
        preferred_location: registerFormData.preferred_location,
        custom_answers: {
          cover_note: registerFormData.cover_note,
        },
      });

      triggerToast(res.message || 'Registration submitted successfully!', 'success');
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              is_registered: true,
              registered_count: res.registered_count || prev.registered_count + 1,
            }
          : null
      );
      setIsRegisterModalOpen(false);

      // Refresh responses if officer
      if (isOfficer) {
        const updatedResponses = await apiService.getCommunityResponses(activeDriveId);
        setResponses(updatedResponses);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || 'Failed to submit registration.';
      triggerToast(errMsg, 'error');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const drive = community?.drive;
  const isRegistered = community?.is_registered;

  // Eligibility evaluation
  const studentCgpa = studentProfile?.cgpa ?? 0.0;
  const studentBranch = (studentProfile?.branch || 'CSE').toUpperCase();
  const minCgpa = drive?.minCgpa ?? 0.0;
  const eligibleBranches = drive?.eligibleBranches || ['CSE', 'IT'];
  const isCgpaEligible = studentCgpa >= minCgpa;
  const isBranchEligible =
    eligibleBranches.length === 0 ||
    eligibleBranches.some(
      (b) => studentBranch.includes(b.toUpperCase()) || (b.toUpperCase() === 'CSE' && studentBranch.includes('COMPUTER'))
    );
  const isEligible = isCgpaEligible && isBranchEligible;

  if (loading && !community) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-xs font-semibold">Loading Placement Community Workspace...</p>
      </div>
    );
  }

  if (!community && !loading) {
    return (
      <div className="space-y-6 pb-12 text-[#CBD5E1]">
        <PageHeader
          title="Placement Communities"
          subtitle="Discover active placement drive communication communities."
          icon={<Users className="w-5 h-5 text-white" />}
        />
        <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-3">
          <Building2 className="w-12 h-12 text-[#64748B] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#F8FAFC]">No active placement communities</h3>
          <p className="text-xs text-[#94A3B8]">
            Communities are created automatically once Placement Officers approve recruiter placement drives.
          </p>
          <Button variant="primary" onClick={() => navigate('/student/drives')}>
            Browse Available Placement Drives
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      {/* Top Breadcrumb & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/student/drives')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Placement Drives
        </button>

        {/* Other Active Communities Quick Selector */}
        {allCommunities.length > 1 && (
          <div className="flex items-center gap-2 bg-[#101D31] px-3 py-1.5 rounded-xl border border-[#243650] text-xs">
            <span className="text-[#94A3B8] font-medium hidden sm:inline">Active Communities:</span>
            <select
              value={activeDriveId}
              onChange={(e) => navigate(`/student/community/${e.target.value}`)}
              className="bg-transparent font-bold text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              {allCommunities.map((c) => (
                <option key={c.drive_id} value={c.drive_id} className="bg-[#0B1628] text-[#F8FAFC]">
                  {c.company_name} — {c.role_title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* COMMUNITY HERO BANNER */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#101D31] via-[#0B1628] to-[#14243B] border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <CompanyLogo
              logo={drive?.companyLogo || community?.company_name?.substring(0, 2).toUpperCase() || 'CP'}
              name={community?.company_name || 'Company'}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 uppercase tracking-wider">
                  Placement Community
                </span>
                <StatusBadge status={(community?.status || 'active').toLowerCase() as any} />
                {isEligible ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> Eligible
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EF4444]/15 text-[#FCA5A5] border border-[#EF4444]/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#EF4444]" /> Not Eligible
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight mt-2">
                {community?.company_name} — {community?.role_title}
              </h1>

              <div className="flex items-center gap-4 text-xs font-semibold text-[#CBD5E1] mt-3 flex-wrap">
                {community?.package_lpa && (
                  <span className="text-[#86EFAC] font-bold">
                    ₹{community.package_lpa} LPA {community.salary_text ? `(${community.salary_text})` : ''}
                  </span>
                )}
                {community?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> {community.location}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[#FCD34D]">
                  <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <strong>Registered Students: {community?.registered_count ?? 0}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isRegistered ? (
              <div className="px-4 py-2.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#86EFAC] text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Registered ✓
              </div>
            ) : (
              <Button
                variant="primary"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={() => setIsRegisterModalOpen(true)}
                className="shadow-glow-brand"
              >
                Register for Placement Drive
              </Button>
            )}

            <Button
              variant="outline"
              icon={<BrainCircuit className="w-4 h-4 text-[#3B82F6]" />}
              onClick={() => navigate(`/student/assessment?drive_id=${encodeURIComponent(activeDriveId)}`)}
            >
              Prepare for This Drive
            </Button>
          </div>
        </div>
      </div>

      {/* COMMUNITY TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#243650] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'bg-[#101D31] text-[#CBD5E1] hover:bg-[#14243B] hover:text-white border border-[#243650]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Drive Overview
          </div>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'announcements'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'bg-[#101D31] text-[#CBD5E1] hover:bg-[#14243B] hover:text-white border border-[#243650]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Officer Announcements ({messages.length})
          </div>
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'forms'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'bg-[#101D31] text-[#CBD5E1] hover:bg-[#14243B] hover:text-white border border-[#243650]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Forms &amp; Surveys ({forms.length})
          </div>
        </button>

        <button
          onClick={() => setActiveTab('preparation')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'preparation'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'bg-[#101D31] text-[#CBD5E1] hover:bg-[#14243B] hover:text-white border border-[#243650]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5" /> AI Preparation &amp; Skill Gap
          </div>
        </button>

        {isOfficer && (
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'responses'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'bg-[#101D31] text-[#CBD5E1] hover:bg-[#14243B] hover:text-white border border-[#243650]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> View Registered Responses ({responses.length})
            </div>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Drive Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <Card className="p-6 bg-[#101D31] border-[#243650] space-y-4">
              <h3 className="text-base font-bold text-[#F8FAFC]">Role &amp; Job Description</h3>
              <p className="text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-line font-medium">
                {drive?.description ||
                  `Join ${community?.company_name} as a ${community?.role_title}. You will work on cutting-edge systems, collaborate with cross-functional product teams, and develop enterprise solutions.`}
              </p>
            </Card>

            {/* Skills & Tech Stack */}
            <Card className="p-6 bg-[#101D31] border-[#243650] space-y-4">
              <h3 className="text-base font-bold text-[#F8FAFC]">Technical Requirements</h3>
              <div>
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                  Mandatory Required Skills
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {drive?.requiredSkills && drive.requiredSkills.length > 0 ? (
                    drive.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 text-xs font-bold rounded-lg"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#94A3B8]">Standard technical fundamentals</span>
                  )}
                </div>
              </div>

              {drive?.preferredSkills && drive.preferredSkills.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
                    Preferred / Good-to-have Skills
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {drive.preferredSkills.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 bg-[#14243B] text-[#CBD5E1] border border-[#243650] text-xs font-semibold rounded-lg"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-6">
            {/* Eligibility Check Card */}
            <Card className="p-5 bg-[#101D31] border-[#243650] space-y-3">
              <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3B82F6]" /> Eligibility Criteria
              </h4>

              <div className="space-y-2 text-xs divide-y divide-[#1B2A40]">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#94A3B8]">Minimum CGPA</span>
                  <span className="font-bold text-[#F8FAFC]">
                    {minCgpa} (Your CGPA: {studentCgpa})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#94A3B8]">Eligible Branches</span>
                  <span className="font-bold text-[#F8FAFC]">
                    {eligibleBranches.join(', ')} (You: {studentBranch})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#94A3B8]">Target Batch</span>
                  <span className="font-bold text-[#F8FAFC]">{drive?.graduationYear || 2027}</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl text-xs font-semibold mt-2 ${
                  isEligible
                    ? 'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#86EFAC]'
                    : 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#FCA5A5]'
                }`}
              >
                {isEligible
                  ? '✓ You meet all academic & branch eligibility requirements for this drive.'
                  : `⚠ You do not currently meet the eligibility criteria: ${
                      !isCgpaEligible ? `CGPA is below required ${minCgpa}. ` : ''
                    }${!isBranchEligible ? `${studentBranch} is not in eligible branches.` : ''}`}
              </div>
            </Card>

            {/* Quick Registration Status */}
            <Card className="p-5 bg-[#101D31] border-[#243650] space-y-3">
              <h4 className="text-sm font-bold text-[#F8FAFC]">Registration Status</h4>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Total Candidates Registered:</span>
                <strong className="text-xl font-black text-[#F8FAFC]">{community?.registered_count ?? 0}</strong>
              </div>

              {isRegistered ? (
                <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#86EFAC] rounded-xl text-xs font-bold text-center">
                  You are registered for this placement drive.
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  Register Now
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICER ANNOUNCEMENTS & FORMS FEED */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <Card className="p-4 bg-[#101D31] border-[#243650]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Placement Officer Broadcast Feed</h3>
                <p className="text-xs text-[#94A3B8]">Official placement notices, registration forms, and interview updates</p>
              </div>
              <span className="px-2.5 py-1 bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 text-xs font-bold rounded-lg">
                {messages.length} Announcements
              </span>
            </div>
          </Card>

          {messages.length === 0 ? (
            <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-2">
              <MessageSquare className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[#F8FAFC]">No announcements yet</p>
              <p className="text-xs text-[#94A3B8]">Placement Officer messages will appear here in real time.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <Card
                  key={msg.id}
                  className="p-5 bg-[#101D31] border-[#243650] hover:border-[#3B82F6]/50 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white font-bold flex items-center justify-center text-xs">
                        PO
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#F8FAFC] block">{msg.author_name}</span>
                        <span className="text-[10px] text-[#94A3B8] font-medium uppercase">Placement Officer</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/20 text-[#60A5FA] uppercase border border-[#3B82F6]/30">
                        {msg.message_type || 'ANNOUNCEMENT'}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#3B82F6]" />
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#F8FAFC] leading-relaxed font-medium whitespace-pre-line">
                    {msg.content}
                  </p>

                  {/* CLICKABLE ACTION BUTTONS */}
                  {(msg.action_type || msg.message_type === 'REGISTRATION' || msg.message_type === 'FORM' || msg.form_id) && (
                    <div className="pt-2 border-t border-[#1B2A40] flex items-center gap-2 flex-wrap">
                      {msg.action_type === 'START_ASSESSMENT' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<BrainCircuit className="w-4 h-4" />}
                          onClick={() => navigate(`/student/assessment?drive_id=${encodeURIComponent(activeDriveId)}`)}
                        >
                          {msg.action_label || 'Start Assessment'}
                        </Button>
                      ) : msg.action_type === 'VIEW_INTERVIEW' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Calendar className="w-4 h-4" />}
                          onClick={() => navigate('/student/interviews')}
                        >
                          {msg.action_label || 'View Interview Schedule'}
                        </Button>
                      ) : msg.action_type === 'VIEW_DRIVE' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Briefcase className="w-4 h-4" />}
                          onClick={() => setActiveTab('overview')}
                        >
                          {msg.action_label || 'View Drive Details'}
                        </Button>
                      ) : (msg.action_type === 'OPEN_FORM' || msg.message_type === 'FORM') && msg.form_id ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                          icon={<ClipboardList className="w-4 h-4" />}
                          onClick={() => navigate(`/student/forms/${msg.form_id}`)}
                        >
                          {msg.action_label || 'Fill Form'}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<FileText className="w-4 h-4" />}
                          onClick={() => setIsRegisterModalOpen(true)}
                        >
                          {msg.action_label || (isRegistered ? 'View Registration' : 'Open Registration Form')}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FORMS & SURVEYS */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          {forms.length === 0 ? (
            <Card className="p-8 text-center bg-[#101D31] border-[#243650] space-y-3">
              <ClipboardList className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No forms uploaded yet</h3>
              <p className="text-xs text-slate-400">The Placement Office has not uploaded any custom forms or surveys for this drive yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forms.map((f) => (
                <Card key={f.id} className="p-5 bg-[#101D31] border-[#243650] hover:border-violet-500/40 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-700/30">
                        {f.fields.length} FIELDS
                      </span>
                      <span className="text-[10px] text-slate-400">By {f.created_by_name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{f.title}</h4>
                    {f.description && <p className="text-xs text-slate-300 line-clamp-2">{f.description}</p>}
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#1B2A40] flex items-center justify-between">
                    <span className="text-xs text-slate-400">{f.submission_count} submissions</span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500 text-white"
                      icon={<ClipboardList className="w-4 h-4" />}
                      onClick={() => navigate(`/student/forms/${f.id}`)}
                    >
                      Fill Form
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREPARATION & SKILL GAP */}
      {activeTab === 'preparation' && (
        <div className="space-y-6">
          <Card className="p-6 bg-[#101D31] border-[#243650] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-[#3B82F6]" /> Personalized AI Exam &amp; Prep
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  AI generates focused coding &amp; aptitude tests based on {community?.company_name} requirements.
                </p>
              </div>

              <Button
                variant="primary"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={() => navigate(`/student/assessment?drive_id=${encodeURIComponent(activeDriveId)}`)}
                className="shadow-glow-brand shrink-0"
              >
                Launch Focused Drive Assessment
              </Button>
            </div>

            {/* Skill Gap Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#1B2A40]">
              <div className="p-4 rounded-xl bg-[#0B1628] border border-[#243650] space-y-2">
                <span className="text-xs font-bold text-[#86EFAC] uppercase tracking-wider block">
                  ✓ Matched Technical Skills
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {skillGap?.matched_skills && skillGap.matched_skills.length > 0 ? (
                    skillGap.matched_skills.map((s: string) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30 text-xs font-bold rounded-lg"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#94A3B8]">Analyze your resume to see skill matches</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1628] border border-[#243650] space-y-2">
                <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider block">
                  ⚠ Missing / Weak Skills to Practice
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {skillGap?.missing_skills && skillGap.missing_skills.length > 0 ? (
                    skillGap.missing_skills.map((s: string) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/30 text-xs font-bold rounded-lg"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#94A3B8]">No critical skill gaps detected for this role</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: OFFICER VIEW RESPONSES */}
      {activeTab === 'responses' && isOfficer && (
        <Card className="p-6 bg-[#101D31] border-[#243650] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Registered Candidate Responses</h3>
              <p className="text-xs text-[#94A3B8]">Live registration records submitted via this placement community</p>
            </div>
            <span className="text-sm font-bold text-[#86EFAC]">Total: {responses.length} Candidates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14243B] text-[#CBD5E1] uppercase font-bold border-b border-[#243650]">
                <tr>
                  <th className="p-3 pl-4">Candidate</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">CGPA</th>
                  <th className="p-3">Skills</th>
                  <th className="p-3">Registered At</th>
                  <th className="p-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2A40]">
                {responses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#94A3B8]">
                      No responses yet. Be the first student to register!
                    </td>
                  </tr>
                ) : (
                  responses.map((r) => (
                    <tr key={r.id} className="hover:bg-[#14243B] transition-colors">
                      <td className="p-3 pl-4 font-bold text-[#F8FAFC]">{r.student_name}</td>
                      <td className="p-3 font-mono text-[#CBD5E1]">{r.roll_number || 'N/A'}</td>
                      <td className="p-3 font-bold text-[#F8FAFC]">{r.branch || 'CSE'}</td>
                      <td className="p-3 font-bold text-[#86EFAC]">{r.cgpa != null ? r.cgpa : 'N/A'}</td>
                      <td className="p-3 text-[#94A3B8]">
                        {(r.skills || []).slice(0, 3).join(', ') || 'Technical candidate'}
                      </td>
                      <td className="p-3 text-[#CBD5E1]">
                        {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : 'Today'}
                      </td>
                      <td className="p-3 pr-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30 uppercase">
                          {r.status || 'APPLIED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* STUDENT REGISTRATION MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden border border-[#243650] text-[#F8FAFC]">
            <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">Placement Drive Registration</h3>
                <p className="text-xs text-[#94A3B8]">{community?.company_name} — {community?.role_title}</p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={registerFormData.name}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, name: e.target.value })}
                    className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={registerFormData.roll_number}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, roll_number: e.target.value })}
                    className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Branch</label>
                  <input
                    type="text"
                    required
                    value={registerFormData.branch}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, branch: e.target.value })}
                    className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Current CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={registerFormData.cgpa}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, cgpa: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={registerFormData.phone}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, phone: e.target.value })}
                  className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Preferred Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru / Hyderabad / Remote"
                  value={registerFormData.preferred_location}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, preferred_location: e.target.value })}
                  className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#CBD5E1] mb-1">Cover Note / Remarks (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Briefly state your relevant project experience or technical highlights..."
                  value={registerFormData.cover_note}
                  onChange={(e) => setRegisterFormData({ ...registerFormData, cover_note: e.target.value })}
                  className="w-full p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="pt-4 border-t border-[#243650] flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmittingReg}
                  icon={isSubmittingReg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                >
                  {isSubmittingReg ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
