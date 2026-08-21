import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { useAuth, getPortalDashboardUrl } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  portalName?: string;
  fallbackLoginPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  portalName = 'Restricted Portal',
  fallbackLoginPath = '/login',
}) => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6] mb-3" />
        <p className="text-xs text-[#94A3B8] font-medium">Verifying portal authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackLoginPath} state={{ from: location }} replace />;
  }

  const userRole = user.role;
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    const roleLabels: Record<string, string> = {
      student: 'Student',
      recruiter: 'Company Recruiter',
      placement_officer: 'Placement Officer',
    };

    const userPortalLabel = roleLabels[userRole] || userRole;
    const targetDashboard = getPortalDashboardUrl(userRole);

    return (
      <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#101D31] border border-[#243650] rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.30)] text-[#EF4444] flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-black text-[#F8FAFC] tracking-tight">Access Denied</h2>
            <p className="text-xs text-[#CBD5E1] mt-1.5 leading-relaxed">
              You don't have permission to access the <strong className="text-[#F8FAFC]">{portalName}</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] text-xs text-left space-y-1.5 font-medium">
            <div className="flex justify-between text-[#94A3B8]">
              <span>Active Account:</span>
              <span className="text-[#F8FAFC] font-bold truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex justify-between text-[#94A3B8]">
              <span>Assigned Role:</span>
              <span className="text-[#60A5FA] font-bold">{userPortalLabel}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(targetDashboard, { replace: true })}
              className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to {userPortalLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full py-2.5 px-4 bg-[#0B1628] hover:bg-[#14243B] text-[#CBD5E1] hover:text-[#F8FAFC] border border-[#243650] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#94A3B8]" />
              <span>Sign Out &amp; Switch Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
