import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sparkles,
  User,
  Menu,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth, getPortalDashboardUrl } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface TopNavbarProps {
  currentTitle: string;
  onMobileMenuToggle: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTitle,
  onMobileMenuToggle,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notificationsList, markNotificationRead, markAllNotificationsRead } = usePlacement();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  const markAllRead = () => {
    markAllNotificationsRead();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'student':
        return {
          label: 'Student Candidate',
          icon: <GraduationCap className="w-3.5 h-3.5 text-[#60A5FA]" />,
          classes: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
        };
      case 'recruiter':
        return {
          label: 'Company Recruiter',
          icon: <Building2 className="w-3.5 h-3.5 text-[#22D3EE]" />,
          classes: 'bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border-[rgba(6,182,212,0.30)]',
        };
      case 'placement_officer':
      default:
        return {
          label: 'Placement Officer',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-[#86EFAC]" />,
          classes: 'bg-[rgba(34,197,94,0.15)] text-[#86EFAC] border-[rgba(34,197,94,0.30)]',
        };
    }
  };

  const badgeInfo = getRoleBadge(user?.role);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-[#07111F]/90 backdrop-blur-md border-b border-[#1B2A40] sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4 shadow-3d-md text-[#F8FAFC]">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 text-[#94A3B8] hover:text-white rounded-xl md:hidden hover:bg-[#101D31] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-black text-[#F8FAFC] tracking-tight leading-none flex items-center gap-2">
            <span>{currentTitle}</span>
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
            <span className="text-[11px] text-[#94A3B8] font-semibold">Secure Portal Session</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search Input */}
        <div className="hidden sm:flex relative w-56 lg:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search in portal..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium transition-all"
          />
        </div>

        {/* NOTIFICATIONS CONTAINER */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#101D31] transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#3B82F6] rounded-full ring-2 ring-[#07111F] animate-pulse" />
            )}
          </button>

          {/* NOTIFICATIONS DROPDOWN MENU */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0B1628] rounded-2xl shadow-3d-lg border border-[#243650] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-[#1B2A40] bg-[#101D31]/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#1B2A40] text-xs">
                {notificationsList.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setNotificationsOpen(false);
                      if (n.relatedRoute) {
                        navigate(n.relatedRoute);
                        return;
                      }
                      const notifType = (n.type || (n as any).notificationType || '').toUpperCase();
                      const driveId = n.drive_id || (n as any).driveId;
                      if (notifType.includes('INTERVIEW') || notifType.includes('SHORTLIST')) {
                        navigate(user?.role === 'student' ? '/student/interviews' : '/admin/interviews');
                        return;
                      }
                      if (user?.role === 'recruiter') {
                        navigate('/recruiter/drives');
                        return;
                      }
                      if (driveId) {
                        navigate(user?.role === 'student' ? `/student/community/${driveId}` : `/admin/companies/${driveId}`);
                        return;
                      }
                      navigate(user?.role === 'student' ? '/student/drives' : '/admin/notifications');
                    }}
                    className={`p-3.5 hover:bg-[#192B45] transition-colors cursor-pointer space-y-1 ${
                      !n.read ? 'bg-[#3B82F6]/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-medium">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1] font-medium leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE DROPDOWN */}
        <div className="relative pl-2 border-l border-[#243650]" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#101D31] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-black text-xs shadow-3d-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-[#F8FAFC] block leading-tight max-w-[140px] truncate">
                {user?.name || 'Authenticated User'}
              </span>
              <span className="text-[10px] font-semibold text-[#94A3B8] block">
                {badgeInfo.label}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {/* PROFILE DROPDOWN MENU */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0B1628] rounded-2xl shadow-3d-lg border border-[#243650] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-[#1B2A40] bg-[#101D31]/80 space-y-2">
                <div>
                  <span className="text-xs font-black text-[#F8FAFC] block">
                    {user?.name || 'User Profile'}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] font-medium block truncate">
                    {user?.email || 'No email attached'}
                  </span>
                </div>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.classes}`}>
                  {badgeInfo.icon}
                  <span>{badgeInfo.label}</span>
                </div>
              </div>

              <div className="p-2 space-y-1 text-xs font-medium">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(getPortalDashboardUrl(user?.role));
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-[#CBD5E1] hover:bg-[#14243B] hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                  <span>My Portal Dashboard</span>
                </button>
              </div>

              <div className="p-2 border-t border-[#1B2A40] bg-[#101D31]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out &amp; Exit Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
