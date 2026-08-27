import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, X, BrainCircuit } from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

interface AllocateAptitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    id: string;
    student_name?: string;
    studentName?: string;
    company_name?: string;
    companyName?: string;
    job_title?: string;
    roleTitle?: string;
    drive_id?: string;
    driveId?: string;
    student_id?: string;
    studentId?: string;
  } | null;
  onSuccess?: (res: any) => void;
}

export const AllocateAptitudeModal: React.FC<AllocateAptitudeModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) => {
  const { triggerToast } = usePlacement();
  const [title, setTitle] = useState('Aptitude Assessment');
  const [scheduledAt, setScheduledAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !candidate) return null;

  const studentName = candidate.student_name || candidate.studentName || 'Student Candidate';
  const companyName = candidate.company_name || candidate.companyName || 'Company';
  const jobTitle = candidate.job_title || candidate.roleTitle || 'Placement Role';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        application_id: candidate.id,
        drive_id: candidate.drive_id || candidate.driveId,
        student_id: candidate.student_id || candidate.studentId,
        round_type: 'APTITUDE',
        title: title.trim() || 'Aptitude Assessment',
        scheduled_at: scheduledAt || undefined,
        deadline: deadline || undefined,
        duration_minutes: Number(durationMinutes) || 30,
      };

      const result = await apiService.allocateAptitude(payload);
      triggerToast(`Allocated Aptitude Round to ${studentName}! Notification dispatched.`, 'success');
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to allocate aptitude round:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to allocate aptitude round.';
      setErrorMsg(detail);
      triggerToast(detail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-lg border border-[#243650] overflow-hidden text-[#F8FAFC] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Allocate Aptitude Round</h3>
              <p className="text-xs text-[#CBD5E1]">{studentName} &bull; {companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-[#101D31] rounded-xl border border-[#243650] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Target Candidate &amp; Placement Role</span>
            <p className="text-xs font-bold text-[#F8FAFC]">{studentName}</p>
            <p className="text-xs text-[#60A5FA]">{jobTitle} at {companyName}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block">
              Round Type
            </label>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              APTITUDE
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block">
              Assessment Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Aptitude Assessment"
              className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#3B82F6]" /> Scheduled Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" /> Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-bold"
            />
          </div>

          <div className="pt-3 border-t border-[#243650] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Allocating...' : 'Confirm Aptitude Allocation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
