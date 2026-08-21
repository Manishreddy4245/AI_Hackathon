import React, { useState } from 'react';
import { Bell, X, Send, Users, ShieldAlert, Check } from 'lucide-react';
import { NotificationItem, NotificationType, RecipientRole } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { Button } from '../ui/Button';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ isOpen, onClose }) => {
  const { sendNotification, students, panelsList } = usePlacement();

  const [recipientRole, setRecipientRole] = useState<RecipientRole>('students');
  const [recipientName, setRecipientName] = useState('Rahul Verma');
  const [notifType, setNotifType] = useState<NotificationType>('interview');
  const [title, setTitle] = useState('Technical Interview Scheduled');
  const [message, setMessage] = useState(
    'Your Technical Interview for TechNova is scheduled for today at 10:30 AM in Lab 101.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: 'Just now',
      read: false,
      important: notifType === 'important_update',
      type: notifType,
      recipientRole,
      recipientName,
      relatedRoute: '/interviews',
    };

    sendNotification(newNotif);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Send Placement Notification</h3>
              <p className="text-xs text-slate-400">Broadcast updates to candidates, panels, or campus officers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Category</label>
              <select
                value={recipientRole}
                onChange={(e) => {
                  const role = e.target.value as RecipientRole;
                  setRecipientRole(role);
                  if (role === 'students') setRecipientName(students[0]?.name || 'Rahul Verma');
                  else if (role === 'panel') setRecipientName(panelsList[0]?.name || 'Panel B');
                  else setRecipientName('Placement Officer');
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="students">Student Candidate</option>
                <option value="panel">Interview Panel</option>
                <option value="staff">Placement Staff / Officers</option>
                <option value="all">All Registered Students</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Recipient</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Type</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as NotificationType)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="interview">Interview Notice</option>
                <option value="eligibility">Eligibility Alert</option>
                <option value="reminder">Reminder Nudge</option>
                <option value="important_update">Important Update</option>
                <option value="system_alert">System Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Header</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800 leading-relaxed font-medium"
              placeholder="Enter clear, concise notification details..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={<Send className="w-3.5 h-3.5" />}>
              Send Notification
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
