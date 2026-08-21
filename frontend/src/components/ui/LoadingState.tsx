import React from 'react';
import { Bot } from 'lucide-react';

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading placement operations...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-3 animate-in fade-in">
    <div className="p-3 rounded-2xl bg-[#14243B] border border-[#243650] text-[#3B82F6] shadow-3d-sm">
      <Bot className="w-8 h-8 animate-spin" />
    </div>
    <p className="text-xs font-semibold text-[#CBD5E1]">{label}</p>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="p-5 rounded-2xl border border-[#243650] bg-[#101D31] space-y-3 animate-pulse">
    <div className="h-4 bg-[#14243B] rounded w-1/3" />
    <div className="h-8 bg-[#14243B] rounded w-1/2" />
    <div className="h-3 bg-[#14243B] rounded w-2/3" />
  </div>
);

export const SkeletonTable: React.FC = () => (
  <div className="p-4 border border-[#243650] rounded-2xl bg-[#101D31] space-y-3 animate-pulse">
    <div className="h-6 bg-[#14243B] rounded w-full" />
    <div className="h-6 bg-[#14243B] rounded w-full" />
    <div className="h-6 bg-[#14243B] rounded w-full" />
    <div className="h-6 bg-[#14243B] rounded w-full" />
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="p-5 rounded-2xl border border-[#243650] bg-[#101D31] h-64 flex items-end gap-3 animate-pulse">
    <div className="bg-[#14243B] rounded-t w-1/5 h-1/2" />
    <div className="bg-[#14243B] rounded-t w-1/5 h-3/4" />
    <div className="bg-[#14243B] rounded-t w-1/5 h-full" />
    <div className="bg-[#14243B] rounded-t w-1/5 h-2/3" />
    <div className="bg-[#14243B] rounded-t w-1/5 h-1/3" />
  </div>
);
