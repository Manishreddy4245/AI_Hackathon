import React from 'react';
import { Bot, UserCheck, Clock, Sparkles } from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';

export const AgentActivityTimeline: React.FC = () => {
  const { agentActivities } = usePlacement();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#3B82F6]" /> Agent Activity &amp; Audit Trail
        </h3>
        <span className="text-xs text-[#94A3B8] font-medium">Real-time autonomous log</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#243650]">
        {agentActivities.map((event) => (
          <div key={event.id} className="relative flex items-start gap-3 text-xs">
            {/* Timeline Dot Indicator */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-[#0B1628] flex items-center justify-center text-[10px] shadow-sm ${
                event.type === 'officer_action'
                  ? 'bg-[#22C55E] text-white'
                  : 'bg-[#3B82F6] text-white'
              }`}
            >
              {event.type === 'officer_action' ? (
                <UserCheck className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-[#243650] bg-[#101D31] shadow-sm w-full space-y-1 text-[#F8FAFC]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F8FAFC] text-xs">{event.title}</span>
                <span className="text-[10px] font-semibold text-[#94A3B8] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#3B82F6]" /> {event.timestamp}
                </span>
              </div>
              <p className="text-[#CBD5E1] font-medium leading-relaxed">{event.detail}</p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-[#94A3B8] font-semibold uppercase">
                <span className="px-2 py-0.5 rounded bg-[#14243B] border border-[#243650] text-[#CBD5E1]">{event.category}</span>
                <span className="text-[#60A5FA]">{event.type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
