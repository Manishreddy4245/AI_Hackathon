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
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { UserRole } from '../../types';
import { usePlacement } from '../../context/PlacementContext';

interface TopNavbarProps {
  currentTitle: string;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onMobileMenuToggle: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTitle,
  userRole,
  onRoleChange,
  onMobileMenuToggle,
}) => {
  const navigate = useNavigate();
  const { notificationsList, markNotificationRead } = usePlacement();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  const markAllRead = () => {
    notificationsList.forEach((n) => markNotificationRead(n.id));
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

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4 shadow-3d-md text-white">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 text-slate-300 hover:text-white rounded-xl md:hidden hover:bg-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-black text-white tracking-tight leading-none flex items-center gap-2">
            <span>{currentTitle}</span>
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-slate-400 font-semibold">Live System Operational</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search Input */}
        <div className="hidden sm:flex relative w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search drives, candidates..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-400 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all"
          />
        </div>

        {/* NOTIFICATIONS DROPDOWN CONTAINER */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
            )}
          </button>


          {/* REAL NOTIFICATIONS DROPDOWN MENU */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-3d-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notificationsList.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(n.relatedRoute || '/notifications');
                    }}
                    className={`p-3.5 hover:bg-brand-50/40 transition-colors cursor-pointer space-y-1 ${
                      !n.read ? 'bg-brand-50/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PROFILE & ROLE DROPDOWN MENU */}
        <div className="relative pl-2 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-3d-sm">
              {userRole === 'placement_officer' ? 'PO' : userRole === 'student' ? 'ST' : 'PM'}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {userRole === 'placement_officer' ? 'Officer Admin' : 'Rahul Verma'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">
                {userRole === 'placement_officer' ? 'Placement Operations' : 'CSE 2026 Student'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* REAL PROFILE DROPDOWN MENU */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-3d-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  {userRole === 'placement_officer' ? 'Placement Officer Workspace' : 'Rahul Verma (Student)'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  {userRole === 'placement_officer' ? 'admin@placemind.edu' : 'rahul.verma@student.edu'}
                </span>
              </div>

              <div className="p-2 space-y-1 text-xs font-semibold text-slate-700">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Switch Active Role
                </div>
                <button
                  onClick={() => {
                    onRoleChange('placement_officer');
                    setProfileOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    userRole === 'placement_officer' ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Placement Officer
                  </span>
                  {userRole === 'placement_officer' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                </button>

                <button
                  onClick={() => {
                    onRoleChange('student');
                    setProfileOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    userRole === 'student' ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Student Workspace
                  </span>
                  {userRole === 'student' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                </button>
              </div>

              <div className="p-2 border-t border-slate-100 space-y-1 text-xs font-semibold">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    alert('System Configuration Dialog');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
