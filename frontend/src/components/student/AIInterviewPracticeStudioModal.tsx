import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  BrainCircuit,
  Building2,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  MessageSquare,
  FileCode2,
  X,
  Target,
  ChevronRight,
  TrendingUp,
  Check,
  Zap,
  Briefcase,
  Copy,
  Download,
  Plus,
  Search,
  Loader2,
  Layers,
  StopCircle,
  HelpCircle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  apiService,
  PracticeSessionDetail,
  PracticeSessionCreatePayload,
  PracticeSessionEvaluation,
  PracticeQuestionItem,
  PracticeAnswerItem
} from '../../services/api';

interface AIInterviewPracticeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSessionId?: string | null;
  onSessionComplete?: () => void;
}

const DEFAULT_TOPICS = [
  'Arrays & Hashing',
  'Dynamic Programming',
  'Graphs',
  'System Design',
  'OOPs / Java',
  'SQL / Databases',
  'Strings',
  'Trees & BST',
  'REST APIs & Backend'
];

const POPULAR_COMPANY_PRESETS = [
  'Amazon',
  'Google',
  'Microsoft',
  'Infosys',
  'Deloitte',
  'TCS',
  'Accenture',
  'Wipro'
];

const POPULAR_ROLE_PRESETS = [
  'Software Development Engineer (SDE)',
  'Frontend Developer',
  'Backend Developer',
  'Java Spring Boot Developer',
  'Machine Learning Engineer',
  'Cloud Engineer',
  'Data Analyst',
  'Business Analyst'
];

const INTERVIEW_STYLES = [
  { id: 'Technical', title: 'Technical Problem Solving & DSA', desc: 'Core algorithms, complexity analysis, data structures, and edge cases.' },
  { id: 'System Design', title: 'System Design & Architecture', desc: 'Scalability, microservices, databases, caching, and API design.' },
  { id: 'Coding Viva', title: 'Coding + Technical Viva Probes', desc: 'Approach explanation, syntax trade-offs, and live code inspection viva.' },
  { id: 'HR / Behavioral', title: 'HR & Behavioral (STAR Method)', desc: 'Situational leadership, conflict handling, and cultural fit.' },
  { id: 'Mixed', title: 'Comprehensive Mixed Round', desc: 'Holistic assessment covering technical fundamentals, viva, and behavioral fit.' }
];

