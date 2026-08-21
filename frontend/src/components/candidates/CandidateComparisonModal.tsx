import React from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { CandidateMatch } from '../../types';
import { MatchScore } from '../ui/MatchScore';

interface CandidateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateMatch[];
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  isOpen,
  onClose,
  candidates,
}) => {
  if (!isOpen || candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-5xl overflow-hidden border border-[#243650] my-6 animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Side-by-Side Candidate Comparison</h3>
              <p className="text-xs text-[#CBD5E1]">Comparing {candidates.length} candidates for drive requirements</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6 overflow-x-auto">
          <div className={`grid gap-4 ${candidates.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {candidates.map((c) => (
              <div key={c.studentId} className="p-4 rounded-xl border border-[#243650] bg-[#101D31] space-y-4">
                {/* Profile Header */}
                <div className="text-center pb-3 border-b border-[#243650] space-y-2">
                  <img
                    src={c.studentAvatar}
                    alt={c.studentName}
                    className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-[#3B82F6] shadow-md"
                  />
                  <div>
                    <h4 className="text-base font-bold text-[#F8FAFC]">{c.studentName}</h4>
                    <p className="text-xs text-[#CBD5E1] font-semibold">{c.branch} &bull; CGPA: {c.cgpa}</p>
                  </div>
                  <MatchScore score={c.matchScore} />
                </div>

                {/* Matched Skills */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {c.matchedSkills.map((s) => (
                      <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skill Gaps */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Skill Gaps</span>
                  <div className="flex flex-wrap gap-1">
                    {c.missingSkills.length > 0 ? (
                      c.missingSkills.map((s) => (
                        <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)]">
                          ✕ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#86EFAC] font-semibold">None (Full Skill Match)</span>
                    )}
                  </div>
                </div>

                {/* Relevant Projects */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Relevant Projects</span>
                  {c.relevantProjects.length > 0 ? (
                    <ul className="text-xs text-[#CBD5E1] space-y-1 font-medium">
                      {c.relevantProjects.map((p) => (
                        <li key={p.name} className="p-2 rounded bg-[#0B1628] border border-[#243650] leading-snug">
                          <span className="font-bold text-[#F8FAFC]">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-[#64748B]">No matching projects listed</span>
                  )}
                </div>

                {/* AI Recommendation */}
                <div className="p-3 rounded-lg bg-[#0B1628] border border-[#243650] text-xs space-y-1">
                  <span className="text-[10px] font-bold text-[#3B82F6] uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#06B6D4]" /> AI Recommendation
                  </span>
                  <p className="text-[#CBD5E1] leading-relaxed text-[11px] font-medium">{c.aiRecommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
