import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand' | 'violet' | 'emerald' | 'cyan';
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
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-3d-sm hover:shadow-3d-md cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 focus:ring-indigo-500 border border-indigo-500/40 shadow-glow-indigo',
    brand:
      'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 focus:ring-indigo-500 border border-indigo-500/40 shadow-glow-indigo',
    violet:
      'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 focus:ring-violet-500 border border-violet-500/40 shadow-glow-violet',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 border border-emerald-500/40 shadow-glow-emerald',
    cyan:
      'bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-500 border border-cyan-500/40 shadow-glow-cyan',
    secondary:
      'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 focus:ring-slate-500',
    outline:
      'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-indigo-400 focus:ring-indigo-400',
    ghost:
      'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white focus:ring-slate-400 shadow-none hover:shadow-none',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 border border-rose-500',
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
