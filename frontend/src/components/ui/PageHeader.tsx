import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, icon }) => {
  return (
    <div className="relative p-4 sm:p-5 md:p-6 rounded-2xl bg-[#101D31] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)] border border-[#243650] mb-4 sm:mb-6 overflow-hidden">
      {/* Subtle ambient lighting mesh in background */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {icon && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white shrink-0 shadow-glow-brand transform translate-z-10 mt-0.5">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#F8FAFC] tracking-tight leading-snug flex items-center gap-2 break-words-safe">
              <span>{title}</span>
            </h1>
            {subtitle && (
              <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed mt-1 max-w-2xl break-words-safe">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">{action}</div>}
      </div>
    </div>
  );
};
