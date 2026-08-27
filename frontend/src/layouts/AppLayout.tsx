import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Sparkles,
  CalendarCheck,
  DoorOpen,
  Bell,
  BarChart3,
  AlertTriangle,
  Bot,
  UserCheck,
  Briefcase,
  GraduationCap,
  BookOpen,
  Settings,
  X,
  LogOut,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userRole: UserRole = user?.role || 'placement_officer';

  const getPageTitle = (path: string) => {
    // Placement Officer routes
    if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
      if (path.includes('/companies')) return 'Companies & Placement Drives';
      if (path.includes('/candidates')) return 'Candidates Management Pool';
      if (path.includes('/matching')) return 'Autonomous AI Candidate Matching';
      if (path.includes('/interviews')) return 'Interview Schedules & Timelines';
      if (path.includes('/panels')) return 'Interview Panels & Assessment Rooms';
      if (path.includes('/notifications')) return 'Operational Notifications & Alerts';
      if (path.includes('/analytics')) return 'Institutional Skill Gap Analytics';
      if (path.includes('/exceptions')) return 'AI Exceptions & Conflict Engine';
      if (path.includes('/copilot')) return 'Placement Officer Copilot AI';
      if (path.includes('/audit')) return 'Institutional System Audit Logs';
      return 'Placement Officer Operations Hub';
    }

    // Student routes
    if (path.startsWith('/student')) {
      if (path.includes('/dashboard')) return 'Student Career & Placement Workspace';
      if (path.includes('/resume')) return 'AI Resume Analyzer & Profile';
      if (path.includes('/drives')) return 'Eligible Placement Drives';
      if (path.includes('/assessment')) return 'AI Placement Assessment & PrepBot';
      if (path.includes('/assessments')) return 'My Placement Assessments';
      if (path.includes('/applications')) return 'My Submitted Applications';
      if (path.includes('/interviews')) return 'My Scheduled Interviews';
      if (path.includes('/notifications')) return 'Candidate Notifications & Alerts';
      if (path.includes('/profile')) return 'My Student Profile & Credentials';
      if (path.includes('/copilot')) return 'Student Placement Copilot';
      return 'Student Career & Placement Workspace';
    }

    // Recruiter routes
    if (path.startsWith('/recruiter')) {
      if (path.includes('/drives')) return 'Company Placement Drives';
      if (path.includes('/candidates')) return 'Shortlisted Candidate Pool';
      if (path.includes('/interviews')) return 'Interview Round Coordination';
      if (path.includes('/copilot')) return 'Recruiter Placement Copilot';
      if (path.includes('/notifications')) return 'Recruiter Notifications';
      return 'Recruiter Hiring Workspace';
    }

    return 'PlaceMind Operations Hub';
  };

  // 1. Student Portal Navigation
  const studentNavSections: NavSection[] = [
    {
      label: 'STUDENT WORKSPACE',
      items: [
        { path: '/student/dashboard', label: 'Dashboard', icon: <UserCheck className="w-4 h-4" /> },
        { path: '/student/resume', label: 'Resume Analyzer', icon: <Sparkles className="w-4 h-4" /> },
        { path: '/student/drives', label: 'Placement Drives', icon: <Briefcase className="w-4 h-4" /> },
        { path: '/student/community', label: 'Communities', icon: <Users className="w-4 h-4" /> },
        { path: '/student/assessment', label: 'AI Assessment', icon: <BrainCircuit className="w-4 h-4" /> },
        { path: '/student/assessments', label: 'My Assessments', icon: <BarChart3 className="w-4 h-4" /> },
        { path: '/student/applications', label: 'My Applications', icon: <FileCheck className="w-4 h-4" /> },
        { path: '/student/interviews', label: 'My Interviews', icon: <GraduationCap className="w-4 h-4" /> },
        { path: '/student/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { path: '/student/profile', label: 'Profile', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ];

  // 2. Recruiter Portal Navigation
  const recruiterNavSections: NavSection[] = [
    {
      label: 'CORPORATE RECRUITER',
      items: [
        { path: '/recruiter/dashboard', label: 'Hiring Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { path: '/recruiter/drives', label: 'Company Drives', icon: <Building2 className="w-4 h-4" /> },
        { path: '/recruiter/candidates', label: 'Candidate Pool', icon: <Users className="w-4 h-4" /> },
        { path: '/recruiter/interviews', label: 'Interview Schedules', icon: <CalendarCheck className="w-4 h-4" /> },
        { path: '/recruiter/copilot', label: 'Placement Copilot', icon: <Bot className="w-4 h-4" /> },
        { path: '/recruiter/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
      ],
    },
  ];

  // 3. Placement Officer Portal Navigation
  const placementOfficerNavSections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [
        { path: '/admin/dashboard', label: 'Operations Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      label: 'PLACEMENT OPERATIONS',
      items: [
        { path: '/admin/companies', label: 'Companies & Drives', icon: <Building2 className="w-4 h-4" /> },
        { path: '/admin/candidates', label: 'Candidates Pool', icon: <Users className="w-4 h-4" /> },
        { path: '/admin/matching', label: 'AI Matching Hub', icon: <Sparkles className="w-4 h-4" /> },
        { path: '/admin/interviews', label: 'Interview Schedules', icon: <CalendarCheck className="w-4 h-4" /> },
        { path: '/admin/panels', label: 'Panels & Rooms', icon: <DoorOpen className="w-4 h-4" /> },
      ],
    },
    {
      label: 'INTELLIGENCE & AUDIT',
      items: [
        { path: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { path: '/admin/analytics', label: 'Skill Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { path: '/admin/exceptions', label: 'AI Exceptions', icon: <AlertTriangle className="w-4 h-4" /> },
        { path: '/admin/copilot', label: 'Placement Copilot', icon: <Bot className="w-4 h-4" /> },
        { path: '/admin/audit', label: 'Audit Logs', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ];

  // Select navigation strictly based on authenticated role
  const getNavSections = (): NavSection[] => {
    switch (userRole) {
      case 'student':
        return studentNavSections;
      case 'recruiter':
        return recruiterNavSections;
      case 'placement_officer':
      default:
        return placementOfficerNavSections;
    }
  };

  const activeNavSections = getNavSections();

  const getPortalHeaderInfo = () => {
    switch (userRole) {
      case 'student':
        return {
          title: 'Student Portal',
          subtitle: 'Candidate Career Hub',
          badgeClass: 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/30',
        };
      case 'recruiter':
        return {
          title: 'Recruiter Portal',
          subtitle: 'Corporate Hiring Hub',
          badgeClass: 'bg-[#06B6D4]/20 text-[#22D3EE] border-[#06B6D4]/30',
        };
      case 'placement_officer':
      default:
        return {
          title: 'Placement Officer',
          subtitle: 'Institutional Operations',
          badgeClass: 'bg-[#22C55E]/20 text-[#86EFAC] border-[#22C55E]/30',
        };
    }
  };

  const portalInfo = getPortalHeaderInfo();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#050C18] text-[#CBD5E1] border-r border-[#17253A] shadow-3d-lg">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#17253A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-lg shadow-glow-brand transform translate-z-10">
            P
          </div>
          <div>
            <h1 className="text-base font-black text-[#F8FAFC] tracking-wide flex items-center gap-1.5">
              <span>PlaceMind</span>
            </h1>
            <p className="text-[11px] text-[#94A3B8] font-medium">{portalInfo.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-[#94A3B8] hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Role Card */}
      <div className="px-4 pt-3">
        <div className="p-2.5 rounded-xl bg-[#101D31] border border-[#243650] flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Active Portal</span>
          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${portalInfo.badgeClass}`}>
            {portalInfo.title}
          </span>
        </div>
      </div>

      {/* Role-Isolated Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {activeNavSections.map((section) => (
          <div key={section.label}>
            <span className="px-3 text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
              {section.label}
            </span>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(59,130,246,0.22), rgba(6,182,212,0.10))'
                        : undefined,
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? 'text-white border-l-2 border-[#3B82F6] shadow-sm font-extrabold translate-x-1'
                        : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#101D31]/60 hover:translate-x-0.5'
                    }`}
                  >
                    <span className={isActive ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer with Logout */}
      <div className="p-3 border-t border-[#17253A] space-y-1 bg-[#050C18]">
        <div className="px-3 py-2 text-xs text-[#94A3B8]">
          <span className="block text-[10px] text-[#64748B] font-bold uppercase">Logged in as:</span>
          <span className="text-[#F8FAFC] font-semibold truncate block">{user?.email || 'User'}</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Portal</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#07111F] text-[#CBD5E1]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#050C18]/80 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full z-10">{SidebarContent}</aside>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen bg-app-main text-[#CBD5E1]">
        <TopNavbar
          currentTitle={getPageTitle(location.pathname)}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
