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
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Recruiter Drives</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{drivesList.length}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Active Applications</span>
          <div className="text-2xl font-bold text-brand-600 mt-1">
            {drivesList.reduce((acc, d) => acc + d.registeredCount, 0)}
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Shortlisted Candidates</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {drivesList.reduce((acc, d) => acc + d.shortlistedCount, 0)}
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Average Package</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">16.6 LPA</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, role, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
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
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
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
            className="text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Placement Drives List</CardTitle>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredDrives.length} drives</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Company & Role</th>
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
            <tbody className="divide-y divide-slate-100">
              {filteredDrives.map((drive) => (
                <tr
                  key={drive.id}
                  onClick={() => navigate(`/companies/${drive.id}`)}
                  className="transition-colors hover:bg-slate-50/70 cursor-pointer"
                >
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {drive.companyLogo}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {drive.companyName}
                          {drive.aiConfirmed && (
                            <span className="p-0.5 rounded bg-brand-50 text-brand-600" title="AI Verified JD">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{drive.roleTitle} &bull; {drive.employmentType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-medium text-slate-700">{drive.location}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-bold text-emerald-700 text-sm">₹{drive.packageLpa} LPA</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-900">Min CGPA: {drive.minCgpa}</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {drive.eligibleBranches.map((b) => (
                          <span key={b} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-center">
                    <span className="font-bold text-slate-900">{drive.registeredCount}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-center">
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{drive.shortlistedCount}</span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <StatusBadge status={drive.status} />
                  </td>
                  <td className="px-4 py-3.5 align-middle text-xs font-medium text-slate-600">
                    {drive.deadline}
                  </td>
                  <td className="px-4 py-3.5 align-middle text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${drive.id}`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
        <h3 className="text-base font-bold text-slate-900">Visiting Campus Recruiters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {mockCompanies.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-2xs">
                  {c.logo}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {c.tier}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-3">{c.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{c.industry}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.location}</span>
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
