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
        email: email || undefined,
        password: password || undefined,
        role: selectedRole,
      });

      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
      }

      const role: UserRole = res.user?.role || selectedRole;
      setCurrentUserRole(role);
      setLoading(false);

      triggerToast(`Authenticated as ${res.user?.name || role}`, 'success');

      if (role === 'student') {
        navigate('/student');
      } else if (role === 'recruiter') {
        navigate('/recruiter');
      } else if (role === 'panel_member') {
        navigate('/panels');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden selection:bg-brand-500 selection:text-white">
      {/* Background Subtle Highlights */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar Brand */}
      <header className="p-6 md:p-8 flex items-center justify-between max-w-7xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center font-black text-xl shadow-lg">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">PlaceMind</h1>
            <p className="text-xs text-slate-400">AI Campus Placement Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          24h Hackathon Build v1.0
        </div>
      </header>

      {/* Main Login Workspace Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Autonomous Interview & Drive Coordination
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              AI Campus Placement Operations
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your role or enter credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Options */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => handleRoleSelect('placement_officer')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedRole === 'placement_officer'
                  ? 'bg-slate-700 border-brand-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                <div className="text-xs font-semibold truncate">Placement Officer</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedRole === 'student'
                  ? 'bg-slate-700 border-brand-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="text-xs font-semibold truncate">Student Candidate</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('recruiter')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedRole === 'recruiter'
                  ? 'bg-slate-700 border-brand-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs font-semibold truncate">Company Recruiter</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('panel_member')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedRole === 'panel_member'
                  ? 'bg-slate-700 border-brand-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs font-semibold truncate">Panel Member</div>
              </div>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={executeLogin} className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  placeholder={
                    selectedRole === 'placement_officer'
                      ? 'admin@placemind.local'
                      : selectedRole === 'student'
                      ? 'student@placemind.local'
                      : selectedRole === 'recruiter'
                      ? 'recruiter@placemind.local'
                      : 'panel@placemind.local'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400">
                  Demo pass: password123
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group mt-2"
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
          <div className="text-center pt-2 border-t border-slate-700/60">
            <span className="text-xs text-slate-400">New student candidate? </span>
            <button
              type="button"
              onClick={() => setSignupModalOpen(true)}
              className="text-xs font-bold text-brand-400 hover:underline"
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
      <footer className="p-6 text-center text-xs text-slate-500 relative z-10">
        PlaceMind Autonomous Placement Operations Agent &bull; FastAPI + MongoDB Production Architecture
      </footer>
    </div>
  );
};
