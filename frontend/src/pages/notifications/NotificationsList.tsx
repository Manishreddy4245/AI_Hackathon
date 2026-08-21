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
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Unread</span>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">{unreadCount}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Today</span>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">24</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Scheduled</span>
          <div className="text-2xl font-black text-[#86EFAC] mt-1">8</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider">Important</span>
          <div className="text-2xl font-black text-[#FCD34D] mt-1">{importantCount}</div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search notifications, recipients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              All ({notificationsList.length})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'unread'
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setStatusFilter('important')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'important'
                  ? 'bg-[#F59E0B] text-[#07111F]'
                  : 'bg-[#14243B] text-[#CBD5E1] hover:bg-[#192B45] hover:text-white border border-[#243650]'
              }`}
            >
              Important ({importantCount})
            </button>
          </div>

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
          <CardTitle>Broadcast Feed</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredNotifs.length} items</span>
        </CardHeader>
        <CardContent className="p-0">
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
            <div key={rem.id} className="p-4 rounded-xl border border-[#243650] bg-[#0B1628] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F8FAFC]">{rem.title}</span>
                <button onClick={() => toggleReminder(rem.id)} className="text-[#3B82F6] cursor-pointer">
                  {rem.enabled ? <ToggleRight className="w-6 h-6 text-[#3B82F6]" /> : <ToggleLeft className="w-6 h-6 text-[#64748B]" />}
                </button>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-semibold">{rem.timing}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block border ${rem.enabled ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]' : 'bg-[#14243B] text-[#94A3B8] border-[#243650]'}`}>
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
