import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'neutral' | 'positive' | 'warning' | 'negative';
  subtitle?: string;
  accent?: 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'indigo';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendType = 'neutral',
  subtitle,
  accent = 'blue',
  onClick,
  className = '',
}) => {
  const trendColors = {
    neutral: 'bg-[#14243B] text-[#CBD5E1] border-[#243650]',
    positive: 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]',
    warning: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    negative: 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.25)]',
  };

  const accentBadges = {
    blue: 'bg-gradient-to-tr from-[#3B82F6] to-[#2563EB] text-white shadow-glow-brand',
    cyan: 'bg-gradient-to-tr from-[#06B6D4] to-[#0891B2] text-white shadow-glow-cyan',
    violet: 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-glow-violet',
    emerald: 'bg-gradient-to-tr from-[#22C55E] to-emerald-600 text-white shadow-glow-emerald',
    amber: 'bg-gradient-to-tr from-[#F59E0B] to-amber-600 text-white',
    indigo: 'bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white shadow-glow-indigo',
  };

  return (
    <Card
      onClick={onClick}
      className={`p-4 sm:p-5 relative overflow-hidden bg-[#101D31] border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] text-[#F8FAFC] transition-all group ${
        onClick
          ? 'cursor-pointer hover:bg-[#14243B] hover:border-[#3B82F6] hover:shadow-[0_16px_40px_rgba(59,130,246,0.15)] active:scale-[0.99]'
          : 'hover:bg-[#14243B] hover:border-[#31527A]'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#94A3B8] uppercase tracking-wider block group-hover:text-[#60A5FA] transition-colors truncate">
              {label}
            </span>
            {onClick && (
              <span className="text-[10px] font-bold text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                Details →
              </span>
            )}
          </div>
          <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#F8FAFC] drop-shadow-xs">{value}</span>
            {trend && (
              <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold border ${trendColors[trendType]}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[10px] sm:text-[11px] text-[#CBD5E1] font-semibold block mt-1 truncate">{subtitle}</span>
          )}
        </div>

        <div className={`p-2.5 sm:p-3 rounded-xl ${accentBadges[accent]} shrink-0 transform translate-z-10 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
