import React from 'react';

type StatusType = 'eligible' | 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'ongoing' | 'upcoming' | 'completed' | 'in_session' | 'pending';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase() as StatusType;

  const styles: Record<string, string> = {
    eligible: 'bg-blue-50 text-blue-700 border-blue-200',
    applied: 'bg-sky-50 text-sky-700 border-sky-200',
    shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
    interview: 'bg-amber-50 text-amber-700 border-amber-200',
    scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
    selected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    ongoing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    in_session: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse',
    upcoming: 'bg-slate-100 text-slate-700 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const currentStyle = styles[normalized] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${currentStyle}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
