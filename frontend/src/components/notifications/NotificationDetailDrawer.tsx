import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ExternalLink, CheckCircle2, User, Clock, Building2 } from 'lucide-react';
import { NotificationItem } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { Button } from '../ui/Button';

interface NotificationDetailDrawerProps {
  notification: NotificationItem | null;
  onClose: () => void;
}

export const NotificationDetailDrawer: React.FC<NotificationDetailDrawerProps> = ({
  notification,
  onClose,
}) => {
  const navigate = useNavigate();
  const { markNotificationRead } = usePlacement();

  if (!notification) return null;

  const handleNavigate = () => {
    markNotificationRead(notification.id);
    onClose();

    const notifType = (notification.type || (notification as any).notificationType || '').toUpperCase();
    const driveId = notification.drive_id || (notification as any).driveId;
    const role = notification.recipientRole || (notification as any).recipient_role;

    // Explicit related route takes highest priority
    if (notification.relatedRoute) {
      navigate(notification.relatedRoute);
      return;
    }

    // Role & event specific destinations
    if (notifType === 'FORM_UPLOADED' || (notification as any).form_id) {
      const formId = (notification as any).form_id;
      if (formId) {
        navigate(`/student/forms/${formId}`);
        return;
      }
    }

    if (notifType === 'CAMPUS_DRIVE_PENDING') {
      if (driveId) {
        navigate(`/admin/companies/${driveId}`);
        return;
      }
    }

    if (notifType.includes('INTERVIEW') || notifType.includes('SHORTLIST')) {
      navigate(role === 'student' ? '/student/interviews' : '/admin/interviews');
      return;
    }

    if (notifType.includes('COMMUNITY') || notifType.includes('ANNOUNCEMENT') || notifType === 'NEW_DRIVE_AVAILABLE') {
      if (driveId) {
        navigate(`/student/community/${driveId}`);
        return;
      }
    }

    if (role === 'recruiter' || notifType.includes('DRIVE_APPROVED') || notifType.includes('DRIVE_REJECTED')) {
      navigate('/recruiter/drives');
      return;
    }

    if (notifType === 'APPLICATION_RECEIVED' && driveId) {
      navigate(`/admin/companies/${driveId}`);
      return;
    }

    // Fallback: If driveId is present on any drive notification
    if (driveId) {
      navigate(`/student/community/${driveId}`);
    } else {
      navigate(role === 'student' ? '/student/drives' : '/admin/notifications');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0B1628] text-[#F8FAFC] h-full p-6 shadow-[0_12px_35px_rgba(0,0,0,0.5)] overflow-y-auto space-y-6 border-l border-[#243650]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#243650]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
              <Bell className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Notification Context</h3>
              <p className="text-xs text-[#CBD5E1]">ID: {notification.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Info */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8]">Notification Header</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] uppercase border border-[rgba(59,130,246,0.30)]">
                {notification.type}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">{notification.title}</h4>
            <p className="text-[#CBD5E1] leading-relaxed font-medium">{notification.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-[#243650] bg-[#101D31]">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Target Recipient</span>
              <span className="font-bold text-[#F8FAFC] mt-0.5 block">{notification.recipientName}</span>
              <span className="text-[10px] text-[#CBD5E1] font-medium uppercase">({notification.recipientRole})</span>
            </div>

            <div className="p-3 rounded-lg border border-[#243650] bg-[#101D31]">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Dispatch Time</span>
              <span className="font-bold text-[#F8FAFC] mt-0.5 block">{notification.timestamp}</span>
              <span className="text-[10px] text-[#86EFAC] font-semibold">Verified Logged</span>
            </div>
          </div>

          {/* Related Metadata Context */}
          {(notification.relatedDriveName || notification.relatedCandidateName) && (
            <div className="p-3 rounded-lg bg-[#101D31] border border-[#243650] space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Linked Entities</span>
              {notification.relatedDriveName && (
                <div className="flex items-center justify-between text-[#CBD5E1]">
                  <span className="font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" /> Placement Drive:
                  </span>
                  <span className="font-bold text-[#F8FAFC]">{notification.relatedDriveName}</span>
                </div>
              )}
              {notification.relatedCandidateName && (
                <div className="flex items-center justify-between text-[#CBD5E1]">
                  <span className="font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#06B6D4]" /> Candidate:
                  </span>
                  <span className="font-bold text-[#F8FAFC]">{notification.relatedCandidateName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#243650] space-y-2">
          {(notification.relatedRoute || notification.drive_id || (notification as any).driveId) && (
            <Button
              variant="primary"
              className="w-full justify-center"
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={handleNavigate}
            >
              {(notification.type === 'APPLICATION_RECEIVED' || (notification as any).notificationType === 'APPLICATION_RECEIVED')
                ? 'Open Placement Drive & Candidates'
                : 'Go to Related Item'}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-center"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => {
              markNotificationRead(notification.id);
              onClose();
            }}
          >
            Mark as Read
          </Button>
        </div>
      </div>
    </div>
  );
};
