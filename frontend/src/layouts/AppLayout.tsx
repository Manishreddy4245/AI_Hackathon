import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { UserRole } from '../types';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('placement_officer');
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard':
        return 'Placement Operations';
      case '/companies':
        return 'Companies & Placement Drives';
      case '/candidates':
        return 'Candidates Pool';
      case '/matching':
        return 'AI Candidate Matching';
      case '/interviews':
        return 'Interview Schedules';
      case '/panels':
        return 'Panels & Assessment Rooms';
      case '/notifications':
        return 'Notifications & Alerts';
      case '/analytics':
        return 'Skill Gap & Demand Analytics';
      case '/exceptions':
        return 'AI Exceptions & Conflicts';
      case '/copilot':
        return 'Placement Copilot AI';
      case '/audit':
        return 'System Audit Logs';
      case '/recruiter':
        return 'Recruiter Workspace';
      case '/student':
        return 'Student Dashboard';
      case '/student/resume':
        return 'AI Resume Analyzer';
      case '/student/drives':
        return 'Eligible Drives';
      case '/student/interviews':
        return 'My Interviews';
      case '/student/skills':
        return 'My Skill Gaps';
      default:
        return 'PlaceMind Operations';
    }
  };

  // Automatically sync userRole state based on URL path context
  useEffect(() => {
    if (location.pathname.startsWith('/student')) {
      if (userRole !== 'student') setUserRole('student');
    } else if (location.pathname.startsWith('/recruiter')) {
      if (userRole !== 'recruiter') setUserRole('recruiter');
    } else if (location.pathname.startsWith('/panels')) {
      if (userRole !== 'panel_member') setUserRole('panel_member');
    } else if (['/dashboard', '/companies', '/candidates', '/matching', '/interviews', '/analytics', '/exceptions', '/audit'].some(p => location.pathname.startsWith(p))) {
      if (userRole !== 'placement_officer') setUserRole('placement_officer');
    }
  }, [location.pathname]);

  const officerNavSections = [
    {
      label: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      label: 'PLACEMENT OPERATIONS',
      items: [
        { path: '/companies', label: 'Companies & Drives', icon: <Building2 className="w-4 h-4" /> },
        { path: '/candidates', label: 'Candidates Pool', icon: <Users className="w-4 h-4" /> },
        { path: '/matching', label: 'AI Matching', icon: <Sparkles className="w-4 h-4" /> },
        { path: '/interviews', label: 'Interviews', icon: <CalendarCheck className="w-4 h-4" /> },
        { path: '/panels', label: 'Panels & Rooms', icon: <DoorOpen className="w-4 h-4" /> },
      ],
    },
    {
      label: 'OPERATIONS & ANALYTICS',
      items: [
        { path: '/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { path: '/analytics', label: 'Student Skill Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { path: '/exceptions', label: 'Exceptions', icon: <AlertTriangle className="w-4 h-4" /> },
        { path: '/copilot', label: 'Placement Copilot', icon: <Bot className="w-4 h-4" /> },
        { path: '/audit', label: 'Audit Logs', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ];

  const studentNavSections = [
    {
      label: 'STUDENT WORKSPACE',
      items: [
        { path: '/student', label: 'Student Dashboard', icon: <UserCheck className="w-4 h-4" /> },
        { path: '/student/resume', label: 'AI Resume Analyzer', icon: <Sparkles className="w-4 h-4" /> },
        { path: '/student/drives', label: 'Placement Drives', icon: <Briefcase className="w-4 h-4" /> },
        { path: '/student/interviews', label: 'My Interviews', icon: <GraduationCap className="w-4 h-4" /> },
        { path: '/student/skills', label: 'My Skill Gaps', icon: <BookOpen className="w-4 h-4" /> },
        { path: '/copilot', label: 'Placement Copilot', icon: <Bot className="w-4 h-4" /> },
      ],
    },
  ];

  const activeNavSections = userRole === 'student' ? studentNavSections : officerNavSections;

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    if (role === 'student') {
      navigate('/student');
    } else if (role === 'recruiter') {
      navigate('/recruiter');
    } else if (role === 'panel_member') {
      navigate('/panels');
    } else {
      navigate('/dashboard');
    }
  };



  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 border-r border-slate-800/80 shadow-3d-lg">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 text-white flex items-center justify-center font-black text-lg shadow-glow-brand transform translate-z-10">
            P
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide flex items-center gap-1.5">
              <span>PlaceMind</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                3D AI
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {userRole === 'student' ? 'Student AI Workspace' : 'Placement Operations Hub'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Context Pill */}
      <div className="px-4 pt-3">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Role</span>
          <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold text-[10px]">
            {userRole === 'student' ? 'Student' : 'Placement Officer'}
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {activeNavSections.map((section) => (
          <div key={section.label}>
            <span className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow-brand border border-brand-400/30 translate-x-1'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80 hover:translate-x-0.5'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-1 bg-slate-950">
        <button
          onClick={() => alert('Settings & System Status Configuration')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>System Settings</span>
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-navy-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full z-10">{SidebarContent}</aside>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen bg-navy-950 text-slate-100">
        <TopNavbar
          currentTitle={getPageTitle(location.pathname)}
          userRole={userRole}
          onRoleChange={handleRoleChange}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};



