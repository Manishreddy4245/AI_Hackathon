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
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendType = 'neutral',
  subtitle,
  accent = 'indigo',
}) => {
  const trendColors = {
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    positive: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
    warning: 'bg-amber-950/90 text-amber-300 border-amber-800',
    negative: 'bg-rose-950/90 text-rose-300 border-rose-800',
  };

  const accentBadges = {
    blue: 'bg-blue-600 text-white shadow-glow-brand',
    cyan: 'bg-cyan-600 text-white shadow-glow-cyan',
    violet: 'bg-violet-600 text-white shadow-glow-violet',
    emerald: 'bg-emerald-600 text-white shadow-glow-emerald',
    amber: 'bg-amber-600 text-white',
    indigo: 'bg-indigo-600 text-white shadow-glow-indigo',
  };

  return (
    <Card className="p-5 relative overflow-hidden bg-slate-900/90 border-slate-800/90 shadow-3d-sm text-slate-100 hover:border-indigo-500/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white drop-shadow-xs">{value}</span>
            {trend && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${trendColors[trendType]}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-300 font-semibold block mt-1">{subtitle}</span>
          )}
        </div>

        <div className={`p-3 rounded-xl ${accentBadges[accent]} shrink-0 transform translate-z-10`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
