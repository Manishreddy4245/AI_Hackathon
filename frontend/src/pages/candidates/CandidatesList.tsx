import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Filter, Download, Search, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MatchScore } from '../../components/ui/MatchScore';
import { usePlacement } from '../../context/PlacementContext';

export const CandidatesList: React.FC = () => {
  const navigate = useNavigate();
  const { students, isShortlisted } = usePlacement();

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [cgpaFilter, setCgpaFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.skills.some((sk) => sk.toLowerCase().includes(search.toLowerCase()));

    const matchesBranch = branchFilter === 'all' || s.branch.toUpperCase() === branchFilter.toUpperCase();
    const matchesCgpa =
      cgpaFilter === 'all' ||
      (cgpaFilter === '8.5+' && s.cgpa >= 8.5) ||
      (cgpaFilter === '8.0+' && s.cgpa >= 8.0) ||
      (cgpaFilter === '7.5+' && s.cgpa >= 7.5);

    const matchesSkill =
      skillFilter === 'all' || s.skills.some((sk) => sk.toLowerCase() === skillFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'shortlisted' && isShortlisted(s.id)) ||
      s.placementStatus === statusFilter;

    return matchesSearch && matchesBranch && matchesCgpa && matchesSkill && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Candidate Management"
        subtitle="Review student profiles, eligibility and placement readiness."
        icon={<Users className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>
              Export Candidate Roster
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, roll number, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
          </select>

          <select
            value={cgpaFilter}
            onChange={(e) => setCgpaFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All CGPA</option>
            <option value="8.5+">8.5+ CGPA</option>
            <option value="8.0+">8.0+ CGPA</option>
            <option value="7.5+">7.5+ CGPA</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Skills</option>
            <option value="Python">Python</option>
            <option value="Java">Java</option>
            <option value="SQL">SQL</option>
            <option value="React">React</option>
            <option value="Machine Learning">Machine Learning</option>
          </select>
        </div>
      </Card>

      {/* Candidate Directory Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registered Candidate Roster</CardTitle>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredStudents.length} candidates</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">CGPA</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3">Placement Status</th>
                <th className="px-4 py-3">Readiness Score</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const shortlisted = isShortlisted(student.id);
                return (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/candidates/${student.id}`)}
                    className="transition-colors hover:bg-slate-50/70 cursor-pointer"
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {student.name}
                            {shortlisted && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Shortlisted
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle font-mono font-medium text-slate-700">{student.rollNumber}</td>
                    <td className="px-4 py-3.5 align-middle font-semibold text-slate-900">{student.branch}</td>
                    <td className="px-4 py-3.5 align-middle font-bold text-slate-900 text-sm">{student.cgpa}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {student.skills.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Eligible ✓
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <StatusBadge status={shortlisted ? 'shortlisted' : student.placementStatus} />
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <MatchScore score={student.readinessScore || 82} />
                    </td>
                    <td className="px-4 py-3.5 align-middle text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/candidates/${student.id}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
