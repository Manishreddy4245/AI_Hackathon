import React from 'react';

type StatusType = 'eligible' | 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'ongoing' | 'upcoming' | 'completed' | 'in_session' | 'pending';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase() as StatusType;

  const styles: Record<string, string> = {
    eligible: 'bg-[rgba(6,182,212,0.10)] text-[#22D3EE] border-[rgba(6,182,212,0.25)]',
    applied: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    shortlisted: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    interview: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    scheduled: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    selected: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]',
    completed: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]',
    rejected: 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.25)]',
    ongoing: 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]',
    in_session: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)] animate-pulse',
    upcoming: 'bg-[#14243B] text-[#CBD5E1] border-[#243650]',
    pending: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
  };

  const currentStyle = styles[normalized] || 'bg-[#14243B] text-[#CBD5E1] border-[#243650]';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${currentStyle}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
