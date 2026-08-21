import React, { useState } from 'react';
import {
  DoorOpen,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  CalendarCheck,
  AlertTriangle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePlacement } from '../../context/PlacementContext';
import { CreatePanelModal } from '../../components/panels/CreatePanelModal';
import { RoomScheduleTimeline } from '../../components/rooms/RoomScheduleTimeline';
import { Room, Panel } from '../../types';

export const PanelsList: React.FC = () => {
  const { panelsList, roomsList, interviewsList, exceptionsList, confirmPanel } = usePlacement();
  const [activeTab, setActiveTab] = useState<'panels' | 'rooms' | 'assignments' | 'conflicts'>('panels');
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(roomsList[0] || null);

  const panelAndRoomConflicts = exceptionsList.filter(
    (e) => e.category === 'panel' || e.category === 'room' || e.category === 'scheduling'
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Panels & Rooms"
        subtitle="Manage interview panels, room availability, assignments and scheduling conflicts."
        icon={<DoorOpen className="w-5 h-5 text-white" />}
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#243650] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('panels')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'panels'
              ? 'border-[#3B82F6] text-[#60A5FA]'
              : 'border-transparent text-[#CBD5E1] hover:text-white'
          }`}
        >
          Panels ({panelsList.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'border-[#3B82F6] text-[#60A5FA]'
              : 'border-transparent text-[#CBD5E1] hover:text-white'
          }`}
        >
          Rooms ({roomsList.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'assignments'
              ? 'border-[#3B82F6] text-[#60A5FA]'
              : 'border-transparent text-[#CBD5E1] hover:text-white'
          }`}
        >
          Assignments ({interviewsList.length})
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'border-[#EF4444] text-[#F87171]'
              : 'border-transparent text-[#CBD5E1] hover:text-white'
          }`}
        >
          <span>Conflicts</span>
          {panelAndRoomConflicts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[rgba(239,68,68,0.20)] text-[#F87171] border border-[rgba(239,68,68,0.30)] text-[10px] font-bold">
              {panelAndRoomConflicts.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PANELS GRID */}
      {activeTab === 'panels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panelsList.map((panel) => (
            <Card key={panel.id} className="p-5 flex flex-col justify-between space-y-4 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC]">{panel.name}</h3>
                    <p className="text-xs text-[#CBD5E1] font-medium">{panel.companyName} &bull; Room: {panel.roomNumber}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      panel.availability === 'available'
                        ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]'
                        : panel.availability === 'busy'
                        ? 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]'
                        : 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.25)]'
                    }`}
                  >
                    {panel.availability}
                  </span>
                </div>

                {/* Panel Members List */}
                <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Assigned Members</span>
                  <ul className="space-y-1 font-semibold text-[#CBD5E1]">
                    {panel.members.map((m) => (
                      <li key={m} className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expertise Badges */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Expertise Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {panel.expertise.map((exp) => (
                      <span key={exp} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Action Footer */}
              <div className="pt-3 border-t border-[#243650] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#CBD5E1]">
                  {panel.interviewsScheduled} Interviews Scheduled
                </span>
                {panel.confirmed ? (
                  <span className="text-[#86EFAC] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Confirmed ✓
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
                  className={`p-4 transition-all cursor-pointer bg-[#101D31] border-[#243650] text-[#F8FAFC] ${
                    isSelected ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/30 bg-[#14243B]' : 'hover:border-[#31527A]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-[#F8FAFC]">{room.name}</h4>
                      <p className="text-xs text-[#CBD5E1] font-medium">{room.building}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        room.status === 'available'
                          ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border-[rgba(34,197,94,0.25)]'
                          : room.status === 'occupied'
                          ? 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]'
                          : 'bg-[#0B1628] text-[#CBD5E1] border-[#243650]'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#243650] space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#CBD5E1]">
                      <span>Capacity:</span>
                      <span className="font-bold text-[#F8FAFC]">{room.capacity} seats</span>
                    </div>
                    <div className="flex items-center justify-between text-[#CBD5E1]">
                      <span>Location:</span>
                      <span className="font-medium text-[#F8FAFC]">{room.building}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#CBD5E1]">
                      <span>Next Available:</span>
                      <span className="font-semibold text-[#86EFAC]">{room.nextAvailable}</span>
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

      {/* TAB 3: ASSIGNMENTS VIEW */}
      {activeTab === 'assignments' && (
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle>Active Panel &amp; Room Interview Assignments</CardTitle>
            <p className="text-xs text-[#CBD5E1]">Live coordination of candidate rounds across operational rooms and panel leads.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
              <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Company &amp; Round</th>
                  <th className="px-4 py-3">Assigned Panel</th>
                  <th className="px-4 py-3">Assigned Room</th>
                  <th className="px-4 py-3">Time Slot</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243650]">
                {interviewsList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-[#F8FAFC] block">{item.candidateName}</span>
                      <span className="text-[11px] font-mono text-[#94A3B8]">{item.candidateRoll}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-[#CBD5E1] block">{item.companyName}</span>
                      <span className="text-[11px] text-[#94A3B8]">{item.round}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[#60A5FA] font-bold">{item.panelName}</td>
                    <td className="px-4 py-3.5 text-[#22C55E] font-medium">{item.roomName}</td>
                    <td className="px-4 py-3.5 text-[#CBD5E1] font-mono">{item.timeSlot}</td>
                    <td className="px-4 py-3.5 text-right">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: CONFLICTS VIEW */}
      {activeTab === 'conflicts' && (
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <CardTitle className="text-[#F87171] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              <span>Panel &amp; Room Scheduling Conflicts</span>
            </CardTitle>
            <p className="text-xs text-[#CBD5E1]">
              Autonomous detection of overlapping rooms, unavailable panel members, and back-to-back overruns.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {panelAndRoomConflicts.length === 0 ? (
              <div className="p-6 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#22C55E] mx-auto" />
                <h4 className="text-sm font-bold text-[#86EFAC]">Zero Scheduling Conflicts Detected</h4>
                <p className="text-xs text-[#94A3B8]">All interview panels and venue rooms are optimally synchronized without overlap.</p>
              </div>
            ) : (
              panelAndRoomConflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="p-4 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-[#FCA5A5]">{conf.title}</h4>
                      <p className="text-xs text-[#CBD5E1] mt-1 font-medium leading-relaxed">{conf.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#94A3B8]">
                        <span>Category: <strong className="text-[#F8FAFC]">{conf.category}</strong></span>
                        <span>&bull;</span>
                        <span>Severity: <strong className="text-[#EF4444]">{conf.severity}</strong></span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-[rgba(239,68,68,0.20)] text-[#F87171] border border-[rgba(239,68,68,0.30)] shrink-0">
                    {conf.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* CREATE PANEL MODAL */}
      <CreatePanelModal
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
      />
    </div>
  );
};
