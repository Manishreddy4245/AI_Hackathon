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
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';
import { apiService, PlacementRecommendation } from '../../services/api';
import { ProfileCompletionWidget } from '../../components/student/ProfileCompletionWidget';

export const StudentDrives: React.FC = () => {
  const navigate = useNavigate();
  const { drives, hasAppliedToDrive, applyToDrive } = usePlacement();
  const { user } = useAuth();

  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<PlacementRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStatusAndRecs = async () => {
      setLoading(true);
      try {
        const [profileRes, recsRes] = await Promise.allSettled([
          apiService.getMyStudentProfile(),
          apiService.getPlacementRecommendations(),
        ]);

        if (isMounted) {
          if (profileRes.status === 'fulfilled' && profileRes.value) {
            setStudentProfile(profileRes.value);
          }
          if (recsRes.status === 'fulfilled' && recsRes.value) {
            setRecommendations(recsRes.value);
          }
        }
      } catch (err) {
        console.warn('Could not fetch student profile or recommendations', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStatusAndRecs();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const isProfileComplete = studentProfile?.isProfileComplete ?? (user?.email === 'student@demo.com');
  const completionPercentage = studentProfile?.profileCompletion ?? 0;
  const hasResume = studentProfile?.hasResume ?? (isProfileComplete || user?.email === 'student@demo.com');

  // Map recommendation data by drive_id for fast lookup
  const recsMap = new Map<string, PlacementRecommendation>();
  recommendations.forEach((rec) => recsMap.set(rec.drive_id, rec));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Eligible Placement Drives"
        subtitle="Explore active campus drives, requirement breakdowns and submit applications."
        icon={<Briefcase className="w-5 h-5 text-white" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      {/* PROFILE COMPLETION BANNER ON DRIVES PAGE */}
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
        <div className="p-4 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] flex items-center justify-between gap-4 text-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#F8FAFC]">Personalized Matching & Eligibility Unavailable</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">
                Upload and analyze your resume in the Resume Analyzer to discover placement opportunities you are eligible for.
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
            Go to Resume Analyzer
          </Button>
        </div>
      )}

      {/* DRIVES LIST */}
      <div className="space-y-4">
        {drives.map((drive) => {
          const applied = hasAppliedToDrive(drive.id);
          const rec = recsMap.get(drive.id);

          const isEligible = hasResume ? (rec ? rec.eligible : isProfileComplete) : false;
          const matchScore = hasResume && rec ? rec.match_score : 0;
          const matchedSkills = rec?.matched_skills || [];
          const skillGaps = rec?.skill_gaps || [];
          const reasons = rec?.eligibility_reasons || [];

          return (
            <Card key={drive.id} className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-base flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-[#3B82F6]" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#F8FAFC]">{drive.companyName}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 font-bold">
                        {drive.packageLpa} LPA
                      </span>

                      {/* Dynamic Eligibility & Match Badges */}
                      {hasResume ? (
                        <>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                              isEligible
                                ? 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border-[rgba(34,197,94,0.3)]'
                                : 'bg-[rgba(239,68,68,0.15)] text-[#FCA5A5] border-[rgba(239,68,68,0.3)]'
                            }`}
                          >
                            {isEligible ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> : <XCircle className="w-3 h-3 text-[#EF4444]" />}
                            {isEligible ? 'Eligible' : 'Not Eligible'}
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

                    <p className="text-xs font-semibold text-[#CBD5E1]">{drive.roleTitle} &bull; {drive.employmentType || 'Full-time'}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" /> {drive.location}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" /> Deadline: {drive.deadline}
                      </span>
                      {drive.minCgpa && (
                        <>
                          <span>&bull;</span>
                          <span>Min CGPA: <strong className="text-[#F8FAFC]">{drive.minCgpa}</strong></span>
                        </>
                      )}
                    </div>

                    {/* Ineligibility Reason Callout */}
                    {hasResume && !isEligible && reasons.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-xs text-[#FCA5A5] font-medium">
                        <strong>Missing Criteria:</strong> {reasons.join(' ')}
                      </div>
                    )}

                    {/* Required & Matched Skills */}
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
                                className="px-2 py-0.5 rounded bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)] text-[11px] font-medium"
                              >
                                &bull; {skill}
                              </span>
                            ))}
                          </>
                        ) : (
                          drive.requiredSkills.map((skill, i) => (
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

                {/* Application Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-2 bg-[#0B1628] border-[#243650] text-[#CBD5E1] hover:text-white"
                    onClick={() => navigate(`/companies/${drive.id}`)}
                  >
                    Drive Details
                  </Button>

                  {applied ? (
                    <span className="text-xs font-bold text-[#60A5FA] bg-[rgba(59,130,246,0.15)] px-3 py-2 rounded-xl border border-[rgba(59,130,246,0.30)] flex items-center justify-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" /> Applied
                    </span>
                  ) : !hasResume ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs py-2 px-3 bg-[#1E293B] border-[#334155] text-[#FCD34D] hover:bg-[#334155] flex items-center justify-center gap-1.5 cursor-pointer"
                      icon={<Lock className="w-3.5 h-3.5 text-[#F59E0B]" />}
                      onClick={() => navigate('/student/resume')}
                      title="Upload your resume to complete your profile before applying."
                    >
                      Upload Resume to Apply (0%)
                    </Button>
                  ) : isEligible ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs py-2 px-4 shadow-md"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => applyToDrive(drive.id, user?.id)}
                    >
                      Apply Now
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="text-xs py-2 px-3 bg-[#1E293B]/50 border-[#334155] text-[#94A3B8] opacity-75 cursor-not-allowed flex items-center justify-center gap-1.5"
                      title={reasons.join(' ')}
                    >
                      Ineligible to Apply
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
