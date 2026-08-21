import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand' | 'violet' | 'emerald' | 'cyan' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:from-[#60A5FA] hover:to-[#3B82F6] focus:ring-[#3B82F6] border border-[#3B82F6]/40 shadow-[0_4px_14px_rgba(59,130,246,0.25)]',
    brand:
      'bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white hover:from-[#60A5FA] hover:to-[#3B82F6] focus:ring-[#3B82F6] border border-[#3B82F6]/40 shadow-[0_4px_14px_rgba(59,130,246,0.25)]',
    violet:
      'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 focus:ring-violet-500 border border-violet-500/40 shadow-glow-violet',
    emerald:
      'bg-[#22C55E] text-white hover:bg-emerald-500 focus:ring-[#22C55E] border border-emerald-500/40 shadow-glow-emerald',
    success:
      'bg-[#22C55E] text-white hover:bg-emerald-500 focus:ring-[#22C55E] border border-emerald-500/40 shadow-glow-emerald',
    cyan:
      'bg-[#06B6D4] text-white hover:bg-cyan-500 focus:ring-[#06B6D4] border border-cyan-500/40 shadow-glow-cyan',
    secondary:
      'bg-[#14243B] text-[#E2E8F0] hover:bg-[#192B45] border border-[#2A4263] hover:border-[#3B82F6] focus:ring-[#3B82F6]',
    outline:
      'bg-[#101D31] text-[#F8FAFC] border border-[#243650] hover:bg-[#14243B] hover:border-[#31527A] focus:ring-[#3B82F6]',
    ghost:
      'bg-transparent text-[#94A3B8] hover:bg-[#14243B] hover:text-[#F8FAFC] focus:ring-[#3B82F6] shadow-none hover:shadow-none',
    danger:
      'bg-[#EF4444] text-white hover:bg-rose-700 focus:ring-rose-500 border border-rose-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs font-bold gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
