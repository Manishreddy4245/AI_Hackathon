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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden border border-[#243650] my-6 animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg font-bold text-xs shadow-xs ${
                exception.severity === 'critical'
                  ? 'bg-[rgba(239,68,68,0.20)] text-[#EF4444]'
                  : exception.severity === 'warning'
                  ? 'bg-[rgba(245,158,11,0.20)] text-[#F59E0B]'
                  : 'bg-[rgba(59,130,246,0.20)] text-[#3B82F6]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">AI Exception Review &amp; Resolution</h3>
              <p className="text-xs text-[#CBD5E1]">Category: {exception.category.toUpperCase()} &bull; ID: {exception.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Issue Overview Card */}
          <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  exception.severity === 'critical'
                    ? 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)]'
                    : exception.severity === 'warning'
                    ? 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]'
                    : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]'
                }`}
              >
                {exception.severity} SEVERITY
              </span>
              <span className="text-[#CBD5E1] font-semibold">{exception.timestamp}</span>
            </div>
            <h4 className="text-base font-bold text-[#F8FAFC]">{exception.title}</h4>
            <p className="text-[#CBD5E1] leading-relaxed font-medium">{exception.description}</p>
            <div className="pt-1 text-[11px] text-[#94A3B8]">
              Affected Entity: <span className="font-bold text-[#F8FAFC]">{exception.affectedEntity}</span>
            </div>
          </div>

          {/* AI RECOMMENDATION BOX */}
          <div className="p-4 rounded-xl ai-card-surface space-y-3">
            <div className="flex items-center justify-between border-b border-[#243650] pb-2">
              <span className="text-xs font-bold text-[#F8FAFC] uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#06B6D4]" /> AI Recommended Resolution
              </span>
              <span className="text-[10px] font-bold text-[#60A5FA] bg-[#3B82F6]/20 px-2 py-0.5 rounded border border-[#3B82F6]/30">
                Verified Optimal
              </span>
            </div>

            <p className="text-xs font-bold text-[#F8FAFC] leading-relaxed">{exception.aiRecommendation}</p>

            {/* Suggested Action Verification Indicators */}
            <div className="p-3 bg-[#101D31] rounded-lg border border-[#243650] space-y-2 text-xs">
              <span className="font-semibold text-[#CBD5E1] block">Proposed Operation Details:</span>
              <p className="font-bold text-[#60A5FA]">{exception.suggestedActionText}</p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-bold text-[#86EFAC]">
                {exception.candidateAvailable !== false && <span>✓ Candidate available</span>}
                {exception.panelAvailable !== false && <span>✓ Panel available</span>}
                {exception.roomAvailable !== false && <span>✓ Room available</span>}
              </div>
            </div>

            {/* MANDATORY HUMAN-IN-THE-LOOP CONTROL NOTICE */}
            <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.25)] text-[11px] font-semibold text-[#FCD34D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>AI Recommendation — Requires Placement Officer approval before applying changes.</span>
              </div>
              <span className="text-[10px] font-bold uppercase bg-[rgba(245,158,11,0.20)] px-2 py-0.5 rounded text-[#FCD34D]">
                Human Oversight Required
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#243650] flex flex-col sm:flex-row items-center justify-between gap-3">
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
