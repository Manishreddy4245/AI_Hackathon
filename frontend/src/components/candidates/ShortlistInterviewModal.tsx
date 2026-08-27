import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  Building2,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import { CreateEditAvailabilityModal } from '../panels/CreateEditAvailabilityModal';

interface ShortlistInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
  onShortlistSuccess: (payload: any) => Promise<void> | void;
}

export const ShortlistInterviewModal: React.FC<ShortlistInterviewModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onShortlistSuccess,
}) => {
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);

  // Manual fallback fields if creating direct custom slot
  const [useCustomSlot, setUseCustomSlot] = useState(false);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartTime, setCustomStartTime] = useState('10:00 AM');
  const [customEndTime, setCustomEndTime] = useState('10:30 AM');
  const [customPanel, setCustomPanel] = useState('');
  const [customMembers, setCustomMembers] = useState('');
  const [customBlock, setCustomBlock] = useState('');
  const [customRoom, setCustomRoom] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const data = await apiService.getAvailableInterviewSlots();
      setAvailableSlots(data || []);
      if (data && data.length > 0) {
        setSelectedSlotId(data[0].id);
      } else {
        setSelectedSlotId('');
      }
    } catch (err) {
      console.error('Error fetching available interview slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !candidate) return null;

  const selectedSlot = availableSlots.find((s) => s.id === selectedSlotId);

  const handleSaveNewSlot = async (slotData: any) => {
    const created = await apiService.createInterviewAvailability(slotData);
    await fetchSlots();
    if (created?.id) {
      setSelectedSlotId(created.id);
      setUseCustomSlot(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let payload: any = {};
      if (!useCustomSlot && selectedSlot) {
        payload = {
          slot_id: selectedSlot.id,
          interview_date: selectedSlot.date,
          interview_time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          panel_name: selectedSlot.panel_name,
          panel_members: selectedSlot.panel_members || [],
          block: selectedSlot.block,
          room_number: selectedSlot.room_number,
        };
      } else if (useCustomSlot) {
        const membersList = customMembers.split(',').map((m) => m.trim()).filter(Boolean);
        payload = {
          interview_date: customDate,
          interview_time: `${customStartTime} - ${customEndTime}`,
          start_time: customStartTime,
          end_time: customEndTime,
          panel_name: customPanel,
          panel_members: membersList,
          block: customBlock,
          room_number: customRoom,
        };
      } else {
        throw new Error('Please select an available interview slot or enter custom slot details.');
      }

      await onShortlistSuccess(payload);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to shortlist candidate.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-[#F8FAFC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1B2A40] bg-[#0B1628]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">SHORTLIST CANDIDATE</h3>
              <p className="text-xs text-[#94A3B8]">
                Candidate: <strong className="text-[#F8FAFC]">{candidate.student_name}</strong> &bull;{' '}
                <strong className="text-[#60A5FA]">{candidate.company_name}</strong> ({candidate.job_title})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[rgba(239,68,68,0.15)] border border-[#EF4444] rounded-xl flex items-center gap-2 text-xs text-[#FCA5A5]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Slot Selection Controls */}
          {!useCustomSlot ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Select Available Interview Slot ▼
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreateSlotOpen(true)}
                  className="text-xs text-[#60A5FA] hover:text-white flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + New Slot
                </button>
              </div>

              {loadingSlots ? (
                <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-center text-xs text-[#94A3B8]">
                  Loading saved availability slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-5 bg-[#0B1628] rounded-xl border border-[#243650] text-center space-y-3">
                  <p className="text-xs font-bold text-[#F8FAFC]">No interview slots currently available.</p>
                  <p className="text-[11px] text-[#94A3B8]">
                    Create a new interview availability slot or specify custom details.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setIsCreateSlotOpen(true)}
                    >
                      Add Available Slot
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseCustomSlot(true)}
                    >
                      Enter Custom Details
                    </Button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full text-xs p-3 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
                >
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} | {s.start_time} - {s.end_time} | {s.panel_name} | {s.block}, {s.room_number}
                    </option>
                  ))}
                </select>
              )}

              {/* Display Selected Slot Detailed Card */}
              {selectedSlot && (
                <div className="p-4 bg-[#0B1628] rounded-xl border border-[rgba(59,130,246,0.35)] space-y-3">
                  <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">
                    Confirmed Interview Logistics
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-[#101D31] rounded-lg border border-[#243650]">
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Date</span>
                      <span className="font-bold text-[#F8FAFC] mt-0.5 block">{selectedSlot.date}</span>
                    </div>
                    <div className="p-2.5 bg-[#101D31] rounded-lg border border-[#243650]">
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Time</span>
                      <span className="font-bold text-[#F8FAFC] mt-0.5 block">
                        {selectedSlot.start_time} - {selectedSlot.end_time}
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#101D31] rounded-lg border border-[#243650]">
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Venue</span>
                      <span className="font-bold text-[#F8FAFC] mt-0.5 block">
                        {selectedSlot.room_number} ({selectedSlot.block})
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#101D31] rounded-lg border border-[#243650] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Panel</span>
                      <span className="font-bold text-[#60A5FA]">{selectedSlot.panel_name}</span>
                    </div>
                    {selectedSlot.panel_members && selectedSlot.panel_members.length > 0 && (
                      <p className="text-[11px] text-[#CBD5E1]">
                        <strong>Members:</strong> {selectedSlot.panel_members.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Slot Input Mode */
            <div className="space-y-3 p-4 bg-[#0B1628] rounded-xl border border-[#243650]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider">
                  Manual Custom Slot Details
                </span>
                <button
                  type="button"
                  onClick={() => setUseCustomSlot(false)}
                  className="text-xs text-[#94A3B8] hover:text-white underline"
                >
                  Back to Saved Slots
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Panel Name</label>
                  <input
                    type="text"
                    value={customPanel}
                    onChange={(e) => setCustomPanel(e.target.value)}
                    className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Panel Members</label>
                  <input
                    type="text"
                    value={customMembers}
                    onChange={(e) => setCustomMembers(e.target.value)}
                    className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Start Time</label>
                    <input
                      type="text"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">End Time</label>
                    <input
                      type="text"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Block</label>
                  <input
                    type="text"
                    value={customBlock}
                    onChange={(e) => setCustomBlock(e.target.value)}
                    className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Room Number</label>
                  <input
                    type="text"
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    className="w-full p-2 bg-[#101D31] border border-[#243650] rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[#1B2A40] bg-[#0B1628]/60">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSubmitting || (!useCustomSlot && !selectedSlot)}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isSubmitting ? 'Shortlisting...' : 'Confirm Shortlist & Schedule Interview'}
          </Button>
        </div>
      </div>

      {/* Modal to add new availability */}
      <CreateEditAvailabilityModal
        isOpen={isCreateSlotOpen}
        onClose={() => setIsCreateSlotOpen(false)}
        onSave={handleSaveNewSlot}
      />
    </div>
  );
};
