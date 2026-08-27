import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase();

  const styles: Record<string, string> = {
    eligible: 'bg-[rgba(6,182,212,0.10)] text-[#22D3EE] border-[rgba(6,182,212,0.25)]',
    applied: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    shortlisted: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    interview: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    scheduled: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    selected: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]',
    completed: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]',
    rejected: 'bg-[rgba(239,68,68,0.15)] text-[#F87171] border-[rgba(239,68,68,0.35)]',
    ongoing: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    in_session: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)] animate-pulse',
    upcoming: 'bg-[#14243B] text-[#CBD5E1] border-[#243650]',
    pending: 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border-[rgba(245,158,11,0.35)]',
    pending_announcement: 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse',
    pending_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse',
    announced: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    changes_requested: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    request_changes: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    draft: 'bg-slate-700/30 text-slate-400 border-slate-700',
  };

  const currentStyle = styles[normalized] || 'bg-[#14243B] text-[#CBD5E1] border-[#243650]';

  const formatText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower === 'pending_announcement' || lower === 'pending_approval') return 'Pending Approval';
    if (lower === 'announced') return 'Announced';
    if (lower === 'changes_requested') return 'Changes Requested';
    return text.replace(/_/g, ' ');
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize tracking-wide ${currentStyle}`}>
      {formatText(status)}
    </span>
  );
};
