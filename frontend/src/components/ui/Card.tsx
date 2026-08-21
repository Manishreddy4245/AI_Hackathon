import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover3d?: boolean;
  level?: 1 | 2;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hover3d = true,
  level = 1,
}) => {
  const levelClass =
    level === 1
      ? 'bg-slate-900/90 border-slate-800/90 text-slate-100 shadow-3d-sm'
      : 'bg-slate-850/90 border-slate-800/70 text-slate-100 shadow-xs';

  return (
    <div
      onClick={onClick}
      className={`${levelClass} rounded-2xl border ${
        hover3d ? 'card-3d-surface' : 'transition-all'
      } ${onClick ? 'cursor-pointer hover:border-indigo-500/50 hover:shadow-3d-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 pb-3 border-b border-slate-800/80 ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`text-base font-black text-white tracking-tight ${className}`}>{children}</h3>;

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 text-slate-200 ${className}`}>{children}</div>;
