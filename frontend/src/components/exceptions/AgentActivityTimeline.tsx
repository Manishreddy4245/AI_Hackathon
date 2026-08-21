import React from 'react';
import { Bot, UserCheck, Clock, Sparkles } from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';

export const AgentActivityTimeline: React.FC = () => {
  const { agentActivities } = usePlacement();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-600" /> Agent Activity & Audit Trail
        </h3>
        <span className="text-xs text-slate-500 font-medium">Real-time autonomous log</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {agentActivities.map((event) => (
          <div key={event.id} className="relative flex items-start gap-3 text-xs">
            {/* Timeline Dot Indicator */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-2xs ${
                event.type === 'officer_action'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 text-white'
              }`}
            >
              {event.type === 'officer_action' ? (
                <UserCheck className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs w-full space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{event.title}</span>
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {event.timestamp}
                </span>
              </div>
              <p className="text-slate-600 font-medium leading-relaxed">{event.detail}</p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                <span>{event.category}</span>
                <span>{event.type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
