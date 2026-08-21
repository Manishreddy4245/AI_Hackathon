import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, ShieldCheck, GraduationCap, ArrowRight, Sparkles, Building2, Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '../../types';
import { apiService } from '../../services/api';
import { SignupModal } from '../../components/auth/SignupModal';
import { usePlacement } from '../../context/PlacementContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUserRole, triggerToast } = usePlacement();
  const [selectedRole, setSelectedRole] = useState<UserRole>('placement_officer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'placement_officer') {
      setEmail('admin@placemind.local');
      setPassword('password123');
    } else if (role === 'student') {
      setEmail('student@placemind.local');
      setPassword('password123');
    } else if (role === 'recruiter') {
      setEmail('recruiter@placemind.local');
      setPassword('password123');
    } else if (role === 'panel_member') {
      setEmail('panel@placemind.local');
      setPassword('password123');
    }
  };

  const executeLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiService.login({
        email: email || '',
        password: password || '',
        portalRole: selectedRole,
      });

      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
      }

      const role: UserRole = res.user?.role || selectedRole;
      setCurrentUserRole(role);
      setLoading(false);

      triggerToast(`Authenticated as ${res.user?.name || role}`, 'success');

      if (role === 'student') {
        navigate('/student/dashboard');
      } else if (role === 'recruiter') {
        navigate('/recruiter/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex flex-col justify-between relative overflow-hidden selection:bg-[#3B82F6] selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#3B82F6]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#06B6D4]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar Brand */}
      <header className="p-6 md:p-8 flex items-center justify-between max-w-7xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-xl shadow-glow-brand">
            P
          </div>
          <div>
            <h1 className="text-lg font-black text-[#F8FAFC] tracking-wide">PlaceMind</h1>
            <p className="text-xs text-[#94A3B8] font-medium">AI Campus Placement Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#101D31] border border-[#243650] text-[#22C55E]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
          Campus Placement SaaS v1.0
        </div>
      </header>

      {/* Main Login Workspace Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-[#101D31] rounded-2xl border border-[#243650] p-6 sm:p-8 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" /> Autonomous Interview &amp; Drive Operations
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#F8FAFC]">
              AI Campus Placement Agent
            </h2>
            <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
              Select your role or enter credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)] rounded-xl text-[#FCA5A5] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Options - 3 Roles */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-[#14243B] border-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#0B1628] border-[#243650] text-[#94A3B8] hover:border-[#31527A] hover:text-[#CBD5E1]'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-1">
                <GraduationCap className="w-4 h-4 text-[#06B6D4]" />
                <div className="text-[11px] font-bold">Student</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('recruiter')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'recruiter'
                  ? 'bg-[#14243B] border-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#0B1628] border-[#243650] text-[#94A3B8] hover:border-[#31527A] hover:text-[#CBD5E1]'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-1">
                <Building2 className="w-4 h-4 text-[#F59E0B]" />
                <div className="text-[11px] font-bold">Recruiter</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('placement_officer')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'placement_officer'
                  ? 'bg-[#14243B] border-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#0B1628] border-[#243650] text-[#94A3B8] hover:border-[#31527A] hover:text-[#CBD5E1]'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                <div className="text-[11px] font-bold">Officer</div>
              </div>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={executeLogin} className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type="email"
                  placeholder={
                    selectedRole === 'placement_officer'
                      ? 'placement@demo.com'
                      : selectedRole === 'student'
                      ? 'student@demo.com'
                      : 'recruiter@demo.com'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0B1628] border border-[#243650] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#E2E8F0]">Password</label>
                <span className="text-[11px] text-[#94A3B8] cursor-pointer hover:text-[#CBD5E1]">
                  Demo pass: password123
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[#0B1628] border border-[#243650] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] hover:from-[#60A5FA] hover:to-[#3B82F6] text-white font-bold text-sm rounded-xl transition-all shadow-[0_4px_14px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 group mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedRole === 'placement_officer'
                      ? 'Sign In as Placement Officer'
                      : selectedRole === 'student'
                      ? 'Sign In as Student'
                      : selectedRole === 'recruiter'
                      ? 'Sign In as Recruiter'
                      : 'Sign In as Panel Member'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Student Signup Trigger Link */}
          <div className="text-center pt-2 border-t border-[#243650]">
            <span className="text-xs text-[#94A3B8]">New student candidate? </span>
            <button
              type="button"
              onClick={() => setSignupModalOpen(true)}
              className="text-xs font-bold text-[#60A5FA] hover:underline cursor-pointer"
            >
              Register Account Here
            </button>
          </div>
        </div>
      </main>

      {/* Signup Modal */}
      <SignupModal
        isOpen={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSuccess={(regEmail) => {
          setSignupModalOpen(false);
          setEmail(regEmail);
          setPassword('password123');
          setSelectedRole('student');
          triggerToast('Registration complete! Click Sign In to enter.', 'success');
        }}
      />

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-[#64748B] relative z-10 font-medium">
        PlaceMind Autonomous Placement Operations Agent &bull; FastAPI + MongoDB Production Architecture
      </footer>
    </div>
  );
};
