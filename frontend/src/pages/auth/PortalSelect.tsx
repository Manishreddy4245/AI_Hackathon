import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useAuth, getPortalDashboardUrl } from '../../context/AuthContext';

export const PortalSelect: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const portals = [
    {
      id: 'student',
      title: 'Student',
      badge: 'Candidate Portal',
      description: 'For students looking for placement opportunities, resume analysis, and interview tracking.',
      icon: <GraduationCap className="w-7 h-7 text-[#60A5FA]" />,
      buttonText: 'Student Login',
      route: '/login/student',
      accentColor: 'from-[#3B82F6]/20 to-[#6366F1]/10',
      borderColor: 'hover:border-[#3B82F6]',
      buttonClass: 'bg-[#3B82F6] hover:bg-[#2563EB] text-white',
      badgeClass: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
      iconBg: 'bg-[#3B82F6]/10 border-[#3B82F6]/30',
    },
    {
      id: 'recruiter',
      title: 'Recruiter',
      badge: 'Corporate Portal',
      description: 'For companies and recruiters managing hiring drives, candidate pipelines, and evaluations.',
      icon: <Building2 className="w-7 h-7 text-[#06B6D4]" />,
      buttonText: 'Recruiter Login',
      route: '/login/recruiter',
      accentColor: 'from-[#06B6D4]/20 to-[#0284C7]/10',
      borderColor: 'hover:border-[#06B6D4]',
      buttonClass: 'bg-[#06B6D4] hover:bg-[#0891B2] text-white',
      badgeClass: 'bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border-[rgba(6,182,212,0.30)]',
      iconBg: 'bg-[#06B6D4]/10 border-[#06B6D4]/30',
    },
    {
      id: 'placement_officer',
      title: 'Placement Officer',
      badge: 'Administrative Portal',
      description: 'For placement administrators managing drives, eligibility rules, panels & rooms, and automated operations.',
      icon: <ShieldCheck className="w-7 h-7 text-[#22C55E]" />,
      buttonText: 'Placement Officer Login',
      route: '/login/placement-officer',
      accentColor: 'from-[#22C55E]/20 to-[#10B981]/10',
      borderColor: 'hover:border-[#22C55E]',
      buttonClass: 'bg-[#22C55E] hover:bg-[#16A34A] text-white',
      badgeClass: 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border-[rgba(34,197,94,0.30)]',
      iconBg: 'bg-[#22C55E]/10 border-[#22C55E]/30',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex flex-col justify-between relative overflow-hidden selection:bg-[#3B82F6] selection:text-white">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="p-6 md:p-8 flex items-center justify-between max-w-7xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-xl shadow-glow-brand">
            P
          </div>
          <div>
            <h1 className="text-lg font-black text-[#F8FAFC] tracking-wide flex items-center gap-1.5">
              <span>PlaceMind</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                Enterprise
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8] font-medium">Autonomous Campus Placement Operating System</p>
          </div>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#CBD5E1] hidden sm:inline">
              Signed in as <strong className="text-[#F8FAFC]">{user.name}</strong>
            </span>
            <button
              onClick={() => navigate(getPortalDashboardUrl(user.role))}
              className="px-3.5 py-1.5 rounded-xl bg-[#14243B] hover:bg-[#1E3A5F] border border-[#3B82F6]/40 text-[#60A5FA] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-6xl w-full mx-auto relative z-10">
        {/* Page Hero */}
        <div className="text-center max-w-2xl mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101D31] border border-[#243650] text-xs font-bold text-[#CBD5E1] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>Role-Isolated Multi-Portal Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#F8FAFC]">
            Welcome to PlaceMind
          </h2>
          <p className="text-sm text-[#CBD5E1] font-medium">
            Choose your portal to continue. Each role operates inside an isolated, permission-secured workspace.
          </p>
        </div>

        {/* 3 Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {portals.map((portal) => (
            <div
              key={portal.id}
              onClick={() => navigate(portal.route)}
              className={`group bg-[#101D31] border border-[#243650] ${portal.borderColor} rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)] cursor-pointer relative overflow-hidden`}
            >
              {/* Subtle Card Header Gradient */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${portal.accentColor}`}></div>

              <div className="space-y-4">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${portal.iconBg} border flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105`}>
                    {portal.icon}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${portal.badgeClass}`}>
                    {portal.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-[#F8FAFC] group-hover:text-white flex items-center gap-1.5">
                    <span>{portal.title}</span>
                  </h3>
                  <p className="text-xs text-[#CBD5E1] mt-1.5 font-medium leading-relaxed">
                    {portal.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-4 border-t border-[#1B2A40]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(portal.route);
                  }}
                  className={`w-full py-2.5 px-4 ${portal.buttonClass} font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group-hover:gap-2.5 cursor-pointer`}
                >
                  <span>{portal.buttonText}</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Security Assurance Banner */}
        <div className="mt-10 p-3.5 px-5 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center gap-3 text-xs text-[#94A3B8] font-medium max-w-xl text-center">
          <Lock className="w-4 h-4 text-[#3B82F6] shrink-0" />
          <span>
            Strict role-based authentication enforced. Users cannot access cross-portal dashboards or APIs without authorized credentials.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-[#64748B] relative z-10 font-medium border-t border-[#17253A]">
        PlaceMind Autonomous Placement Operating System &bull; Fast, Secure, Role-Isolated Architecture
      </footer>
    </div>
  );
};
