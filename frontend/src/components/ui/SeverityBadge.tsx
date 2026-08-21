import React from 'react';
import { ExceptionSeverity } from '../../types';

interface SeverityBadgeProps {
  severity: ExceptionSeverity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const styles: Record<ExceptionSeverity, string> = {
    critical: 'bg-rose-100 text-rose-800 border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    info: 'bg-sky-100 text-sky-800 border-sky-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${styles[severity]}`}>
      {severity}
    </span>
  );
};
