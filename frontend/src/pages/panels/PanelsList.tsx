import React, { useState } from 'react';
import { DoorOpen, Plus, Users, CheckCircle2, AlertCircle, Clock, MapPin, Building2, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePlacement } from '../../context/PlacementContext';
import { CreatePanelModal } from '../../components/panels/CreatePanelModal';
import { RoomScheduleTimeline } from '../../components/rooms/RoomScheduleTimeline';
import { Room } from '../../types';

export const PanelsList: React.FC = () => {
  const { panelsList, roomsList, confirmPanel } = usePlacement();
  const [activeTab, setActiveTab] = useState<'panels' | 'rooms'>('panels');
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(roomsList[0]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Panels & Rooms Coordination"
        subtitle="Manage interview panels, expertise and venue availability."
        icon={<DoorOpen className="w-5 h-5" />}
        action={
          activeTab === 'panels' ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreatePanelOpen(true)}
            >
              Create Panel
            </Button>
          ) : undefined
        }
      />

      {/* Tab Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('panels')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'panels'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Panels ({panelsList.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'rooms'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Venue Rooms ({roomsList.length})
        </button>
      </div>

      {/* TAB 1: PANELS GRID */}
      {activeTab === 'panels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panelsList.map((panel) => (
            <Card key={panel.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{panel.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{panel.companyName} &bull; Room: {panel.roomNumber}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      panel.availability === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : panel.availability === 'busy'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {panel.availability}
                  </span>
                </div>

                {/* Panel Members List */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Members</span>
                  <ul className="space-y-1 font-semibold text-slate-800">
                    {panel.members.map((m) => (
                      <li key={m} className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expertise Badges */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Expertise Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {panel.expertise.map((exp) => (
                      <span key={exp} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  {panel.interviewsScheduled} Interviews Today
                </span>
                {panel.confirmed ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed ✓
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => confirmPanel(panel.id)}
                  >
                    Confirm Panel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: ROOMS GRID & TIMELINE */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {roomsList.map((room) => {
              const isSelected = selectedRoom?.id === room.id;
              return (
                <Card
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 transition-all cursor-pointer ${
                    isSelected ? 'border-brand-600 ring-2 ring-brand-500/20 bg-brand-50/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{room.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{room.building}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        room.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : room.status === 'occupied'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Capacity:</span>
                      <span className="font-bold text-slate-900">{room.capacity} seats</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Next Available:</span>
                      <span className="font-semibold text-emerald-700">{room.nextAvailable}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ROOM HOURLY TIMELINE VISUALIZER */}
          {selectedRoom && <RoomScheduleTimeline room={selectedRoom} />}
        </div>
      )}

      {/* CREATE PANEL MODAL */}
      <CreatePanelModal
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
      />
    </div>
  );
};
