import React, { useState } from 'react';
import {
  Bell,
  Search,
  Star,
  CheckCircle2,
  Trash2,
  Clock,
  Filter,
  ToggleLeft,
  ToggleRight,
  Send,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { NotificationItem } from '../../types';
import { SendNotificationModal } from '../../components/notifications/SendNotificationModal';
import { NotificationDetailDrawer } from '../../components/notifications/NotificationDetailDrawer';

type NotificationStatusFilter = 'all' | 'unread' | 'today' | 'scheduled' | 'important';

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
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>('all');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'students' | 'staff' | 'panel'>('all');

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // Helper Predicates for Accurate Real-Time Category Mapping
  const isUnread = (item: NotificationItem): boolean => !item.read;

  const isToday = (item: NotificationItem): boolean => {
    if (item.created_at) {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      }
    }
    const ts = (item.timestamp || '').toLowerCase();
    if (ts.includes('just now') || ts.includes('today')) return true;
    const now = new Date();
    const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
    return ts.includes(todayFormatted);
  };

  const isScheduled = (item: NotificationItem): boolean => {
    const it = item as any;
    return Boolean(
      it.scheduled === true ||
      it.status === 'SCHEDULED' ||
      it.scheduledAt ||
      item.type === 'INTERVIEW_SCHEDULED' ||
      item.type === 'INTERVIEW_SLOT_ASSIGNED'
    );
  };

  const isImportant = (item: NotificationItem): boolean => {
    const it = item as any;
    return Boolean(
      item.important === true ||
      it.priority === 'IMPORTANT' ||
      it.priority === 'HIGH'
    );
  };

  // Live Statistics Calculated Strictly from Authenticated User's Notifications
  const unreadCount = notificationsList.filter(isUnread).length;
  const todayCount = notificationsList.filter(isToday).length;
  const scheduledCount = notificationsList.filter(isScheduled).length;
  const importantCount = notificationsList.filter(isImportant).length;

  // Filtered Notifications based on Search, Status Category & Recipient Role
  const filteredNotifs = notificationsList.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.message || '').toLowerCase().includes(q) ||
      (item.recipientName || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q) ||
      (item.company_name || '').toLowerCase().includes(q) ||
      (item.job_title || '').toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'unread') matchesStatus = isUnread(item);
    else if (statusFilter === 'today') matchesStatus = isToday(item);
    else if (statusFilter === 'scheduled') matchesStatus = isScheduled(item);
    else if (statusFilter === 'important') matchesStatus = isImportant(item);

    const matchesRecipient =
      recipientFilter === 'all' || item.recipientRole === recipientFilter;

    return matchesSearch && matchesStatus && matchesRecipient;
  });

  const handleCardClick = (target: NotificationStatusFilter) => {
    if (statusFilter === target) {
      setStatusFilter('all');
    } else {
      setStatusFilter(target);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      {/* Header */}
      <PageHeader
        title="Notification Center"
        subtitle="Keep students, panels and placement teams informed throughout the placement process."
        icon={<Bell className="w-5 h-5 text-white" />}
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
            <Bell className="w-4 h-4 text-[#3B82F6]" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* SUMMARY KPI CARDS (Live & Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. UNREAD CARD */}
        <div
          id="kpi-card-unread"
          onClick={() => handleCardClick('unread')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'unread'
              ? 'bg-[#14243B] border-[#3B82F6] ring-2 ring-[#3B82F6]/50 shadow-md shadow-[#3B82F6]/10'
              : 'bg-[#101D31] border-[#243650] hover:border-[#3B82F6]/60 hover:bg-[#14243B]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Unread</span>
            <Bell className={`w-3.5 h-3.5 ${statusFilter === 'unread' ? 'text-[#3B82F6]' : 'text-[#64748B]'}`} />
          </div>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">{unreadCount}</div>
          <span className="text-[10px] text-[#94A3B8] font-semibold mt-1 block">
            {statusFilter === 'unread' ? 'Active filter • Click to reset' : 'Click to view unread'}
          </span>
        </div>

        {/* 2. TODAY CARD */}
        <div
          id="kpi-card-today"
          onClick={() => handleCardClick('today')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'today'
              ? 'bg-[#14243B] border-[#60A5FA] ring-2 ring-[#60A5FA]/50 shadow-md shadow-[#60A5FA]/10'
              : 'bg-[#101D31] border-[#243650] hover:border-[#60A5FA]/60 hover:bg-[#14243B]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Today</span>
            <Calendar className={`w-3.5 h-3.5 ${statusFilter === 'today' ? 'text-[#60A5FA]' : 'text-[#64748B]'}`} />
          </div>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{todayCount}</div>
          <span className="text-[10px] text-[#94A3B8] font-semibold mt-1 block">
            {statusFilter === 'today' ? 'Active filter • Click to reset' : 'Click to view today'}
          </span>
        </div>

        {/* 3. SCHEDULED CARD */}
        <div
          id="kpi-card-scheduled"
          onClick={() => handleCardClick('scheduled')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'scheduled'
              ? 'bg-[#14243B] border-[#22C55E] ring-2 ring-[#22C55E]/50 shadow-md shadow-[#22C55E]/10'
              : 'bg-[#101D31] border-[#243650] hover:border-[#22C55E]/60 hover:bg-[#14243B]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Scheduled</span>
            <Clock className={`w-3.5 h-3.5 ${statusFilter === 'scheduled' ? 'text-[#22C55E]' : 'text-[#64748B]'}`} />
          </div>
          <div className="text-2xl font-black text-[#86EFAC] mt-1">{scheduledCount}</div>
          <span className="text-[10px] text-[#94A3B8] font-semibold mt-1 block">
            {statusFilter === 'scheduled' ? 'Active filter • Click to reset' : 'Click to view scheduled'}
          </span>
        </div>

        {/* 4. IMPORTANT CARD */}
        <div
          id="kpi-card-important"
          onClick={() => handleCardClick('important')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'important'
              ? 'bg-[#14243B] border-[#F59E0B] ring-2 ring-[#F59E0B]/50 shadow-md shadow-[#F59E0B]/10'
              : 'bg-[#101D31] border-[#243650] hover:border-[#F59E0B]/60 hover:bg-[#14243B]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider">Important</span>
            <Star className={`w-3.5 h-3.5 ${statusFilter === 'important' ? 'fill-amber-400 text-amber-400' : 'text-[#64748B]'}`} />
          </div>
          <div className="text-2xl font-black text-[#FCD34D] mt-1">{importantCount}</div>
          <span className="text-[10px] text-[#94A3B8] font-semibold mt-1 block">
            {statusFilter === 'important' ? 'Active filter • Click to reset' : 'Click to view important'}
          </span>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search notifications, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              All ({notificationsList.length})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'unread'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setStatusFilter('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'today'
                  ? 'bg-[#60A5FA] text-[#07111F] shadow-sm font-extrabold'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Today ({todayCount})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'scheduled'
                  ? 'bg-[#22C55E] text-[#07111F] shadow-sm font-extrabold'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setStatusFilter('important')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'important'
                  ? 'bg-[#F59E0B] text-[#07111F] shadow-sm font-extrabold'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Important ({importantCount})
            </button>
          </div>

          {/* Recipient Dropdown Filter */}
          <div>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value as any)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
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
      <Card className="bg-[#101D31] border-[#243650]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <CardTitle className="text-base font-bold text-[#F8FAFC]">Broadcast Feed</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredNotifs.length} items</span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifs.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] space-y-2">
              <Bell className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
              {statusFilter === 'unread' ? (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No unread notifications</p>
                  <p className="text-xs text-[#64748B]">All caught up! You have read all notifications in your feed.</p>
                </>
              ) : statusFilter === 'today' ? (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No notifications received today</p>
                  <p className="text-xs text-[#64748B]">You haven't received any new placement alerts or interview updates today.</p>
                </>
              ) : statusFilter === 'scheduled' ? (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No scheduled notifications</p>
                  <p className="text-xs text-[#64748B]">You have no upcoming scheduled interviews or placement sessions at this time.</p>
                </>
              ) : statusFilter === 'important' ? (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No important notifications</p>
                  <p className="text-xs text-[#64748B]">No notifications are currently flagged as important or high priority.</p>
                </>
              ) : search ? (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No matching notifications</p>
                  <p className="text-xs text-[#64748B]">No alerts match "{search}". Try searching with different terms.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#F8FAFC]">No notifications yet</p>
                  <p className="text-xs text-[#64748B]">All live campus drive applications and alerts will appear here in real-time.</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#1B2A40]">
              {filteredNotifs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNotif(item)}
                  className={`p-4 hover:bg-[#14243B] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !item.read ? 'bg-[#3B82F6]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Star Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNotificationImportant(item.id);
                      }}
                      className="mt-1 text-[#64748B] hover:text-[#F59E0B] transition-colors cursor-pointer"
                      title={item.important ? 'Remove Importance' : 'Mark as Important'}
                    >
                      <Star className={`w-4 h-4 ${item.important ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">{item.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] uppercase">
                          {item.type}
                        </span>
                        {!item.read && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3B82F6] text-white">
                            NEW
                          </span>
                        )}
                        {item.important && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/30">
                            IMPORTANT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed font-normal">{item.message}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] mt-2 font-medium">
                        <span>Recipient: <strong className="text-[#F8FAFC]">{item.recipientName}</strong> ({item.recipientRole})</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#3B82F6]" /> {item.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(item.id);
                      }}
                      className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
                      title={item.read ? 'Mark as Unread' : 'Mark as Read'}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${item.read ? 'text-[#22C55E]' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.10)] rounded-lg transition-colors cursor-pointer"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUTOMATED REMINDERS SECTION */}
      <Card className="p-5 bg-[#101D31] border-[#243650]">
        <h3 className="text-base font-bold text-[#F8FAFC] mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#3B82F6]" /> Automated Reminders Setup
        </h3>
        <p className="text-xs text-[#CBD5E1] mb-4 font-medium">Configure autonomous notification timing preferences</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reminderConfigs.map((rem) => (
            <div key={rem.id} className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F8FAFC]">{rem.title}</span>
                <button onClick={() => toggleReminder(rem.id)} className="text-[#3B82F6] cursor-pointer">
                  {rem.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-[#64748B]" />}
                </button>
              </div>
              <span className="text-[11px] text-[#94A3B8] block">{rem.timing}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

      {/* Notification Detail Drawer */}
      <NotificationDetailDrawer
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </div>
  );
};
