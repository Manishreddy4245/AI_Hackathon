import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  GraduationCap,
  Sparkles,
  Info
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePlacement } from '../../context/PlacementContext';

export interface KpiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiKey: 'active_drives' | 'eligible_students' | 'shortlisted_candidates' | 'interviews_today' | 'pending_actions' | null;
  onActionResolved?: () => void;
}

export const KpiDetailModal: React.FC<KpiDetailModalProps> = ({
  isOpen,
  onClose,
  kpiKey,
  onActionResolved
}) => {
  const navigate = useNavigate();
  const {
    drives,
    students,
    candidatePool,
    candidateStats,
    interviewsList,
    availabilitySlots,
    exceptionsList,
    notificationsList,
    checkEligibility
  } = usePlacement();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const todayHumanStr = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  // Compute live breakdown directly from shared portal state
  const kpiData = useMemo(() => {
    if (!kpiKey) return null;

    // 1. ACTIVE DRIVES (from Companies & Drives)
    if (kpiKey === 'active_drives') {
      const excluded = ['draft', 'rejected', 'expired', 'closed', 'cancelled'];
      const activeList = drives.filter((d) => {
        const st = (d.status || 'open').toLowerCase();
        if (excluded.includes(st)) return false;
        if (d.deadline && d.deadline.includes('-') && d.deadline.length >= 10) {
          if (d.deadline.slice(0, 10) < todayStr) return false;
        }
        return true;
      });

      const items = activeList.map((d) => {
        // Count applications and shortlists for this drive from candidate pool
        const dId = d.id;
        const driveApps = candidatePool.filter((c) => (c.driveId === dId || c.drive_id === dId));
        const shortCount = driveApps.filter((c) => (c.status || '').toUpperCase() === 'SHORTLISTED').length;

        // Evaluate eligible students for this drive
        const eligibleCount = students.filter((s) => checkEligibility(s, d).eligible).length;

        return {
          id: d.id,
          company_name: d.companyName,
          role_title: d.roleTitle,
          package_lpa: d.packageLpa,
          location: d.location || 'Campus / Hybrid',
          status: (d.status || 'ACTIVE').toUpperCase(),
          deadline: d.deadline || 'Ongoing',
          eligible_count: eligibleCount,
          applications_count: driveApps.length,
          shortlisted_count: shortCount
        };
      });

      const totalDrives = drives.length;
      const finalCount = items.length;

      return {
        kpi: 'active_drives',
        title: 'Active Placement Drives',
        count: finalCount,
        formula: {
          explanation: `Active Drives (${finalCount}) = Total Approved Drives (${totalDrives}) - Inactive/Expired Drives (${totalDrives - finalCount}). Directly synced with Companies & Drives.`
        },
        items
      };
    }

    // 2. ELIGIBLE STUDENTS (from Candidates Pool & AI Matching)
    if (kpiKey === 'eligible_students') {
      const activeDrives = drives.filter((d) => {
        const st = (d.status || 'open').toLowerCase();
        return !['draft', 'rejected', 'expired', 'closed', 'cancelled'].includes(st);
      });

      let uniqueEligible = 0;
      const items = students.map((s) => {
        const matchingDrives: string[] = [];
        const failureReasons: string[] = [];

        activeDrives.forEach((d) => {
          const res = checkEligibility(s, d);
          if (res.eligible) {
            matchingDrives.push(`${d.companyName} (${d.roleTitle})`);
          } else if (res.reason) {
            failureReasons.push(res.reason);
          }
        });

        const isEligible = matchingDrives.length > 0;
        if (isEligible) uniqueEligible++;

        return {
          student_id: s.id,
          name: s.name,
          roll_number: s.rollNumber || 'N/A',
          branch: s.branch,
          cgpa: s.cgpa,
          skills: s.skills || [],
          is_eligible: isEligible,
          eligible_drives_count: matchingDrives.length,
          eligible_drives: matchingDrives,
          reasons: isEligible
            ? [`✓ Branch (${s.branch}) and CGPA (${s.cgpa}) meet drive criteria`, `✓ Eligible for ${matchingDrives.length} active drive(s)`]
            : [`✗ ${failureReasons[0] || 'Criteria not met for active drives'}`]
        };
      });

      const totalReg = students.length;
      const batchPct = totalReg > 0 ? Math.round((uniqueEligible / totalReg) * 100) : 0;

      return {
        kpi: 'eligible_students',
        title: 'Eligible Students Breakdown',
        count: uniqueEligible,
        total_registered_students: totalReg,
        batch_eligibility_pct: batchPct,
        formula: {
          explanation: `Unique Eligible Students (${uniqueEligible}) / Total Registered Students (${totalReg}) = ${batchPct}% Batch Eligibility. Students eligible for multiple drives are counted only ONCE. Directly synced with Candidates Pool & Matching Hub.`
        },
        items
      };
    }

    // 3. SHORTLISTED CANDIDATES (from Candidates Pool)
    if (kpiKey === 'shortlisted_candidates') {
      const shortlistedItems = candidatePool.filter((c) => (c.status || '').toUpperCase() === 'SHORTLISTED');
      const uniqueStudents = new Set(shortlistedItems.map((c) => c.studentId || c.student_id)).size;

      const items = shortlistedItems.map((c) => ({
        application_id: c.id,
        student_id: c.studentId || c.student_id,
        student_name: c.studentName || c.student_name || 'Student Candidate',
        student_email: c.studentEmail || c.student_email || c.email || 'N/A',
        company_name: c.companyName || c.company_name || 'Placement Partner',
        job_title: c.roleTitle || c.job_title || 'Engineer',
        skills: c.skills || [],
        status: 'SHORTLISTED',
        applied_at: c.applied_at || todayHumanStr,
        interview: c.interview || null
      }));

      return {
        kpi: 'shortlisted_candidates',
        title: 'Shortlisted Candidates',
        count: items.length,
        unique_students_count: uniqueStudents,
        counting_mode: 'Shortlisted Applications in Candidate Pool',
        formula: {
          explanation: `Total Shortlisted Candidates = ${items.length} (${uniqueStudents} unique students). Directly synced with Candidate Pool.`
        },
        items
      };
    }

    // 4. INTERVIEWS TODAY (from Interview Schedules & Panels)
    if (kpiKey === 'interviews_today') {
      const isDateToday = (dStr?: string) => {
        if (!dStr) return false;
        const norm = dStr.trim();
        return norm === todayStr || norm.startsWith(todayStr) || norm.toLowerCase().includes(todayHumanStr.toLowerCase());
      };

      const todayInterviews = interviewsList.filter((i) => {
        if ((i.status || '').toLowerCase() === 'cancelled') return false;
        return isDateToday(i.date);
      });

      const todayAvailableSlots = availabilitySlots.filter((s) => {
        return (s.status || '').toUpperCase() === 'AVAILABLE' && isDateToday(s.date);
      });

      const items = todayInterviews.map((i: any) => ({
        interview_id: i.id || i.interview_id,
        student_name: i.candidateName || i.studentName || i.student_name || 'Candidate',
        company_name: i.companyName || i.company_name || 'Company',
        job_title: i.jobTitle || i.job_title || i.roleTitle || 'Role Evaluation',
        panel_name: i.panelName || i.panel_name || 'Technical Panel',
        panel_members: i.panelMembers || i.panel_members || ['Panel Committee'],
        block: i.block || 'Main Block',
        room_number: i.roomName || i.room_number || i.room_name || 'A-101',
        time_slot: i.timeSlot || i.time || `${i.start_time} - ${i.end_time}`,
        status: (i.status || 'SCHEDULED').toUpperCase()
      }));

      return {
        kpi: 'interviews_today',
        title: 'Interviews Scheduled Today',
        count: items.length,
        today_date: todayHumanStr,
        available_slots_remaining: todayAvailableSlots.length,
        formula: {
          explanation: `Interviews Scheduled Today (${items.length}) from Interview Schedules. Remaining available slots: ${todayAvailableSlots.length}.`
        },
        items,
        available_slots: todayAvailableSlots
      };
    }

    // 5. PENDING ACTIONS (from Exceptions, Drive Approvals, Notifications)
    if (kpiKey === 'pending_actions') {
      const unresolvedExceptions = exceptionsList.filter((e) => (e.status || '').toLowerCase() !== 'resolved');
      const unconfirmedDrives = drives.filter((d) => d.aiConfirmed === false || (d.status || '').toLowerCase() === 'pending');
      const pendingApps = candidatePool.filter((c) => (c.status || '').toUpperCase() === 'APPLIED');

      const items: any[] = [];

      unconfirmedDrives.forEach((d) => {
        items.push({
          id: d.id,
          category: 'Drive Approval',
          title: `Review Placement Drive: ${d.companyName}`,
          description: `Drive for ${d.roleTitle} (${d.packageLpa} LPA) is awaiting officer review.`,
          timestamp: todayHumanStr,
          action_route: '/recruiter/drives'
        });
      });

      unresolvedExceptions.forEach((e: any) => {
        items.push({
          id: e.id,
          category: 'AI Exception',
          title: e.title,
          description: e.suggestedActionText || 'Action required to resolve conflict.',
          timestamp: e.timeAgo || e.timestamp || todayHumanStr,
          action_route: '/exceptions'
        });
      });

      pendingApps.slice(0, 10).forEach((app) => {
        items.push({
          id: app.id,
          category: 'Candidate Review',
          title: `New Applicant: ${app.studentName || 'Student'} -> ${app.companyName || 'Company'}`,
          description: `Applied for ${app.roleTitle || 'Job Role'}. Review and shortlist in Candidate Pool.`,
          timestamp: app.applied_at || todayHumanStr,
          action_route: '/admin/candidates'
        });
      });

      const totalCount = unconfirmedDrives.length + unresolvedExceptions.length;

      return {
        kpi: 'pending_actions',
        title: 'Pending Placement Actions',
        count: totalCount,
        formula: {
          explanation: `Pending Actions (${totalCount}) = Drives Awaiting Confirmation (${unconfirmedDrives.length}) + Unresolved AI Operations (${unresolvedExceptions.length}). Synced live with AI Operations & Exceptions.`
        },
        items
      };
    }

    return null;
  }, [
    kpiKey,
    drives,
    students,
    candidatePool,
    candidateStats,
    interviewsList,
    availabilitySlots,
    exceptionsList,
    notificationsList,
    checkEligibility,
    todayStr,
    todayHumanStr
  ]);

  // Metadata per KPI
  const kpiMeta = useMemo(() => {
    switch (kpiKey) {
      case 'active_drives':
        return {
          title: 'Active Placement Drives',
          icon: <Briefcase className="w-5 h-5 text-[#3B82F6]" />,
          accentBg: 'bg-[#3B82F6]/15',
          accentBorder: 'border-[#3B82F6]/30',
          accentText: 'text-[#60A5FA]',
          navRoute: '/recruiter/drives',
          navLabel: 'Open Companies & Drives'
        };
      case 'eligible_students':
        return {
          title: 'Eligible Students Breakdown',
          icon: <Users className="w-5 h-5 text-[#06B6D4]" />,
          accentBg: 'bg-[#06B6D4]/15',
          accentBorder: 'border-[#06B6D4]/30',
          accentText: 'text-[#22D3EE]',
          navRoute: '/admin/candidates',
          navLabel: 'Open Candidates Pool'
        };
      case 'shortlisted_candidates':
        return {
          title: 'Shortlisted Candidates',
          icon: <UserCheck className="w-5 h-5 text-[#818CF8]" />,
          accentBg: 'bg-[#818CF8]/15',
          accentBorder: 'border-[#818CF8]/30',
          accentText: 'text-[#A5B4FC]',
          navRoute: '/admin/candidates',
          navLabel: 'Open Candidates Pool'
        };
      case 'interviews_today':
        return {
          title: 'Interviews Scheduled Today',
          icon: <Calendar className="w-5 h-5 text-[#A78BFA]" />,
          accentBg: 'bg-[#8B5CF6]/15',
          accentBorder: 'border-[#8B5CF6]/30',
          accentText: 'text-[#C4B5FD]',
          navRoute: '/interviews',
          navLabel: 'Open Interview Schedules'
        };
      case 'pending_actions':
        return {
          title: 'Pending Placement Actions',
          icon: <AlertCircle className="w-5 h-5 text-[#F59E0B]" />,
          accentBg: 'bg-[#F59E0B]/15',
          accentBorder: 'border-[#F59E0B]/30',
          accentText: 'text-[#FCD34D]',
          navRoute: '/exceptions',
          navLabel: 'Open AI Operations'
        };
      default:
        return {
          title: 'KPI Details',
          icon: <Sparkles className="w-5 h-5 text-white" />,
          accentBg: 'bg-[#3B82F6]/15',
          accentBorder: 'border-[#3B82F6]/30',
          accentText: 'text-[#60A5FA]',
          navRoute: '/admin/dashboard',
          navLabel: 'Go to Dashboard'
        };
    }
  }, [kpiKey]);

  // Filter items based on user search and filters
  const filteredItems = useMemo(() => {
    if (!kpiData?.items) return [];
    let items = [...kpiData.items];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter((item: any) => {
        const name = (item.name || item.student_name || item.company_name || item.title || '').toLowerCase();
        const role = (item.role_title || item.job_title || item.roll_number || item.category || '').toLowerCase();
        const panel = (item.panel_name || item.room_number || item.description || '').toLowerCase();
        return name.includes(q) || role.includes(q) || panel.includes(q);
      });
    }

    if (branchFilter !== 'ALL') {
      items = items.filter((item: any) => (item.branch || '').toUpperCase() === branchFilter.toUpperCase());
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ELIGIBLE') {
        items = items.filter((item: any) => item.is_eligible === true);
      } else if (statusFilter === 'NOT_ELIGIBLE') {
        items = items.filter((item: any) => item.is_eligible === false);
      } else {
        items = items.filter((item: any) => (item.status || '').toUpperCase() === statusFilter.toUpperCase());
      }
    }

    return items;
  }, [kpiData, searchTerm, branchFilter, statusFilter]);

  if (!isOpen || !kpiKey) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={kpiData?.title || kpiMeta.title}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-[#CBD5E1]">
        {/* Metric Header with Section Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#0B1628] rounded-xl border border-[#243650]">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${kpiMeta.accentBg} border ${kpiMeta.accentBorder} ${kpiMeta.accentText}`}>
              {kpiMeta.icon}
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">Live Portal Count</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
                  {kpiData?.count ?? 0}
                </span>
                <span className="text-xs font-semibold text-[#94A3B8]">
                  {kpiKey === 'eligible_students' && kpiData?.total_registered_students ? `of ${kpiData.total_registered_students} registered (${kpiData.batch_eligibility_pct}% batch eligibility)` : ''}
                  {kpiKey === 'active_drives' ? 'active & open drives' : ''}
                  {kpiKey === 'shortlisted_candidates' && kpiData?.unique_students_count ? `(${kpiData.unique_students_count} unique students)` : ''}
                  {kpiKey === 'interviews_today' && kpiData?.available_slots_remaining !== undefined ? `• ${kpiData.available_slots_remaining} available slots left` : ''}
                  {kpiKey === 'pending_actions' ? 'requiring officer review' : ''}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => {
              onClose();
              navigate(kpiMeta.navRoute);
            }}
          >
            {kpiMeta.navLabel}
          </Button>
        </div>

        {/* HOW THIS NUMBER IS CALCULATED (FORMULA BOX) */}
        {kpiData?.formula && (
          <div className="p-4 bg-[#101D31] rounded-xl border border-[#3B82F6]/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#60A5FA] font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" /> How this number is calculated
            </div>
            <p className="text-[#CBD5E1] text-xs leading-relaxed font-medium">
              {kpiData.formula.explanation}
            </p>
            {kpiData.counting_mode && (
              <div className="text-[11px] text-[#94A3B8] font-mono pt-1">
                Source: <strong className="text-[#F8FAFC]">{kpiData.counting_mode}</strong>
              </div>
            )}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] text-xs rounded-xl focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {kpiKey === 'eligible_students' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0B1628] text-xs font-bold text-[#F8FAFC] border border-[#243650] rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Candidates</option>
                <option value="ELIGIBLE">Eligible Only</option>
                <option value="NOT_ELIGIBLE">Not Eligible</option>
              </select>
            )}

            {kpiKey === 'interviews_today' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0B1628] text-xs font-bold text-[#F8FAFC] border border-[#243650] rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            )}

            <span className="text-xs font-semibold text-[#94A3B8] shrink-0">
              Showing {filteredItems.length} records
            </span>
          </div>
        </div>

        {/* 1. ACTIVE DRIVES LIST */}
        {kpiKey === 'active_drives' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0B1628] rounded-xl border border-[#243650]">
                No active placement drives found.
              </div>
            ) : (
              filteredItems.map((drive: any) => (
                <div
                  key={drive.id}
                  className="p-4 bg-[#101D31] rounded-xl border border-[#243650] hover:border-[#3B82F6]/50 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#0B1628] border border-[#243650] text-[#3B82F6]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#F8FAFC]">{drive.company_name}</h4>
                        <p className="text-xs font-semibold text-[#60A5FA]">{drive.role_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)]">
                        {drive.status}
                      </span>
                      <span className="text-xs font-bold text-[#86EFAC] px-2.5 py-1 bg-[#0B1628] rounded-md border border-[#243650]">
                        ₹{drive.package_lpa} LPA
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 text-[#CBD5E1]">
                    <div className="p-2 bg-[#0B1628] rounded-lg border border-[#243650]">
                      <span className="text-[#94A3B8] block text-[10px]">Deadline</span>
                      <strong className="text-[#F8FAFC]">{drive.deadline}</strong>
                    </div>
                    <div className="p-2 bg-[#0B1628] rounded-lg border border-[#243650]">
                      <span className="text-[#94A3B8] block text-[10px]">Eligible Students</span>
                      <strong className="text-[#38BDF8]">{drive.eligible_count}</strong>
                    </div>
                    <div className="p-2 bg-[#0B1628] rounded-lg border border-[#243650]">
                      <span className="text-[#94A3B8] block text-[10px]">Applications</span>
                      <strong className="text-[#F8FAFC]">{drive.applications_count}</strong>
                    </div>
                    <div className="p-2 bg-[#0B1628] rounded-lg border border-[#243650]">
                      <span className="text-[#94A3B8] block text-[10px]">Shortlisted</span>
                      <strong className="text-[#86EFAC]">{drive.shortlisted_count}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. ELIGIBLE STUDENTS LIST */}
        {kpiKey === 'eligible_students' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0B1628] rounded-xl border border-[#243650]">
                No eligible students found.
              </div>
            ) : (
              filteredItems.map((student: any) => (
                <div
                  key={student.student_id}
                  className={`p-4 rounded-xl border transition-all space-y-2 ${
                    student.is_eligible
                      ? 'bg-[#101D31] border-[#243650] border-l-4 border-l-[#22C55E]'
                      : 'bg-[#0B1628] border-[#243650]/60 border-l-4 border-l-[#EF4444]/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">{student.name}</h4>
                        <span className="text-xs text-[#94A3B8] font-mono">({student.roll_number})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                          {student.branch}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        CGPA: <strong className="text-[#F8FAFC]">{student.cgpa}</strong>
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 self-start sm:self-center ${
                        student.is_eligible
                          ? 'bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border-[rgba(34,197,94,0.30)]'
                          : 'bg-[rgba(239,68,68,0.15)] text-[#F87171] border-[rgba(239,68,68,0.30)]'
                      }`}
                    >
                      {student.is_eligible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {student.is_eligible ? `Eligible (${student.eligible_drives_count} Drives)` : 'Not Eligible'}
                    </span>
                  </div>

                  {student.eligible_drives && student.eligible_drives.length > 0 && (
                    <div className="text-[11px] text-[#38BDF8] pt-1">
                      Eligible Drives: <span className="text-[#CBD5E1] font-semibold">{student.eligible_drives.join(', ')}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-[#94A3B8] space-y-0.5 pt-1 border-t border-[#243650]/40">
                    {student.reasons?.map((r: string, idx: number) => (
                      <div key={idx} className="font-medium">{r}</div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. SHORTLISTED CANDIDATES LIST */}
        {kpiKey === 'shortlisted_candidates' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0B1628] rounded-xl border border-[#243650]">
                No shortlisted candidates found in Candidate Pool.
              </div>
            ) : (
              filteredItems.map((candidate: any) => (
                <div
                  key={candidate.application_id}
                  className="p-4 bg-[#101D31] rounded-xl border border-[#243650] hover:border-[#818CF8]/50 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">{candidate.student_name}</h4>
                        <span className="text-xs text-[#94A3B8]">({candidate.student_email})</span>
                      </div>
                      <p className="text-xs font-semibold text-[#60A5FA] mt-0.5">
                        {candidate.job_title} &bull; <strong className="text-[#F8FAFC]">{candidate.company_name}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)] flex items-center gap-1.5 self-start sm:self-center">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SHORTLISTED
                    </span>
                  </div>

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {candidate.skills.slice(0, 6).map((skill: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {candidate.interview && (
                    <div className="p-2.5 bg-[#0B1628] rounded-lg border border-[rgba(34,197,94,0.30)] text-[11px] flex flex-wrap items-center justify-between gap-2 text-[#86EFAC]">
                      <span>📅 {candidate.interview.date} ({candidate.interview.time || candidate.interview.timeSlot})</span>
                      <span>👥 {candidate.interview.panel_name || candidate.interview.panelName} — 🚪 {candidate.interview.room_number || candidate.interview.roomName || 'A-101'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. INTERVIEWS TODAY LIST */}
        {kpiKey === 'interviews_today' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Scheduled Candidate Evaluations ({filteredItems.length})
              </h4>
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0B1628] rounded-xl border border-[#243650]">
                  No interviews scheduled for today ({kpiData?.today_date}).
                </div>
              ) : (
                filteredItems.map((intv: any) => (
                  <div
                    key={intv.interview_id}
                    className="p-4 bg-[#101D31] rounded-xl border border-[#243650] hover:border-[#8B5CF6]/50 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F8FAFC]">{intv.company_name}</span>
                          <span className="text-xs font-semibold text-[#CBD5E1]">&bull; {intv.job_title}</span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Candidate: <strong className="text-[#F8FAFC]">{intv.student_name}</strong>
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border border-[rgba(245,158,11,0.30)] flex items-center gap-1.5 self-start sm:self-center">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> {intv.time_slot}
                      </span>
                    </div>

                    <div className="p-2 bg-[#0B1628] rounded-lg border border-[#243650] text-[11px] flex flex-wrap items-center justify-between gap-2 text-[#CBD5E1]">
                      <span>👥 {intv.panel_name} ({intv.panel_members?.join(', ') || 'Assigned'})</span>
                      <span>🏢 {intv.block}, Room {intv.room_number}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {kpiData?.available_slots && kpiData.available_slots.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#243650]">
                <h4 className="text-xs font-bold text-[#86EFAC] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Remaining Available Slots Today ({kpiData.available_slots.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {kpiData.available_slots.map((slot: any) => (
                    <div key={slot.id || slot._id || slot.slot_id} className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>{slot.panel_name || slot.panelName}</span>
                        <span className="text-[#86EFAC] font-mono text-[11px]">{slot.start_time} - {slot.end_time}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8]">
                        Venue: {slot.block}, Room {slot.room_number || slot.roomName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. PENDING ACTIONS LIST */}
        {kpiKey === 'pending_actions' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86EFAC] bg-[#0B1628] rounded-xl border border-[rgba(34,197,94,0.30)] flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-[#22C55E]" />
                <span className="font-bold">No pending actions. All placement operations are resolved!</span>
              </div>
            ) : (
              filteredItems.map((action: any) => (
                <div
                  key={action.id}
                  className="p-4 bg-[#101D31] rounded-xl border border-[#243650] hover:border-[#F59E0B]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/30 uppercase tracking-wider">
                        {action.category}
                      </span>
                      <span className="text-[10px] font-bold text-[#94A3B8]">{action.timestamp}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#F8FAFC]">{action.title}</h4>
                    <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed">{action.description}</p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onClose();
                      navigate(action.action_route || '/exceptions');
                    }}
                    className="shrink-0 self-end sm:self-center bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold"
                  >
                    Review
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer with Close button */}
        <div className="pt-3 border-t border-[#243650] flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close Breakdown">
            Close Breakdown
          </Button>
        </div>
      </div>
    </Modal>
  );
};
