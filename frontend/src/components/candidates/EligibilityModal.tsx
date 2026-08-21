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

  // Additional mock candidates to populate realistic 428 pool metrics
  const fullRoster: Student[] = [
    ...students,
    {
      id: 'std-7',
      rollNumber: '2021ECE1045',
      name: 'Rohan Gupta',
      email: 'rohan.g@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      branch: 'ECE',
      batch: '2027',
      cgpa: 6.9,
      skills: ['Python', 'C++'],
      projects: [],
      certifications: [],
      readinessScore: 65,
      resumeUrl: '#',
      placementStatus: 'unplaced',
      applicationsCount: 1,
      shortlistsCount: 0,
      interviewsCount: 0,
    },
    {
      id: 'std-8',
      rollNumber: '2021ME1012',
      name: 'Vikas Sharma',
      email: 'vikas.s@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      branch: 'Mechanical',
      batch: '2027',
      cgpa: 7.9,
      skills: ['CAD', 'Python'],
      projects: [],
      certifications: [],
      readinessScore: 70,
      resumeUrl: '#',
      placementStatus: 'unplaced',
      applicationsCount: 2,
      shortlistsCount: 0,
      interviewsCount: 0,
    },
  ];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Eligibility Verification Rule Engine</h3>
              <p className="text-xs text-slate-400">
                {drive.companyName} &bull; {drive.roleTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Drive Requirements Overview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Minimum CGPA</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{drive.minCgpa}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Eligible Branches</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {drive.eligibleBranches.map((b) => (
                  <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Required Skills</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {drive.requiredSkills.map((s) => (
                  <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ELIGIBILITY SUMMARY KPI BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Total Candidates</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">428</div>
            </div>
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
              <span className="text-xs font-semibold text-emerald-700">Eligible</span>
              <div className="text-2xl font-bold text-emerald-800 mt-1">286</div>
            </div>
            <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/80">
              <span className="text-xs font-semibold text-rose-700">Not Eligible</span>
              <div className="text-2xl font-bold text-rose-800 mt-1">142</div>
            </div>
            <div className="p-3.5 bg-brand-50/50 rounded-xl border border-brand-200/80">
              <span className="text-xs font-semibold text-brand-700">Eligibility Rate</span>
              <div className="text-2xl font-bold text-brand-800 mt-1">66.8%</div>
            </div>
          </div>

          {/* Progress Bar Visualizer */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Roster Evaluation Breakdown</span>
              <span>286 Eligible / 142 Ineligible</span>
            </div>
            <div className="w-full h-3 bg-rose-200 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: '66.8%' }} />
              <div className="bg-rose-500 h-full transition-all" style={{ width: '33.2%' }} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search evaluated candidate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({evaluatedList.length})
              </button>
              <button
                onClick={() => setFilterType('eligible')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filterType === 'eligible' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Eligible ({evaluatedList.filter((e) => e.eligible).length})
              </button>
              <button
                onClick={() => setFilterType('ineligible')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filterType === 'ineligible' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ineligible ({evaluatedList.filter((e) => !e.eligible).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Branch</th>
                  <th className="px-4 py-2.5">CGPA</th>
                  <th className="px-4 py-2.5">Verification Result</th>
                  <th className="px-4 py-2.5">Rule Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ student, eligible, reason }) => (
                  <tr key={student.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 align-middle font-bold text-slate-900">
                      {student.name}
                      <span className="text-slate-400 font-medium text-[11px] block">{student.rollNumber}</span>
                    </td>
                    <td className="px-4 py-3 align-middle font-medium text-slate-700">{student.branch}</td>
                    <td className="px-4 py-3 align-middle font-bold text-slate-900">{student.cgpa}</td>
                    <td className="px-4 py-3 align-middle">
                      {eligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Eligible ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Not Eligible ✕
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs">
                      {eligible ? (
                        <span className="text-emerald-700 font-medium">All eligibility rules satisfied</span>
                      ) : (
                        <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
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
