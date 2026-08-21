import React from 'react';
import { ExceptionSeverity } from '../../types';

interface SeverityBadgeProps {
  severity: ExceptionSeverity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const styles: Record<ExceptionSeverity, string> = {
    critical: 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.25)]',
    warning: 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]',
    info: 'bg-[rgba(56,189,248,0.10)] text-[#7DD3FC] border-[rgba(56,189,248,0.25)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[severity]}`}>
      {severity}
    </span>
  );
};
