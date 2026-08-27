import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Award,
  ArrowLeft,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

export const AptitudeTestView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { triggerToast } = usePlacement();

  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Question & Navigation State
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any | null>(null);

  // Persistent Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoSubmitFiredRef = useRef<boolean>(false);

  // 1. Fetch / Start Assessment Session
  const initAssessment = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // First try fetching active session
      let data = await apiService.getAssessmentDetail(id).catch(() => null);

      // If status is ALLOCATED, start it
      if (data && (data.status === 'ALLOCATED' || !data.started_at)) {
        setStarting(true);
        data = await apiService.startAssessment(id);
        setStarting(false);
      } else if (!data) {
        setStarting(true);
        data = await apiService.startAssessment(id);
        setStarting(false);
      }

      setSession(data);

      // Hydrate saved answers if present
      if (data?.saved_answers) {
        setSelectedAnswers(data.saved_answers);
      }

      // Check if already completed
      if (data?.status === 'COMPLETED') {
        triggerToast('Assessment is already completed.', 'info');
      }
    } catch (err: any) {
      console.error('Failed to initialize aptitude test session:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load aptitude test.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAssessment();
  }, [id]);

  // 2. Persistent Timer Countdown Effect
  useEffect(() => {
    if (!session || session.status === 'COMPLETED' || !session.expires_at) {
      return;
    }

    const calculateRemaining = () => {
      const expiresMs = new Date(session.expires_at).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
      return diffSec;
    };

    setRemainingSeconds(calculateRemaining());

    const timerInterval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !autoSubmitFiredRef.current && session.status !== 'COMPLETED') {
        autoSubmitFiredRef.current = true;
        clearInterval(timerInterval);
        triggerToast('Time is up! Your test is being automatically submitted.', 'warning');
        handleFinalSubmit(true);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session]);

  // 3. Option Select Handler (Saves answer locally and to backend)
  const handleOptionSelect = async (questionId: string, optionText: string) => {
    if (session?.status === 'COMPLETED') return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionText,
    }));

    if (id) {
      try {
        await apiService.saveAssessmentAnswer(id, questionId, optionText);
      } catch (err) {
        console.warn('Asynchronous answer save failed:', err);
      }
    }
  };

  // 4. Final Submission Handler
  const handleFinalSubmit = async (isAutoSubmit: boolean = false) => {
    if (!id || submitting) return;
    setSubmitting(true);
    setIsSubmitModalOpen(false);

    try {
      const questions = session?.questions || [];
      const formattedAnswers = questions.map((q: any) => ({
        question_id: q.id,
        type: q.type || 'aptitude',
        selected_option: selectedAnswers[q.id] || '',
      }));

      const result = await apiService.submitAssessment(id, {
        answers: formattedAnswers,
        time_taken_seconds: 0,
      });

      setResultData(result);
      setSession((prev: any) => ({ ...prev, status: 'COMPLETED' }));

      if (isAutoSubmit) {
        triggerToast('Time is up! Your aptitude test has been submitted.', 'warning');
      } else {
        triggerToast('Aptitude Test Submitted Successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to submit aptitude test:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to submit assessment.';
      triggerToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Loading State
  if (loading || starting) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-sm font-bold text-[#F8FAFC]">Preparing Aptitude Assessment Environment...</p>
        <p className="text-xs text-[#64748B]">Configuring persistent timer and question payload...</p>
      </div>
    );
  }

  // Render Error State
  if (errorMsg || !session) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Aptitude Test Unavailable"
          subtitle={errorMsg || 'Could not load the requested test session.'}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          action={
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student/dashboard')}>
              Back to Dashboard
            </Button>
          }
        />
        <Card className="p-8 text-center bg-[#101D31] border-[#243650]">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Test Access Restricted</h3>
          <p className="text-xs text-[#CBD5E1] mt-1 max-w-md mx-auto">{errorMsg}</p>
          <Button variant="primary" className="mt-4 text-xs" onClick={() => navigate('/student/dashboard')}>
            Return to Student Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Render Completion Result View
  if (resultData || session.status === 'COMPLETED') {
    const scorePct = resultData?.percentage ?? session?.percentage ?? session?.score ?? 0;
    const passThreshold = resultData?.passing_percentage ?? session?.passing_percentage ?? 60;
    const isPassed = resultData?.result === 'QUALIFIED' || session?.result === 'QUALIFIED' || scorePct >= passThreshold;
    const isTechnical = (session?.type || session?.round_type || '').toUpperCase() === 'TECHNICAL';

    return (
      <div className="space-y-6 pb-12 max-w-3xl mx-auto text-[#F8FAFC]">
        <PageHeader
          title={isTechnical ? 'Technical Test Evaluation' : 'Aptitude Test Evaluation'}
          subtitle={`${session.company || 'Placement Drive'} • ${session.job_title || 'Role'}`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />

        <Card className="p-8 bg-[#101D31] border-[#243650] text-center space-y-6 shadow-xl">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl font-black ${
              isPassed
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}
          >
            {isPassed ? '🎉' : '❌'}
          </div>

          <div>
            <span
              className={`text-xs font-bold uppercase tracking-widest block ${
                isPassed ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              Status: {isPassed ? (isTechnical ? 'TECHNICAL QUALIFIED' : 'APTITUDE QUALIFIED') : (isTechnical ? 'REJECTED AT TECHNICAL' : 'REJECTED AT APTITUDE')}
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              {isPassed ? 'Congratulations! You Qualified' : `${isTechnical ? 'Technical' : 'Aptitude'} Result: Not Qualified`}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-md mx-auto">
              {isPassed
                ? (isTechnical
                    ? `You passed the Technical assessment with ${scorePct}% (Passing threshold: ${passThreshold}%). Your profile is now eligible for the interview stage.`
                    : `You passed the Aptitude assessment with ${scorePct}% (Passing threshold: ${passThreshold}%). Placement Office has been notified for Technical Round allocation.`)
                : `You scored ${scorePct}%. The required passing score for this drive is ${passThreshold}%. You did not qualify for the next round.`}
            </p>
          </div>


          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center">
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650]">
              <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Your Score</span>
              <span className="text-xl font-black text-cyan-400 font-mono mt-1 block">{scorePct}%</span>
            </div>
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650]">
              <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Passing Mark</span>
              <span className="text-xl font-black text-amber-400 font-mono mt-1 block">{passThreshold}%</span>
            </div>
            <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650]">
              <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Result</span>
              <span className={`text-sm font-black mt-2 block ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPassed ? 'QUALIFIED' : 'FAILED'}
              </span>
            </div>
          </div>


          <div className="pt-4 border-t border-[#243650] flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/student/dashboard')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Student Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active Questions & Timer State
  const questions = session.questions || [];
  const currentQ = questions[currentIdx] || {};
  const totalQ = questions.length;
  const answeredCount = Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]).length;

  // Format Timer Display
  const formatTimer = (sec: number | null) => {
    if (sec === null || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = remainingSeconds !== null && remainingSeconds < 300; // < 5 mins

  return (
    <div className="space-y-6 pb-12 text-[#F8FAFC]">
      {/* HEADER WITH PERSISTENT TIMER */}
      <div className="sticky top-0 z-40 bg-[#0B1628]/95 backdrop-blur-md border-b border-[#243650] py-3.5 px-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{session.title || 'Aptitude Assessment'}</h2>
            <p className="text-xs text-[#CBD5E1]">
              {session.company || 'Placement Drive'} &bull; {session.job_title || 'Role'}
            </p>
          </div>
        </div>

        {/* Persistent Countdown Timer Badge */}
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border font-mono font-bold text-sm transition-all ${
            isUrgent
              ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40'
          }`}
        >
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`} />
          <span>TIME LEFT: {formatTimer(remainingSeconds)}</span>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
          icon={<Send className="w-4 h-4" />}
          onClick={() => setIsSubmitModalOpen(true)}
        >
          Submit Test
        </Button>
      </div>

      {/* MAIN TEST AREA GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* QUESTION PANEL (3 COLS) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 bg-[#101D31] border-[#243650] shadow-md space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-[#243650] pb-4">
              <span className="text-xs font-bold text-[#94A3B8]">
                Question <strong className="text-cyan-400 text-sm font-mono">{currentIdx + 1}</strong> of {totalQ}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#14243B] text-amber-300 border border-[#243650]">
                {currentQ.topic || 'Quantitative Aptitude'}
              </span>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#F8FAFC] leading-relaxed">
                {currentQ.question || 'Aptitude question text loading...'}
              </h3>
            </div>

            {/* MCQ Options */}
            <div className="space-y-3 pt-2">
              {(currentQ.options || []).map((option: string, optIdx: number) => {
                const isSelected = selectedAnswers[currentQ.id] === option;
                const optionLabel = String.fromCharCode(65 + optIdx);

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleOptionSelect(currentQ.id, option)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-[#0B1628] border-[#243650] text-[#CBD5E1] hover:bg-[#14243B] hover:border-[#3B82F6]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500 text-black border-cyan-400'
                            : 'bg-[#101D31] text-[#94A3B8] border-[#243650]'
                        }`}
                      >
                        {optionLabel}
                      </div>
                      <span className="text-sm font-medium">{option}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-cyan-400 bg-cyan-400 text-black' : 'border-[#243650]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NAVIGATION BUTTONS */}
            <div className="flex items-center justify-between border-t border-[#243650] pt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                icon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              >
                Previous
              </Button>

              <span className="text-xs text-[#94A3B8]">
                Progress: <strong className="text-emerald-400 font-mono">{answeredCount}</strong> / {totalQ} Answered
              </span>

              {currentIdx < totalQ - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  icon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setCurrentIdx((prev) => Math.min(totalQ - 1, prev + 1))}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  Submit Test
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* SIDE QUESTION PALETTE GRID (1 COL) */}
        <div className="space-y-6">
          <Card className="p-5 bg-[#101D31] border-[#243650] shadow-md space-y-4">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Question Roster</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, idx: number) => {
                const isAnswered = !!selectedAnswers[q.id];
                const isCurrent = currentIdx === idx;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0B1628] bg-cyan-500 text-black font-black'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-[#0B1628] text-[#94A3B8] border border-[#243650] hover:bg-[#14243B] text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#243650] space-y-2 text-[11px] text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#0B1628] border border-[#243650]" />
                <span>Unanswered ({totalQ - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-cyan-500 border border-cyan-400" />
                <span>Current Question</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1628] rounded-2xl p-6 max-w-md w-full border border-[#243650] space-y-4 text-[#F8FAFC]">
            <div className="flex items-center gap-3 text-emerald-400">
              <Send className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm Test Submission</h3>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              You have answered <strong className="text-emerald-400">{answeredCount}</strong> of <strong className="text-white">{totalQ}</strong> questions. Are you sure you want to submit your aptitude test?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
                Continue Test
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