export const AIInterviewPracticeStudioModal: React.FC<AIInterviewPracticeStudioModalProps> = ({
  isOpen,
  onClose,
  initialSessionId,
  onSessionComplete
}) => {
  // Phase State: 'SETUP' | 'LIVE' | 'REPORT'
  const [phase, setPhase] = useState<'SETUP' | 'LIVE' | 'REPORT'>('SETUP');

  // Configuration Setup States
  const [mode, setMode] = useState<'text' | 'video' | 'hybrid'>('video');
  const [targetCompany, setTargetCompany] = useState<string>('Amazon');
  const [customCompanies, setCustomCompanies] = useState<string[]>([]);
  const [newCustomCompanyInput, setNewCustomCompanyInput] = useState<string>('');
  const [isAddingCustomCompany, setIsAddingCustomCompany] = useState<boolean>(false);

  const [targetRole, setTargetRole] = useState<string>('Software Development Engineer (SDE)');
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newCustomRoleInput, setNewCustomRoleInput] = useState<string>('');
  const [isAddingCustomRole, setIsAddingCustomRole] = useState<boolean>(false);
  const [interviewStyle, setInterviewStyle] = useState<string>('Technical');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Arrays & Hashing', 'Dynamic Programming']);
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [newCustomTopicInput, setNewCustomTopicInput] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<string>('Fresher / SDE-1');
  const [difficulty, setDifficulty] = useState<string>('Adaptive');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);

  // Active Session State
  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestionItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Answer Submission States
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [questionTimer, setQuestionTimer] = useState<number>(0);

  // Media & Hardware States
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAIVoiceEnabled, setIsAIVoiceEnabled] = useState<boolean>(true);
  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(false);

  // Interviewer Voice Configuration State
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [voiceAccent, setVoiceAccent] = useState<'indian' | 'american' | 'british' | 'neutral'>('indian');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPreviewSpeaking, setIsPreviewSpeaking] = useState<boolean>(false);
  const [ttsErrorMessage, setTtsErrorMessage] = useState<string | null>(null);

  // Media & Speech Recognition Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Reset or initialize session on open
  useEffect(() => {
    if (isOpen) {
      if (initialSessionId) {
        resumeExistingSession(initialSessionId);
      } else {
        setPhase('SETUP');
        setErrorMessage(null);
        if (mode === 'video' || mode === 'hybrid') {
          startCameraStream();
        }
      }
    } else {
      stopCameraStream();
      clearInterval(timerIntervalRef.current);
      setSession(null);
      setCurrentQuestion(null);
      setTypedAnswer('');
      setTranscript('');
      setRecordedVideoUrl(null);
    }
  }, [isOpen, initialSessionId]);

  // Helper to discover best matching voice by gender and accent
  const findBestMatchingVoice = (
    voices: SpeechSynthesisVoice[],
    gender: 'female' | 'male',
    accent: 'indian' | 'american' | 'british' | 'neutral'
  ): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;

    const accentLangPrefixes: Record<string, string[]> = {
      indian: ['en-in', 'hi-in', 'en_in'],
      american: ['en-us', 'en_us'],
      british: ['en-gb', 'en_gb'],
      neutral: ['en']
    };

    const targetPrefixes = accentLangPrefixes[accent] || ['en'];

    // 1. Filter by language/accent
    let matchingLangVoices = voices.filter((v) => {
      const l = (v.lang || '').toLowerCase();
      const n = (v.name || '').toLowerCase();
      if (accent === 'indian') {
        return targetPrefixes.some((p) => l.startsWith(p)) || n.includes('india') || n.includes('heera') || n.includes('ravi');
      }
      return targetPrefixes.some((p) => l.startsWith(p));
    });

    if (matchingLangVoices.length === 0) {
      matchingLangVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    }
    if (matchingLangVoices.length === 0) {
      matchingLangVoices = voices;
    }

    // 2. Filter by gender heuristics
    const femaleKeywords = ['female', 'heera', 'zira', 'hazel', 'jenny', 'samantha', 'victoria', 'susan', 'ava', 'emma', 'karen'];
    const maleKeywords = ['male', 'ravi', 'david', 'mark', 'george', 'guy', 'daniel', 'arthur', 'oliver', 'rishi'];
    const targetKeywords = gender === 'female' ? femaleKeywords : maleKeywords;

    const genderMatched = matchingLangVoices.find((v) => {
      const n = (v.name || '').toLowerCase();
      return targetKeywords.some((k) => n.includes(k));
    });

    return genderMatched || matchingLangVoices[0] || voices[0];
  };

  // Load and categorize real browser speech synthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setTtsErrorMessage('Web Speech Synthesis is not supported in this browser. Live interview will continue in visual text mode.');
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setSystemVoices(voices);
        const matched = findBestMatchingVoice(voices, voiceGender, voiceAccent);
        if (matched && !selectedVoiceURI) {
          setSelectedVoiceURI(matched.voiceURI || matched.name);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Preview Voice Sample
  const handlePreviewVoice = () => {
    if (!('speechSynthesis' in window)) {
      setTtsErrorMessage('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isPreviewSpeaking) {
      window.speechSynthesis.cancel();
      setIsPreviewSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    setTtsErrorMessage(null);

    const sampleText = voiceAccent === 'indian'
      ? "Hello! I am your AI interviewer from India. I will evaluate your technical concepts, problem-solving approach, and communication skills."
      : "Hello! I am your AI interviewer. I will evaluate your technical concepts, problem-solving approach, and communication skills.";

    const utterance = new SpeechSynthesisUtterance(sampleText);

    const activeVoice = systemVoices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI)
      || findBestMatchingVoice(systemVoices, voiceGender, voiceAccent);

    if (activeVoice) {
      utterance.voice = activeVoice;
      utterance.lang = activeVoice.lang;
    } else {
      utterance.lang = voiceAccent === 'indian' ? 'en-IN' : (voiceAccent === 'british' ? 'en-GB' : 'en-US');
    }

    utterance.rate = 0.95;
    utterance.pitch = voiceGender === 'female' ? 1.08 : 0.92;

    utterance.onstart = () => setIsPreviewSpeaking(true);
    utterance.onend = () => setIsPreviewSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('TTS preview error:', e);
      setIsPreviewSpeaking(false);
      setTtsErrorMessage('Voice playback unavailable in your browser. You can continue with text.');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Text to Speech for Interviewer Voice
  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setTtsErrorMessage('Voice playback unavailable. You can continue with text.');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const activeVoice = systemVoices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI)
      || findBestMatchingVoice(systemVoices, voiceGender, voiceAccent);

    if (activeVoice) {
      utterance.voice = activeVoice;
      utterance.lang = activeVoice.lang;
    } else {
      utterance.lang = voiceAccent === 'indian' ? 'en-IN' : (voiceAccent === 'british' ? 'en-GB' : 'en-US');
    }

    utterance.rate = 0.95;
    utterance.pitch = voiceGender === 'female' ? 1.08 : 0.92;

    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => setIsAISpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsAISpeaking(false);
      setTtsErrorMessage('Voice playback unavailable. You can continue with text.');
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAISpeaking(false);
      setIsPreviewSpeaking(false);
    }
  };

  // Question countdown timer & Auto-speak Question
  useEffect(() => {
    if (phase === 'LIVE') {
      clearInterval(timerIntervalRef.current);
      setQuestionTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setQuestionTimer((prev) => prev + 1);
      }, 1000);

      if (currentQuestion?.question_text && isAIVoiceEnabled) {
        speakQuestion(currentQuestion.question_text);
      }
    } else {
      clearInterval(timerIntervalRef.current);
      stopSpeaking();
    }
    return () => {
      clearInterval(timerIntervalRef.current);
      stopSpeaking();
    };
  }, [phase, currentQuestion?.question_index, isAIVoiceEnabled]);

  // Camera Management
  const startCameraStream = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setupAudioVisualizer(stream);
    } catch (err: any) {
      console.warn('Camera/Microphone permission denied or unavailable:', err);
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    stopSpeechRecognition();
  };

  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (e) {
      console.warn('Audio Visualizer setup skipped', e);
    }
  };

  // Speech Recognition (Web Speech API)
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in browser');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition init error:', e);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
  };

  // Recording Controls
  const startRecording = () => {
    if (!mediaStreamRef.current) {
      startCameraStream();
    }
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(mediaStreamRef.current!, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        }
      };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      startSpeechRecognition();
    } catch (e) {
      console.warn('MediaRecorder error:', e);
      setIsRecording(true);
      startSpeechRecognition();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopSpeechRecognition();
  };

  // Resume Session
  const resumeExistingSession = async (sessionId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiService.getPracticeSession(sessionId);
      setSession(data);
      if (data.status === 'COMPLETED') {
        setPhase('REPORT');
      } else {
        setPhase('LIVE');
        setCurrentQuestion(data.current_question || data.questions[data.questions.length - 1]);
        if (data.config?.mode === 'video' || data.config?.mode === 'hybrid') {
          startCameraStream();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to load practice session.');
    } finally {
      setLoading(false);
    }
  };

  // Custom Company Management
  const handleAddCustomCompany = () => {
    const trimmed = newCustomCompanyInput.trim();
    if (!trimmed) return;

    const existsInPresets = POPULAR_COMPANY_PRESETS.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    const existsInCustom = customCompanies.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );

    if (!existsInPresets && !existsInCustom) {
      setCustomCompanies((prev) => [...prev, trimmed]);
    }
    setTargetCompany(trimmed);
    setNewCustomCompanyInput('');
    setIsAddingCustomCompany(false);
  };

  // Custom Role Management
  const handleAddCustomRole = () => {
    const trimmed = newCustomRoleInput.trim();
    if (!trimmed) return;

    const existsInPresets = POPULAR_ROLE_PRESETS.some(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );
    const existsInCustom = customRoles.some(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );

    if (!existsInPresets && !existsInCustom) {
      setCustomRoles((prev) => [...prev, trimmed]);
    }
    setTargetRole(trimmed);
    setNewCustomRoleInput('');
    setIsAddingCustomRole(false);
  };

  // Start New Practice Session
  const handleStartPractice = async () => {
    const finalCompany = targetCompany.trim();
    const finalRole = targetRole.trim();

    if (!finalCompany) {
      setErrorMessage('Please enter a target company before starting the interview.');
      return;
    }
    if (!finalRole) {
      setErrorMessage('Please enter a target role before starting the interview.');
      return;
    }
    if (selectedTopics.length === 0 && customTopics.length === 0) {
      setErrorMessage('Please select or add at least one technical topic.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const payload: PracticeSessionCreatePayload = {
        company: finalCompany,
        role: finalRole,
        interview_style: interviewStyle,
        topics: selectedTopics,
        custom_topics: customTopics,
        experience_level: experienceLevel,
        difficulty: difficulty,
        total_questions: totalQuestions,
        mode: mode,
        voice_gender: voiceGender,
        voice_accent: voiceAccent,
        voice_id: selectedVoiceURI || undefined
      };
      const data = await apiService.startPracticeSession(payload);
      setSession(data);
      setCurrentQuestion(data.current_question || data.questions[0]);
      setPhase('LIVE');
      setTypedAnswer('');
      setTranscript('');

      if (mode === 'video' || mode === 'hybrid') {
        startCameraStream();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'AI interviewer is temporarily unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async (isSkipped = false) => {
    if (!session || !currentQuestion) return;

    if (isRecording) {
      stopRecording();
    }

    const answerContent = isSkipped
      ? ''
      : (mode === 'text' ? typedAnswer : (transcript || typedAnswer)).trim();

    if (!isSkipped && !answerContent) {
      setErrorMessage('Please provide an answer or speak on camera before submitting.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        session_id: session.session_id,
        question_index: currentQuestion.question_index,
        answer_text: answerContent,
        transcript: transcript || undefined,
        audio_video_metadata: {
          duration_seconds: questionTimer,
          mode: mode,
          recorded: recordedChunksRef.current.length > 0
        },
        time_taken_seconds: questionTimer,
        is_skipped: isSkipped
      };

      const updated = await apiService.submitPracticeAnswer(payload);
      setSession(updated);

      if (updated.status === 'COMPLETED' || !updated.current_question) {
        setPhase('REPORT');
        stopCameraStream();
        if (onSessionComplete) onSessionComplete();
      } else {
        setCurrentQuestion(updated.current_question);
        setTypedAnswer('');
        setTranscript('');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to submit answer. Please retry.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manually Finish & Evaluate
  const handleFinishEarly = async () => {
    if (!session) return;
    if (isRecording) stopRecording();

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const updated = await apiService.finishPracticeSession(session.session_id);
      setSession(updated);
      setPhase('REPORT');
      stopCameraStream();
      if (onSessionComplete) onSessionComplete();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to evaluate interview.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-5 bg-black/85 backdrop-blur-md overflow-hidden select-none cursor-default">
      <div className="relative w-full max-w-5xl h-[95vh] sm:h-[92vh] max-h-[880px] bg-[#0B1528] border border-[#223552] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transform-none transition-none">
        
        {/* TOP HEADER */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#1E293B] bg-[#0E1A2E] flex items-center justify-between gap-2 sm:gap-4 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight truncate">
                  AI Interview Studio
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                  Gemini Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#94A3B8] truncate max-w-xs sm:max-w-md">
                {phase === 'SETUP' && 'Configure custom target company, topics, and dynamic interview style'}
                {phase === 'LIVE' && `${session?.config.company} • ${session?.config.role} • ${session?.config.interview_style}`}
                {phase === 'REPORT' && `Comprehensive Performance Evaluation & Placement Readiness`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase === 'LIVE' && (
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] sm:text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/30 px-2 sm:px-3"
                onClick={handleFinishEarly}
                disabled={actionLoading}
              >
                End & Evaluate
              </Button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BODY CONTENT BASED ON PHASE */}
        <div className="flex-1 overflow-y-auto p-6 text-[#CBD5E1] overscroll-contain">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-semibold text-white">Initializing Gemini AI Practice Session...</p>
              <p className="text-xs text-[#94A3B8] max-w-sm">
                Generating dynamic, company-tailored interview challenges based on your selected topics.
              </p>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* PHASE 1: CONFIGURATION & SETUP */}
              {/* ========================================================================= */}
              {phase === 'SETUP' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                      1. Select Practice Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('video');
                          startCameraStream();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          mode === 'video'
                            ? 'bg-gradient-to-b from-[#162744] to-[#0E1A2E] border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                            : 'bg-[#101D31] border-[#243650] hover:border-[#3B82F6]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                            <Video className="w-4 h-4" />
                          </div>
                          {mode === 'video' && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <h4 className="text-sm font-bold text-white">Video Mode</h4>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Practice on camera with mic. Real-time speech transcription & recording.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('hybrid');
                          startCameraStream();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          mode === 'hybrid'
                            ? 'bg-gradient-to-b from-[#162744] to-[#0E1A2E] border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                            : 'bg-[#101D31] border-[#243650] hover:border-[#3B82F6]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                          </div>
                          {mode === 'hybrid' && <CheckCircle className="w-4 h-4 text-purple-400" />}
                        </div>
                        <h4 className="text-sm font-bold text-white">Hybrid Mode</h4>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Speak on camera with live editable transcript and code viva review.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('text');
                          stopCameraStream();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          mode === 'text'
                            ? 'bg-gradient-to-b from-[#162744] to-[#0E1A2E] border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                            : 'bg-[#101D31] border-[#243650] hover:border-[#3B82F6]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          {mode === 'text' && <CheckCircle className="w-4 h-4 text-blue-400" />}
                        </div>
                        <h4 className="text-sm font-bold text-white">Text / Code Mode</h4>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Type structured explanations, complexity breakdowns, and code snippets.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Company & Role Selector */}
                  {/* Target Company & Role Selection (Fully Customizable) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 1. TARGET COMPANY */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                          2. Target Company
                        </label>
                        <span className="text-[10px] text-cyan-400 font-medium">Free-form & Customizable</span>
                      </div>

                      {/* Main Editable Input */}
                      <input
                        type="text"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        placeholder="Search or enter any company (e.g. Deloitte, SAP, Zoho, Startup)..."
                        className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-medium"
                      />

                      {/* Presets & Custom Added Companies */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                            Popular Presets & Custom:
                          </span>
                          {!isAddingCustomCompany && (
                            <button
                              type="button"
                              onClick={() => setIsAddingCustomCompany(true)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Custom Company</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {POPULAR_COMPANY_PRESETS.map((comp) => {
                            const isSelected = targetCompany.trim().toLowerCase() === comp.toLowerCase();
                            return (
                              <button
                                key={comp}
                                type="button"
                                onClick={() => setTargetCompany(comp)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                                    : 'bg-[#0E1A2E] text-[#94A3B8] hover:text-white hover:border-cyan-500/40 border border-[#243650]'
                                }`}
                              >
                                {comp}
                              </button>
                            );
                          })}

                          {customCompanies.map((comp) => {
                            const isSelected = targetCompany.trim().toLowerCase() === comp.toLowerCase();
                            return (
                              <span
                                key={comp}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-500/30 text-purple-200 border-purple-400 font-bold shadow-sm'
                                    : 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:border-purple-500'
                                }`}
                                onClick={() => setTargetCompany(comp)}
                              >
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span>{comp}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomCompanies((prev) => prev.filter((c) => c !== comp));
                                    if (targetCompany.trim().toLowerCase() === comp.toLowerCase()) {
                                      setTargetCompany(POPULAR_COMPANY_PRESETS[0]);
                                    }
                                  }}
                                  className="hover:text-rose-400 ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>

                        {/* Dedicated Custom Company Input */}
                        {isAddingCustomCompany && (
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="text"
                              value={newCustomCompanyInput}
                              onChange={(e) => setNewCustomCompanyInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomCompany();
                                } else if (e.key === 'Escape') {
                                  setIsAddingCustomCompany(false);
                                  setNewCustomCompanyInput('');
                                }
                              }}
                              autoFocus
                              placeholder="Enter company name (e.g. Deloitte, SAP, Zoho)... Press Enter"
                              className="flex-1 bg-[#101D31] border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-cyan-400"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={handleAddCustomCompany}
                              disabled={!newCustomCompanyInput.trim()}
                              className="px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                            >
                              Add Company
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomCompany(false);
                                setNewCustomCompanyInput('');
                              }}
                              className="p-1.5 text-[#94A3B8] hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. TARGET ROLE */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                          3. Target Role
                        </label>
                        <span className="text-[10px] text-cyan-400 font-medium">Free-form & Customizable</span>
                      </div>

                      {/* Main Editable Input */}
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="Search or enter any role (e.g. Data Analyst, AI Engineer)..."
                        className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-medium"
                      />

                      {/* Presets & Custom Added Roles */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                            Popular Presets & Custom:
                          </span>
                          {!isAddingCustomRole && (
                            <button
                              type="button"
                              onClick={() => setIsAddingCustomRole(true)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Custom Role</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {POPULAR_ROLE_PRESETS.map((r) => {
                            const isSelected = targetRole.trim().toLowerCase() === r.toLowerCase();
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setTargetRole(r)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                                    : 'bg-[#0E1A2E] text-[#94A3B8] hover:text-white hover:border-cyan-500/40 border border-[#243650]'
                                }`}
                              >
                                {r}
                              </button>
                            );
                          })}

                          {customRoles.map((r) => {
                            const isSelected = targetRole.trim().toLowerCase() === r.toLowerCase();
                            return (
                              <span
                                key={r}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-500/30 text-purple-200 border-purple-400 font-bold shadow-sm'
                                    : 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:border-purple-500'
                                }`}
                                onClick={() => setTargetRole(r)}
                              >
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span>{r}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomRoles((prev) => prev.filter((item) => item !== r));
                                    if (targetRole.trim().toLowerCase() === r.toLowerCase()) {
                                      setTargetRole(POPULAR_ROLE_PRESETS[0]);
                                    }
                                  }}
                                  className="hover:text-rose-400 ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>

                        {/* Dedicated Custom Role Input */}
                        {isAddingCustomRole && (
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="text"
                              value={newCustomRoleInput}
                              onChange={(e) => setNewCustomRoleInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomRole();
                                } else if (e.key === 'Escape') {
                                  setIsAddingCustomRole(false);
                                  setNewCustomRoleInput('');
                                }
                              }}
                              autoFocus
                              placeholder="Enter custom role (e.g. Data Analyst, AI Engineer)... Press Enter"
                              className="flex-1 bg-[#101D31] border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-cyan-400"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={handleAddCustomRole}
                              disabled={!newCustomRoleInput.trim()}
                              className="px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                            >
                              Add Role
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomRole(false);
                                setNewCustomRoleInput('');
                              }}
                              className="p-1.5 text-[#94A3B8] hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Topics System */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        4. Select & Add Technical Topics
                      </label>
                      <span className="text-[11px] text-cyan-400 font-semibold">
                        {selectedTopics.length + customTopics.length} topics selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_TOPICS.map((topic) => {
                        const isSelected = selectedTopics.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setSelectedTopics((prev) =>
                                isSelected ? prev.filter((t) => t !== topic) : [...prev, topic]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                : 'bg-[#101D31] text-[#94A3B8] hover:text-white border border-[#243650]'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 text-cyan-400" /> : <Plus className="w-3 h-3 text-[#64748B]" />}
                            {topic}
                          </button>
                        );
                      })}

                      {customTopics.map((ct) => (
                        <span
                          key={ct}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/50 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          {ct}
                          <button
                            type="button"
                            onClick={() => setCustomTopics((prev) => prev.filter((t) => t !== ct))}
                            className="hover:text-rose-400 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Custom Topic Input */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newCustomTopicInput}
                        onChange={(e) => setNewCustomTopicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCustomTopicInput.trim()) {
                            e.preventDefault();
                            if (!customTopics.includes(newCustomTopicInput.trim())) {
                              setCustomTopics((prev) => [...prev, newCustomTopicInput.trim()]);
                            }
                            setNewCustomTopicInput('');
                          }
                        }}
                        placeholder="Add custom topic (e.g. Node.js Event Loop, Docker, Kafka, Redis)... Press Enter"
                        className="flex-1 bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newCustomTopicInput.trim() && !customTopics.includes(newCustomTopicInput.trim())) {
                            setCustomTopics((prev) => [...prev, newCustomTopicInput.trim()]);
                            setNewCustomTopicInput('');
                          }
                        }}
                        disabled={!newCustomTopicInput.trim()}
                      >
                        Add Topic
                      </Button>
                    </div>
                  </div>

                  {/* 5. INTERVIEWER VOICE & ACCENT CONFIGURATION */}
                  <div className="p-4 rounded-2xl bg-[#0E1A2E] border border-[#1E293B] space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        5. Interviewer Voice & Accent (Supported Real TTS)
                      </label>
                      <span className="text-[10px] text-cyan-400 font-semibold">
                        {systemVoices.length > 0 ? `${systemVoices.length} System Voices Detected` : 'Native Browser Voice'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Voice Gender */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#94A3B8] block">Voice Gender</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceGender('female');
                              const matched = findBestMatchingVoice(systemVoices, 'female', voiceAccent);
                              if (matched) setSelectedVoiceURI(matched.voiceURI || matched.name);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              voiceGender === 'female'
                                ? 'bg-cyan-500 text-slate-950 shadow-md'
                                : 'bg-[#101D31] text-[#94A3B8] hover:text-white border border-[#243650]'
                            }`}
                          >
                            <span>👩 Female</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceGender('male');
                              const matched = findBestMatchingVoice(systemVoices, 'male', voiceAccent);
                              if (matched) setSelectedVoiceURI(matched.voiceURI || matched.name);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              voiceGender === 'male'
                                ? 'bg-cyan-500 text-slate-950 shadow-md'
                                : 'bg-[#101D31] text-[#94A3B8] hover:text-white border border-[#243650]'
                            }`}
                          >
                            <span>👨 Male</span>
                          </button>
                        </div>
                      </div>

                      {/* Accent / Locale */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#94A3B8] block">Accent / Locale</span>
                        <select
                          value={voiceAccent}
                          onChange={(e) => {
                            const newAccent = e.target.value as any;
                            setVoiceAccent(newAccent);
                            const matched = findBestMatchingVoice(systemVoices, voiceGender, newAccent);
                            if (matched) setSelectedVoiceURI(matched.voiceURI || matched.name);
                          }}
                          className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="indian">🇮🇳 Indian English</option>
                          <option value="american">🇺🇸 American English</option>
                          <option value="british">🇬🇧 British English</option>
                          <option value="neutral">🌐 Global / Neutral English</option>
                        </select>
                      </div>

                      {/* Voice Identity & Preview Button */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#94A3B8] block">Voice Identity & Preview</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedVoiceURI}
                            onChange={(e) => setSelectedVoiceURI(e.target.value)}
                            className="flex-1 bg-[#101D31] border border-[#243650] rounded-xl px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 truncate"
                          >
                            {systemVoices.length > 0 ? (
                              systemVoices
                                .filter((v) => (v.lang || '').toLowerCase().startsWith('en'))
                                .map((v) => (
                                  <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                                    {v.name} ({v.lang})
                                  </option>
                                ))
                            ) : (
                              <option value="">Browser Native Engine</option>
                            )}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handlePreviewVoice}
                            className={`px-3 py-2 text-xs font-bold shrink-0 ${
                              isPreviewSpeaking
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse'
                                : 'bg-[#14243B] text-cyan-400 hover:text-white border border-[#243650]'
                            }`}
                          >
                            {isPreviewSpeaking ? '⏹️ Stop' : '🔊 Preview'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {ttsErrorMessage && (
                      <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {ttsErrorMessage}
                      </p>
                    )}
                  </div>

                  {/* Interview Style & Difficulty Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        5. Interview Style
                      </label>
                      <select
                        value={interviewStyle}
                        onChange={(e) => setInterviewStyle(e.target.value)}
                        className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {INTERVIEW_STYLES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        6. Difficulty
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Adaptive">Adaptive (Probes on answers)</option>
                        <option value="Easy">Easy / Foundational</option>
                        <option value="Medium">Medium / Standard Tier</option>
                        <option value="Hard">Hard / Bar Raiser</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        7. Number of Questions
                      </label>
                      <select
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                        className="w-full bg-[#101D31] border border-[#243650] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={3}>3 Questions (Quick 10m Round)</option>
                        <option value={5}>5 Questions (Standard 20m Round)</option>
                        <option value={7}>7 Questions (Deep 30m Round)</option>
                        <option value={10}>10 Questions (Full Marathon Round)</option>
                      </select>
                    </div>
                  </div>

                  {/* Camera Test preview if Video or Hybrid mode */}
                  {(mode === 'video' || mode === 'hybrid') && (
                    <div className="p-4 rounded-2xl bg-[#0E1A2E] border border-[#1E293B] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded-xl bg-black overflow-hidden border border-slate-700 relative flex items-center justify-center">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white">Camera & Microphone Preview</h5>
                          <p className="text-[11px] text-[#94A3B8]">
                            Audio Input Level: {audioLevel}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400">Sensors Active</span>
                      </div>
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/20 rounded-2xl flex items-center justify-center gap-2"
                      onClick={handleStartPractice}
                    >
                      <Zap className="w-4 h-4 text-cyan-300" />
                      Start AI Interview Practice ({totalQuestions} Questions)
                    </Button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* PHASE 2: LIVE INTERVIEW SESSION */}
              {/* ========================================================================= */}
              {phase === 'LIVE' && currentQuestion && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Status Banner */}
                  <div className="p-3.5 rounded-2xl bg-[#101D31] border border-[#243650] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-extrabold text-xs">
                        Question {currentQuestion.question_index} of {session?.total_questions || totalQuestions}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-semibold text-xs">
                        {currentQuestion.topic}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[#94A3B8] text-[11px] font-medium">
                        {currentQuestion.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{Math.floor(questionTimer / 60)}:{(questionTimer % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI INTERVIEWER QUESTION CARD */}
                  <Card hover3d={false} className="p-5 bg-gradient-to-b from-[#13233D] to-[#0D1829] border border-cyan-500/30 text-white shadow-xl shadow-cyan-500/5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            AI Interviewer • {session?.config.company}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#94A3B8] uppercase">{currentQuestion.question_type}</span>
                            {isAISpeaking ? (
                              <button
                                type="button"
                                onClick={stopSpeaking}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold animate-pulse"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Speaking</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => speakQuestion(currentQuestion.question_text)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0B1528] text-slate-300 hover:text-white border border-[#243650] text-[10px] font-medium"
                              >
                                <Volume2 className="w-3 h-3 text-cyan-400" />
                                <span>Replay Audio</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-[#F8FAFC] leading-relaxed">
                          {currentQuestion.question_text}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* INTERACTIVE ANSWER AREA */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    
                    {/* VIDEO/MIC PANEL (If video or hybrid mode) */}
                    {(session?.config.mode === 'video' || session?.config.mode === 'hybrid') && (
                      <div className="lg:col-span-6 space-y-3">
                        <div className="relative rounded-2xl overflow-hidden bg-black border border-[#243650] aspect-video flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                          />
                          {!isVideoEnabled && (
                            <div className="text-center p-4">
                              <VideoOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                              <p className="text-xs text-slate-400">Camera Paused</p>
                            </div>
                          )}

                          {/* Recording status badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px]">
                            {isRecording ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                <span className="text-rose-400 font-bold">Recording Answer</span>
                              </>
                            ) : (
                              <span className="text-slate-400">Standby</span>
                            )}
                          </div>

                          {/* Mic level */}
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] flex items-center gap-1.5">
                            <Mic className={`w-3 h-3 ${audioLevel > 10 ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="text-slate-300">Level: {audioLevel}%</span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {!isRecording ? (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                icon={<Play className="w-3.5 h-3.5" />}
                                onClick={startRecording}
                              >
                                Record Answer
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                icon={<StopCircle className="w-3.5 h-3.5" />}
                                onClick={stopRecording}
                              >
                                Stop Recording
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (mediaStreamRef.current) {
                                  const vTrack = mediaStreamRef.current.getVideoTracks()[0];
                                  if (vTrack) {
                                    vTrack.enabled = !vTrack.enabled;
                                    setIsVideoEnabled(vTrack.enabled);
                                  }
                                }
                              }}
                              className="p-2 rounded-xl bg-[#101D31] text-[#94A3B8] hover:text-white border border-[#243650]"
                            >
                              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (mediaStreamRef.current) {
                                  const aTrack = mediaStreamRef.current.getAudioTracks()[0];
                                  if (aTrack) {
                                    aTrack.enabled = !aTrack.enabled;
                                    setIsAudioEnabled(aTrack.enabled);
                                  }
                                }
                              }}
                              className="p-2 rounded-xl bg-[#101D31] text-[#94A3B8] hover:text-white border border-[#243650]"
                            >
                              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TEXT / TRANSCRIPT INPUT PANEL */}
                    <div className={session?.config.mode === 'text' ? 'lg:col-span-12 space-y-3' : 'lg:col-span-6 space-y-3'}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                            {session?.config.mode === 'text'
                              ? 'Your Solution & Complexity Explanation'
                              : 'Real-time Speech Transcript'}
                          </label>
                          <span className="text-[11px] text-[#64748B]">
                            {session?.config.mode === 'text' ? `${typedAnswer.length} chars` : `${transcript.split(' ').filter(Boolean).length} words`}
                          </span>
                        </div>

                        {session?.config.mode === 'text' ? (
                          <textarea
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="Type your structured explanation, step-by-step reasoning, base cases, and time/space complexity analysis..."
                            rows={8}
                            className="w-full bg-[#101D31] border border-[#243650] rounded-2xl p-4 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-cyan-500 leading-relaxed"
                          />
                        ) : (
                          <textarea
                            value={transcript || typedAnswer}
                            onChange={(e) => {
                              setTranscript(e.target.value);
                              setTypedAnswer(e.target.value);
                            }}
                            placeholder="Your spoken words will appear here in real-time via Web Speech recognition. You can also edit/type directly..."
                            rows={8}
                            className="w-full bg-[#101D31] border border-[#243650] rounded-2xl p-4 text-xs text-[#F8FAFC] focus:outline-none focus:border-cyan-500 leading-relaxed"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BAR */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1E293B]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs text-[#94A3B8] w-full sm:w-auto"
                      onClick={() => handleSubmitAnswer(true)}
                      disabled={actionLoading}
                    >
                      Skip Question
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 w-full sm:w-auto flex items-center justify-center"
                      onClick={() => handleSubmitAnswer(false)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini is evaluating...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>Submit & Next Question</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* PHASE 3: COMPREHENSIVE EVALUATION REPORT */}
              {/* ========================================================================= */}
              {phase === 'REPORT' && session?.evaluation && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* SCORE HEADER */}
                  <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#12233E] via-[#0E1A2E] to-[#0A1220] border border-cyan-500/40 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            {session.evaluation.readiness_level}
                          </span>
                          <span className="text-xs text-[#94A3B8] break-words-safe">
                            {session.config.company} • {session.config.role}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                          Placement Practice Evaluation Report
                        </h3>
                        <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
                          {session.evaluation.detailed_feedback}
                        </p>
                      </div>

                      {/* Overall Score Circle */}
                      <div className="flex items-center gap-4 bg-[#0B1528]/80 p-3 sm:p-4 rounded-2xl border border-[#243650] shrink-0 self-start md:self-auto">
                        <div className="text-center">
                          <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            {Math.round(session.evaluation.overall_score)}%
                          </span>
                          <span className="text-[10px] text-[#94A3B8] block font-bold uppercase tracking-wider mt-0.5">
                            Overall Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Scores */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#1E293B]">
                      <div className="p-3 rounded-xl bg-[#0B1528] border border-[#243650]">
                        <span className="text-[10px] text-[#94A3B8] font-semibold block uppercase">Technical Depth</span>
                        <span className="text-lg font-black text-cyan-400">{Math.round(session.evaluation.technical_score)}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0B1528] border border-[#243650]">
                        <span className="text-[10px] text-[#94A3B8] font-semibold block uppercase">Communication & Structure</span>
                        <span className="text-lg font-black text-purple-400">{Math.round(session.evaluation.communication_score)}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0B1528] border border-[#243650]">
                        <span className="text-[10px] text-[#94A3B8] font-semibold block uppercase">Problem Solving & Trade-offs</span>
                        <span className="text-lg font-black text-blue-400">{Math.round(session.evaluation.problem_solving_score)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* STRENGTHS & WEAKNESSES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card hover3d={false} className="p-4 sm:p-5 bg-[#101D31] border-[#243650]">
                      <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Key Demonstrated Strengths
                      </h4>
                      <ul className="space-y-2">
                        {session.evaluation.strengths.map((st, i) => (
                          <li key={i} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card hover3d={false} className="p-4 sm:p-5 bg-[#101D31] border-[#243650]">
                      <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Areas for Targeted Improvement
                      </h4>
                      <ul className="space-y-2">
                        {session.evaluation.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* ACTIONABLE RECOMMENDATIONS & SUGGESTIONS */}
                  {session.evaluation.recommendations && session.evaluation.recommendations.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
                      <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Actionable Suggestions & Placement Prep Guidance
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {session.evaluation.recommendations.map((rec, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[#0B1528] border border-[#243650] text-xs text-[#E2E8F0] flex items-start gap-2">
                            <span className="text-cyan-400 font-bold shrink-0">#{i + 1}</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MISSED CONCEPTS & BLIND SPOTS */}
                  {session.evaluation.missed_concepts && session.evaluation.missed_concepts.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#101D31] border border-rose-900/40 space-y-2">
                      <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        Missed Technical Concepts & Gaps
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {session.evaluation.missed_concepts.map((concept, i) => (
                          <span key={i} className="px-3 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                            <X className="w-3 h-3 text-rose-400" />
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TOPIC MASTERY BREAKDOWN */}
                  {session.evaluation.topic_scores && session.evaluation.topic_scores.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-cyan-400" />
                        Topic Mastery & Conceptual Depth Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {session.evaluation.topic_scores.map((ts, i) => (
                          <div key={i} className="p-3.5 rounded-xl bg-[#101D31] border border-[#243650] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{ts.topic}</span>
                              <span className={`text-xs font-black ${ts.score >= 70 ? 'text-emerald-400' : ts.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {Math.round(ts.score)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#0B1528] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${ts.score >= 70 ? 'bg-emerald-500' : ts.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, Math.max(5, ts.score))}%` }}
                              />
                            </div>
                            {ts.feedback && (
                              <p className="text-[11px] text-[#94A3B8] leading-tight">{ts.feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VIDEO & SPEECH METRICS */}
                  {session.evaluation.video_feedback && (
                    <div className="p-4 rounded-2xl bg-[#0E1A2E] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Video & Speech Practice Metrics</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-[#94A3B8] block">Total Speaking Time</span>
                          <span className="font-mono font-bold text-cyan-400">{session.evaluation.video_feedback.total_speaking_time_seconds || 0}s</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#94A3B8] block">Avg Response Duration</span>
                          <span className="font-mono font-bold text-purple-400">{session.evaluation.video_feedback.average_answer_duration_seconds || 0}s / question</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#94A3B8] block">Questions Attempted</span>
                          <span className="font-mono font-bold text-emerald-400">{session.evaluation.video_feedback.answered_questions_ratio || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QUESTION BY QUESTION BREAKDOWN */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Question-by-Question Response Audit
                    </h4>

                    <div className="space-y-3">
                      {session.questions.map((q) => {
                        const ans = session.answers.find((a) => a.question_index === q.question_index);
                        return (
                          <div key={q.question_index} className="p-4 rounded-2xl bg-[#101D31] border border-[#243650] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-cyan-400">
                                Question {q.question_index}: {q.topic}
                              </span>
                              <span className="text-[10px] text-[#94A3B8]">
                                {ans?.time_taken_seconds || 0}s duration
                              </span>
                            </div>
                            <p className="text-xs font-medium text-white">{q.question_text}</p>
                            <div className="p-3 rounded-xl bg-[#0B1528] border border-[#1E293B] text-[11px] text-[#94A3B8] font-mono break-words-safe">
                              <span className="text-slate-400 font-bold block mb-1">Your Submitted Response:</span>
                              {ans?.answer_text || ans?.transcript || '[Skipped / No Answer]'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-[#1E293B]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setPhase('SETUP')}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Practice Again
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold w-full sm:w-auto"
                      onClick={onClose}
                    >
                      Close Report
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
