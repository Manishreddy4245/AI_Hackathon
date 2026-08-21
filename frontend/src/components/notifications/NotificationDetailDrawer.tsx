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
    if (notification.relatedRoute) {
      navigate(notification.relatedRoute);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl overflow-y-auto space-y-6 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notification Context</h3>
              <p className="text-xs text-slate-500">ID: {notification.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Info */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Notification Header</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 uppercase">
                {notification.type}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{notification.title}</h4>
            <p className="text-slate-700 leading-relaxed font-medium">{notification.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Recipient</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{notification.recipientName}</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase">({notification.recipientRole})</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Dispatch Time</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{notification.timestamp}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Verified Logged</span>
            </div>
          </div>

          {/* Related Metadata Context */}
          {(notification.relatedDriveName || notification.relatedCandidateName) && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Linked Entities</span>
              {notification.relatedDriveName && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Placement Drive:
                  </span>
                  <span className="font-bold text-slate-900">{notification.relatedDriveName}</span>
                </div>
              )}
              {notification.relatedCandidateName && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Candidate:
                  </span>
                  <span className="font-bold text-slate-900">{notification.relatedCandidateName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          {notification.relatedRoute && (
            <Button
              variant="primary"
              className="w-full justify-center"
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={handleNavigate}
            >
              Go to Related Item
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
