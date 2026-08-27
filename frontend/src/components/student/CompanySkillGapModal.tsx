import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Target,
  GraduationCap,
  Award,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';

interface CompanySkillGapModalProps {
  opportunityId: string | null;
  onClose: () => void;
}

export const CompanySkillGapModal: React.FC<CompanySkillGapModalProps> = ({
  opportunityId,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (opportunityId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opportunityId, onClose]);

  // Fetch opportunity specific skill gap analysis
  useEffect(() => {
    if (!opportunityId) return;
    let isMounted = true;
    const fetchSkillGap = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.getOpportunitySkillGap(opportunityId);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.detail || 'Failed to load skill gap analysis');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSkillGap();
    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  if (!opportunityId) return null;

  const matchedSkills: string[] = data?.skills_you_have || [];
  const missingSkills: string[] = data?.skills_you_need || [];
  const studentAllSkills: string[] = data?.student_all_skills || matchedSkills;
  const isEligible = data?.is_eligible ?? false;
  const matchScore = data?.match_score ?? 0;

  // Combine matched and missing for complete required skills list
  const requiredSkills = Array.from(new Set([...matchedSkills, ...missingSkills]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F172A] border border-[#243650] rounded-2xl shadow-2xl text-[#F8FAFC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-[#101D31]/95 backdrop-blur border-b border-[#243650]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                {data ? `${data.company} — Skill Gap Analysis` : 'Loading Skill Gap...'}
              </h2>
              <p className="text-xs text-[#94A3B8] font-medium">
                {data ? `${data.role} • ${data.source_label}` : 'Target Opportunity Breakdown'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
              <p className="text-xs font-semibold">Comparing your resume against company requirements...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-xs text-[#FCA5A5]">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Top Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isEligible
                    ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)]'
                    : 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.25)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isEligible ? (
                    <ShieldCheck className="w-6 h-6 text-[#22C55E] shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-[#F59E0B] shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F8FAFC]">
                        {isEligible ? 'Eligible for this Opportunity' : 'Not Currently Eligible'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                          isEligible
                            ? 'bg-[#22C55E]/20 text-[#86EFAC] border-[#22C55E]/30'
                            : 'bg-[#F59E0B]/20 text-[#FCD34D] border-[#F59E0B]/30'
                        }`}
                      >
                        {matchScore}% Match
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                      {isEligible
                        ? 'Your extracted resume skills satisfy the core requirements for this position.'
                        : missingSkills.length > 0
                        ? 'Required skills are missing from your resume profile for this role.'
                        : 'Review eligibility details below to prepare for this opportunity.'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-[#94A3B8]">Required Skills Match</div>
                  <div className="text-lg font-black text-[#F8FAFC]">{data.match_fraction}</div>
                </div>
              </div>

              {/* Ineligibility Reason Banner */}
              {!isEligible && (
                <div className="p-3.5 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-xs space-y-1">
                  <div className="font-bold text-[#FCA5A5] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-[#EF4444]" />
                    Why you're not eligible:
                  </div>
                  <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
                    {missingSkills.length > 0
                      ? `Required technical skills missing: ${missingSkills.join(', ')}.`
                      : 'Academic or branch criteria listed below are not satisfied.'}
                  </p>
                </div>
              )}

              {/* Skills Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Your Skills (Extracted from Resume) */}
                <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#86EFAC]">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    Your Skills (Resume Extracted)
                  </div>
                  {studentAllSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {studentAllSkills.map((skill: string, idx: number) => {
                        const isMatch = matchedSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
                        return (
                          <span
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                              isMatch
                                ? 'bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]'
                                : 'bg-[#14243B] text-[#CBD5E1] border-[#243650]'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> {skill}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8] italic pt-1">
                      Upload your resume in the Resume Analyzer to populate your skills.
                    </p>
                  )}
                </div>

                {/* Required Skills (Role Requirements) */}
                <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F8FAFC]">
                    <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                    Required Skills ({requiredSkills.length})
                  </div>
                  {requiredSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {requiredSkills.map((skill: string, idx: number) => {
                        const isSatisfied = matchedSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
                        return (
                          <span
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                              isSatisfied
                                ? 'bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]'
                                : 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.25)]'
                            }`}
                          >
                            {isSatisfied ? (
                              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                            ) : (
                              <XCircle className="w-3 h-3 text-[#EF4444]" />
                            )}
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#86EFAC] font-medium pt-1">
                      General eligibility requirements apply.
                    </p>
                  )}
                </div>
              </div>

              {/* Missing Skills Highlight */}
              {missingSkills.length > 0 && (
                <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FCD34D]">
                    <XCircle className="w-4 h-4 text-[#F59E0B]" />
                    Missing Skills to Acquire ({missingSkills.length})
                  </div>
                  <ul className="space-y-1.5 pt-1">
                    {missingSkills.map((skill: string, idx: number) => (
                      <li key={idx} className="text-xs text-[#CBD5E1] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        <strong className="text-white">{skill}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Academic & Non-Skill Criteria */}
              {data.source_type === 'college' && data.non_skill_criteria && (
                <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-3">
                  <div className="text-xs font-bold text-[#94A3B8] flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#3B82F6]" />
                    Academic &amp; Eligibility Criteria
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {data.non_skill_criteria.min_cgpa?.required && (
                      <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          data.non_skill_criteria.min_cgpa.satisfied
                            ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.2)] text-[#86EFAC]'
                            : 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)] text-[#FCA5A5]'
                        }`}
                      >
                        <span>Min CGPA: {data.non_skill_criteria.min_cgpa.required}</span>
                        <span>{data.non_skill_criteria.min_cgpa.satisfied ? '✓ Pass' : '✗ Unmet'}</span>
                      </div>
                    )}
                    {data.non_skill_criteria.eligible_branches?.required?.length > 0 && (
                      <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          data.non_skill_criteria.eligible_branches.satisfied
                            ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.2)] text-[#86EFAC]'
                            : 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)] text-[#FCA5A5]'
                        }`}
                      >
                        <span>Branch: {data.non_skill_criteria.eligible_branches.student}</span>
                        <span>{data.non_skill_criteria.eligible_branches.satisfied ? '✓ Eligible' : '✗ Ineligible'}</span>
                      </div>
                    )}
                    {data.non_skill_criteria.graduation_year?.required && (
                      <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          data.non_skill_criteria.graduation_year.satisfied
                            ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.2)] text-[#86EFAC]'
                            : 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)] text-[#FCA5A5]'
                        }`}
                      >
                        <span>Batch: {data.non_skill_criteria.graduation_year.required}</span>
                        <span>{data.non_skill_criteria.graduation_year.satisfied ? '✓ Valid' : '✗ Unmet'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actionable Learning Roadmap Steps */}
              {data.roadmap_steps && data.roadmap_steps.length > 0 && (
                <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F8FAFC]">
                    <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                    Actionable Roadmap to Become Eligible
                  </div>
                  <div className="space-y-2">
                    {data.roadmap_steps.map((step: any) => (
                      <div
                        key={step.step}
                        className="p-3 rounded-lg bg-[#0B1628] border border-[#243650] flex items-start gap-3 text-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#60A5FA] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {step.step}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold text-[#F8FAFC] flex items-center gap-2">
                            <span>Learn {step.skill}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                step.importance === 'Mandatory'
                                  ? 'bg-[#EF4444]/20 text-[#FCA5A5]'
                                  : 'bg-[#F59E0B]/20 text-[#FCD34D]'
                              }`}
                            >
                              {step.importance}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] font-medium">{step.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between p-4 bg-[#101D31]/95 backdrop-blur border-t border-[#243650]">
          <span className="text-xs text-[#64748B]">PlaceMind AI Placement Matching Engine</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
