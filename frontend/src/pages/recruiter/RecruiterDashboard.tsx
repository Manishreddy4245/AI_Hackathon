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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" /> Company Recruiter Workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiter Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review company placement drives, applicant shortlists, interview progress, and mark candidate selections.
          </p>
        </div>

        {/* Drive Filter Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2"
          >
            {drives.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                {d.companyName} - {d.roleTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drive Overview Metrics */}
      {currentDrive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drive Role & Package</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{currentDrive.roleTitle}</div>
            <div className="text-xs font-bold text-emerald-600 mt-0.5">₹{currentDrive.packageLpa} LPA &bull; {currentDrive.location}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{currentDrive.registeredCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Campus candidates applied</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted</div>
            <div className="text-2xl font-black text-brand-600 mt-1">{currentDrive.shortlistedCount || 32}</div>
            <div className="text-xs text-slate-500 mt-0.5">Approved by Placement Officer</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selections Made</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {driveInterviews.filter((i) => i.status === 'completed' || i.status === 'confirmed').length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Interview evaluations finalized</div>
          </div>
        </div>
      )}

      {/* Main Recruiter Candidate Evaluation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Scheduled Interviews & Candidates</h3>
            <p className="text-xs text-slate-500">Evaluate candidates assigned to {currentDrive?.companyName}</p>
          </div>
          <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
            {driveInterviews.length} Slots Scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Candidate</th>
                <th className="p-3.5">Roll Number</th>
                <th className="p-3.5">Round</th>
                <th className="p-3.5">Time Slot & Room</th>
                <th className="p-3.5">Panel Assigned</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Recruiter Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {driveInterviews.length > 0 ? (
                driveInterviews.map((intSlot) => (
                  <tr key={intSlot.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 pl-5 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                        {intSlot.candidateName.charAt(0)}
                      </div>
                      <span>{intSlot.candidateName}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{intSlot.candidateRoll}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {intSlot.round}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div>{intSlot.timeSlot}</div>
                      <div className="text-[11px] text-slate-500">{intSlot.roomName}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{intSlot.panelName}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                          intSlot.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : intSlot.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {intSlot.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right space-x-1">
                      <button
                        onClick={() => handleOutcomeChange(intSlot.id, 'completed')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Select Candidate
                      </button>
                      <button
                        onClick={() => handleOutcomeChange(intSlot.id, 'cancelled')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
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
