import React from 'react';
import { Room } from '../../types';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface RoomScheduleTimelineProps {
  room: Room;
}

export const RoomScheduleTimeline: React.FC<RoomScheduleTimelineProps> = ({ room }) => {
  const defaultBookings = room.bookings || [
    { time: '09:00 AM', status: 'free' },
    { time: '10:00 AM', status: 'occupied', driveName: 'TechNova Technical Interview' },
    { time: '11:00 AM', status: 'free' },
    { time: '12:00 PM', status: 'occupied', driveName: 'DataSphere Candidate Evaluation' },
    { time: '01:00 PM', status: 'free' },
    { time: '02:00 PM', status: 'occupied', driveName: 'FinEdge Assessment' },
    { time: '03:00 PM', status: 'free' },
    { time: '04:00 PM', status: 'free' },
  ];

  return (
    <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-brand-600" /> Today's Venue Schedule Timeline — {room.name}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">{room.building}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {defaultBookings.map((b) => (
          <div
            key={b.time}
            className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
              b.status === 'occupied'
                ? 'bg-amber-50 border-amber-200/80 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px]">{b.time}</span>
              {b.status === 'occupied' ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                  Occupied
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase">
                  Free Block
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium mt-1 truncate">
              {b.status === 'occupied' ? b.driveName || 'Interview Session' : 'Available for booking'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
