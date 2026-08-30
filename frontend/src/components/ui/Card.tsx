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
      ? 'bg-[#101D31] border-[#243650] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)]'
      : 'bg-[#14243B] border-[#243650] text-[#F8FAFC] shadow-sm';

  return (
    <div
      onClick={onClick}
      className={`${levelClass} rounded-2xl border ${
        hover3d ? 'card-3d-surface' : 'transition-all'
      } ${onClick ? 'cursor-pointer hover:bg-[#14243B] hover:border-[#31527A] hover:shadow-[0_16px_40px_rgba(0,0,0,0.3)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-4 sm:p-5 pb-2.5 sm:pb-3 border-b border-[#1B2A40] ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight ${className}`}>{children}</h3>;

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-4 sm:p-5 text-[#CBD5E1] ${className}`}>{children}</div>;

