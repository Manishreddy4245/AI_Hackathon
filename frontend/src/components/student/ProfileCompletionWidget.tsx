import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Sparkles, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  weight?: number;
}

interface ProfileCompletionWidgetProps {
  completion: number;
  isComplete: boolean;
  missingRequirements?: string[];
  checklist?: ChecklistItem[];
  compact?: boolean;
  showCTA?: boolean;
}

export const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({
  completion,
  isComplete,
  missingRequirements = [],
  checklist = [],
  compact = false,
  showCTA = true,
}) => {
  const navigate = useNavigate();
  const clampedCompletion = Math.min(100, Math.max(0, completion || 0));

  const defaultChecklist: ChecklistItem[] = [
    { key: 'resume', label: 'Resume Upload & AI Analysis', completed: isComplete || clampedCompletion >= 25 },
    { key: 'skills', label: 'Verified Technical Skills', completed: isComplete || clampedCompletion >= 50 },
    { key: 'education', label: 'Academic & Education Details', completed: isComplete || clampedCompletion >= 75 },
    { key: 'projects', label: 'Projects & Experience', completed: isComplete || clampedCompletion >= 100 },
  ];

  const items = checklist.length > 0 ? checklist : defaultChecklist;

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border ${isComplete ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.25)]' : 'bg-[rgba(245,158,11,0.06)] border-[rgba(245,158,11,0.25)]'} text-[#F8FAFC]`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#F8FAFC]">
                  {isComplete ? 'Profile Complete (Ready to Apply)' : `Profile Incomplete (${clampedCompletion}%)`}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isComplete ? 'bg-[#22C55E]/20 text-[#86EFAC]' : 'bg-[#F59E0B]/20 text-[#FCD34D]'}`}>
                  {isComplete ? 'Eligible' : 'Gated'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">
                {isComplete
                  ? 'All placement criteria verified. You can submit drive applications.'
                  : 'Upload your resume to extract verified skills and unlock drive applications.'}
              </p>
            </div>
          </div>
          {!isComplete && showCTA && (
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 text-xs py-1.5 px-3"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => navigate('/student/resume')}
            >
              Complete Profile
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#101D31] rounded-2xl border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] space-y-5 text-[#F8FAFC]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isComplete ? 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border border-[rgba(34,197,94,0.30)]' : 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border border-[rgba(245,158,11,0.30)]'}`}>
              {isComplete ? <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> : <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />}
              {isComplete ? 'Placement Eligible' : 'Application Submission Gated'}
            </span>
          </div>
          <h3 className="text-lg font-black text-[#F8FAFC]">
            {isComplete ? 'Profile Complete & Placement Verified' : 'Complete Your Placement Profile'}
          </h3>
          <p className="text-xs text-[#CBD5E1] max-w-xl font-medium leading-relaxed">
            {isComplete
              ? 'Your profile contains verified skills and academic credentials extracted from your resume. You are eligible to apply for active placement drives.'
              : 'PlaceMind requires an uploaded resume and verified technical skills before you can register for campus placement drives.'}
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center gap-4 shrink-0 shadow-md">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="#17253A" strokeWidth="5" fill="transparent" />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke={isComplete ? '#22C55E' : '#3B82F6'}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray="163"
                strokeDashoffset={163 - (163 * clampedCompletion) / 100}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-sm font-black text-[#FFFFFF]">
              {clampedCompletion}%
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-[#F8FAFC] block">Profile Completion</span>
            <span className="text-[11px] text-[#94A3B8] block">
              {isComplete ? 'All Requirements Met' : `${clampedCompletion} of 100% completed`}
            </span>
            {!isComplete && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 text-[11px] py-1 bg-[#101D31] border-[#243650] text-[#60A5FA] hover:text-white"
                icon={<ArrowRight className="w-3 h-3" />}
                onClick={() => navigate('/student/resume')}
              >
                Upload Resume
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar & Checklist */}
      <div className="space-y-3 pt-2 border-t border-[#1B2A40]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.key}
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${item.completed ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#86EFAC]' : 'bg-[#0B1628] border-[#243650] text-[#94A3B8]'}`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
              )}
              <span className={item.completed ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
