import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { ExceptionItem } from '../../types';
import { Button } from './Button';
import { SeverityBadge } from './SeverityBadge';
import { useNavigate } from 'react-router-dom';

interface AlertCardProps {
  alert: ExceptionItem;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <ShieldAlert className="w-5 h-5 text-[#EF4444]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />;
      case 'info':
      default:
        return <AlertCircle className="w-5 h-5 text-[#38BDF8]" />;
    }
  };

  const getBorderColor = () => {
    switch (alert.severity) {
      case 'critical':
        return 'border-l-4 border-l-[#EF4444] bg-[rgba(239,68,68,0.06)] border-[#243650]';
      case 'warning':
        return 'border-l-4 border-l-[#F59E0B] bg-[rgba(245,158,11,0.06)] border-[#243650]';
      case 'info':
      default:
        return 'border-l-4 border-l-[#38BDF8] bg-[rgba(56,189,248,0.06)] border-[#243650]';
    }
  };

  const recommendation = alert.recommendedAction || alert.aiRecommendation;
  const actionText = alert.actionText || 'Review Exception';

  return (
    <div className={`p-4 rounded-xl border ${getBorderColor()} transition-all hover:bg-[#14243B]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#101D31] border border-[#243650] shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-[#F8FAFC]">{alert.title}</h4>
              <SeverityBadge severity={alert.severity} />
            </div>
            <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed">{alert.description}</p>
            {recommendation && (
              <div className="mt-2 text-xs font-medium text-[#CBD5E1] bg-[#101D31] p-2.5 rounded-lg border border-[#243650]">
                <span className="text-[#3B82F6] font-bold">AI Recommendation:</span> {recommendation}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs font-medium text-[#94A3B8] shrink-0">{alert.timestamp}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-[#1B2A40] flex items-center justify-end">
        <Button
          variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'secondary' : 'outline'}
          size="sm"
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          onClick={() => navigate(alert.actionRoute || '/exceptions')}
        >
          {actionText}
        </Button>
      </div>
    </div>
  );
};
