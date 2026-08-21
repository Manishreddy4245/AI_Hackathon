import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Filter,
  Search,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mockDrives, mockCompanies } from '../../data/mockData';
import { PlacementDrive } from '../../types';
import { CreateDriveModal } from '../../components/companies/CreateDriveModal';

export const CompaniesList: React.FC = () => {
  const navigate = useNavigate();
  const [drivesList, setDrivesList] = useState<PlacementDrive[]>(mockDrives);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const handleDriveCreated = (newDrive: PlacementDrive) => {
    setDrivesList([newDrive, ...drivesList]);
  };

  const filteredDrives = drivesList.filter((drive) => {
    const matchesSearch =
      drive.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.requiredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || drive.status === statusFilter;
    const matchesType = typeFilter === 'all' || drive.employmentType === typeFilter;
    const matchesBranch = branchFilter === 'all' || drive.eligibleBranches.includes(branchFilter);
    const matchesLocation =
      locationFilter === 'all' || drive.location.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesType && matchesBranch && matchesLocation;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Companies & Placement Drives"
        subtitle="Manage company requirements, placement drives and AI-assisted eligibility workflows."
        icon={<Building2 className="w-5 h-5" />}
        action={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Placement Drive
          </Button>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Total Recruiter Drives</span>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{drivesList.length}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Active Applications</span>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">
            {drivesList.reduce((acc, d) => acc + d.registeredCount, 0)}
          </div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Shortlisted Candidates</span>
          <div className="text-2xl font-black text-[#A855F7] mt-1">
            {drivesList.reduce((acc, d) => acc + d.shortlistedCount, 0)}
          </div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Average Package</span>
          <div className="text-2xl font-black text-[#86EFAC] mt-1">16.6 LPA</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search company, role, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="shortlisting">Shortlisting</option>
            <option value="interview">Interview</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>

          {/* Job Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Job Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="PPO">PPO</option>
          </select>

          {/* Branch Filter */}
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
            <option value="Mechanical">Mechanical</option>
          </select>
        </div>
      </Card>

      {/* Placement Drives Table */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <CardTitle>Placement Drives List</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredDrives.length} drives</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
            <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
              <tr>
                <th className="px-4 py-3">Company &amp; Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3 text-center">Applications</th>
                <th className="px-4 py-3 text-center">Shortlisted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243650]">
              {filteredDrives.map((drive) => (
                <tr
                  key={drive.id}
                  onClick={() => navigate(`/companies/${drive.id}`)}
                  className="transition-colors hover:bg-[#14243B] cursor-pointer text-[#F8FAFC]"
                >
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {drive.companyLogo}
                      </div>
                      <div>
                        <div className="font-bold text-[#F8FAFC] text-sm flex items-center gap-1.5">
                          {drive.companyName}
                          {drive.aiConfirmed && (
                            <span className="p-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA]" title="AI Verified JD">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#CBD5E1] font-medium">{drive.roleTitle} &bull; {drive.employmentType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-semibold text-[#CBD5E1]">{drive.location}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-bold text-[#86EFAC] text-sm">₹{drive.packageLpa} LPA</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="text-[#CBD5E1]">
                      <span className="font-bold text-[#F8FAFC]">Min CGPA: {drive.minCgpa}</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {drive.eligibleBranches.map((b) => (
                          <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#14243B] border border-[#243650] text-[#CBD5E1]">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-center">
                    <span className="font-bold text-[#F8FAFC]">{drive.registeredCount}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-center">
                    <span className="font-bold text-[#C084FC] bg-[rgba(168,85,247,0.15)] px-2.5 py-0.5 rounded border border-[rgba(168,85,247,0.30)]">{drive.shortlistedCount}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <StatusBadge status={drive.status} />
                  </td>
                  <td className="px-4 py-3.5 align-middle text-xs font-semibold text-[#94A3B8]">
                    {drive.deadline}
                  </td>
                  <td className="px-4 py-3.5 align-middle text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${drive.id}`);
                      }}
                      className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recruiter Partner Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#F8FAFC]">Visiting Campus Recruiters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {mockCompanies.map((c) => (
            <Card key={c.id} className="p-4 bg-[#101D31] border-[#243650] text-[#F8FAFC] hover:border-[#31527A] transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-sm flex items-center justify-center shadow-xs">
                  {c.logo}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                  {c.tier}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#F8FAFC] mt-3">{c.name}</h4>
              <p className="text-xs text-[#CBD5E1] mt-0.5 font-medium">{c.industry}</p>
              <div className="mt-3 pt-3 border-t border-[#1B2A40] text-xs text-[#94A3B8] space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span className="text-[#CBD5E1]">{c.location}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Job Description Analysis Modal */}
      <CreateDriveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDriveCreated={handleDriveCreated}
      />
    </div>
  );
};
