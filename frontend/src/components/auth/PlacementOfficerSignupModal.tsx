import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

interface PlacementOfficerSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const PlacementOfficerSignupModal: React.FC<PlacementOfficerSignupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: 'Campus University',
    designation: 'Head of Placement & Training (TPO)',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.name || !formData.email || !formData.college) {
      setError('Please fill in all mandatory fields (Name, Official Email, College / Institution)');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.registerPlacementOfficer({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        college: formData.college,
        designation: formData.designation,
        phone: formData.phone || undefined,
      });

      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
      }
      if (res.refresh_token) {
        localStorage.setItem('placemind_refresh_token', res.refresh_token);
      }
      setLoading(false);
      onSuccess(formData.email);
    } catch (err: any) {
      setLoading(false);
      if (err.response?.status === 404) {
        setError('Registration service endpoint not found (404). Please ensure the backend server is running the latest API version.');
      } else if (err.response?.status === 409) {
        setError('An account with this institutional email is already registered.');
      } else if (err.response?.status === 400 || err.response?.status === 422) {
        setError(err.response?.data?.detail || 'Invalid registration details provided.');
      } else if (err.response?.status >= 500) {
        setError('Internal server error occurred during registration. Please try again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to complete Placement Officer registration.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0B1628] border border-[#243650] rounded-2xl p-5 sm:p-8 shadow-[0_12px_35px_rgba(0,0,0,0.5)] relative text-[#F8FAFC] max-h-[94vh] sm:max-h-[90vh] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-[#86EFAC]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#F8FAFC]">Placement Officer Registration</h3>
            <p className="text-xs text-[#CBD5E1]">Register institutional coordinator account &amp; manage campus drives</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)] rounded-xl text-[#FCA5A5] text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Officer Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">College / Institution *</label>
              <input
                type="text"
                required
                placeholder="Campus University"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Official Institutional Email *</label>
              <input
                type="email"
                required
                placeholder="tpo@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Designation / Role Title</label>
              <input
                type="text"
                placeholder="Head of Placements (TPO)"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Confirm Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Contact Phone (Optional)</label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#22C55E] to-[#10B981] hover:from-[#4ADE80] hover:to-[#059669] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Placement Officer Account...</span>
                </>
              ) : (
                <span>Register Officer Account &amp; Access Portal</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
