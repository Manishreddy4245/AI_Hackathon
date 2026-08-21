import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading placement operations...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-3 animate-in fade-in">
    <div className="p-3 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 shadow-2xs">
      <Bot className="w-8 h-8 animate-spin" />
    </div>
    <p className="text-xs font-semibold text-slate-600">{label}</p>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/3" />
    <div className="h-8 bg-slate-200 rounded w-1/2" />
    <div className="h-3 bg-slate-200 rounded w-2/3" />
  </div>
);

export const SkeletonTable: React.FC = () => (
  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-3 animate-pulse">
    <div className="h-6 bg-slate-100 rounded w-full" />
    <div className="h-6 bg-slate-100 rounded w-full" />
    <div className="h-6 bg-slate-100 rounded w-full" />
    <div className="h-6 bg-slate-100 rounded w-full" />
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="p-5 rounded-2xl border border-slate-200 bg-white h-64 flex items-end gap-3 animate-pulse">
    <div className="bg-slate-200 rounded-t w-1/5 h-1/2" />
    <div className="bg-slate-200 rounded-t w-1/5 h-3/4" />
    <div className="bg-slate-200 rounded-t w-1/5 h-full" />
    <div className="bg-slate-200 rounded-t w-1/5 h-2/3" />
    <div className="bg-slate-200 rounded-t w-1/5 h-1/3" />
  </div>
);
