import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Layers className="w-8 h-8 text-[#94A3B8]" />,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-8 text-center rounded-2xl border border-dashed border-[#243650] bg-[#101D31] space-y-3 my-4 animate-in fade-in">
      <div className="w-12 h-12 rounded-2xl bg-[#14243B] border border-[#243650] shadow-sm flex items-center justify-center mx-auto text-[#94A3B8]">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-[#F8FAFC]">{title}</h4>
        <p className="text-xs text-[#CBD5E1] max-w-sm mx-auto mt-0.5 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
