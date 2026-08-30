import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Building2, Users, ArrowRight, BarChart2, ShieldAlert } from 'lucide-react';
import { SkillGap } from '../../types';
import { Button } from '../ui/Button';

interface SkillDetailDrawerProps {
  skillGap: SkillGap | null;
  onClose: () => void;
}

export const SkillDetailDrawer: React.FC<SkillDetailDrawerProps> = ({ skillGap, onClose }) => {
  const navigate = useNavigate();

  if (!skillGap) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0B1628] text-[#F8FAFC] h-full p-4 sm:p-6 shadow-[0_12px_35px_rgba(0,0,0,0.5)] overflow-y-auto space-y-4 sm:space-y-6 border-l border-[#243650]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#243650] gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] font-bold text-xs shadow-xs shrink-0">
              <BarChart2 className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">{skillGap.skill} Skill Gap Analysis</h3>
              <p className="text-[11px] sm:text-xs text-[#CBD5E1] truncate">Industry demand vs campus proficiency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650]">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Recruiter Demand</span>
            <div className="text-xl font-bold text-[#60A5FA] mt-0.5">{skillGap.industryDemand}%</div>
          </div>
          <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650]">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Student Skill</span>
            <div className="text-xl font-bold text-[#F8FAFC] mt-0.5">{skillGap.studentProficiency}%</div>
          </div>
          <div className="p-3 bg-[rgba(245,158,11,0.10)] rounded-xl border border-[rgba(245,158,11,0.25)]">
            <span className="text-[10px] font-bold text-[#FCD34D] uppercase">Campus Deficit</span>
            <div className="text-xl font-bold text-[#FCD34D] mt-0.5">{skillGap.gapPercent}%</div>
          </div>
        </div>

        {/* AFFECTED STUDENTS COUNTER */}
        <div className="p-4 rounded-xl border border-[#243650] bg-[#101D31] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#F8FAFC] block">Students Needing Improvement</span>
            <span className="text-[11px] text-[#CBD5E1] font-medium">Targeted workshop roster</span>
          </div>
          <span className="text-2xl font-bold text-[#60A5FA]">{skillGap.affectedCount} Students</span>
        </div>

        {/* RELATED PLACEMENT DRIVES */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#3B82F6]" /> Linked Active Placement Drives
          </span>
          <div className="space-y-1.5">
            {skillGap.relatedDrives.map((d) => (
              <div key={d} className="p-3 rounded-lg border border-[#243650] bg-[#101D31] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F8FAFC]">{d}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">Required Skill</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI RECOMMENDATION BOX */}
        <div className="p-4 rounded-xl border border-[rgba(59,130,246,0.30)] bg-[#101D31] space-y-2 text-xs">
          <span className="font-bold text-[#60A5FA] uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#06B6D4]" /> AI Workshop Recommendation
          </span>
          <p className="text-[#CBD5E1] font-medium leading-relaxed">{skillGap.recommendation}</p>
        </div>

        {/* ACTION BUTTON */}
        <div className="pt-2">
          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<Users className="w-4 h-4" />}
            onClick={() => {
              onClose();
              navigate('/candidates');
            }}
          >
            View Affected Student Roster
          </Button>
        </div>
      </div>
    </div>
  );
};
