import React, { useState } from 'react';
import { Building2, Users, Calendar, CheckCircle, XCircle, Clock, Award, Filter, Sparkles } from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';
import { InterviewStatus } from '../../types';

export const RecruiterDashboard: React.FC = () => {
  const { drives, students, interviewsList, updateInterviewStatus, triggerToast } = usePlacement();
  const [selectedDriveId, setSelectedDriveId] = useState<string>('technova-backend');

  const currentDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  const driveInterviews = interviewsList.filter(
    (i) => i.companyName.toLowerCase().includes(currentDrive?.companyName.toLowerCase() || 'technova')
  );

  const handleOutcomeChange = (interviewId: string, status: InterviewStatus) => {
    updateInterviewStatus(interviewId, status);
    triggerToast(`Candidate interview outcome set to ${status.replace('_', ' ').toUpperCase()}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#101D31] p-6 rounded-2xl border border-[#243650] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.25)] text-[#FCD34D] text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5 text-[#F59E0B]" /> Company Recruiter Workspace
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Recruiter Command Center</h1>
          <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
            Review company placement drives, applicant shortlists, interview progress, and mark candidate selections.
          </p>
        </div>

        {/* Drive Filter Selector */}
        <div className="flex items-center gap-2 bg-[#0B1628] p-2 rounded-xl border border-[#243650]">
          <Filter className="w-4 h-4 text-[#3B82F6] ml-1" />
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#F8FAFC] focus:outline-none cursor-pointer pr-2"
          >
            {drives.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0B1628] text-[#F8FAFC]">
                {d.companyName} - {d.roleTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drive Overview Metrics */}
      {currentDrive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
            <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Drive Role &amp; Package</div>
            <div className="text-lg font-bold text-[#F8FAFC] mt-1">{currentDrive.roleTitle}</div>
            <div className="text-xs font-bold text-[#86EFAC] mt-0.5">₹{currentDrive.packageLpa} LPA &bull; {currentDrive.location}</div>
          </div>

          <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
            <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Total Registered</div>
            <div className="text-2xl font-black text-[#F8FAFC] mt-1">{currentDrive.registeredCount}</div>
            <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">Campus candidates applied</div>
          </div>

          <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
            <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Shortlisted</div>
            <div className="text-2xl font-black text-[#3B82F6] mt-1">{currentDrive.shortlistedCount || 32}</div>
            <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">Approved by Placement Officer</div>
          </div>

          <div className="bg-[#101D31] p-5 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
            <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Selections Made</div>
            <div className="text-2xl font-black text-[#86EFAC] mt-1">
              {driveInterviews.filter((i) => i.status === 'completed' || i.status === 'confirmed').length}
            </div>
            <div className="text-xs text-[#CBD5E1] mt-0.5 font-medium">Interview evaluations finalized</div>
          </div>
        </div>
      )}

      {/* Main Recruiter Candidate Evaluation Table */}
      <div className="bg-[#101D31] rounded-2xl border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] overflow-hidden text-[#F8FAFC]">
        <div className="p-5 border-b border-[#243650] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Scheduled Interviews &amp; Candidates</h3>
            <p className="text-xs text-[#CBD5E1]">Evaluate candidates assigned to {currentDrive?.companyName}</p>
          </div>
          <span className="px-3 py-1 bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] text-xs font-bold rounded-full">
            {driveInterviews.length} Slots Scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#14243B] text-[#CBD5E1] uppercase tracking-wider font-bold border-b border-[#243650]">
              <tr>
                <th className="p-3.5 pl-5">Candidate</th>
                <th className="p-3.5">Roll Number</th>
                <th className="p-3.5">Round</th>
                <th className="p-3.5">Time Slot &amp; Room</th>
                <th className="p-3.5">Panel Assigned</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Recruiter Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243650] font-medium text-[#F8FAFC]">
              {driveInterviews.length > 0 ? (
                driveInterviews.map((intSlot) => (
                  <tr key={intSlot.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-[#F8FAFC] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {intSlot.candidateName.charAt(0)}
                      </div>
                      <span>{intSlot.candidateName}</span>
                    </td>
                    <td className="p-3.5 font-mono text-[#CBD5E1]">{intSlot.candidateRoll}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1628] text-[#CBD5E1] border border-[#243650]">
                        {intSlot.round}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#F8FAFC]">{intSlot.timeSlot}</div>
                      <div className="text-[11px] text-[#94A3B8]">{intSlot.roomName}</div>
                    </td>
                    <td className="p-3.5 font-bold text-[#F8FAFC]">{intSlot.panelName}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                          intSlot.status === 'completed'
                            ? 'bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]'
                            : intSlot.status === 'cancelled'
                            ? 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)]'
                            : 'bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]'
                        }`}
                      >
                        {intSlot.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right space-x-1">
                      <button
                        onClick={() => handleOutcomeChange(intSlot.id, 'completed')}
                        className="px-2.5 py-1 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        Select Candidate
                      </button>
                      <button
                        onClick={() => handleOutcomeChange(intSlot.id, 'cancelled')}
                        className="px-2.5 py-1 bg-[#14243B] hover:bg-[rgba(239,68,68,0.20)] text-[#CBD5E1] hover:text-[#FCA5A5] border border-[#243650] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#94A3B8]">
                    No active interview slots found for this drive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
