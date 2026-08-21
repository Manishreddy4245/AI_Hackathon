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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl overflow-y-auto space-y-6 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{skillGap.skill} Skill Gap Analysis</h3>
              <p className="text-xs text-slate-500">Industry demand vs campus proficiency</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Recruiter Demand</span>
            <div className="text-xl font-bold text-brand-600 mt-0.5">{skillGap.industryDemand}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Student Skill</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{skillGap.studentProficiency}%</div>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Campus Deficit</span>
            <div className="text-xl font-bold text-amber-900 mt-0.5">{skillGap.gapPercent}%</div>
          </div>
        </div>

        {/* AFFECTED STUDENTS COUNTER */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Students Needing Improvement</span>
            <span className="text-[11px] text-slate-500 font-medium">Targeted workshop roster</span>
          </div>
          <span className="text-2xl font-bold text-brand-600">{skillGap.affectedCount} Students</span>
        </div>

        {/* RELATED PLACEMENT DRIVES */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-brand-600" /> Linked Active Placement Drives
          </span>
          <div className="space-y-1.5">
            {skillGap.relatedDrives.map((d) => (
              <div key={d} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">{d}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">Required Skill</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI RECOMMENDATION BOX */}
        <div className="p-4 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/40 via-white to-slate-50 space-y-2 text-xs">
          <span className="font-bold text-brand-900 uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-600" /> AI Workshop Recommendation
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">{skillGap.recommendation}</p>
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
