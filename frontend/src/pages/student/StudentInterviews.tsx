import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ArrowLeft,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  Users,
  DoorOpen,
  Building,
  RefreshCw,
  Loader2,
  BrainCircuit,
  Video,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { usePlacement } from '../../context/PlacementContext';
import { apiService, PracticeSessionSummaryItem } from '../../services/api';
import { AIInterviewPracticeStudioModal } from '../../components/student/AIInterviewPracticeStudioModal';

export const StudentInterviews: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = usePlacement();
  const [activeTab, setActiveTab] = useState<'recruitment' | 'practice'>('recruitment');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSessionSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isPracticeStudioOpen, setIsPracticeStudioOpen] = useState(false);
  const [selectedPracticeSessionId, setSelectedPracticeSessionId] = useState<string | null>(null);

  // Delete Confirmation State
  const [sessionToDelete, setSessionToDelete] = useState<PracticeSessionSummaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiService.deletePracticeSession(sessionToDelete.session_id);

      // Immediately remove from displayed list & decrement count
      setPracticeSessions((prev) => prev.filter((p) => p.session_id !== sessionToDelete.session_id));
      triggerToast('Interview history deleted successfully.', 'info');
      setSessionToDelete(null);

      // Sync with MongoDB in background
      fetchAllData(false);
    } catch (err: any) {
      console.error('Delete practice interview failed:', err);
      const status = err?.response?.status;
      let errorMsg = 'Unable to delete this interview. Please try again.';
      if (status === 403) {
        errorMsg = "You don't have permission to delete this interview.";
      } else if (status === 404) {
        errorMsg = 'This interview no longer exists.';
      } else if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setDeleteError(errorMsg);
      triggerToast(errorMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [recruitmentData, practiceData] = await Promise.allSettled([
        apiService.getMyInterviews(),
        apiService.getPracticeInterviewHistory()
      ]);

      if (recruitmentData.status === 'fulfilled') {
        setInterviews(Array.isArray(recruitmentData.value) ? recruitmentData.value : []);
      } else {
        setInterviews([]);
      }

      if (practiceData.status === 'fulfilled') {
        setPracticeSessions(Array.isArray(practiceData.value) ? practiceData.value : []);
      } else {
        setPracticeSessions([]);
      }
    } catch (err) {
      console.error('Failed to fetch interviews data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      <PageHeader
        title="My Interviews & AI Practice Studio"
        subtitle="Manage scheduled campus recruitment rounds, venue assignments, and dynamic AI interview practice sessions."
        icon={<Calendar className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<BrainCircuit className="w-4 h-4 text-cyan-300" />}
              onClick={() => {
                setSelectedPracticeSessionId(null);
                setIsPracticeStudioOpen(true);
              }}
              className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold shadow-lg shadow-cyan-500/20"
            >
              🎙️ AI Interview Practice Studio
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/student')}
            >
              Back to Dashboard
            </Button>
          </div>
        }
      />

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#101D31] border border-[#243650] max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('recruitment')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'recruitment'
              ? 'bg-[#3B82F6] text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Campus Interviews ({interviews.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'practice'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          AI Practice History ({practiceSessions.length})
        </button>
      </div>

      {loading ? (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650]">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#94A3B8] font-medium">Loading interview records...</p>
        </Card>
      ) : (
        <>
          {/* TAB 1: CAMPUS RECRUITMENT INTERVIEWS */}
          {activeTab === 'recruitment' && (
            interviews.length > 0 ? (
              <div className="space-y-5">
                {interviews.map((item, idx) => {
                  const company = item.company_name || item.companyName || 'Company';
                  const role = item.job_title || item.roleTitle || 'Software Engineer';
                  const panel = item.panel_name || item.panelName || 'Technical Interview Panel';
                  const members: string[] = item.panel_members || item.panelMembers || [];
                  const block = item.block || 'Block B';
                  const room = item.room_number || item.roomNumber || item.room_name || item.roomName || 'B-204';
                  const dateStr = item.date || 'TBD';
                  const timeStr = item.start_time && item.end_time
                    ? `${item.start_time} - ${item.end_time}`
                    : (item.time || item.timeSlot || '10:00 AM - 10:30 AM');
                  const status = (item.status || 'SCHEDULED').toUpperCase();

                  return (
                    <Card
                      key={item.id || item.interview_id || idx}
                      className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC] shadow-xl hover:border-[#3B82F6]/50 transition-all"
                    >
                      {/* Header Row: Company, Role & Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1B2A40]">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/30 text-[#60A5FA] flex items-center justify-center shrink-0 font-bold shadow-sm">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-lg font-black text-[#F8FAFC] tracking-tight">{company}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> SHORTLISTED / INTERVIEW SCHEDULED
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#60A5FA] mt-0.5">
                              {role} &bull; <span className="text-[#CBD5E1]">{item.round || 'Technical Round 1'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#38BDF8] bg-[#0284C7]/15 px-3 py-1.5 rounded-xl border border-[#0284C7]/30">
                            Status: <strong className="text-white">{status}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Interview Logistics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" /> Interview Date
                          </span>
                          <p className="text-xs font-bold text-[#F8FAFC]">{dateStr}</p>
                        </div>

                        <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Time Slot
                          </span>
                          <p className="text-xs font-bold text-[#FCD34D] font-mono">{timeStr}</p>
                        </div>

                        <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-[#06B6D4]" /> Academic Block
                          </span>
                          <p className="text-xs font-bold text-[#F8FAFC]">{block}</p>
                        </div>

                        <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <DoorOpen className="w-3.5 h-3.5 text-[#A855F7]" /> Room Number
                          </span>
                          <p className="text-xs font-bold text-[#C084FC]">{room}</p>
                        </div>
                      </div>

                      {/* Panel Section */}
                      <div className="mt-4 p-4 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#3B82F6]" /> Interview Panel
                          </span>
                          <p className="text-xs font-bold text-[#F8FAFC]">{panel}</p>
                        </div>

                        {members && members.length > 0 && (
                          <div className="space-y-1 sm:text-right">
                            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                              Panel Members
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                              {members.map((member, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[#14243B] text-[#E2E8F0] border border-[#243650]"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-3 text-[#F8FAFC]">
                <Calendar className="w-12 h-12 text-[#3B82F6] mx-auto opacity-70" />
                <h3 className="text-base font-bold text-[#F8FAFC]">No campus interviews scheduled yet.</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                  When placement officers and recruiters shortlist your profile and assign venue rooms, your confirmed schedules will appear here.
                </p>
                <Button variant="primary" size="sm" onClick={() => navigate('/student/drives')}>
                  Explore Active Placement Drives
                </Button>
              </Card>
            )
          )}

          {/* TAB 2: AI PRACTICE SESSIONS */}
          {activeTab === 'practice' && (
            practiceSessions.length > 0 ? (
              <div className="space-y-4">
                {practiceSessions.map((ps) => {
                  const isCompleted = ps.status === 'COMPLETED';
                  const isInProgress = ps.status === 'IN_PROGRESS';

                  return (
                    <Card
                      key={ps.session_id}
                      className="p-5 bg-[#101D31] border-[#243650] text-[#F8FAFC] shadow-lg hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                            <BrainCircuit className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold text-white">{ps.company}</h4>
                              <span className="text-xs text-[#94A3B8]">({ps.role})</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : isInProgress
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {ps.status}
                              </span>
                            </div>

                            <p className="text-xs text-[#94A3B8] mt-1 flex flex-wrap items-center gap-2">
                              <span className="capitalize font-semibold text-cyan-300">{ps.mode} Mode</span>
                              <span>•</span>
                              <span>{ps.answers_count} of {ps.questions_count} answered</span>
                              <span>•</span>
                              <span>{new Date(ps.started_at).toLocaleDateString()}</span>
                            </p>

                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {ps.topics.slice(0, 4).map((top, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#0B1528] text-slate-300 border border-[#1E293B]"
                                >
                                  {top}
                                </span>
                              ))}
                              {ps.topics.length > 4 && (
                                <span className="text-[10px] text-slate-400">+{ps.topics.length - 4} more</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {isCompleted && ps.overall_score !== undefined && ps.overall_score !== null && (
                            <div className="text-right mr-1">
                              <span className="text-[10px] text-[#94A3B8] font-bold block uppercase">Evaluation</span>
                              <span className="text-lg font-black text-cyan-400">{Math.round(ps.overall_score)}%</span>
                            </div>
                          )}

                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs"
                            onClick={() => {
                              setSelectedPracticeSessionId(ps.session_id);
                              setIsPracticeStudioOpen(true);
                            }}
                          >
                            {isInProgress ? 'Resume Session' : 'Review Report'}
                          </Button>

                          {/* Kebab action menu */}
                          <div className="relative">
                            <button
                              type="button"
                              title="More Options"
                              aria-label="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveKebabId(activeKebabId === ps.session_id ? null : ps.session_id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#0B1528] hover:bg-[#14243B] border border-[#243650] transition-colors focus:outline-none"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeKebabId === ps.session_id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveKebabId(null);
                                  }}
                                />
                                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#0B1528] border border-[#243650] shadow-2xl z-30 py-1 overflow-hidden animate-fadeIn">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveKebabId(null);
                                      setDeleteError(null);
                                      setSessionToDelete(ps);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    Delete Interview
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-3 text-[#F8FAFC]">
                <BrainCircuit className="w-12 h-12 text-cyan-400 mx-auto opacity-70" />
                <h3 className="text-base font-bold text-white">No AI Practice Sessions Yet</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                  Start your first dynamic AI mock interview or video practice session. Gemini will generate company-specific technical challenges and evaluate your actual responses.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold"
                  onClick={() => {
                    setSelectedPracticeSessionId(null);
                    setIsPracticeStudioOpen(true);
                  }}
                >
                  Start First Practice Session
                </Button>
              </Card>
            )
          )}
        </>
      )}

      {/* UNIFIED AI INTERVIEW PRACTICE STUDIO MODAL */}
      <AIInterviewPracticeStudioModal
        isOpen={isPracticeStudioOpen}
        onClose={() => {
          setIsPracticeStudioOpen(false);
          setSelectedPracticeSessionId(null);
        }}
        initialSessionId={selectedPracticeSessionId}
        onSessionComplete={() => fetchAllData()}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => {
          if (!isDeleting) {
            setSessionToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Interview History?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {sessionToDelete && (
            <div className="p-3.5 rounded-xl bg-[#101D31] border border-[#243650] flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-white">{sessionToDelete.company}</h5>
                <p className="text-xs text-[#94A3B8]">{sessionToDelete.role} • <span className="capitalize">{sessionToDelete.mode} Mode</span></p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                sessionToDelete.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {sessionToDelete.status}
              </span>
            </div>
          )}

          {sessionToDelete?.status === 'IN_PROGRESS' ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> This practice interview is currently in progress. Deleting it will permanently discard your ongoing questions, answers, and session data. This action cannot be undone.
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              This will permanently remove this interview session, transcript, evaluation, score, feedback, suggestions, and associated practice data from your interview history. This action cannot be undone.
            </p>
          )}

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E293B]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSessionToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              icon={isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


