import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Filter,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Sparkles,
  FileText,
  UserCheck,
  RefreshCw,
  Award,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MatchScore } from '../../components/ui/MatchScore';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';
import { ShortlistInterviewModal } from '../../components/candidates/ShortlistInterviewModal';
import { AllocateAptitudeModal } from '../../components/candidates/AllocateAptitudeModal';
import { CreateOfferModal } from '../../components/offers/CreateOfferModal';
import { CandidatePoolStats } from '../../types';

export const CandidatesList: React.FC = () => {
  const navigate = useNavigate();
  const { drives, triggerToast } = usePlacement();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<CandidatePoolStats>({
    all: 0,
    applied: 0,
    shortlisted: 0,
    not_shortlisted: 0,
    interview_scheduled: 0,
    selected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshingPool, setIsRefreshingPool] = useState(false);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driveFilter, setDriveFilter] = useState('all');

  const [selectedCandidateForShortlist, setSelectedCandidateForShortlist] = useState<any | null>(null);
  const [selectedCandidateForAptitude, setSelectedCandidateForAptitude] = useState<any | null>(null);
  const [selectedCandidateForOffer, setSelectedCandidateForOffer] = useState<any | null>(null);


  const fetchPool = async (isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsRefreshingPool(true);
    }
    try {
      const [poolData, statsData] = await Promise.all([
        apiService.getCandidatePool(driveFilter !== 'all' ? driveFilter : undefined).catch(() => null),
        apiService.getCandidatePoolStats(driveFilter !== 'all' ? driveFilter : undefined).catch(() => null),
      ]);
      const safePool = poolData || [];
      setCandidates(safePool);
      if (statsData !== null && statsData !== undefined) {
        setStats(statsData);
      } else {
        setStats({
          all: safePool.length,
          applied: safePool.filter((c: any) => (c.status || '').toUpperCase() === 'APPLIED' && (c.stage || '').toUpperCase() === 'APPLIED').length,
          shortlisted: safePool.filter((c: any) => SHORTLISTED_STAGES.includes((c.status || '').toUpperCase()) || SHORTLISTED_STAGES.includes((c.stage || '').toUpperCase())).length,
          not_shortlisted: safePool.filter((c: any) => REJECTED_STAGES.includes((c.status || '').toUpperCase()) || REJECTED_STAGES.includes((c.stage || '').toUpperCase())).length,
          interview_scheduled: safePool.filter((c: any) => !!c.interview || ['INTERVIEW_SCHEDULED', 'HR_INTERVIEW_ALLOCATED'].includes((c.stage || '').toUpperCase())).length,
          selected: safePool.filter((c: any) => SELECTED_STAGES.includes((c.status || '').toUpperCase()) || SELECTED_STAGES.includes((c.stage || '').toUpperCase())).length,
        });
      }
    } catch (err) {
      console.error('Error fetching candidate pool:', err);
    } finally {
      setLoading(false);
      setIsRefreshingPool(false);
    }
  };

  useEffect(() => {
    fetchPool(true);
  }, [driveFilter]);

  const handleShortlistSuccess = async (payload: any) => {
    if (!selectedCandidateForShortlist) return;
    const candId = selectedCandidateForShortlist.id;
    // Optimistic in-place update without wiping list
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candId
          ? {
              ...c,
              status: 'SHORTLISTED',
              interview: payload?.interview_date
                ? {
                    date: payload.interview_date,
                    time: payload.interview_time,
                    panel_name: payload.panel_name || 'Technical Panel',
                    room_name: payload.room || 'Room 101',
                  }
                : c.interview,
            }
          : c
      )
    );
    setStats((prev) => ({
      ...prev,
      shortlisted: prev.shortlisted + 1,
      applied: Math.max(0, prev.applied - 1),
    }));
    try {
      await apiService.shortlistApplication(candId, payload);
      triggerToast(`Successfully shortlisted ${selectedCandidateForShortlist.student_name}!`, 'success');
      fetchPool(false);
    } catch (err) {
      triggerToast('Failed to shortlist candidate.', 'error');
      fetchPool(false);
    }
  };

  const handleAllocateAptitude = async (appId: string, studentName: string) => {
    try {
      await apiService.allocateAptitude(appId);
      triggerToast(`Allocated Aptitude Round to ${studentName}! Notification dispatched.`, 'success');
      fetchPool(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to allocate aptitude round.';
      triggerToast(msg, 'error');
    }
  };

  const handleSimulateAptitudePass = async (appId: string, studentName: string) => {
    try {
      await apiService.evaluateAptitude(appId, true, 88);
      triggerToast(`Marked ${studentName} as Aptitude Qualified (Interview Ready)!`, 'success');
      fetchPool(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update aptitude result.';
      triggerToast(msg, 'error');
    }
  };

  const handleReject = async (candidateId: string, candidateName: string) => {
    if (window.confirm(`Mark ${candidateName}'s application as Not Shortlisted?`)) {
      // Optimistic in-place update without wiping list
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: 'NOT_SHORTLISTED' } : c))
      );
      setStats((prev) => ({
        ...prev,
        not_shortlisted: prev.not_shortlisted + 1,
        applied: Math.max(0, prev.applied - 1),
      }));
      try {
        await apiService.rejectApplication(candidateId);
        triggerToast(`Updated application status to Not Shortlisted.`, 'info');
        fetchPool(false);
      } catch (err) {
        triggerToast('Failed to update status.', 'error');
        fetchPool(false);
      }
    }
  };


  const SHORTLISTED_STAGES = [
    'SHORTLISTED', 'APTITUDE_ALLOCATED', 'APTITUDE_ASSIGNED', 'APTITUDE_IN_PROGRESS',
    'APTITUDE_QUALIFIED', 'TECHNICAL_ROUND_PENDING', 'TECHNICAL_ALLOCATED', 'TECHNICAL_IN_PROGRESS',
    'TECHNICAL_QUALIFIED', 'INTERVIEW_PENDING', 'HR_INTERVIEW_PENDING', 'HR_INTERVIEW_ALLOCATED',
    'INTERVIEW_READY', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'INTERVIEWED',
    'SELECTED', 'FINAL_SELECTED', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'JOINED', 'PLACED'
  ];
  const SELECTED_STAGES = ['SELECTED', 'FINAL_SELECTED', 'ACCEPTED', 'PLACED', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'JOINED'];
  const REJECTED_STAGES = ['NOT_SHORTLISTED', 'REJECTED', 'APTITUDE_FAILED', 'REJECTED_AT_APTITUDE', 'REJECTED_AT_TECHNICAL', 'TECHNICAL_FAILED', 'REJECTED_AT_HR', 'INTERVIEW_FAILED'];

  const filteredCandidates = candidates.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.student_email || '').toLowerCase().includes(q) ||
      (c.rollNumber || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.job_title || '').toLowerCase().includes(q) ||
      (c.skills || []).some((sk: string) => sk.toLowerCase().includes(q));

    const matchesBranch = branchFilter === 'all' || (c.branch || '').toUpperCase() === branchFilter.toUpperCase();

    const stUpper = (c.status || '').toUpperCase();
    const stageUpper = (c.stage || '').toUpperCase();

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'APPLIED' && stUpper === 'APPLIED' && stageUpper === 'APPLIED') ||
      (statusFilter === 'SHORTLISTED' && (SHORTLISTED_STAGES.includes(stUpper) || SHORTLISTED_STAGES.includes(stageUpper))) ||
      (statusFilter === 'NOT_SHORTLISTED' && (REJECTED_STAGES.includes(stUpper) || REJECTED_STAGES.includes(stageUpper))) ||
      (statusFilter === 'INTERVIEW_SCHEDULED' && (!!c.interview || ['INTERVIEW_SCHEDULED', 'HR_INTERVIEW_ALLOCATED'].includes(stageUpper))) ||
      (statusFilter === 'SELECTED' && (SELECTED_STAGES.includes(stUpper) || SELECTED_STAGES.includes(stageUpper)));

    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Candidate Pool Management"
        subtitle="Manage real student applicants, evaluate resume skills, and schedule placement interviews."
        icon={<Users className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<RefreshCw className={`w-4 h-4 ${isRefreshingPool || loading ? 'animate-spin' : ''}`} />}
              onClick={() => fetchPool(false)}
              disabled={isRefreshingPool || loading}
            >
              {isRefreshingPool ? 'Updating...' : 'Refresh Pool'}
            </Button>
          </div>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">All Applicants</span>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{stats.all || 0}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Applied</span>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">{stats.applied || 0}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Shortlisted</span>
          <div className="text-2xl font-black text-[#22C55E] mt-1">{stats.shortlisted || 0}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Not Shortlisted</span>
          <div className="text-2xl font-black text-[#EF4444] mt-1">{stats.not_shortlisted || 0}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider">Interview Set</span>
          <div className="text-2xl font-black text-[#FCD34D] mt-1">{stats.interview_scheduled || 0}</div>
        </div>
        <div className="p-4 bg-[#101D31] rounded-xl border border-[#243650] shadow-sm">
          <span className="text-xs font-bold text-[#86EFAC] uppercase tracking-wider">Selected</span>
          <div className="text-2xl font-black text-[#86EFAC] mt-1">{stats.selected || 0}</div>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search candidate, roll no, company, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            value={driveFilter}
            onChange={(e) => setDriveFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Placement Drives</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companyName} — {d.roleTitle}
              </option>
            ))}
          </select>

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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Application Statuses</option>
            <option value="APPLIED">Applied (Pending Review)</option>
            <option value="SHORTLISTED">Shortlisted (In Pipeline)</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="SELECTED">Selected / Placed</option>
            <option value="NOT_SHORTLISTED">Not Shortlisted / Rejected</option>
          </select>
        </div>
      </Card>

      {/* CANDIDATE APPLICATIONS ROSTER */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
          <CardTitle>Application Review & Candidate Pool</CardTitle>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredCandidates.length} applicants</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading && candidates.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#94A3B8]">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
                <span>Loading candidate applications...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] space-y-2">
              <Users className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[#F8FAFC]">No candidate applications yet</p>
              <p className="text-xs text-[#64748B]">
                When students apply for college placement drives, their applications and extracted resume profiles will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#243650]">
              {filteredCandidates.map((c) => {
                const stage = (c.stage || c.status || 'APPLIED').toUpperCase();
                const isEligible = c.eligible !== false;
                const isShortlisted = stage === 'SHORTLISTED';
                const isAptitudeAssigned = stage === 'APTITUDE_ALLOCATED' || stage === 'APTITUDE_ASSIGNED';

                const isAptitudeQualified = stage === 'APTITUDE_QUALIFIED' || stage === 'INTERVIEW_READY';
                const isInterviewScheduled = (stage === 'INTERVIEW_SCHEDULED' || (!!c.interview && (c.interview.status || '').toUpperCase() === 'SCHEDULED')) && !['INTERVIEW_COMPLETED', 'SELECTED', 'FINAL_SELECTED', 'PLACED', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'JOINED'].includes(stage);
                const isRejected = ['NOT_SHORTLISTED', 'REJECTED', 'APTITUDE_FAILED', 'REJECTED_AT_APTITUDE', 'REJECTED_AT_TECHNICAL', 'REJECTED_AT_HR', 'INTERVIEW_FAILED'].includes(stage);
                const hasInterview = !!c.interview;

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/admin/candidates/${c.id}`)}
                    className="p-5 hover:bg-[#14243B] transition-colors cursor-pointer space-y-4"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
                          {c.student_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#F8FAFC] text-base">{c.student_name}</h3>

                            {!isEligible && (
                              <span
                                title={(c.eligibility_reasons || []).join('; ')}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(239,68,68,0.20)] text-[#F87171] border border-[rgba(239,68,68,0.40)] cursor-help"
                              >
                                ⚠️ Ineligible {(c.eligibility_reasons?.length ? `(${c.eligibility_reasons[0]})` : '')}
                              </span>
                            )}
                            {isEligible && stage === 'APPLIED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                                🔵 Eligible (Applied)
                              </span>
                            )}
                            {isEligible && isShortlisted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🟡 Shortlisted (Aptitude Pending)
                              </span>
                            )}
                            {isEligible && isAptitudeAssigned && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                🔷 Aptitude Round Allocated
                              </span>
                            )}
                            {isEligible && stage === 'APTITUDE_IN_PROGRESS' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                ⏳ Aptitude Test In Progress
                              </span>
                            )}
                            {isEligible && stage === 'APTITUDE_QUALIFIED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🟢 Aptitude Qualified (Technical Eligible)
                              </span>
                            )}
                            {isEligible && stage === 'TECHNICAL_ALLOCATED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                💻 Technical Round Allocated
                              </span>
                            )}
                            {isEligible && stage === 'HR_INTERVIEW_ALLOCATED' && !isInterviewScheduled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                🔷 HR / Interview Allocated
                              </span>
                            )}
                            {isEligible && isInterviewScheduled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                🟣 Interview Scheduled
                              </span>
                            )}
                            {isEligible && stage === 'INTERVIEW_COMPLETED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                🤝 Interview Completed (Decision Pending)
                              </span>
                            )}
                            {isEligible && (['SELECTED', 'FINAL_SELECTED', 'PLACED'].includes(stage) || (c.status || '').toUpperCase() === 'SELECTED' || (c.status || '').toUpperCase() === 'PLACED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🏆 Selected / Placed
                              </span>
                            )}
                            {isEligible && (stage === 'OFFER_EXTENDED' || (c.status || '').toUpperCase() === 'OFFER_EXTENDED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                📄 Offer Extended
                              </span>
                            )}
                            {isEligible && (stage === 'OFFER_ACCEPTED' || (c.status || '').toUpperCase() === 'OFFER_ACCEPTED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                ✅ Offer Accepted
                              </span>
                            )}
                            {isEligible && (stage === 'JOINED' || (c.status || '').toUpperCase() === 'JOINED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🎉 Joined Company
                              </span>
                            )}
                            {stage === 'TECHNICAL_IN_PROGRESS' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                💻 Technical In Progress
                              </span>
                            )}
                            {(stage === 'TECHNICAL_QUALIFIED' || stage === 'INTERVIEW_PENDING') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🟢 Technical Qualified (Interview Pending)
                              </span>
                            )}
                            {stage === 'REJECTED_AT_TECHNICAL' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                                🔴 Rejected at Technical
                              </span>
                            )}
                            {stage === 'REJECTED_AT_HR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                                🔴 Rejected at HR / Interview
                              </span>
                            )}
                            {(isRejected || stage === 'REJECTED_AT_APTITUDE') && stage !== 'REJECTED_AT_TECHNICAL' && stage !== 'REJECTED_AT_HR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                                🔴 {stage === 'REJECTED_AT_APTITUDE' ? 'Rejected at Aptitude' : 'Not Shortlisted / Failed'}
                              </span>
                            )}

                          </div>
                          <div className="text-xs text-[#CBD5E1] mt-0.5">
                            <strong className="text-[#60A5FA]">{c.job_title}</strong> at{' '}
                            <strong className="text-[#F8FAFC]">{c.company_name}</strong> &bull; Applied on{' '}
                            <span className="font-mono text-[#94A3B8]">{c.applied_at}</span>
                          </div>
                          <div className="text-[11px] text-[#CBD5E1] mt-1.5 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-mono text-[#F8FAFC]">
                              📱 {c.mobile || c.applicant?.mobile || 'Mobile N/A'}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-[#CBD5E1]">
                              🎓 {c.college_name || c.applicant?.college_name || 'Campus University'}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-[#94A3B8]">
                              📍 {c.location || c.applicant?.location || 'Bengaluru'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/candidates/${c.id}`);
                          }}
                        >
                          View Candidate
                        </Button>

                        {!isEligible && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title={(c.eligibility_reasons || []).join('; ') || "Candidate is ineligible"}
                          >
                            Ineligible
                          </Button>
                        )}

                        {isEligible && stage === 'APPLIED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await apiService.shortlistApplication(c.id);
                                triggerToast(`Shortlisted ${c.student_name}! Next step: Allocate Aptitude Round.`, 'success');
                                fetchPool(false);
                              } catch (err: any) {
                                triggerToast(err?.response?.data?.detail || 'Shortlist failed.', 'error');
                              }
                            }}
                          >
                            Shortlist Candidate
                          </Button>
                        )}

                        {isEligible && isShortlisted && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                            icon={<Sparkles className="w-4 h-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAllocateAptitude(c.id, c.student_name);
                            }}
                          >
                            Allocate Aptitude
                          </Button>
                        )}

                        {isEligible && stage === 'APTITUDE_QUALIFIED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                            icon={<Sparkles className="w-4 h-4" />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await apiService.allocateTechnicalRound(c.id);
                                triggerToast(`Technical round allocated to ${c.student_name}!`, 'success');
                                fetchPool(false);
                              } catch (err: any) {
                                triggerToast(err?.response?.data?.detail || 'Technical round allocation failed.', 'error');
                              }
                            }}
                          >
                            Allocate Technical Round
                          </Button>
                        )}

                        {isEligible && (stage === 'TECHNICAL_QUALIFIED' || stage === 'INTERVIEW_PENDING' || c.canAllocateHR) && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                            icon={<Users className="w-4 h-4" />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await apiService.allocateHRRound(c.id);
                                triggerToast(`HR / Interview round allocated to ${c.student_name}!`, 'success');
                                fetchPool(false);
                              } catch (err: any) {
                                triggerToast(err?.response?.data?.detail || 'HR / Interview round allocation failed.', 'error');
                              }
                            }}
                          >
                            Allocate HR / Interview
                          </Button>
                        )}

                        {isEligible && stage === 'HR_INTERVIEW_ALLOCATED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/interviews');
                            }}
                          >
                            Schedule Interview
                          </Button>
                        )}


                        {isEligible && stage === 'TECHNICAL_ALLOCATED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 cursor-default"
                          >
                            Technical Allocated
                          </Button>
                        )}


                        {isEligible && isAptitudeAssigned && stage !== 'APTITUDE_QUALIFIED' && stage !== 'TECHNICAL_ALLOCATED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10 cursor-default"
                          >
                            Aptitude Allocated
                          </Button>
                        )}

                        {isEligible && (isAptitudeQualified || stage === 'TECHNICAL_ALLOCATED') && !isInterviewScheduled && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidateForShortlist(c);
                            }}
                          >
                            Schedule Interview
                          </Button>
                        )}

                        {isEligible && (stage === 'SELECTED' || c.status === 'SELECTED' || c.canIssueOffer) && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                            icon={<Award className="w-4 h-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidateForOffer(c);
                            }}
                          >
                            Issue Offer Letter
                          </Button>
                        )}

                        {isEligible && stage === 'OFFERED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10 cursor-default"
                          >
                            Offer Released
                          </Button>
                        )}

                        {isEligible && (stage === 'OFFER_ACCEPTED' || stage === 'JOINING_CONFIRMED') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Placed &amp; Joined
                          </span>
                        )}


                        {!isRejected && stage === 'APPLIED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(c.id, c.student_name);
                            }}
                          >
                            Do Not Shortlist
                          </Button>
                        )}
                      </div>
                    </div>


                    {/* Interview Logistics Banner (If Scheduled) */}
                    {hasInterview && (
                      <div className="p-3 bg-[#0B1628] rounded-xl border border-[rgba(34,197,94,0.30)] flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-bold text-[#4ADE80] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> {c.interview.date}
                          </span>
                          <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#3B82F6]" /> {c.interview.time}
                          </span>
                          <span className="text-[#CBD5E1] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#3B82F6]" /> {c.interview.panel_name}
                          </span>
                          <span className="text-[#CBD5E1] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> {c.interview.room_name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Skills & Projects Extracted from Resume */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1.5">
                          Extracted Resume Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(c.skills || []).length > 0 ? (
                            c.skills.map((sk: string) => (
                              <span
                                key={sk}
                                className="px-2.5 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650] text-[11px] font-medium"
                              >
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#64748B] italic">Skills not detected</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1.5">
                          Extracted Projects
                        </span>
                        <div className="space-y-1">
                          {(c.projects || []).length > 0 ? (
                            c.projects.slice(0, 2).map((proj: any, idx: number) => (
                              <div key={idx} className="text-[#CBD5E1] font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
                                <span>{proj.title || proj.name || proj}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[#64748B] italic">Projects not detected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shortlist & Interview Scheduling Modal */}
      <ShortlistInterviewModal
        isOpen={!!selectedCandidateForShortlist}
        onClose={() => setSelectedCandidateForShortlist(null)}
        candidate={selectedCandidateForShortlist}
        onShortlistSuccess={handleShortlistSuccess}
      />

      {/* Issue Official Offer Letter Modal */}
      <CreateOfferModal
        isOpen={!!selectedCandidateForOffer}
        onClose={() => setSelectedCandidateForOffer(null)}
        candidate={selectedCandidateForOffer}
        onOfferIssued={() => fetchPool(false)}
      />
    </div>
  );
};
