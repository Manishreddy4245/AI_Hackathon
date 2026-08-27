import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  Building2,
  MapPin,
  CheckCircle2,
  Calendar,
  Lock,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Globe,
  GraduationCap,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';
import {
  apiService,
  PlacementRecommendation,
  CompanyOpportunityGroup,
  UnifiedOpportunitiesResponse,
} from '../../services/api';
import { ProfileCompletionWidget } from '../../components/student/ProfileCompletionWidget';
import { CompanySkillGapModal } from '../../components/student/CompanySkillGapModal';
import { StudentApplicationModal } from '../../components/student/StudentApplicationModal';

export const StudentDrives: React.FC = () => {
  const navigate = useNavigate();
  const { hasAppliedToDrive, applyToDrive, triggerToast } = usePlacement();
  const { user } = useAuth();

  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [dataResponse, setDataResponse] = useState<UnifiedOpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'college' | 'external'>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'ineligible' | 'high_match'>('all');
  const [viewMode, setViewMode] = useState<'company' | 'flat'>('company');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [applyingDrive, setApplyingDrive] = useState<any | null>(null);

  // Fetch opportunities whenever filter, page, or search changes
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, opsRes] = await Promise.allSettled([
          apiService.getMyStudentProfile(),
          apiService.getOpportunities(sourceFilter, eligibilityFilter, page, pageSize, searchQuery),
        ]);

        if (isMounted) {
          if (profileRes.status === 'fulfilled' && profileRes.value) {
            setStudentProfile(profileRes.value);
          }
          if (opsRes.status === 'fulfilled' && opsRes.value) {
            setDataResponse(opsRes.value);
            // Default first 3 companies expanded
            if (opsRes.value.company_groups && opsRes.value.company_groups.length > 0) {
              const initialExpanded = new Set<string>();
              opsRes.value.company_groups.slice(0, 4).forEach((g) => initialExpanded.add(g.company));
              setExpandedCompanies(initialExpanded);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch opportunities or profile', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, sourceFilter, eligibilityFilter, page, searchQuery]);

  const toggleCompanyExpand = (companyName: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyName)) {
        next.delete(companyName);
      } else {
        next.add(companyName);
      }
      return next;
    });
  };


  const isProfileComplete = Boolean(studentProfile?.isProfileComplete);
  const completionPercentage = studentProfile?.profileCompletion ?? 0;
  const hasResume = Boolean(studentProfile?.hasResume);

  const totalOpps = dataResponse?.total_opportunities ?? 0;
  const eligibleCount = dataResponse?.eligible_count ?? 0;
  const ineligibleCount = dataResponse?.ineligible_count ?? 0;
  const totalCompanies = dataResponse?.total_companies ?? 0;
  const totalPages = dataResponse?.total_pages ?? 1;

  // Render individual opportunity card
  const renderOpportunityCard = (opp: PlacementRecommendation, isInsideGroup: boolean = false) => {
    const isCollege = opp.source_type === 'college';
    const applied = hasAppliedToDrive(opp.drive_id);
    const isEligible = hasResume ? opp.eligible : false;
    const matchScore = hasResume ? opp.match_score : 0;
    const matchedSkills = opp.matched_skills || [];
    const skillGaps = opp.skill_gaps || [];
    const reasons = opp.eligibility_reasons || [];

    return (
      <Card
        key={opp.drive_id}
        className={`p-5 text-[#F8FAFC] transition-all border ${
          isInsideGroup ? 'bg-[#0B1628] border-[#243650]/80' : 'bg-[#101D31] border-[#243650]'
        } ${
          hasResume
            ? isEligible
              ? 'border-l-4 border-l-[#22C55E]'
              : 'border-l-4 border-l-[#F59E0B]'
            : ''
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1">
            {!isInsideGroup && (
              <div
                className={`w-11 h-11 rounded-xl border font-bold text-base flex items-center justify-center shrink-0 ${
                  isCollege
                    ? 'bg-[#0B1628] border-[#3B82F6]/30 text-[#3B82F6]'
                    : 'bg-[#181126] border-[#8B5CF6]/30 text-[#A78BFA]'
                }`}
              >
                {isCollege ? <Building2 className="w-5 h-5 text-[#3B82F6]" /> : <Globe className="w-5 h-5 text-[#A78BFA]" />}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {!isInsideGroup && <h3 className="text-sm font-bold text-[#F8FAFC]">{opp.company}</h3>}
                <span className="text-sm font-bold text-[#F8FAFC]">{opp.role}</span>

                {/* Source Badge */}
                {isCollege ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 font-bold flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Campus Drive
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/30 font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#A78BFA]" /> {opp.source_label}
                  </span>
                )}

                {/* Package / Salary */}
                {opp.package_lpa && (
                  <span className="text-xs px-2.5 py-0.5 rounded bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30 font-bold">
                    {opp.package_lpa} LPA
                  </span>
                )}
                {opp.salary_text && !opp.package_lpa && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[#14243B] text-[#94A3B8] border border-[#243650] font-medium">
                    {opp.salary_text}
                  </span>
                )}

                {/* Match & Eligibility Badges */}
                {hasResume ? (
                  <>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                        isEligible
                          ? 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border-[rgba(34,197,94,0.3)]'
                          : 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border-[rgba(245,158,11,0.3)]'
                      }`}
                    >
                      {isEligible ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> : <XCircle className="w-3 h-3 text-[#F59E0B]" />}
                      {isEligible ? 'Eligible' : 'Not Currently Eligible'}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#06B6D4]/15 text-[#67E8F9] border border-[#06B6D4]/30">
                      {matchScore}% Match
                    </span>
                  </>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border border-[rgba(245,158,11,0.3)] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#F59E0B]" /> Resume Required
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" /> {opp.location || 'Remote / Hybrid'}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" /> {opp.deadline ? `Deadline: ${opp.deadline}` : opp.posted_at}
                </span>
                {opp.min_cgpa && (
                  <>
                    <span>&bull;</span>
                    <span>Min CGPA: <strong className="text-[#F8FAFC]">{opp.min_cgpa}</strong></span>
                  </>
                )}
              </div>

              {/* Ineligibility Reason / Missing Criteria */}
              {hasResume && !isEligible && (
                <div className="p-2.5 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] text-xs text-[#FCD34D] font-medium space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#F59E0B]">
                    <Target className="w-3.5 h-3.5" /> Missing Requirements / Skill Gaps:
                  </div>
                  <div className="text-[11px] text-[#CBD5E1]">
                    {reasons.length > 0 ? reasons.join(' • ') : `Missing required technical skills: ${skillGaps.join(', ')}`}
                  </div>
                </div>
              )}

              {/* Skills Breakdown */}
              <div className="space-y-1 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#94A3B8]">Skills:</span>
                  {hasResume ? (
                    <>
                      {matchedSkills.map((skill, i) => (
                        <span
                          key={`m-${i}`}
                          className="px-2 py-0.5 rounded bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-[11px] font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" /> {skill}
                        </span>
                      ))}
                      {skillGaps.map((skill, i) => (
                        <span
                          key={`g-${i}`}
                          className="px-2 py-0.5 rounded bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)] text-[11px] font-medium flex items-center gap-1"
                        >
                          <span className="text-[#EF4444] font-bold">✗</span> {skill}
                        </span>
                      ))}
                    </>
                  ) : (
                    opp.skill_gaps?.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650] text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
            {/* View Skill Gap Button (Always Available for Contextual Gap Inspection) */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-2 bg-[#0B1628] border-[#243650] text-[#CBD5E1] hover:text-white flex items-center gap-1.5"
              icon={<Target className="w-3.5 h-3.5 text-[#06B6D4]" />}
              onClick={() => setSelectedOpportunityId(opp.drive_id)}
            >
              View Skill Gap
            </Button>

            {/* College Drive Detail Link & Community */}
            {isCollege && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs py-2 bg-[#101D31] border-[#3B82F6]/40 text-[#60A5FA] hover:bg-[#14243B] hover:text-white flex items-center gap-1.5"
                  icon={<Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />}
                  onClick={() => navigate(`/student/community/${opp.drive_id}`)}
                >
                  Placement Community
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs py-2 bg-[#0B1628] border-[#243650] text-[#CBD5E1] hover:text-white"
                  onClick={() => navigate(`/student/assessment?drive_id=${encodeURIComponent(opp.drive_id)}`)}
                >
                  Prepare for Drive
                </Button>
              </>
            )}

            {/* Application Handlers */}
            {applied ? (
              <span className="text-xs font-bold text-[#60A5FA] bg-[rgba(59,130,246,0.15)] px-3 py-2 rounded-xl border border-[rgba(59,130,246,0.30)] flex items-center justify-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" /> Applied
              </span>
            ) : !hasResume ? (
              <Button
                variant="secondary"
                size="sm"
                className="text-xs py-2 px-3 bg-[#1E293B] border-[#334155] text-[#FCD34D] hover:bg-[#334155] flex items-center justify-center gap-1.5"
                icon={<Lock className="w-3.5 h-3.5 text-[#F59E0B]" />}
                onClick={() => navigate('/student/resume')}
              >
                Upload Resume
              </Button>
            ) : isEligible ? (
              <Button
                variant="primary"
                size="sm"
                className="text-xs py-2 px-4 shadow-md font-bold"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setApplyingDrive(opp)}
              >
                Apply / Register
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Campus Placement Drives"
        subtitle="Explore active campus placement drives matched against your resume profile."
        icon={<Briefcase className="w-5 h-5 text-white" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      {/* PROFILE COMPLETION BANNER */}
      <ProfileCompletionWidget
        completion={completionPercentage}
        isComplete={isProfileComplete}
        missingRequirements={studentProfile?.missingRequirements}
        checklist={studentProfile?.checklist}
        compact={true}
        showCTA={true}
      />

      {/* NO RESUME NOTICE */}
      {!hasResume && (
        <div className="p-4 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#F8FAFC]">Personalized Discovery & Eligibility Unavailable</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">
                Upload your resume to analyze your profile and compare it with all available opportunities.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="shrink-0 text-xs py-1.5 px-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => navigate('/student/resume')}
          >
            Upload Resume
          </Button>
        </div>
      )}

      {/* AGGREGATE SUMMARY METRICS CARD */}
      <div className="p-4 rounded-2xl bg-[#101D31] border border-[#243650] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-[#94A3B8] block text-[11px] font-semibold">Total Drives</span>
            <span className="text-base font-black text-[#F8FAFC]">{totalOpps}</span>
          </div>
          <div className="h-7 w-[1px] bg-[#243650]" />
          <div>
            <span className="text-[#86EFAC] block text-[11px] font-semibold">Eligible For You</span>
            <span className="text-base font-black text-[#86EFAC]">{hasResume ? eligibleCount : 0}</span>
          </div>
          <div className="h-7 w-[1px] bg-[#243650]" />
          <div>
            <span className="text-[#FCD34D] block text-[11px] font-semibold">Not Currently Eligible</span>
            <span className="text-base font-black text-[#FCD34D]">{hasResume ? ineligibleCount : 0}</span>
          </div>
          <div className="h-7 w-[1px] bg-[#243650]" />
          <div>
            <span className="text-[#60A5FA] block text-[11px] font-semibold">Companies</span>
            <span className="text-base font-black text-[#60A5FA]">{totalCompanies}</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#0B1628] p-1 rounded-xl border border-[#243650]">
          <button
            onClick={() => setViewMode('company')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'company'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Group by Company
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'flat'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" /> All Drives List
          </button>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0B1628] p-1.5 rounded-xl border border-[#243650]">
            <button
              onClick={() => {
                setSourceFilter('all');
                setEligibilityFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                sourceFilter === 'all' && eligibilityFilter === 'all'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#14243B]'
              }`}
            >
              All Drives ({totalOpps})
            </button>

            <button
              onClick={() => {
                setEligibilityFilter('eligible');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                eligibilityFilter === 'eligible'
                  ? 'bg-[#22C55E] text-[#0F172A] shadow-sm font-extrabold'
                  : 'text-[#86EFAC] hover:text-white hover:bg-[#14243B]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Eligible ({hasResume ? eligibleCount : 0})
            </button>

            <button
              onClick={() => {
                setEligibilityFilter('ineligible');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                eligibilityFilter === 'ineligible'
                  ? 'bg-[#F59E0B] text-[#0F172A] shadow-sm font-bold'
                  : 'text-[#FCD34D] hover:text-white hover:bg-[#14243B]'
              }`}
            >
              <Target className="w-3.5 h-3.5" /> Not Eligible ({hasResume ? ineligibleCount : 0})
            </button>

            <button
              onClick={() => {
                setSourceFilter('college');
                setEligibilityFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                sourceFilter === 'college' && eligibilityFilter === 'all'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#14243B]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Campus Drives
            </button>

          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, role or skill..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#101D31] border border-[#243650] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>
      </div>

      {/* DISCOVERY LIST RENDERING */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
          <p className="text-xs font-semibold">Discovering active campus placement drives...</p>
        </div>
      ) : totalOpps === 0 ? (
        <Card className="p-8 text-center text-[#94A3B8] bg-[#101D31] border-[#243650]">
          <Briefcase className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#F8FAFC]">No placement drives match your filter</p>
          <p className="text-xs text-[#94A3B8] mt-1">Try switching tabs to view all drives or adjust your search.</p>
        </Card>
      ) : viewMode === 'company' && dataResponse?.company_groups ? (
        /* ================= GROUPED BY COMPANY VIEW ================= */
        <div className="space-y-4">
          {dataResponse.company_groups.map((group) => {
            const isExpanded = expandedCompanies.has(group.company);
            const isCollege = group.source_type === 'college';

            return (
              <Card key={group.company} className="p-0 overflow-hidden bg-[#101D31] border-[#243650] text-[#F8FAFC]">
                {/* Company Header Row */}
                <div
                  onClick={() => toggleCompanyExpand(group.company)}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#14243B]/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl border font-bold text-base flex items-center justify-center shrink-0 ${
                        isCollege
                          ? 'bg-[#0B1628] border-[#3B82F6]/30 text-[#3B82F6]'
                          : 'bg-[#181126] border-[#8B5CF6]/30 text-[#A78BFA]'
                      }`}
                    >
                      {isCollege ? <Building2 className="w-6 h-6 text-[#3B82F6]" /> : <Globe className="w-6 h-6 text-[#A78BFA]" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#F8FAFC]">{group.company}</h3>
                        {isCollege ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 font-bold flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" /> Campus Drive
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/30 font-bold flex items-center gap-1">
                            <Globe className="w-3 h-3 text-[#A78BFA]" /> {group.source_label}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#94A3B8] font-medium mt-1 flex items-center gap-2">
                        <span>{group.total_jobs} {group.total_jobs === 1 ? 'Drive' : 'Drives'}</span>
                        <span>&bull;</span>
                        {hasResume ? (
                          <>
                            <span className="text-[#86EFAC] font-semibold">{group.eligible_jobs} Eligible</span>
                            <span>&bull;</span>
                            <span className="text-[#FCD34D] font-semibold">{group.ineligible_jobs} Not Eligible</span>
                          </>
                        ) : (
                          <span className="text-[#F59E0B]">Resume Required</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {hasResume && (
                      <div className="text-right">
                        <span className="text-[10px] text-[#94A3B8] block font-medium">Best Match</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#06B6D4]/15 text-[#67E8F9] border border-[#06B6D4]/30">
                          {group.best_match_score}% Match
                        </span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs py-1.5 px-3 bg-[#0B1628] border-[#243650] text-[#CBD5E1]"
                      icon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    >
                      {isExpanded ? 'Hide' : `View (${group.total_jobs})`}
                    </Button>
                  </div>
                </div>

                {/* Expanded Child Opportunities */}
                {isExpanded && (
                  <div className="p-4 pt-0 space-y-3 border-t border-[#243650]/60 bg-[#08101E]/40">
                    <p className="text-[11px] font-bold text-[#94A3B8] pt-2">
                      Available roles at {group.company}:
                    </p>
                    {group.opportunities.map((opp) => renderOpportunityCard(opp, true))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* ================= FLAT OPPORTUNITIES LIST VIEW ================= */
        <div className="space-y-4">
          {dataResponse?.opportunities.map((opp) => renderOpportunityCard(opp, false))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#243650] text-xs text-[#94A3B8]">
          <span>
            Showing page <strong className="text-[#F8FAFC]">{page}</strong> of <strong className="text-[#F8FAFC]">{totalPages}</strong> ({totalOpps} total drives)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* COMPANY SPECIFIC SKILL GAP MODAL */}
      <CompanySkillGapModal
        opportunityId={selectedOpportunityId}
        onClose={() => setSelectedOpportunityId(null)}
      />

      {/* SIMPLE STUDENT APPLICATION MODAL */}
      <StudentApplicationModal
        isOpen={!!applyingDrive}
        drive={applyingDrive}
        onClose={() => setApplyingDrive(null)}
        onApplicationSubmitted={() => {
          // Re-fetch opportunities and update applied states
          window.location.reload();
        }}
      />
    </div>
  );
};
