import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  Users,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth, getPortalDashboardUrl } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { SignupModal } from '../../components/auth/SignupModal';

interface PortalConfig {
  portalRole: UserRole;
  title: string;
  portalSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  icon: React.ReactNode;
  accentGradient: string;
  buttonClass: string;
  badgeClass: string;
  demoEmail: string;
  demoPass: string;
  canRegister: boolean;
  registerLabel?: string;
  restrictedNotice?: string;
}

export const PortalLogin: React.FC = () => {
  const { portalType } = useParams<{ portalType: string }>();
  const navigate = useNavigate();
  const { login, forgotPassword, user, isAuthenticated } = useAuth();

  // Map route param to portal configuration
  const getPortalConfig = (): PortalConfig => {
    switch (portalType) {
      case 'student':
        return {
          portalRole: 'student',
          title: 'Student Portal Login',
          portalSubtitle: 'Access placement drives, AI resume analyzer, and interview schedules.',
          emailLabel: 'Student Email / Roll ID',
          emailPlaceholder: 'student@demo.com',
          icon: <GraduationCap className="w-6 h-6 text-[#60A5FA]" />,
          accentGradient: 'from-[#3B82F6] to-[#6366F1]',
          buttonClass: 'bg-gradient-to-r from-[#3B82F6] to-[#6366F1] hover:from-[#60A5FA] hover:to-[#4F46E5]',
          badgeClass: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
          demoEmail: 'student@demo.com',
          demoPass: 'password123',
          canRegister: true,
          registerLabel: 'New student candidate? Register here',
        };

      case 'recruiter':
        return {
          portalRole: 'recruiter',
          title: 'Recruiter Portal Login',
          portalSubtitle: 'Manage company hiring drives, candidate pipelines, and evaluation shortlists.',
          emailLabel: 'Corporate Work Email',
          emailPlaceholder: 'recruiter@demo.com',
          icon: <Building2 className="w-6 h-6 text-[#06B6D4]" />,
          accentGradient: 'from-[#06B6D4] to-[#0284C7]',
          buttonClass: 'bg-gradient-to-r from-[#06B6D4] to-[#0284C7] hover:from-[#22D3EE] hover:to-[#0369A1]',
          badgeClass: 'bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border-[rgba(6,182,212,0.30)]',
          demoEmail: 'recruiter@demo.com',
          demoPass: 'password123',
          canRegister: true,
          registerLabel: 'New campus recruiter? Request drive access',
        };

      case 'placement-officer':
      case 'placement_officer':
      default:
        return {
          portalRole: 'placement_officer',
          title: 'Placement Officer Login',
          portalSubtitle: 'Manage institutional placement drives, AI matching algorithms, panels & rooms, and automated operations.',
          emailLabel: 'Official Institutional Email',
          emailPlaceholder: 'placement@demo.com',
          icon: <ShieldCheck className="w-6 h-6 text-[#22C55E]" />,
          accentGradient: 'from-[#22C55E] to-[#10B981]',
          buttonClass: 'bg-gradient-to-r from-[#22C55E] to-[#10B981] hover:from-[#4ADE80] hover:to-[#059669]',
          badgeClass: 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border-[rgba(34,197,94,0.30)]',
          demoEmail: 'placement@demo.com',
          demoPass: 'password123',
          canRegister: false,
          restrictedNotice: 'Placement Officer administrative access is restricted to verified campus coordinators.',
        };
    }
  };

  const config = getPortalConfig();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modals
  const [studentSignupOpen, setStudentSignupOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // If already authenticated in this role, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === config.portalRole) {
        navigate(getPortalDashboardUrl(user.role), { replace: true });
      }
    }
  }, [isAuthenticated, user, config.portalRole, navigate]);

  const handleFillDemo = () => {
    setEmail(config.demoEmail);
    setPassword(config.demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password, config.portalRole);
    setLoading(false);

    if (result.success && result.user) {
      const targetUrl = getPortalDashboardUrl(result.user.role);
      navigate(targetUrl, { replace: true });
    } else {
      setError(result.error || 'Invalid credentials or unauthorized portal access.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    const res = await forgotPassword(forgotEmail, config.portalRole);
    setForgotLoading(false);
    setForgotSuccess(res.message);
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex flex-col justify-between relative overflow-hidden selection:bg-[#3B82F6] selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="p-6 md:p-8 flex items-center justify-between max-w-7xl w-full mx-auto relative z-10">
        <Link to="/login" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-xl shadow-glow-brand">
            P
          </div>
          <div>
            <h1 className="text-lg font-black text-[#F8FAFC] tracking-wide group-hover:text-white">PlaceMind</h1>
            <p className="text-xs text-[#94A3B8] font-medium">Campus Placement Agent</p>
          </div>
        </Link>

        <Link
          to="/login"
          className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#101D31] hover:bg-[#14243B] border border-[#243650] text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Portal</span>
        </Link>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-[#101D31] rounded-2xl border border-[#243650] p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.40)] space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold shadow-xs mx-auto mb-1">
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${config.badgeClass}`}>
                {config.title.replace(' Login', '')}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-[#F8FAFC]">
              {config.title}
            </h2>
            <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed">
              {config.portalSubtitle}
            </p>
          </div>

          {/* Error / Alert Box */}
          {error && (
            <div className="p-3.5 bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.30)] rounded-xl text-[#FCA5A5] text-xs flex items-start gap-2.5 font-medium leading-relaxed animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.30)] rounded-xl text-[#86EFAC] text-xs flex items-center gap-2.5 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Quick Demo Credentials Helper */}
          <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span className="font-semibold">Demo: {config.demoEmail}</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 rounded-lg bg-[#14243B] hover:bg-[#1E3A5F] border border-[#3B82F6]/30 text-[#60A5FA] text-[11px] font-bold cursor-pointer transition-colors"
            >
              Auto Fill
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#E2E8F0]">{config.emailLabel}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type="email"
                  required
                  placeholder={config.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B1628] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#E2E8F0]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotEmail(email);
                    setForgotSuccess(null);
                  }}
                  className="text-[11px] font-bold text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#0B1628] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#243650] bg-[#0B1628] text-[#3B82F6] focus:ring-0 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 ${config.buttonClass} text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {config.title.replace(' Login', '')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Links or Policy Notices */}
          <div className="pt-4 border-t border-[#1B2A40] text-center space-y-2">
            {config.canRegister && (
              <div>
                <button
                  type="button"
                  onClick={() => setStudentSignupOpen(true)}
                  className="text-xs font-bold text-[#60A5FA] hover:underline cursor-pointer"
                >
                  {config.registerLabel}
                </button>
              </div>
            )}

            {config.restrictedNotice && (
              <div className="flex items-start gap-2 p-2.5 bg-[#0B1628] rounded-xl border border-[#243650] text-[11px] text-[#94A3B8] text-left font-medium">
                <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                <span>{config.restrictedNotice}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050C18]/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#101D31] border border-[#243650] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#F8FAFC]">Reset Portal Password</h3>
            <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed">
              Enter your registered {config.emailLabel.toLowerCase()} to receive password reset instructions for the {config.title.replace(' Login', '')}.
            </p>

            {forgotSuccess ? (
              <div className="p-3.5 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.30)] rounded-xl text-[#86EFAC] text-xs font-medium space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
                <button
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full py-2 bg-[#14243B] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Close &amp; Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder={config.emailPlaceholder}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0B1628] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-[#0B1628] hover:bg-[#14243B] text-[#CBD5E1] text-xs font-bold border border-[#243650] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className={`px-4 py-2 ${config.buttonClass} text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer`}
                  >
                    {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Send Reset Instructions</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Signup Modal */}
      <SignupModal
        isOpen={studentSignupOpen}
        onClose={() => setStudentSignupOpen(false)}
        onSuccess={(regEmail) => {
          setStudentSignupOpen(false);
          setEmail(regEmail);
          setPassword('password123');
          setSuccessNotice('Registration successful! Click Sign In to enter your portal.');
        }}
      />

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-[#64748B] relative z-10 font-medium border-t border-[#17253A]">
        PlaceMind Autonomous Placement Operating System &bull; Enterprise Portal Security
      </footer>
    </div>
  );
};
