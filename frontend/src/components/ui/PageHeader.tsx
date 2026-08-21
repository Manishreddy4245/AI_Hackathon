import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, icon }) => {
  return (
    <div className="relative p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 text-white shadow-3d-md border border-slate-800/80 mb-6 overflow-hidden">
      {/* Subtle ambient lighting mesh in background */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shrink-0 shadow-glow-indigo transform translate-z-10 mt-0.5">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
              <span>{title}</span>
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
      </div>
    </div>
  );
};
