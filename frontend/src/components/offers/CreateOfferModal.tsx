import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  Award,
  DollarSign,
  FileText,
  X,
  Send,
  Loader2,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
  onOfferIssued?: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onOfferIssued,
}) => {
  const { triggerToast } = usePlacement();

  const [packageLpa, setPackageLpa] = useState<number>(12.0);
  const [baseSalaryLpa, setBaseSalaryLpa] = useState<number>(9.6);
  const [joiningBonusLpa, setJoiningBonusLpa] = useState<number>(0.0);
  const [designation, setDesignation] = useState<string>('Software Development Engineer');
  const [jobLocation, setJobLocation] = useState<string>('Bengaluru, India');
  const [employmentType, setEmploymentType] = useState<string>('Full-time');
  const [joiningDate, setJoiningDate] = useState<string>(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [responseDeadline, setResponseDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customLetterText, setCustomLetterText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync state whenever candidate changes or modal opens
  React.useEffect(() => {
    if (candidate && isOpen) {
      const ctc = Number(candidate.package_lpa || candidate.packageLpa || 12.0);
      setPackageLpa(ctc);
      setBaseSalaryLpa(parseFloat((ctc * 0.8).toFixed(2)));
      setJoiningBonusLpa(0.0);
      setDesignation(candidate.job_title || candidate.roleTitle || 'Software Development Engineer');
      setJobLocation(candidate.job_location || candidate.location || 'Bengaluru, India');
      setEmploymentType(candidate.employment_type || 'Full-time');
      setJoiningDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setResponseDeadline(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setCustomLetterText('');
      setSubmitting(false);
    }
  }, [candidate, isOpen]);

  if (!isOpen || !candidate) return null;

  const normalizeDate = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    // Match DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!packageLpa || Number(packageLpa) <= 0) {
      triggerToast('Please enter a valid CTC in LPA.', 'warning');
      return;
    }
    if (!joiningDate) {
      triggerToast('Please provide a tentative joining date.', 'warning');
      return;
    }

    const appId = candidate.application_id || candidate.applicationId || candidate.id;
    if (!appId) {
      triggerToast('Unable to issue offer: candidate application identifier was not found.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        application_id: appId,
        student_id: candidate.student_id || candidate.studentId,
        drive_id: candidate.drive_id || candidate.driveId,
        company_name: candidate.company_name || candidate.companyName,
        job_title: candidate.job_title || candidate.roleTitle,
        package_lpa: Number(packageLpa),
        base_salary_lpa: Number(baseSalaryLpa) || Number(packageLpa) * 0.8,
        joining_bonus_lpa: Number(joiningBonusLpa) || 0,
        designation: designation.trim() || 'Software Development Engineer',
        job_location: jobLocation.trim() || 'Bengaluru, India',
        employment_type: employmentType || 'Full-time',
        joining_date: normalizeDate(joiningDate),
        response_deadline: responseDeadline ? normalizeDate(responseDeadline) : undefined,
        offer_letter_text: customLetterText.trim() || undefined,
      };

      await apiService.createOffer(payload);
      triggerToast(`🎉 Official Offer Letter successfully issued to ${candidate.student_name || candidate.applicant?.name || 'Candidate'}!`, 'success');
      if (onOfferIssued) onOfferIssued();
      onClose();
    } catch (err: any) {
      console.error('Failed to issue offer letter:', err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      
      let errorMsg = 'Failed to issue offer letter. Please try again.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        errorMsg = `Validation error: ${detail[0].msg}`;
      } else if (status === 401) {
        errorMsg = 'Unable to issue offer: session expired. Please log in again.';
      } else if (status === 403) {
        errorMsg = 'Unable to issue offer: you are not authorized for this application.';
      } else if (status === 404) {
        errorMsg = 'Unable to issue offer: candidate application was not found.';
      } else if (status === 409) {
        errorMsg = detail || 'Unable to issue offer: an active offer letter already exists for this application.';
      } else if (status === 422) {
        errorMsg = 'Unable to issue offer: server validation failed. Please verify the entered dates and numbers.';
      } else if (status >= 500) {
        errorMsg = 'Unable to issue offer: server error encountered. Please try again later.';
      }
      
      triggerToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#243650] flex items-center justify-between bg-[#14243B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Issue Official Offer Letter</h3>
              <p className="text-xs text-[#94A3B8]">
                Generating employment offer for <span className="text-cyan-300 font-bold">{candidate.student_name || candidate.applicant?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0B1628] border border-[#243650] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Candidate & Drive Summary */}
          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#1C2C42] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#94A3B8] block">Candidate:</span>
              <strong className="text-white font-bold">{candidate.student_name || candidate.applicant?.name}</strong>
            </div>
            <div>
              <span className="text-[#94A3B8] block">Company:</span>
              <strong className="text-cyan-400 font-bold">{candidate.company_name || candidate.companyName}</strong>
            </div>
            <div>
              <span className="text-[#94A3B8] block">Role:</span>
              <strong className="text-white font-bold">{candidate.job_title || candidate.roleTitle}</strong>
            </div>
          </div>

          {/* Compensation Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
                Total CTC (LPA) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={packageLpa}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPackageLpa(val);
                  setBaseSalaryLpa(parseFloat((val * 0.8).toFixed(2)));
                }}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
                Base Salary (LPA)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={baseSalaryLpa}
                onChange={(e) => setBaseSalaryLpa(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
                Joining Bonus (LPA)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={joiningBonusLpa}
                onChange={(e) => setJoiningBonusLpa(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Designation & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
                Official Designation
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
                Work Location
              </label>
              <input
                type="text"
                required
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Tentative Joining Date *
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Response Deadline *
              </label>
              <input
                type="date"
                required
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Custom Letter Remarks / Text Override */}
          <div>
            <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">
              Custom Offer Letter Message &amp; Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Leave empty to use standard formal corporate offer letter template."
              value={customLetterText}
              onChange={(e) => setCustomLetterText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-xs font-normal focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#243650] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="border-[#243650] text-[#CBD5E1]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Issuing Offer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Issue Offer Letter
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
