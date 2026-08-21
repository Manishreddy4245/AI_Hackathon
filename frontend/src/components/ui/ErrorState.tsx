import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this view.',
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] text-center space-y-3 my-4 animate-in fade-in">
      <div className="w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.20)] text-[#EF4444] flex items-center justify-center mx-auto shadow-sm">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-[#FCA5A5]">{title}</h4>
        <p className="text-xs text-[#CBD5E1] mt-0.5 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button variant="outline" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
