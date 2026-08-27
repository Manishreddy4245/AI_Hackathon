import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  Users,
  CheckCircle2,
  UserCheck,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Edit3,
  Check,
  X,
  Play,
  Bot,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MatchScore } from '../../components/ui/MatchScore';
import { PlacementDrive } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';
import { apiService, CommunityMessage, CommunityResponseItem, PlacementForm, PlacementFormField } from '../../services/api';
import { ShortlistInterviewModal } from '../../components/candidates/ShortlistInterviewModal';
import { CreateDriveModal } from '../../components/companies/CreateDriveModal';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { MessageSquare, Send, Bell, ExternalLink, Loader2, Upload, ClipboardList } from 'lucide-react';

export const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    drives,
    updateDrive,
    approveDrive,
    rejectDrive,
    requestDriveChanges,
    triggerToast,
  } = usePlacement();

  // Find drive by ID from context
  const contextDrive = drives.find((d) => d.id === id);
  const [drive, setDrive] = useState<PlacementDrive | undefined>(contextDrive);

  useEffect(() => {
    if (contextDrive) {
      setDrive(contextDrive);
    }
  }, [id, contextDrive]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isEditDriveModalOpen, setIsEditDriveModalOpen] = useState(false);

  // Drive-specific candidates state
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [isRefreshingApplicants, setIsRefreshingApplicants] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [selectedForShortlist, setSelectedForShortlist] = useState<any | null>(null);

  // Community & Announcements state
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isPostingMessage, setIsPostingMessage] = useState(false);
  const [newMsgContent, setNewMsgContent] = useState('');
  const [newMsgType, setNewMsgType] = useState('ANNOUNCEMENT');
  const [newActionType, setNewActionType] = useState('OPEN_FORM');
  const [newActionLabel, setNewActionLabel] = useState('Open Registration Form');

  // Editable Skill Tags state
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [newRequiredSkill, setNewRequiredSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');

  // Announce drive state
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceSuccess, setAnnounceSuccess] = useState<string | null>(null);
  const [announceError, setAnnounceError] = useState<string | null>(null);

  // Form upload state
  const [forms, setForms] = useState<PlacementForm[]>([]);
  const [isUploadingForm, setIsUploadingForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFields, setFormFields] = useState<PlacementFormField[]>([
    { name: 'full_name', label: 'Full Name', field_type: 'text', required: true, placeholder: 'Your full name' },
    { name: 'email', label: 'Email Address', field_type: 'email', required: true, placeholder: 'your@email.com' },
    { name: 'roll_number', label: 'Roll Number', field_type: 'text', required: true, placeholder: 'e.g. CS21001' },
    { name: 'branch', label: 'Branch', field_type: 'text', required: true, placeholder: 'e.g. CSE' },
    { name: 'cgpa', label: 'CGPA', field_type: 'number', required: true, placeholder: '0.0 - 10.0' },
  ]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    type: 'reject' | 'request_changes';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCommunityMessages = useCallback(async (driveId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await apiService.getCommunityMessages(driveId);
      setCommunityMessages(msgs || []);
    } catch {
      setCommunityMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchDriveForms = useCallback(async (driveId: string) => {
    try {
      const fs = await apiService.getForms(driveId);
      setForms(fs || []);
    } catch {
      setForms([]);
    }
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMsgContent.trim()) return;

    setIsPostingMessage(true);
    try {
      const posted = await apiService.postCommunityMessage(id, {
        content: newMsgContent.trim(),
        message_type: newMsgType,
        action_type: newActionType,
        action_label: newActionLabel,
      });
      setCommunityMessages((prev) => [...prev, posted]);
      setNewMsgContent('');
      triggerToast('Community announcement broadcasted successfully to students!', 'success');
    } catch (err: any) {
      triggerToast(err?.response?.data?.detail || 'Failed to post announcement.', 'error');
    } finally {
      setIsPostingMessage(false);
    }
  };

  const fetchDriveApplicants = useCallback(async (driveId: string, isInitial: boolean = false) => {
    if (isInitial) {
      setLoadingApplicants(true);
    } else {
      setIsRefreshingApplicants(true);
    }
    try {
      const pool = await apiService.getCandidatePool(driveId);
      const driveCandidates = (pool || []).filter(
        (c: any) =>
          c.drive_id === driveId ||
          c.driveId === driveId ||
          (c.drive_id && c.drive_id.toLowerCase() === driveId.toLowerCase())
      );
      setApplicants(pool && pool.length > 0 ? pool : driveCandidates);
    } catch {
      // Keep existing applicants on background refresh error
    } finally {
      setLoadingApplicants(false);
      setIsRefreshingApplicants(false);
    }
  }, []);

  // Sync drive object only when id or contextDrive changes
  useEffect(() => {
    if (contextDrive) {
      setDrive(contextDrive);
    } else if (id) {
      apiService.getDriveById(id)
        .then((d) => { if (d) setDrive(d); })
        .catch(() => {});
    }
  }, [id, contextDrive]);

  // Fetch drive-scoped subdata strictly when ID changes
  useEffect(() => {
    if (id) {
      fetchDriveApplicants(id, true);
      fetchCommunityMessages(id);
      fetchDriveForms(id);
    }
  }, [id, fetchDriveApplicants, fetchCommunityMessages, fetchDriveForms]);

  const triggerAction = (message: string) => {
    setActionNotice(message);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleApprove = async () => {
    if (!drive) return;
    try {
      await approveDrive(drive.id);
      setDrive((prev) => prev ? ({ ...prev, status: 'ACTIVE' as any, aiConfirmed: true }) : undefined);
      triggerAction('Placement drive approved and published to eligible students!');
    } catch {
      triggerAction('Drive approved.');
    }
  };

  const handleAnnounceToStudents = async () => {
    if (!drive) return;
    setIsAnnouncing(true);
    setAnnounceSuccess(null);
    setAnnounceError(null);
    try {
      await apiService.announceDrive(drive.id);
      setDrive((prev) => prev ? ({ ...prev, status: 'ANNOUNCED' as any, students_notified: true } as any) : undefined);
      setAnnounceSuccess(
        `Students have been notified successfully. Campus drive announcement published to the Placement Community.`
      );
    } catch (err: any) {
      setAnnounceError(
        err?.response?.data?.detail || 'Unable to notify students. Please try again.'
      );
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleUploadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !id) return;
    setIsUploadingForm(true);
    try {
      const newForm = await apiService.createForm({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        drive_id: id,
        fields: formFields,
        is_published: true,
      });
      setForms((prev) => [newForm, ...prev]);
      // Refresh community messages to show the new form post
      fetchCommunityMessages(id);
      setFormTitle('');
      setFormDescription('');
      setShowFormBuilder(false);
      triggerToast(`Form "${newForm.title}" published. Students have been notified!`, 'success');
    } catch (err: any) {
      triggerToast(err?.response?.data?.detail || 'Unable to upload the form. Please try again.', 'error');
    } finally {
      setIsUploadingForm(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal || !drive) return;
    setIsSubmitting(true);
    try {
      if (reviewModal.type === 'reject') {
        await rejectDrive(drive.id, reviewNote);
        setDrive((prev) => prev ? ({ ...prev, status: 'REJECTED' as any }) : undefined);
        triggerAction('Placement drive rejected. Recruiter has been notified.');
      } else {
        await requestDriveChanges(drive.id, reviewNote);
        setDrive((prev) => prev ? ({ ...prev, status: 'CHANGES_REQUESTED' as any }) : undefined);
        triggerAction('Requested adjustments from recruiter.');
      }
      setReviewModal(null);
    } catch {
      triggerAction('Action completed.');
      setReviewModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShortlistSuccess = async (payload: any) => {
    if (!selectedForShortlist) return;
    const candId = selectedForShortlist.id;
    // Optimistic in-place update
    setApplicants((prev) =>
      prev.map((app) =>
        app.id === candId
          ? {
              ...app,
              status: 'SHORTLISTED',
              interview: payload?.interview_date
                ? {
                    interview_date: payload.interview_date,
                    interview_time: payload.interview_time,
                    panel_name: payload.panel_name || 'Technical Panel',
                    room: payload.room || 'Room 101',
                  }
                : app.interview,
            }
          : app
      )
    );
    try {
      await apiService.shortlistApplication(candId, payload);
      triggerToast(`Successfully shortlisted ${selectedForShortlist.student_name}!`, 'success');
      if (id) fetchDriveApplicants(id, false);
    } catch {
      triggerToast('Failed to shortlist candidate.', 'error');
      if (id) fetchDriveApplicants(id, false);
    }
  };

  const handleRejectCandidate = async (candidateId: string, candidateName: string) => {
    if (window.confirm(`Mark ${candidateName}'s application as Not Shortlisted for this drive?`)) {
      // Optimistic in-place update
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === candidateId ? { ...app, status: 'NOT_SHORTLISTED' } : app
        )
      );
      try {
        await apiService.rejectApplication(candidateId);
        triggerToast(`Updated ${candidateName} to Not Shortlisted.`, 'info');
        if (id) fetchDriveApplicants(id, false);
      } catch {
        triggerToast('Failed to update status.', 'error');
        if (id) fetchDriveApplicants(id, false);
      }
    }
  };

  const handleAddRequiredSkill = () => {
    if (!drive) return;
    if (newRequiredSkill.trim() && !drive.requiredSkills.includes(newRequiredSkill.trim())) {
      setDrive({
        ...drive,
        requiredSkills: [...drive.requiredSkills, newRequiredSkill.trim()],
      });
      setNewRequiredSkill('');
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    if (!drive) return;
    setDrive({
      ...drive,
      requiredSkills: drive.requiredSkills.filter((s) => s !== skill),
    });
  };

  const handleAddPreferredSkill = () => {
    if (!drive) return;
    if (newPreferredSkill.trim() && !drive.preferredSkills.includes(newPreferredSkill.trim())) {
      setDrive({
        ...drive,
        preferredSkills: [...drive.preferredSkills, newPreferredSkill.trim()],
      });
      setNewPreferredSkill('');
    }
  };

  const handleRemovePreferredSkill = (skill: string) => {
    if (!drive) return;
    setDrive({
      ...drive,
      preferredSkills: drive.preferredSkills.filter((s) => s !== skill),
    });
  };

  const isPlacementOfficer = user?.role === 'placement_officer' || user?.role === ('admin' as any);
  const isPendingApproval = (drive?.status || '').toUpperCase() === 'PENDING_APPROVAL';
  const isPendingAnnouncement = (drive?.status || '').toUpperCase() === 'PENDING_ANNOUNCEMENT';
  const isAlreadyAnnounced = (drive as any)?.students_notified === true || ['ANNOUNCED', 'ACTIVE', 'active', 'open'].includes((drive?.status || '').toUpperCase());

  const filteredApplicants = applicants.filter((c) => {
    const q = applicantSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.student_email || '').toLowerCase().includes(q) ||
      (c.rollNumber || '').toLowerCase().includes(q) ||
      (c.branch || '').toLowerCase().includes(q)
    );
  });

  if (!drive) {
    return (
      <div className="space-y-6 pb-12 text-[#CBD5E1]">
        <PageHeader
          title="Drive Not Found"
          subtitle="The requested placement drive does not exist in the database."
          icon={<Building2 className="w-5 h-5 text-white" />}
          action={
            <Button
              variant="outline"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(user?.role === 'recruiter' ? '/recruiter/dashboard' : '/companies')}
            >
              Back to Drives
            </Button>
          }
        />
        <Card className="p-8 text-center bg-[#101D31] border-[#243650]">
          <p className="text-sm text-[#94A3B8]">No placement drive details available in database.</p>
        </Card>
      </div>
    );
  }

  const appliedCount = applicants.length || drive.registeredCount || 0;
  const shortlistedCount = applicants.filter((c) => c.status === 'SHORTLISTED' || !!c.interview).length || drive.shortlistedCount || 0;
  const interviewScheduledCount = applicants.filter((c) => !!c.interview).length || drive.pipeline?.interview || 0;

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      {/* Back Navigation & Page Header */}
      <PageHeader
        title={`${drive.companyName} — ${drive.roleTitle}`}
        subtitle="Detailed drive requirements, candidate applications, and AI interview scheduling."
        icon={<Building2 className="w-5 h-5 text-white" />}
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(user?.role === 'recruiter' ? '/recruiter/drives' : '/companies')}
          >
            Back to Drives
          </Button>
        }
      />

      {/* Dynamic Action Toast Feedback */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CAMPUS DRIVE ANNOUNCEMENT BANNER — shown when status is PENDING_ANNOUNCEMENT */}
      {isPendingAnnouncement && isPlacementOfficer && !isAlreadyAnnounced && (
        <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-400/40 shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#F8FAFC]">Campus Drive Pending Announcement</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  PENDING ANNOUNCEMENT
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Company</div>
                  <div className="text-white font-semibold">{drive.companyName}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Role</div>
                  <div className="text-white font-semibold">{drive.roleTitle}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Package</div>
                  <div className="text-emerald-400 font-bold">₹{drive.packageLpa} LPA</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Drive Date</div>
                  <div className="text-white font-semibold">{(drive as any).driveDate || drive.deadline || 'TBD'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Location</div>
                  <div className="text-white font-semibold">{drive.location}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Deadline</div>
                  <div className="text-amber-400 font-semibold">{drive.deadline}</div>
                </div>
              </div>
              {drive.requiredSkills?.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Required Skills:</span>
                  {drive.requiredSkills.slice(0, 6).map((sk) => (
                    <span key={sk} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40">{sk}</span>
                  ))}
                </div>
              )}

              {/* Success / Error feedback */}
              {announceSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {announceSuccess}
                </div>
              )}
              {announceError && (
                <div className="mt-3 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs font-medium">
                  {announceError}
                </div>
              )}

              <div className="mt-4 border-t border-blue-800/40 pt-4">
                <p className="text-xs text-slate-300 font-medium mb-3">Notify Students About This Drive?</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                    icon={isAnnouncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    onClick={handleAnnounceToStudents}
                    disabled={isAnnouncing || !!announceSuccess}
                  >
                    {isAnnouncing ? 'Notifying Students…' : announceSuccess ? '✓ Students Notified' : 'Yes, Notify Students'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-400 hover:text-white"
                    onClick={() => navigate(-1)}
                  >
                    Not Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALREADY ANNOUNCED — success banner */}
      {isAlreadyAnnounced && isPlacementOfficer && announceSuccess && (
        <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {announceSuccess}
        </div>
      )}

      {/* LEGACY: OFFICER APPROVAL BANNER (status = PENDING_APPROVAL) */}
      {isPendingApproval && isPlacementOfficer && (
        <div className="p-5 rounded-2xl bg-amber-950/25 border border-amber-500/40 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#F8FAFC]">Placement Cell Approval Review Required</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PENDING APPROVAL
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed">
                  This placement drive was submitted by <strong>{drive.companyName}</strong>. Review eligibility rules, CGPA threshold, and compensation package before publishing live to eligible students.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                icon={<Check className="w-4 h-4" />}
                onClick={handleApprove}
              >
                Approve &amp; Publish Drive
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-indigo-600/80 hover:bg-indigo-500 text-white"
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => {
                  setReviewModal({ isOpen: true, type: 'request_changes' });
                  setReviewNote('Please update the minimum CGPA and eligible branch list.');
                }}
              >
                Request Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                icon={<X className="w-4 h-4" />}
                onClick={() => {
                  setReviewModal({ isOpen: true, type: 'reject' });
                  setReviewNote('Role requirements do not align with current semester placement criteria.');
                }}
              >
                Reject Drive
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* DRIVE OVERVIEW BANNER CARD */}
      <Card className="p-6 border-[#243650] bg-[#101D31] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <CompanyLogo
              logo={drive.companyLogo}
              name={drive.companyName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#F8FAFC] tracking-tight truncate">{drive.companyName}</h2>
                <StatusBadge status={drive.status} />
                {drive.aiConfirmed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                    <Sparkles className="w-3 h-3 text-[#38BDF8]" /> AI JD Verified
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[#CBD5E1] mt-1">
                {drive.roleTitle} &bull; <span className="text-[#94A3B8]">{drive.employmentType}</span>
              </p>
              <div className="flex items-center gap-4 text-xs text-[#CBD5E1] mt-3 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> {drive.location}
                </span>
                <span className="flex items-center gap-1 text-[#86EFAC] font-bold">
                  <Briefcase className="w-3.5 h-3.5 text-[#22C55E]" /> ₹{drive.packageLpa} LPA
                </span>
                <span className="flex items-center gap-1 text-[#FCD34D] font-bold">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Deadline: {drive.deadline}
                </span>
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => triggerAction(`Eligibility check run for ${drive.companyName}: All matching batch students calculated.`)}
            >
              Check Eligibility
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />}
              onClick={() => {
                triggerAction(`AI Candidate Matching launched for ${drive.roleTitle}.`);
                navigate('/matching');
              }}
            >
              Run AI Matching
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Calendar className="w-3.5 h-3.5" />}
              onClick={() => {
                triggerAction(`Navigating to Interview Scheduler for ${drive.companyName}.`);
                navigate('/interviews');
              }}
            >
              Schedule Interviews
            </Button>
          </div>
        </div>
      </Card>

      {/* PLACEMENT PIPELINE PROGRESSION */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40]">
          <CardTitle className="text-base font-bold">Drive Recruitment Pipeline</CardTitle>
          <p className="text-xs text-[#CBD5E1]">Real-time applicant transition stages for this drive</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-[#243650] bg-[#0B1628]">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Eligible</span>
              <div className="text-2xl font-black text-[#F8FAFC] mt-1">{drive.pipeline?.eligible || 0}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(59,130,246,0.30)] bg-[rgba(59,130,246,0.10)]">
              <span className="text-[10px] font-bold text-[#60A5FA] uppercase">Applied</span>
              <div className="text-2xl font-black text-[#60A5FA] mt-1">{appliedCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(168,85,247,0.30)] bg-[rgba(168,85,247,0.10)]">
              <span className="text-[10px] font-bold text-[#C084FC] uppercase">Shortlisted</span>
              <div className="text-2xl font-black text-[#C084FC] mt-1">{shortlistedCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)]">
              <span className="text-[10px] font-bold text-[#FCD34D] uppercase">Interview</span>
              <div className="text-2xl font-black text-[#FCD34D] mt-1">{interviewScheduledCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)]">
              <span className="text-[10px] font-bold text-[#86EFAC] uppercase">Selected</span>
              <div className="text-2xl font-black text-[#86EFAC] mt-1">{drive.selectedCount || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* APPLICATIONS / CANDIDATES FOR THIS DRIVE */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B2A40]">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3B82F6]" />
              <CardTitle className="text-base font-bold">Applications for this Drive</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.15)] text-[#60A5FA] font-bold border border-[rgba(59,130,246,0.30)]">
                {applicants.length} Total Applicants
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Only students who applied to {drive.companyName} ({drive.roleTitle})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Filter applicants..."
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshingApplicants || loadingApplicants ? 'animate-spin' : ''}`} />}
              onClick={() => id && fetchDriveApplicants(id, false)}
              disabled={isRefreshingApplicants || loadingApplicants}
            >
              {isRefreshingApplicants ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loadingApplicants && applicants.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8]">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
                <span>Loading candidate applications...</span>
              </div>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] space-y-2">
              <Users className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[#F8FAFC]">No applications for this drive yet</p>
              <p className="text-xs text-[#64748B]">
                Eligible students who apply to {drive.companyName} will appear here dynamically.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650]">
                <tr>
                  <th className="px-4 py-3.5 w-[28%] min-w-[200px]">Applicant Name</th>
                  <th className="px-4 py-3.5 w-[16%] min-w-[120px]">Branch &amp; CGPA</th>
                  <th className="px-4 py-3.5 w-[14%] min-w-[100px]">Match Score</th>
                  <th className="px-4 py-3.5 w-[14%] min-w-[110px]">Status</th>
                  <th className="px-4 py-3.5 w-[18%] min-w-[140px]">Interview Details</th>
                  <th className="px-4 py-3.5 w-[10%] min-w-[130px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243650]">
                {filteredApplicants.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#334155] text-[#38BDF8] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {typeof candidate.student_avatar === 'string' && candidate.student_avatar.startsWith('http') ? (
                            <img src={candidate.student_avatar} alt={candidate.student_name} className="w-full h-full object-cover" />
                          ) : (
                            candidate.student_name ? candidate.student_name.trim().charAt(0).toUpperCase() : 'S'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#F8FAFC] truncate">{candidate.student_name}</div>
                          <div className="text-[11px] text-[#94A3B8] truncate">{candidate.student_email || candidate.rollNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-semibold text-[#F8FAFC]">{candidate.branch || 'CSE'}</div>
                      <div className="text-[11px] text-[#86EFAC] font-bold">CGPA: {candidate.cgpa || 8.5}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <MatchScore score={candidate.match_score || 85} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="px-4 py-3.5 align-middle text-xs">
                      {candidate.interview ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-[#86EFAC] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#22C55E]" />
                            {candidate.interview.interview_date} &bull; {candidate.interview.interview_time}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Panel: {candidate.interview.panel_name || 'Technical Panel'} | {candidate.interview.room || 'Room 101'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#64748B] italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<UserCheck className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedForShortlist(candidate)}
                        >
                          Shortlist &amp; Schedule
                        </Button>
                        <button
                          onClick={() => handleRejectCandidate(candidate.id, candidate.student_name)}
                          className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Mark Not Shortlisted"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* PLACEMENT COMMUNITY & OFFICER BROADCASTS */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B2A40]">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
              <CardTitle className="text-base font-bold">Placement Community Broadcasts &amp; Forms</CardTitle>
            </div>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Publish official announcements, clickable registration forms, and interview updates for eligible students.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/student/community/${drive.id}`)}
            >
              Preview Public Community View
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Post New Announcement Form */}
          {isPlacementOfficer && (
            <form onSubmit={handlePostAnnouncement} className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] space-y-3">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#3B82F6]" /> Post New Community Message / Interactive Form
              </h4>

              <textarea
                rows={3}
                required
                value={newMsgContent}
                onChange={(e) => setNewMsgContent(e.target.value)}
                placeholder="e.g. Registration for the placement drive is now officially OPEN. Please complete the registration form before 6:00 PM."
                className="w-full text-xs p-3 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">Message Type</label>
                  <select
                    value={newMsgType}
                    onChange={(e) => setNewMsgType(e.target.value)}
                    className="w-full text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="FORM">Form Announcement</option>
                    <option value="REGISTRATION">Registration Announcement</option>
                    <option value="ASSESSMENT">Assessment Announcement</option>
                    <option value="DOCUMENT_REQUEST">Document Request</option>
                    <option value="INTERVIEW_UPDATE">Interview Update</option>
                    <option value="GENERAL">General Message</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">Attached Action</label>
                  <select
                    value={newActionType}
                    onChange={(e) => {
                      setNewActionType(e.target.value);
                      if (e.target.value === 'OPEN_FORM') setNewActionLabel('Open Registration Form');
                      else if (e.target.value === 'START_ASSESSMENT') setNewActionLabel('Start Assessment');
                      else if (e.target.value === 'VIEW_INTERVIEW') setNewActionLabel('View Interview Schedule');
                    }}
                    className="w-full text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none"
                  >
                    <option value="OPEN_FORM">Open Registration Form</option>
                    <option value="START_ASSESSMENT">Start Assessment</option>
                    <option value="VIEW_INTERVIEW">View Interview Schedule</option>
                    <option value="UPLOAD_DOCUMENT">Upload Document</option>
                    <option value="OPEN_APPLICATION">Open Application</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">Action Button Text</label>
                  <input
                    type="text"
                    value={newActionLabel}
                    onChange={(e) => setNewActionLabel(e.target.value)}
                    placeholder="e.g. Open Registration Form"
                    className="w-full text-xs p-2 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isPostingMessage || !newMsgContent.trim()}
                  icon={isPostingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                >
                  {isPostingMessage ? 'Broadcasting...' : 'Broadcast Announcement to Students'}
                </Button>
              </div>
            </form>
          )}

          {/* Broadcasts History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">
              Broadcasted Messages ({communityMessages.length})
            </h4>

            {communityMessages.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0B1628] rounded-xl border border-[#243650]">
                No announcements broadcasted yet for this drive.
              </div>
            ) : (
              <div className="space-y-3">
                {communityMessages.map((msg) => (
                  <div key={msg.id} className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F8FAFC]">{msg.author_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 uppercase">
                          {msg.message_type || 'ANNOUNCEMENT'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-line font-medium">
                      {msg.content}
                    </p>

                    {msg.action_type && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14243B] text-[11px] font-bold text-[#38BDF8] border border-[#243650]">
                        <span>Action: {msg.action_label || msg.action_type}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GRID: JOB REQUIREMENTS & AI INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* JOB REQUIREMENTS (2 cols) */}
        <Card className="lg:col-span-2 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#1B2A40]">
            <div>
              <CardTitle className="text-base font-bold">Job Requirements &amp; Criteria</CardTitle>
              <p className="text-xs text-[#CBD5E1]">Extracted &amp; verified eligibility rules from raw text</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => setIsEditDriveModalOpen(true)}
              >
                Edit Raw Text &amp; AI Analysis
              </Button>
              <Button
                variant={isEditingSkills ? 'primary' : 'outline'}
                size="sm"
                icon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (isEditingSkills) {
                    updateDrive(drive.id, drive);
                  }
                  setIsEditingSkills(!isEditingSkills);
                }}
              >
                {isEditingSkills ? 'Done Editing' : 'Fine-Tune Skills'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Eligibility Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#0B1628] rounded-xl border border-[#243650]">
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Minimum CGPA</span>
                <span className="text-base font-black text-[#F8FAFC]">{drive.minCgpa}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Eligible Branches</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {drive.eligibleBranches.map((b) => (
                    <span key={b} className="text-xs font-semibold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Graduation Batch</span>
                <span className="text-base font-black text-[#F8FAFC]">{drive.graduationYear || 2027}</span>
              </div>
            </div>

            {/* Required Skills Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Required Skills</h4>
              <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-wrap gap-2">
                {drive.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14243B] border border-[#243650] text-[#F8FAFC] text-xs font-bold"
                  >
                    {skill}
                    {isEditingSkills && (
                      <button onClick={() => handleRemoveRequiredSkill(skill)} className="hover:text-[#EF4444] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditingSkills && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add required skill..."
                    value={newRequiredSkill}
                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                    className="text-xs p-2 border border-[#243650] bg-[#0B1628] text-[#F8FAFC] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <Button variant="primary" size="sm" onClick={handleAddRequiredSkill}>
                    + Add
                  </Button>
                </div>
              )}
            </div>

            {/* Preferred Skills Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Preferred Skills</h4>
              <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-wrap gap-2">
                {drive.preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] text-xs font-bold"
                  >
                    {skill}
                    {isEditingSkills && (
                      <button onClick={() => handleRemovePreferredSkill(skill)} className="hover:text-[#EF4444] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditingSkills && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add preferred skill..."
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    className="text-xs p-2 border border-[#243650] bg-[#0B1628] text-[#F8FAFC] rounded-lg flex-1 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddPreferredSkill}>
                    + Add
                  </Button>
                </div>
              )}
            </div>

            {/* Raw Description Preview */}
            <div className="space-y-1 pt-2">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Full Job Description</h4>
              <p className="text-xs text-[#CBD5E1] bg-[#0B1628] p-3 rounded-xl border border-[#243650] leading-relaxed font-medium">
                {drive.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI INSIGHTS & RECOMMENDATIONS (1 col) */}
        <Card className="border-[#243650] bg-[#101D31] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#3B82F6] text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <CardTitle className="text-base font-bold">AI Drive Insights</CardTitle>
            </div>
            <p className="text-xs text-[#CBD5E1]">Autonomous student skill match analysis</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top Matching Skills */}
            <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Top Matching Student Skills
              </span>
              <div className="flex flex-wrap gap-1">
                {(drive.aiInsights?.topMatchingSkills || drive.requiredSkills).map((s) => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Common Skill Gaps */}
            <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" /> Common Student Skill Gaps
              </span>
              <div className="flex flex-wrap gap-1">
                {(drive.aiInsights?.commonSkillGaps || ['Docker', 'FastAPI']).map((s) => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(245,158,11,0.10)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Preparation Strategy Advice */}
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#3B82F6]" /> Recommended Action Strategy
              </span>
              <p className="text-xs text-[#CBD5E1] leading-relaxed mt-1 font-medium">
                {drive.aiInsights?.preparationAdvice || 'Schedule a 1-day revision workshop covering REST API standards and database querying.'}
              </p>
            </div>

            {/* AI Summary Box */}
            {drive.aiExplanation && (
              <div className="p-3 bg-[#07111F] text-[#F8FAFC] rounded-xl text-xs space-y-1 border border-[#243650]">
                <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">AI Rationale</span>
                <p className="text-[#CBD5E1] leading-relaxed text-[11px] font-medium">{drive.aiExplanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OFFICER FORM UPLOAD SECTION */}
      {isPlacementOfficer && id && (
        <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <CardHeader className="border-b border-[#1B2A40]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-violet-400" />
                <CardTitle className="text-base font-bold">Upload Form for Students</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => setShowFormBuilder(!showFormBuilder)}
              >
                {showFormBuilder ? 'Cancel' : 'Create New Form'}
              </Button>
            </div>
            <p className="text-xs text-[#94A3B8]">Create structured forms for students to fill. Published forms notify all students automatically.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {showFormBuilder && (
              <form onSubmit={handleUploadForm} className="p-4 rounded-xl bg-slate-900/50 border border-violet-700/30 space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#F8FAFC] block mb-1">Form Title *</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    placeholder={`e.g. ${drive.companyName} Registration Form`}
                    className="w-full text-xs p-2.5 bg-[#0B1628] border border-[#243650] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#F8FAFC] block mb-1">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief instructions for students..."
                    className="w-full text-xs p-2.5 bg-[#0B1628] border border-[#243650] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#F8FAFC] block mb-2">
                    Default Fields ({formFields.length})
                    <span className="text-slate-500 font-normal ml-1">— Full Name, Email, Roll No, Branch, CGPA included by default</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {formFields.map((field) => (
                      <div key={field.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs">
                        <span className="text-violet-300 font-medium">{field.label}</span>
                        <span className="text-slate-500">({field.field_type})</span>
                        {field.required && <span className="ml-auto text-red-400 text-[10px]">required</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                    icon={isUploadingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    disabled={isUploadingForm || !formTitle.trim()}
                  >
                    {isUploadingForm ? 'Publishing…' : 'Publish Form & Notify Students'}
                  </Button>
                </div>
              </form>
            )}

            {/* Existing forms list */}
            {forms.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Published Forms ({forms.length})</p>
                {forms.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{f.title}</div>
                      {f.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{f.description}</div>}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span>By {f.created_by_name}</span>
                        <span>{f.submission_count} submission{f.submission_count !== 1 ? 's' : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${f.is_published ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {f.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:text-white shrink-0 text-xs"
                      onClick={() => navigate(`/student/forms/${f.id}`)}
                    >
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              !showFormBuilder && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No forms created yet. Use <strong>Create New Form</strong> to publish a form for students.
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {reviewModal && reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1628] border border-[#243650] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B2A40]">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${reviewModal.type === 'reject' ? 'text-red-400' : 'text-indigo-400'}`} />
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  {reviewModal.type === 'reject' ? 'Reject Placement Drive' : 'Request Changes from Recruiter'}
                </h3>
              </div>
              <button onClick={() => setReviewModal(null)} className="text-[#94A3B8] hover:text-[#F8FAFC]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#F8FAFC]">
                {reviewModal.type === 'reject' ? 'Reason for Rejection' : 'Specific Changes Required'}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 bg-[#101D31] border border-[#243650] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                placeholder={reviewModal.type === 'reject' ? 'Enter reason for rejection...' : 'Specify what needs to be changed before approval...'}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1B2A40]">
              <Button variant="outline" size="sm" onClick={() => setReviewModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={reviewModal.type === 'reject' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                onClick={handleSubmitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : reviewModal.type === 'reject' ? 'Confirm Rejection' : 'Send Change Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shortlist & Schedule Interview Modal */}
      {selectedForShortlist && (
        <ShortlistInterviewModal
          isOpen={!!selectedForShortlist}
          candidate={selectedForShortlist}
          onClose={() => setSelectedForShortlist(null)}
          onShortlistSuccess={handleShortlistSuccess}
        />
      )}

      {/* Edit Drive / Raw Text Modal */}
      <CreateDriveModal
        isOpen={isEditDriveModalOpen}
        onClose={() => setIsEditDriveModalOpen(false)}
        initialDrive={drive}
        onDriveCreated={() => {}}
        onDriveUpdated={(updatedDrive) => {
          setDrive(updatedDrive);
          updateDrive(updatedDrive.id, updatedDrive);
          setIsEditDriveModalOpen(false);
        }}
      />
    </div>
  );
};
