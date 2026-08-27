import React, { useState } from 'react';
import { CheckCircle2, XCircle, Search, Filter, X, ShieldCheck } from 'lucide-react';
import { PlacementDrive, Student } from '../../types';
import { usePlacement } from '../../context/PlacementContext';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: PlacementDrive;
}

export const EligibilityModal: React.FC<EligibilityModalProps> = ({ isOpen, onClose, drive }) => {
  const { students, checkEligibility } = usePlacement();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'ineligible'>('all');

  if (!isOpen) return null;

  const fullRoster: Student[] = students;

  const evaluatedList = fullRoster.map((student) => {
    const result = checkEligibility(student, drive);
    return {
      student,
      eligible: result.eligible,
      reason: result.reason,
    };
  });

  const filtered = evaluatedList.filter((item) => {
    const matchesSearch =
      item.student.name.toLowerCase().includes(search.toLowerCase()) ||
      item.student.rollNumber.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'eligible' && item.eligible) ||
      (filterType === 'ineligible' && !item.eligible);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden border border-[#243650] my-6 animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Eligibility Verification Rule Engine</h3>
              <p className="text-xs text-[#CBD5E1]">
                {drive.companyName} &bull; {drive.roleTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Drive Requirements Overview */}
          <div className="p-4 rounded-xl bg-[#101D31] border border-[#243650] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Minimum CGPA</span>
              <div className="text-sm font-bold text-[#F8FAFC] mt-0.5">{drive.minCgpa}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Eligible Branches</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {drive.eligibleBranches.map((b) => (
                  <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650]">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Required Skills</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {drive.requiredSkills.map((s) => (
                  <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ELIGIBILITY SUMMARY KPI BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-[#101D31] rounded-xl border border-[#243650]">
              <span className="text-xs font-semibold text-[#CBD5E1]">Total Candidates</span>
              <div className="text-2xl font-bold text-[#F8FAFC] mt-1">428</div>
            </div>
            <div className="p-3.5 bg-[rgba(34,197,94,0.10)] rounded-xl border border-[rgba(34,197,94,0.25)]">
              <span className="text-xs font-semibold text-[#86EFAC]">Eligible</span>
              <div className="text-2xl font-bold text-[#86EFAC] mt-1">286</div>
            </div>
            <div className="p-3.5 bg-[rgba(239,68,68,0.10)] rounded-xl border border-[rgba(239,68,68,0.25)]">
              <span className="text-xs font-semibold text-[#FCA5A5]">Not Eligible</span>
              <div className="text-2xl font-bold text-[#FCA5A5] mt-1">142</div>
            </div>
            <div className="p-3.5 bg-[rgba(59,130,246,0.15)] rounded-xl border border-[rgba(59,130,246,0.30)]">
              <span className="text-xs font-semibold text-[#60A5FA]">Eligibility Rate</span>
              <div className="text-2xl font-bold text-[#60A5FA] mt-1">66.8%</div>
            </div>
          </div>

          {/* Progress Bar Visualizer */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#CBD5E1] mb-1">
              <span>Roster Evaluation Breakdown</span>
              <span>286 Eligible / 142 Ineligible</span>
            </div>
            <div className="w-full h-3 bg-[rgba(239,68,68,0.20)] rounded-full overflow-hidden flex">
              <div className="bg-[#22C55E] h-full transition-all" style={{ width: '66.8%' }} />
              <div className="bg-[#EF4444] h-full transition-all" style={{ width: '33.2%' }} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search evaluated candidate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-[#3B82F6] text-white' : 'bg-[#101D31] text-[#CBD5E1] border border-[#243650] hover:bg-[#14243B]'
                }`}
              >
                All ({evaluatedList.length})
              </button>
              <button
                onClick={() => setFilterType('eligible')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === 'eligible' ? 'bg-[#22C55E] text-white' : 'bg-[#101D31] text-[#CBD5E1] border border-[#243650] hover:bg-[#14243B]'
                }`}
              >
                Eligible ({evaluatedList.filter((e) => e.eligible).length})
              </button>
              <button
                onClick={() => setFilterType('ineligible')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === 'ineligible' ? 'bg-[#EF4444] text-white' : 'bg-[#101D31] text-[#CBD5E1] border border-[#243650] hover:bg-[#14243B]'
                }`}
              >
                Ineligible ({evaluatedList.filter((e) => !e.eligible).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-[#243650] bg-[#101D31]">
            <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
              <thead className="bg-[#14243B] text-[11px] font-semibold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Branch</th>
                  <th className="px-4 py-2.5">CGPA</th>
                  <th className="px-4 py-2.5">Verification Result</th>
                  <th className="px-4 py-2.5">Rule Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243650]">
                {filtered.map(({ student, eligible, reason }) => (
                  <tr key={student.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="px-4 py-3 align-middle font-bold text-[#F8FAFC]">
                      {student.name}
                      <span className="text-[#94A3B8] font-medium text-[11px] block">{student.rollNumber}</span>
                    </td>
                    <td className="px-4 py-3 align-middle font-medium text-[#CBD5E1]">{student.branch}</td>
                    <td className="px-4 py-3 align-middle font-bold text-[#F8FAFC]">{student.cgpa}</td>
                    <td className="px-4 py-3 align-middle">
                      {eligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Eligible ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border border-[rgba(239,68,68,0.25)] font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-[#EF4444]" /> Not Eligible ✕
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs">
                      {eligible ? (
                        <span className="text-[#86EFAC] font-medium">All eligibility rules satisfied</span>
                      ) : (
                        <span className="text-[#FCA5A5] font-medium bg-[rgba(239,68,68,0.10)] px-2 py-0.5 rounded border border-[rgba(239,68,68,0.25)]">
                          {reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
