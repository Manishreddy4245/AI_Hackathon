import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, Sparkles, UserCheck, Check, ArrowRight } from 'lucide-react';
import { ExceptionItem } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { Button } from '../ui/Button';

interface ExceptionDetailModalProps {
  exception: ExceptionItem | null;
  onClose: () => void;
}

export const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = ({ exception, onClose }) => {
  const { approveExceptionRecommendation, updateExceptionStatus } = usePlacement();

  if (!exception) return null;

  const handleApprove = () => {
    approveExceptionRecommendation(exception.id);
    onClose();
  };

  const handleIgnore = () => {
    updateExceptionStatus(exception.id, 'ignored');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg font-bold text-xs shadow-xs ${
                exception.severity === 'critical'
                  ? 'bg-rose-600 text-white'
                  : exception.severity === 'warning'
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-blue-600 text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">AI Exception Review & Resolution</h3>
              <p className="text-xs text-slate-400">Category: {exception.category.toUpperCase()} &bull; ID: {exception.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Issue Overview Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  exception.severity === 'critical'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : exception.severity === 'warning'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {exception.severity} SEVERITY
              </span>
              <span className="text-slate-500 font-semibold">{exception.timestamp}</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{exception.title}</h4>
            <p className="text-slate-700 leading-relaxed font-medium">{exception.description}</p>
            <div className="pt-1 text-[11px] text-slate-600">
              Affected Entity: <span className="font-bold text-slate-900">{exception.affectedEntity}</span>
            </div>
          </div>

          {/* AI RECOMMENDATION BOX */}
          <div className="p-4 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/40 via-white to-slate-50 space-y-3">
            <div className="flex items-center justify-between border-b border-brand-100 pb-2">
              <span className="text-xs font-bold text-brand-900 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" /> AI Recommended Resolution
              </span>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                Verified Optimal
              </span>
            </div>

            <p className="text-xs font-bold text-slate-900 leading-relaxed">{exception.aiRecommendation}</p>

            {/* Suggested Action Verification Indicators */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">Proposed Operation Details:</span>
              <p className="font-bold text-brand-800">{exception.suggestedActionText}</p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-bold text-emerald-700">
                {exception.candidateAvailable !== false && <span>✓ Candidate available</span>}
                {exception.panelAvailable !== false && <span>✓ Panel available</span>}
                {exception.roomAvailable !== false && <span>✓ Room available</span>}
              </div>
            </div>

            {/* MANDATORY HUMAN-IN-THE-LOOP CONTROL NOTICE (SECTION 13 REQUIREMENT) */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>AI Recommendation — Requires Placement Officer approval before applying changes.</span>
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-100 px-2 py-0.5 rounded text-amber-800">
                Human Oversight Required
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={handleIgnore}>
              Ignore Exception
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => alert('Custom override workflow opened.')}
              >
                Choose Another Action
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-4 h-4" />}
                onClick={handleApprove}
              >
                Approve Recommendation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
