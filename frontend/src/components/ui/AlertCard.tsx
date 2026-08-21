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
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
      default:
        return <AlertCircle className="w-5 h-5 text-sky-600" />;
    }
  };

  const getBorderColor = () => {
    switch (alert.severity) {
      case 'critical':
        return 'border-l-4 border-l-rose-500 bg-rose-50/20';
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-amber-50/20';
      case 'info':
      default:
        return 'border-l-4 border-l-sky-500 bg-sky-50/20';
    }
  };

  const recommendation = alert.recommendedAction || alert.aiRecommendation;
  const actionText = alert.actionText || 'Review Exception';

  return (
    <div className={`p-4 rounded-xl border border-slate-200 bg-white ${getBorderColor()} transition-all hover:shadow-xs`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-2xs shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
              <SeverityBadge severity={alert.severity} />
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.description}</p>
            {recommendation && (
              <div className="mt-2 text-xs font-medium text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-100">
                <span className="text-slate-900 font-semibold">AI Recommendation:</span> {recommendation}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs font-medium text-slate-400 shrink-0">{alert.timestamp}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
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
