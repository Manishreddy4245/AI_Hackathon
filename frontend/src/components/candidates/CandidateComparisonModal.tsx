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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Side-by-Side Candidate Comparison</h3>
              <p className="text-xs text-slate-400">Comparing {candidates.length} candidates for drive requirements</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6 overflow-x-auto">
          <div className={`grid gap-4 ${candidates.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {candidates.map((c) => (
              <div key={c.studentId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                {/* Profile Header */}
                <div className="text-center pb-3 border-b border-slate-200 space-y-2">
                  <img
                    src={c.studentAvatar}
                    alt={c.studentName}
                    className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-white shadow-xs"
                  />
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{c.studentName}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{c.branch} &bull; CGPA: {c.cgpa}</p>
                  </div>
                  <MatchScore score={c.matchScore} />
                </div>

                {/* Matched Skills */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {c.matchedSkills.map((s) => (
                      <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skill Gaps */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Skill Gaps</span>
                  <div className="flex flex-wrap gap-1">
                    {c.missingSkills.length > 0 ? (
                      c.missingSkills.map((s) => (
                        <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          ✕ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold">None (Full Skill Match)</span>
                    )}
                  </div>
                </div>

                {/* Relevant Projects */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Relevant Projects</span>
                  {c.relevantProjects.length > 0 ? (
                    <ul className="text-xs text-slate-700 space-y-1">
                      {c.relevantProjects.map((p) => (
                        <li key={p.name} className="p-2 rounded bg-white border border-slate-200 leading-snug">
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-400">No matching projects listed</span>
                  )}
                </div>

                {/* AI Recommendation */}
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-brand-600 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Recommendation
                  </span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{c.aiRecommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
