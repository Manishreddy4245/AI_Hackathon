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
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search candidate name, roll number, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
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
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All CGPA</option>
            <option value="8.5+">8.5+ CGPA</option>
            <option value="8.0+">8.0+ CGPA</option>
            <option value="7.5+">7.5+ CGPA</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
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
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <CardTitle>Registered Candidate Roster</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredStudents.length} candidates</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
            <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
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
            <tbody className="divide-y divide-[#243650]">
              {filteredStudents.map((student) => {
                const shortlisted = isShortlisted(student.id);
                return (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/candidates/${student.id}`)}
                    className="transition-colors hover:bg-[#14243B] cursor-pointer text-[#F8FAFC]"
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#243650] shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#F8FAFC] text-sm flex items-center gap-1.5">
                            {student.name}
                            {shortlisted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(168,85,247,0.15)] text-[#C084FC] border border-[rgba(168,85,247,0.30)]">
                                Shortlisted
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#CBD5E1] font-medium">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle font-mono font-medium text-[#94A3B8]">{student.rollNumber}</td>
                    <td className="px-4 py-3.5 align-middle font-bold text-[#F8FAFC]">{student.branch}</td>
                    <td className="px-4 py-3.5 align-middle font-black text-[#F8FAFC] text-sm">{student.cgpa}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {student.skills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650] text-[10px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#86EFAC] bg-[rgba(34,197,94,0.10)] px-2.5 py-0.5 rounded border border-[rgba(34,197,94,0.25)]">
                        <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> Eligible ✓
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
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
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
