import React, { useState } from 'react';
import { X, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

interface RecruiterSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const RecruiterSignupModal: React.FC<RecruiterSignupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    designation: 'Campus Talent Acquisition Lead',
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

    if (!formData.name || !formData.email || !formData.companyName) {
      setError('Please fill in all mandatory fields (Name, Email, Company Name)');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.registerRecruiter({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
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
      setError(err.response?.data?.detail || 'Failed to complete recruiter registration');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0B1628] border border-[#243650] rounded-2xl p-6 sm:p-8 shadow-[0_12px_35px_rgba(0,0,0,0.5)] relative text-[#F8FAFC]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-xl text-[#22D3EE]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#F8FAFC]">Recruiter Registration</h3>
            <p className="text-xs text-[#CBD5E1]">Request corporate hiring portal access &amp; manage placement drives</p>
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
                placeholder="Recruiter Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Company / Organization *</label>
              <input
                type="text"
                required
                placeholder="Google / Microsoft / TCS"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Work Email *</label>
              <input
                type="email"
                required
                placeholder="recruiter@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Designation / Role Title</label>
              <input
                type="text"
                placeholder="Talent Acquisition Lead"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
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
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
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
                className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Contact Phone (Optional)</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-[#101D31] border border-[#243650] rounded-lg text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#101D31] hover:bg-[#1E293B] text-[#CBD5E1] font-semibold rounded-lg text-sm transition-colors border border-[#243650] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-[#06B6D4] to-[#0284C7] hover:from-[#22D3EE] hover:to-[#0369A1] text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Recruiter...</span>
                </>
              ) : (
                <span>Register Recruiter Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
