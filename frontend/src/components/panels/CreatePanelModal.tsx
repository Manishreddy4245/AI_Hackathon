import React, { useState } from 'react';
import { DoorOpen, X, Plus, Trash2, Check } from 'lucide-react';
import { Panel } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { Button } from '../ui/Button';

interface CreatePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePanelModal: React.FC<CreatePanelModalProps> = ({ isOpen, onClose }) => {
  const { createPanel, drives } = usePlacement();

  const [panelName, setPanelName] = useState('Panel D — AI & Machine Learning');
  const [companyName, setCompanyName] = useState('TechNova Solutions');
  const [roomNumber, setRoomNumber] = useState('Lab 102');
  const [members, setMembers] = useState<string[]>([
    'Dr. Suresh (Lead)',
    'Prof. Anjali Roy',
    'Industry Expert (TechNova)',
  ]);
  const [expertise, setExpertise] = useState<string[]>(['Backend', 'Python', 'Machine Learning']);
  const [newMember, setNewMember] = useState('');
  const [newSkill, setNewSkill] = useState('');

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (newMember.trim() && !members.includes(newMember.trim())) {
      setMembers([...members, newMember.trim()]);
      setNewMember('');
    }
  };

  const handleRemoveMember = (m: string) => {
    setMembers(members.filter((mem) => mem !== m));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !expertise.includes(newSkill.trim())) {
      setExpertise([...expertise, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (sk: string) => {
    setExpertise(expertise.filter((s) => s !== sk));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Panel = {
      id: `pnl-${Date.now()}`,
      name: panelName,
      members,
      companyName,
      roomNumber,
      expertise,
      availability: 'available',
      interviewsScheduled: 0,
      confirmed: true,
    };
    createPanel(p);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden border border-[#243650] my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-[#101D31] text-[#F8FAFC] border-b border-[#243650] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Create Interview Panel</h3>
              <p className="text-xs text-[#CBD5E1]">Assign interviewer rosters and technical domain expertise</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Panel Name</label>
            <input
              type="text"
              required
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Recruiter Company</label>
              <select
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] font-medium cursor-pointer"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.companyName}>
                    {d.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Assigned Room</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>
          </div>

          {/* Panel Members List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#E2E8F0]">Panel Members</label>
            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m} className="flex items-center justify-between p-2 rounded bg-[#101D31] border border-[#243650] text-xs">
                  <span className="font-semibold text-[#F8FAFC]">{m}</span>
                  <button type="button" onClick={() => handleRemoveMember(m)} className="text-[#94A3B8] hover:text-[#EF4444]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="Add member name..."
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                className="text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
              />
              <Button variant="outline" size="sm" type="button" onClick={handleAddMember}>
                + Add Member
              </Button>
            </div>
          </div>

          {/* Technical Expertise Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#E2E8F0]">Domain Expertise Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {expertise.map((exp) => (
                <span key={exp} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                  {exp}
                  <button type="button" onClick={() => handleRemoveSkill(exp)} className="hover:text-[#EF4444]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="Add skill tag e.g. AWS..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
              />
              <Button variant="outline" size="sm" type="button" onClick={handleAddSkill}>
                + Add Tag
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#243650] flex items-center justify-between">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={<Check className="w-3.5 h-3.5" />}>
              Create Panel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
