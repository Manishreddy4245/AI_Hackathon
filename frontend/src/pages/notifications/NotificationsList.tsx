import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  Star,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Clock,
  Filter,
  ToggleLeft,
  ToggleRight,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { NotificationItem } from '../../types';
import { SendNotificationModal } from '../../components/notifications/SendNotificationModal';
import { NotificationDetailDrawer } from '../../components/notifications/NotificationDetailDrawer';

export const NotificationsList: React.FC = () => {
  const {
    notificationsList,
    reminderConfigs,
    toastNotice,
    markNotificationRead,
    toggleNotificationImportant,
    deleteNotification,
    toggleReminder,
  } = usePlacement();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'important'>('all');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'students' | 'staff' | 'panel'>('all');

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const filteredNotifs = notificationsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.message.toLowerCase().includes(search.toLowerCase()) ||
      item.recipientName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unread' && !item.read) ||
      (statusFilter === 'read' && item.read) ||
      (statusFilter === 'important' && item.important);

    const matchesRecipient =
      recipientFilter === 'all' || item.recipientRole === recipientFilter;

    return matchesSearch && matchesStatus && matchesRecipient;
  });

  const unreadCount = notificationsList.filter((n) => !n.read).length;
  const importantCount = notificationsList.filter((n) => n.important).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Notification Center"
        subtitle="Keep students, panels and placement teams informed throughout the placement process."
        icon={<Bell className="w-5 h-5" />}
        action={
          <Button
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={() => setIsSendModalOpen(true)}
          >
            Send Notification
          </Button>
        }
      />

      {/* Dynamic Toast Feedback */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Bell className="w-4 h-4 text-brand-400" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Unread</span>
          <div className="text-2xl font-bold text-brand-600 mt-1">{unreadCount}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Today</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">24</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Scheduled</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">8</div>
        </div>
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700">Important</span>
          <div className="text-2xl font-bold text-amber-800 mt-1">{importantCount}</div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications, recipients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notificationsList.length})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'unread' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setStatusFilter('important')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'important' ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Important ({importantCount})
            </button>
          </div>

          <div>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value as any)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Recipient Types</option>
              <option value="students">Students</option>
              <option value="staff">Placement Staff</option>
              <option value="panel">Panel Members</option>
            </select>
          </div>
        </div>
      </Card>

      {/* NOTIFICATION ITEMS LIST */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Broadcast Feed</CardTitle>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredNotifs.length} items</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredNotifs.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNotif(item)}
                className={`p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !item.read ? 'bg-brand-50/20 font-semibold' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Star Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNotificationImportant(item.id);
                    }}
                    className="mt-1 text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    <Star className={`w-4 h-4 ${item.important ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {item.type}
                      </span>
                      {!item.read && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-600 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">{item.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-medium">
                      <span>Recipient: <strong className="text-slate-700">{item.recipientName}</strong> ({item.recipientRole})</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationRead(item.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title={item.read ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${item.read ? 'text-emerald-600' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AUTOMATED REMINDERS SECTION (SECTION 7 REQUIREMENT) */}
      <Card className="p-5">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" /> Automated Reminders Setup
        </h3>
        <p className="text-xs text-slate-500 mb-4">Configure autonomous notification timing preferences</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reminderConfigs.map((rem) => (
            <div key={rem.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{rem.title}</span>
                <button onClick={() => toggleReminder(rem.id)} className="text-brand-600">
                  {rem.enabled ? <ToggleRight className="w-6 h-6 text-brand-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">{rem.timing}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${rem.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {rem.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* SEND NOTIFICATION MODAL */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

      {/* NOTIFICATION DETAIL DRAWER */}
      <NotificationDetailDrawer
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </div>
  );
};
