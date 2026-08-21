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
    <div className="space-y-3 p-4 bg-[#101D31] rounded-xl border border-[#243650]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#3B82F6]" /> Today's Venue Schedule Timeline — {room.name}
        </span>
        <span className="text-[10px] font-semibold text-[#CBD5E1]">{room.building}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {defaultBookings.map((b) => (
          <div
            key={b.time}
            className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
              b.status === 'occupied'
                ? 'bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.25)] text-[#FCD34D]'
                : 'bg-[#0B1628] border-[#243650] text-[#F8FAFC] hover:border-[#31527A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#F8FAFC]">{b.time}</span>
              {b.status === 'occupied' ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.20)] text-[#FCD34D] uppercase border border-[rgba(245,158,11,0.30)]">
                  Occupied
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] uppercase border border-[rgba(34,197,94,0.25)]">
                  Free Block
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium mt-1 truncate text-[#CBD5E1]">
              {b.status === 'occupied' ? b.driveName || 'Interview Session' : 'Available for booking'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
