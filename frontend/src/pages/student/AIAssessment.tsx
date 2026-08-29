import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  BrainCircuit,
  Sparkles,
  Bot,
  Send,
  Code2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Flag,
  ChevronRight,
  ChevronLeft,
  Award,
  TrendingUp,
  BarChart3,
  Check,
  X,
  Loader2,
  FileCode2,
  HelpCircle,
  Compass,
  ArrowRight,
  RefreshCw,
  Terminal,
  Bookmark,
  Zap,
  Video,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { AIInterviewPracticeStudioModal } from '../../components/student/AIInterviewPracticeStudioModal';
import {
  apiService,
  AssessmentSession,
  AssessmentQuestion,
  AssessmentResult,
  TopicPerformance,
} from '../../services/api';

type ActiveView = 'CHAT_SETUP' | 'CUSTOM_SETUP' | 'TEST_RUNNER' | 'RESULTS';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggested_actions?: Array<{ label: string; action: string; [key: string]: any }>;
  timestamp: string;
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    cout << "Hello World!";\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        System.out.println("Hello World!");\n    }\n}`,
  python: `# Write your code here\nprint("Hello World!")`,
  javascript: `// Write your code here\nconsole.log("Hello World!");`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    printf("Hello World!");\n    return 0;\n}`,
};

export const AIAssessment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Main UI State
  const [activeView, setActiveView] = useState<ActiveView>('CHAT_SETUP');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student Profile & Resume Skills State
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [hasResume, setHasResume] = useState<boolean>(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Custom Test Config State
  const [testType, setTestType] = useState<'CODING' | 'APTITUDE' | 'COMBINED'>('COMBINED');
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Timer System State (Auto Difficulty Mode + Custom Override)
  const [timerMode, setTimerMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [customTimerPreset, setCustomTimerPreset] = useState<number | 'PRACTICE'>(30);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState<boolean>(false);

  const getAutoTimerDurationMinutes = (diff: string): number => {
    const d = (diff || 'MEDIUM').toUpperCase();
    if (d === 'EASY') return 15;
    if (d === 'HARD') return 40;
    return 25; // MEDIUM default
  };

  // Live Test Runner State
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);
  const [userAnswers, setUserAnswers] = useState<Record<string, { selected_option?: string; code?: string; language?: string }>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Live Timer Interval Effect
  useEffect(() => {
    if (activeView !== 'TEST_RUNNER' || !activeSession) return;

    if (timerMode === 'CUSTOM' && customTimerPreset === 'PRACTICE') {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimeUpModalOpen(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeView, activeSession, timerMode, customTimerPreset]);
  
  // Code Editor & Runner State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState<number>(0);
  const [runOutput, setRunOutput] = useState<{
    status: string;
    stdout: string;
    stderr?: string;
    passed_sample_cases?: number;
    total_sample_cases?: number;
    test_results?: any[];
    totalTestCases?: number;
    passedTestCases?: number;
    executionTime?: string;
    memory?: string;
    testResults?: any[];
  } | null>(null);

  // AI Complexity Analysis & Progressive Hints State
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);
  const [complexityMap, setComplexityMap] = useState<Record<string, { complexity_time: string; complexity_space: string; optimization_tip: string; summary: string }>>({});
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [hintMap, setHintMap] = useState<Record<string, Array<{ hint_level: number; title: string; hint_text: string }>>>({});

  // Adaptive Learning Mode Toggle State (Default: OFF)
  const [isAdaptiveModeEnabled, setIsAdaptiveModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("placemind_adaptive_mode_enabled");
    return saved !== null ? saved === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem("placemind_adaptive_mode_enabled", String(isAdaptiveModeEnabled));
  }, [isAdaptiveModeEnabled]);

  // Unified AI Practice Studio State
  const [isPracticeStudioOpen, setIsPracticeStudioOpen] = useState(false);

  // Phase 2: CAT Adaptive Engine & Spaced Repetition State
  const [adaptiveState, setAdaptiveState] = useState<{
    current_difficulty: string;
    difficulty_transition: string;
    transition_message: string;
    recommended_next_topic: string;
    attempt_score?: number;
  } | null>(null);

  const [spacedRevisionData, setSpacedRevisionData] = useState<{
    due_reviews: Array<{ question_id: string; topic_tag: string; repetition_count: number; interval_days: number; ease_factor: number; next_review_date: string; last_score: number }>;
    topic_mastery_index: Array<{ topic: string; mastery_percentage: number; status: string; total_attempts: number; clean_submissions: number }>;
    active_difficulty: string;
    recommended_next_topic: string;
  } | null>(null);

  // Relative Time & Time-Decay Spaced Repetition Helpers
  const getRelativeTimeText = (lastReviewed: string | null): string => {
    if (!lastReviewed) return "Never";
    const date = new Date(lastReviewed);
    if (isNaN(date.getTime())) return "Never";
    const diffMs = new Date().getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const calculateDecayedMastery = (mastery: number, lastReviewed: string | null, attempts: number): number => {
    if (attempts === 0 || !lastReviewed) return 0;
    const date = new Date(lastReviewed);
    if (isNaN(date.getTime())) return mastery;
    const daysInactive = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInactive > 10) {
      const decayDays = daysInactive - 10;
      const decayPct = Math.floor(decayDays / 3);
      return Math.max(10, mastery - decayPct);
    }
    return mastery;
  };

  // Dynamic Topic Mastery Store with LocalStorage Persistence
  const [userTopicMastery, setUserTopicMastery] = useState<Record<string, { mastery: number; attempts: number; clean: number; easy: number; medium: number; hard: number; lastReviewed: string | null }>>(() => {
    const saved = localStorage.getItem("userTopicMastery") || localStorage.getItem("placemind_user_topic_mastery");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      } catch (e) {}
    }
    return {
      "Arrays & Hashing": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Strings": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Two Pointers & Sliding Window": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Stack & Queue": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Binary Search": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Linked Lists": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Binary Trees & BST": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
      "Graphs": { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null },
    };
  });

  useEffect(() => {
    localStorage.setItem("userTopicMastery", JSON.stringify(userTopicMastery));
    localStorage.setItem("placemind_user_topic_mastery", JSON.stringify(userTopicMastery));
  }, [userTopicMastery]);

  // Assessment Results State
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Language Code Template Helper
  const getQuestionCode = (qId: string, lang: string, templates?: Record<string, string>): string => {
    const key = `${qId}_${lang}`;
    if (codeDrafts[key] !== undefined) {
      return codeDrafts[key];
    }
    if (codeDrafts[qId] !== undefined) {
      return codeDrafts[qId];
    }
    if (templates && templates[lang]) {
      return templates[lang];
    }
    return DEFAULT_TEMPLATES[lang] || '';
  };

  // 1. Initial Load — Profile & Chatbot Greeting
  useEffect(() => {
    loadStudentContext();
  }, [user, searchParams]);

  const loadStudentContext = async () => {
    try {
      setLoading(true);
      const targetDriveId = searchParams.get('drive_id');
      const targetTopic = searchParams.get('topic');
      const targetDiff = searchParams.get('difficulty') || 'Medium';

      const [latestRes, dashRes, driveRes] = await Promise.allSettled([
        apiService.getLatestResume(user?.id || ''),
        apiService.getMyStudentDashboard(),
        targetDriveId ? apiService.getDriveById(targetDriveId) : Promise.resolve(null),
      ]);

      let skills: string[] = [];
      let resumeFound = false;

      if (latestRes.status === 'fulfilled' && latestRes.value?.profile) {
        skills = latestRes.value.profile.raw_skills || latestRes.value.profile.skills.map((s) => s.name);
        resumeFound = true;
      } else if (dashRes.status === 'fulfilled' && dashRes.value?.student?.skills) {
        skills = dashRes.value.student.skills;
        resumeFound = dashRes.value.hasResume;
      }

      setResumeSkills(skills);
      setHasResume(resumeFound);

      let initialPrompt = 'hello';
      let defaultTopics = skills.length > 0 ? skills.slice(0, 4) : ['Arrays & Hashing', 'Strings', 'Quantitative Aptitude', 'Logical Reasoning'];

      if (driveRes.status === 'fulfilled' && driveRes.value) {
        const d = driveRes.value;
        const reqSkills = d.requiredSkills || [];
        defaultTopics = reqSkills.length > 0 ? reqSkills : defaultTopics;
        initialPrompt = `I want to prepare specifically for the ${d.companyName} (${d.roleTitle}) placement drive. Please recommend a test covering: ${defaultTopics.join(', ')}.`;
      } else if (targetTopic) {
        defaultTopics = [targetTopic];
        setDifficulty(targetDiff);
        initialPrompt = `I want to focus on practicing ${targetTopic} at ${targetDiff} difficulty.`;
      }

      setSelectedTopics(defaultTopics);

      // Initial Greeting from PrepBot
      const initialReply = await apiService.chatWithPrepBot(initialPrompt);
      setChatMessages([
        {
          id: 'msg-init',
          sender: 'bot',
          text: initialReply.reply,
          suggested_actions: initialReply.suggested_actions,
          timestamp: 'Just now',
        },
      ]);
      // Load Spaced Revision summary
      try {
        const revisionSummary = await apiService.getSpacedRevisionSummary();
        setSpacedRevisionData(revisionSummary);
        if (revisionSummary.active_difficulty) {
          setDifficulty(revisionSummary.active_difficulty);
        }

        // Merge backend attempt history if available
        if (revisionSummary.topic_mastery_index && revisionSummary.topic_mastery_index.length > 0) {
          setUserTopicMastery((prev) => {
            const updated = { ...prev };
            let updatedAny = false;

            revisionSummary.topic_mastery_index.forEach((item) => {
              if (item.total_attempts > 0) {
                updated[item.topic] = {
                  mastery: Math.round(item.mastery_percentage),
                  attempts: item.total_attempts,
                  clean: item.clean_submissions,
                  easy: updated[item.topic]?.easy || 0,
                  medium: updated[item.topic]?.medium || 0,
                  hard: updated[item.topic]?.hard || 0,
                  lastReviewed: updated[item.topic]?.lastReviewed || new Date().toISOString(),
                };
                updatedAny = true;
              }
            });

            if (updatedAny) {
              localStorage.setItem("userTopicMastery", JSON.stringify(updated));
              localStorage.setItem("placemind_user_topic_mastery", JSON.stringify(updated));
            }
            return updated;
          });
        }
      } catch (e) {
        console.warn('Spaced revision summary load failed', e);
      }
    } catch (err) {
      console.warn('PrepBot initialization fallback', err);
      setChatMessages([
        {
          id: 'msg-fallback',
          sender: 'bot',
          text: `Hello ${user?.name || 'Candidate'}! 👋 I am PrepBot, your AI Placement Assessment Assistant. I can generate personalized coding and aptitude tests based on campus placement standards.`,
          suggested_actions: [
            { label: '🚀 Start Combined Test (30m)', action: 'START_TEST', type: 'COMBINED', count: 10, duration: 30 },
            { label: '💻 Coding Test Only (20m)', action: 'START_TEST', type: 'CODING', count: 5, duration: 20 },
            { label: '🧠 Aptitude Test Only (15m)', action: 'START_TEST', type: 'APTITUDE', count: 10, duration: 15 },
          ],
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatSending]);

  // Live Timer Effect
  useEffect(() => {
    if (activeView !== 'TEST_RUNNER' || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeView, secondsRemaining]);

  // 2. Chatbot Message Dispatch
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputQuery('');
    setIsChatSending(true);

    try {
      const res = await apiService.chatWithPrepBot(textToSend);
      const botMsg: ChatMessage = {
        id: res.id,
        sender: 'bot',
        text: res.reply,
        suggested_actions: res.suggested_actions,
        timestamp: res.timestamp || 'Just now',
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'I am ready to help you prepare. Would you like to generate a personalized placement test?',
          suggested_actions: [
            { label: '🚀 Start 30m Test', action: 'START_TEST', type: 'COMBINED', count: 10, duration: 30 },
            { label: '⚙️ Configure Test', action: 'OPEN_CUSTOM_SETUP' },
          ],
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // 3. Action Dispatcher
  const handleActionClick = (actionItem: any) => {
    if (actionItem.action === 'NAVIGATE_RESUME') {
      navigate('/student/resume');
    } else if (actionItem.action === 'NAVIGATE_HISTORY') {
      navigate('/student/assessments');
    } else if (actionItem.action === 'OPEN_CUSTOM_SETUP') {
      setActiveView('CUSTOM_SETUP');
    } else if (actionItem.action === 'START_TEST') {
      startAssessment({
        type: actionItem.type || 'COMBINED',
        question_count: actionItem.count || 10,
        duration_minutes: actionItem.duration || 30,
        difficulty: actionItem.difficulty || 'Medium',
        topics: actionItem.topics,
      });
    }
  };

  // 4. Start Assessment Session
  const startAssessment = async (configOverride?: {
    type?: string;
    difficulty?: string;
    question_count?: number;
    duration_minutes?: number;
    topics?: string[];
  }) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const targetDiff = configOverride?.difficulty || difficulty;
      let initialMinutes = 25;

      if (timerMode === 'AUTO') {
        initialMinutes = getAutoTimerDurationMinutes(targetDiff);
      } else {
        if (customTimerPreset === 'PRACTICE') {
          initialMinutes = 0;
        } else if (customMinutesInput && !isNaN(parseInt(customMinutesInput)) && parseInt(customMinutesInput) > 0) {
          initialMinutes = parseInt(customMinutesInput);
        } else if (typeof customTimerPreset === 'number') {
          initialMinutes = customTimerPreset;
        }
      }

      const payload = {
        type: configOverride?.type || testType,
        difficulty: targetDiff,
        question_count: configOverride?.question_count || questionCount,
        duration_minutes: initialMinutes || 30,
        topics: configOverride?.topics || (selectedTopics.length > 0 ? selectedTopics : undefined),
      };

      const session = await apiService.generateAssessment(payload);
      setActiveSession(session);
      setCurrentQIndex(0);
      setSecondsRemaining(initialMinutes * 60);
      setElapsedSeconds(0);
      setIsTimeUpModalOpen(false);
      setUserAnswers({});
      setMarkedForReview({});
      setRunOutput(null);

      // Pre-populate code templates per language
      const initialDrafts: Record<string, string> = {};
      session.questions.forEach((q) => {
        if (q.type === 'coding') {
          ['python', 'javascript', 'java', 'cpp', 'c'].forEach((lang) => {
            const template = q.code_template?.[lang] || DEFAULT_TEMPLATES[lang] || '';
            initialDrafts[`${q.id}_${lang}`] = template;
          });
          initialDrafts[q.id] = q.code_template?.['python'] || DEFAULT_TEMPLATES['python'] || '';
        }
      });
      setCodeDrafts(initialDrafts);

      setActiveView('TEST_RUNNER');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Assessment generation is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Global Dispatcher for Dynamic Topic Mastery Updates with Multi-Factor Scoring
  const updateTopicMastery = (
    topicTag?: string,
    passStatus?: boolean,
    hintsUsed: number = 0,
    diffLevel: string = 'Medium',
    timeTakenSeconds?: number
  ) => {
    const tag = topicTag || "Arrays & Hashing";
    const diffUpper = (diffLevel || 'MEDIUM').toUpperCase();

    setUserTopicMastery((prev) => {
      const current = prev[tag] || { mastery: 0, attempts: 0, clean: 0, easy: 0, medium: 0, hard: 0, lastReviewed: null };
      const initialMastery = current.attempts === 0 ? 50 : current.mastery;
      const isClean = Boolean(passStatus) && hintsUsed === 0;

      // 1. Difficulty Weighting Multiplier (Easy 1.0x, Medium 1.2x, Hard 1.5x)
      const diffMultiplier = diffUpper === 'HARD' ? 1.5 : diffUpper === 'EASY' ? 1.0 : 1.2;

      // 2. Time Efficiency Bonus / Penalty
      let timeMod = 0;
      if (timeTakenSeconds && timeTakenSeconds > 0) {
        const targetSecs = diffUpper === 'HARD' ? 180 : diffUpper === 'EASY' ? 60 : 120;
        if (timeTakenSeconds <= targetSecs) {
          timeMod = 5; // Efficiency bonus
        } else if (timeTakenSeconds > targetSecs * 2) {
          timeMod = -5; // Time penalty
        }
      }

      // 3. Multi-factor Score Delta Calculation
      let delta = 0;
      if (isClean) {
        delta = Math.round(15 * diffMultiplier) + timeMod;
      } else if (passStatus) {
        delta = Math.round((5 - (hintsUsed * 5)) * diffMultiplier) + timeMod;
      } else {
        delta = Math.round(-10 * diffMultiplier);
      }

      const newMastery = Math.min(100, Math.max(10, initialMastery + delta));

      // Difficulty breakdown counter update
      const easyCount = (current.easy || 0) + (diffUpper === 'EASY' && passStatus ? 1 : 0);
      const mediumCount = (current.medium || 0) + (diffUpper === 'MEDIUM' && passStatus ? 1 : 0);
      const hardCount = (current.hard || 0) + (diffUpper === 'HARD' && passStatus ? 1 : 0);

      const updatedTopic = {
        mastery: newMastery,
        attempts: (current?.attempts || 0) + 1,
        clean: (current?.clean || 0) + (isClean ? 1 : 0),
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount,
        lastReviewed: new Date().toISOString(),
      };

      const nextState = { ...prev, [tag]: updatedTopic };
      localStorage.setItem("userTopicMastery", JSON.stringify(nextState));
      localStorage.setItem("placemind_user_topic_mastery", JSON.stringify(nextState));
      return nextState;
    });
  };

  // 5. Code Runner (Sample Test Cases)
  const handleRunCode = async () => {
    if (!activeSession) return;
    const currentQ = activeSession.questions[currentQIndex];
    if (!currentQ || currentQ.type !== 'coding') return;

    const code = getQuestionCode(currentQ.id, selectedLanguage, currentQ.code_template);
    if (!code.trim()) {
      setRunOutput({ status: 'FAILED', stdout: '', stderr: 'Please write code before running.' });
      return;
    }

    setIsRunningCode(true);
    setRunOutput(null);
    try {
      const res = await apiService.runAssessmentCode(activeSession.id, {
        question_id: currentQ.id,
        code,
        language: selectedLanguage,
      });
      setRunOutput(res);

      // Extract current topic tag with robust fallback chain
      const currentTopicTag = (currentQ as any)?.topicTag || currentQ?.topic || (currentQ as any)?.category || "Arrays & Hashing";
      const passedCount = (res as any).passedTestCases ?? res.passed_sample_cases ?? 0;
      const totalCount = (res as any).totalTestCases ?? res.total_sample_cases ?? 1;
      const hintsUsed = hintMap[currentQ.id]?.length || 0;
      const passStatus = passedCount === totalCount;

      // Dispatch real-time topic mastery update with difficulty & time factor
      updateTopicMastery(currentTopicTag, passStatus, hintsUsed, currentQ.difficulty || 'Medium', 60);

      // Trigger CAT Adaptive Engine & Spaced Repetition update ONLY if Adaptive Mode is enabled
      if (isAdaptiveModeEnabled) {
        try {
          const adaptEval = await apiService.evaluateAdaptiveSubmission({
            question_id: currentQ.id,
            topic: currentTopicTag,
            difficulty: currentQ.difficulty || selectedLanguage,
            passed_test_cases: passedCount,
            total_test_cases: totalCount,
            hints_used: hintsUsed,
            time_taken_seconds: 60,
          });

          setAdaptiveState({
            current_difficulty: adaptEval.current_difficulty,
            difficulty_transition: adaptEval.difficulty_transition,
            transition_message: adaptEval.transition_message,
            recommended_next_topic: adaptEval.recommended_next_topic,
            attempt_score: adaptEval.attempt_score,
          });

          const revSummary = await apiService.getSpacedRevisionSummary();
          setSpacedRevisionData(revSummary);
        } catch (e) {
          console.warn('Adaptive evaluation failed', e);
        }
      }
    } catch (err: any) {
      setRunOutput({
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: err.response?.data?.detail || 'Failed to execute code in sandbox.',
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // 5b. AI-Powered Complexity Analysis
  const handleAnalyzeComplexity = async () => {
    if (!activeSession) return;
    const currentQ = activeSession.questions[currentQIndex];
    if (!currentQ || currentQ.type !== 'coding') return;
    const code = getQuestionCode(currentQ.id, selectedLanguage, currentQ.code_template);
    if (!code.trim()) return;

    setIsAnalyzingComplexity(true);
    try {
      const res = await apiService.analyzeCodeComplexity(activeSession.id, {
        question_id: currentQ.id,
        code,
        language: selectedLanguage,
      });
      setComplexityMap((prev) => ({ ...prev, [currentQ.id]: res }));
    } catch (err) {
      console.error('Complexity analysis failed', err);
    } finally {
      setIsAnalyzingComplexity(false);
    }
  };

  // 5c. AI-Powered Progressive Hints
  const handleGetHint = async () => {
    if (!activeSession) return;
    const currentQ = activeSession.questions[currentQIndex];
    if (!currentQ) return;

    const existingHints = hintMap[currentQ.id] || [];
    const nextLevel = Math.min(existingHints.length + 1, 3);
    const code = getQuestionCode(currentQ.id, selectedLanguage, currentQ.code_template);

    setIsRequestingHint(true);
    try {
      const res = await apiService.getAssessmentHint(activeSession.id, {
        question_id: currentQ.id,
        code,
        language: selectedLanguage,
        hint_level: nextLevel,
      });
      setHintMap((prev) => ({
        ...prev,
        [currentQ.id]: [...(prev[currentQ.id] || []), res],
      }));
    } catch (err) {
      console.error('Hint request failed', err);
    } finally {
      setIsRequestingHint(false);
    }
  };

  // 6. Submit Assessment
  const handleSubmitAssessment = async () => {
    if (!activeSession) return;
    setLoading(true);
    setErrorMsg(null);

    const answersPayload = activeSession.questions.map((q) => {
      if (q.type === 'aptitude') {
        return {
          question_id: q.id,
          type: 'aptitude',
          selected_option: userAnswers[q.id]?.selected_option || undefined,
        };
      } else {
        return {
          question_id: q.id,
          type: 'coding',
          code: getQuestionCode(q.id, selectedLanguage, q.code_template) || userAnswers[q.id]?.code || '',
          language: selectedLanguage,
        };
      }
    });

    const timeSpent = (activeSession.duration_minutes * 60) - secondsRemaining;

    try {
      const result = await apiService.submitAssessment(activeSession.id, {
        answers: answersPayload,
        time_taken_seconds: Math.max(timeSpent, 10),
      });
      setAssessmentResult(result);

      // Dispatch topic mastery update for all submitted questions
      const resResults = (result as any).results || (result as any).question_results;
      if (resResults && Array.isArray(resResults)) {
        resResults.forEach((qRes: any) => {
          const qDoc = activeSession.questions.find((q) => q.id === qRes.question_id);
          const tag = (qDoc as any)?.topicTag || qDoc?.topic || (qDoc as any)?.category || "Arrays & Hashing";
          const hints = hintMap[qRes.question_id]?.length || 0;
          const qDiff = qDoc?.difficulty || 'Medium';
          const qTime = qRes.executionTime ? parseInt(qRes.executionTime) : 60;
          updateTopicMastery(tag, Boolean(qRes.passed), hints, qDiff, qTime);
        });
      }

      setActiveView('RESULTS');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit assessment. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitAssessment();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper calculation for answered count
  const answeredCount = activeSession
    ? activeSession.questions.filter((q) => {
        if (q.type === 'aptitude') return bool(userAnswers[q.id]?.selected_option);
        return bool(codeDrafts[q.id]?.trim());
      }).length
    : 0;

  function bool(val: any): boolean {
    return Boolean(val);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="AI Placement Assessment"
          subtitle="PrepBot personalized coding and aptitude tests matched to your resume & placement criteria."
          icon={<BrainCircuit className="w-5 h-5 text-white" />}
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Adaptive Learning Mode Toggle Switch */}
          <button
            type="button"
            onClick={() => setIsAdaptiveModeEnabled(!isAdaptiveModeEnabled)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-300 shadow-md ${
              isAdaptiveModeEnabled
                ? 'bg-gradient-to-r from-purple-900/60 to-cyan-900/60 border-purple-500/60 text-purple-200 shadow-purple-500/20'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle CAT Adaptive Difficulty System & Spaced Repetition Engine"
          >
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${isAdaptiveModeEnabled ? 'bg-purple-500' : 'bg-slate-600'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${isAdaptiveModeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="flex items-center gap-1.5 font-mono">
              {isAdaptiveModeEnabled ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span className="text-purple-300 font-bold">⚡ Adaptive Mode Active</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                  <span>📌 Standard Mode</span>
                </>
              )}
            </span>
          </button>

          <Button
            variant={activeView === 'CHAT_SETUP' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('CHAT_SETUP')}
            className="flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            PrepBot Chat
          </Button>

          <Button
            variant={activeView === 'CUSTOM_SETUP' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('CUSTOM_SETUP')}
            className="flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            Custom Test
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsPracticeStudioOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-cyan-500/40 text-cyan-200 hover:text-white hover:bg-cyan-800/40 font-semibold"
          >
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            🎙️ AI Interview Practice Studio
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/student/assessments')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            My Assessments
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: PREPBOT CONVERSATIONAL SETUP                                      */}
      {/* ========================================================================= */}
      {activeView === 'CHAT_SETUP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Chat Window */}
          <Card className="lg:col-span-2 flex flex-col h-[650px] bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                      PrepBot Assistant
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                    <p className="text-slate-400 text-xs">Personalized Placement Assessment & Skill Practice</p>
                  </div>
                </div>

                {resumeSkills.length > 0 ? (
                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs rounded-full font-medium">
                    {resumeSkills.length} Resume Skills Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full font-medium">
                    No Resume Uploaded
                  </span>
                )}
              </div>
            </CardHeader>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                        : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-bl-none shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Action Chips */}
                    {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap gap-2">
                        {msg.suggested_actions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(act)}
                            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            {act.label}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatSending && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                    <span>PrepBot is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="e.g. Test my DSA skills, Give me an aptitude test, Practice my weak areas..."
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!inputQuery.trim() || isChatSending}
                  className="px-4 py-2.5 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </form>
            </div>
          </Card>

          {/* Right Col: Quick Launch & Detected Skills Widget */}
          <div className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Detected Resume Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resumeSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resumeSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-slate-400 text-xs">
                      Upload your resume to enable personalized coding questions tailored to your exact tech stack.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/student/resume')}
                      className="w-full"
                    >
                      Upload Resume in Analyzer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  1-Click Assessment Drills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => startAssessment({ type: 'COMBINED', question_count: 10, duration_minutes: 30 })}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-white text-sm font-medium">Standard Placement Test</h4>
                    <p className="text-slate-400 text-xs">5 Coding + 5 Aptitude • 30 Mins</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                </button>

                <button
                  onClick={() => startAssessment({ type: 'CODING', question_count: 5, duration_minutes: 25 })}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-white text-sm font-medium">Core DSA Sprint</h4>
                    <p className="text-slate-400 text-xs">5 Coding Problems • 25 Mins</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                </button>

                <button
                  onClick={() => startAssessment({ type: 'APTITUDE', question_count: 10, duration_minutes: 15 })}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-white text-sm font-medium">Speed Aptitude Round</h4>
                    <p className="text-slate-400 text-xs">10 MCQs • 15 Mins</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Full-width Weak Topics & Spaced Revision Dashboard Widget */}
          <Card className="lg:col-span-3 bg-slate-900/90 border-slate-800 shadow-xl">
            <CardHeader className="border-b border-slate-800/80 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <div>
                  <CardTitle className="text-white text-sm font-semibold">Weak Topics & Spaced Revision Engine</CardTitle>
                  <div className="text-slate-400 text-xs">SM-2 Spaced Repetition Queue & Topic Mastery Index</div>
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const weakTopic = spacedRevisionData?.recommended_next_topic || 'Binary Search';
                  startAssessment({
                    type: 'CODING',
                    topics: [weakTopic],
                    difficulty: spacedRevisionData?.active_difficulty || 'Medium',
                    question_count: 5,
                    duration_minutes: 20
                  });
                }}
                className="bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 py-1 px-3"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                Re-test Weak Topic ({spacedRevisionData?.recommended_next_topic || 'Binary Search'})
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Due Revisions Banner */}
              {spacedRevisionData?.due_reviews && spacedRevisionData.due_reviews.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span><strong>{spacedRevisionData.due_reviews.length} Revision Items Due Today</strong> (SM-2 Spaced Repetition Queue)</span>
                  </div>
                  <span className="font-mono text-[11px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
                    Due Now
                  </span>
                </div>
              )}

              {/* Topic Mastery Progress Bars */}
              <div className="space-y-3">
                <h5 className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Topic Mastery Index Breakdown
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(userTopicMastery).map(([topicName, metrics]) => {
                    const rawMastery = metrics.mastery || 0;
                    const decayedMastery = calculateDecayedMastery(rawMastery, metrics.lastReviewed, metrics.attempts);
                    const percentage = metrics.attempts === 0 ? 0 : decayedMastery;
                    const status = metrics.attempts === 0
                      ? 'Unattempted'
                      : (percentage >= 80 ? 'Strong' : percentage >= 50 ? 'Moderate' : 'Needs Practice');
                    const relativeTime = getRelativeTimeText(metrics.lastReviewed);

                    return (
                      <div
                        key={topicName}
                        onClick={() => {
                          setSelectedTopics([topicName]);
                          startAssessment({ topics: [topicName], difficulty: 'Medium', type: 'CODING', question_count: 5 });
                        }}
                        className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-3.5 space-y-2.5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group relative"
                        title={`Click to start a focused practice test on ${topicName}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate max-w-[130px]" title={topicName}>
                            {topicName}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            status === 'Unattempted'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : status === 'Strong'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : status === 'Moderate'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {status === 'Unattempted' ? '📌 Unattempted' : status === 'Strong' ? '✅ Strong' : status === 'Moderate' ? '⚡ Moderate' : '⚠️ Needs Practice'} ({percentage}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentage >= 80
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : percentage >= 50
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                : percentage > 0
                                ? 'bg-gradient-to-r from-amber-500 to-red-400'
                                : 'bg-slate-800'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Metadata Row 1: Solved Breakdown by Difficulty */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-semibold">E:{metrics.easy || 0}</span>
                            <span className="text-cyan-400 font-semibold">M:{metrics.medium || 0}</span>
                            <span className="text-red-400 font-semibold">H:{metrics.hard || 0}</span>
                          </span>
                          <span>Clean: {metrics.clean || 0}/{metrics.attempts || 0}</span>
                        </div>

                        {/* Metadata Row 2: Relative Last Practiced & Quick Action */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-1.5 font-sans">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {relativeTime}
                          </span>
                          <span className="text-cyan-400 group-hover:underline font-semibold flex items-center gap-0.5 text-[10px]">
                            Practice <Play className="w-2.5 h-2.5 fill-cyan-400" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CUSTOM TEST CONFIGURATOR                                          */}
      {/* ========================================================================= */}
      {activeView === 'CUSTOM_SETUP' && (
        <Card className="bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Configure Custom Placement Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Assessment Type */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Assessment Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'COMBINED', label: 'Coding + Aptitude', desc: 'Comprehensive placement test' },
                  { key: 'CODING', label: 'Coding Only', desc: 'Data structures & algorithms' },
                  { key: 'APTITUDE', label: 'Aptitude Only', desc: 'Quant, logical & reasoning' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTestType(t.key as any)}
                    className={`p-4 rounded-xl text-left border transition ${
                      testType === t.key
                        ? 'bg-cyan-500/20 border-cyan-500/80 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-slate-400 text-xs mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Difficulty */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Difficulty Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Easy', 'Medium', 'Hard', 'Adaptive'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-3 px-4 rounded-xl text-center border font-medium text-sm transition ${
                      difficulty === diff
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Question Count & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Question Count</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
                        questionCount === cnt
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>

            {/* 3. Timer Control Bar System */}
            <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-white text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Assessment Timer System Mode
                </label>

                {/* Mode Selector Buttons */}
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTimerMode('AUTO')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition ${
                      timerMode === 'AUTO'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🤖 Auto (Bot Assigned)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerMode('CUSTOM')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition ${
                      timerMode === 'CUSTOM'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚙️ Custom Mode
                  </button>
                </div>
              </div>

              {/* Mode 1: Auto (Bot Assigned) Details */}
              {timerMode === 'AUTO' && (
                <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3 text-xs text-purple-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span><strong>Auto Difficulty Timer:</strong> EASY = 15m | MEDIUM = 25m | HARD = 40m</span>
                  </div>
                  <span className="font-mono text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                    Assigned: {getAutoTimerDurationMinutes(difficulty)} Mins ({difficulty})
                  </span>
                </div>
              )}

              {/* Mode 2: Custom Controls & Practice Mode */}
              {timerMode === 'CUSTOM' && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '10m', val: 10 },
                      { label: '20m', val: 20 },
                      { label: '30m', val: 30 },
                      { label: '60m', val: 60 },
                      { label: '♾️ Practice Mode (No Limit)', val: 'PRACTICE' as const },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setCustomTimerPreset(item.val);
                          setCustomMinutesInput('');
                        }}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                          customTimerPreset === item.val && !customMinutesInput
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Direct Minute Input Box */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs text-slate-400 font-medium">Custom Minutes Input:</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      placeholder="e.g. 45"
                      value={customMinutesInput}
                      onChange={(e) => {
                        setCustomMinutesInput(e.target.value);
                      }}
                      className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs w-32 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    {customMinutesInput && !isNaN(parseInt(customMinutesInput)) && (
                      <span className="text-xs text-cyan-400 font-mono">Custom Duration: {customMinutesInput} mins</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setActiveView('CHAT_SETUP')}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => startAssessment()}
                disabled={loading}
                className="flex items-center gap-2 px-6"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Generate & Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: LIVE TEST RUNNER VIEW                                             */}
      {/* ========================================================================= */}
      {activeView === 'TEST_RUNNER' && activeSession && (
        <div className="space-y-4">
          {/* Header Banner (Conditional: Adaptive Mode vs Standard Mode) */}
          {isAdaptiveModeEnabled ? (
            <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-400">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      ⚡ CAT Adaptive Mode Active
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      (adaptiveState?.current_difficulty || difficulty || 'MEDIUM').toUpperCase() === 'HARD'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : (adaptiveState?.current_difficulty || difficulty || 'MEDIUM').toUpperCase() === 'EASY'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      Target Level: {(adaptiveState?.current_difficulty || difficulty || 'MEDIUM').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {adaptiveState?.transition_message || `Adapting difficulty dynamically based on candidate performance.`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                <Compass className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-slate-400 font-medium">Recommended Focus: </span>
                  <span className="text-purple-300 font-semibold font-mono">
                    {adaptiveState?.recommended_next_topic || spacedRevisionData?.recommended_next_topic || 'Binary Search'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span><strong>📌 Standard Mode:</strong> Questions are served in manual/linear order. Submissions run test cases without altering upcoming difficulty.</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Adaptive Engine Standby</span>
            </div>
          )}

          {/* Header Bar */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-20 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                Q{currentQIndex + 1}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {activeSession.questions[currentQIndex]?.topic || 'Placement Assessment'}
                </h3>
                <p className="text-slate-400 text-xs">
                  Question {currentQIndex + 1} of {activeSession.questions.length} • {answeredCount} Answered
                </p>
              </div>
            </div>

            {/* Timer & Submit */}
            <div className="flex items-center gap-4">
              {timerMode === 'CUSTOM' && customTimerPreset === 'PRACTICE' ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm bg-purple-950/60 border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10" title="Practice Mode: Unlimited Time Stopwatch">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span>♾️ Practice Mode:</span>
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm border shadow-lg transition-colors ${
                    secondsRemaining < 300
                      ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse shadow-red-500/20'
                      : 'bg-slate-800/90 border-slate-700 text-cyan-400 shadow-cyan-500/10'
                  }`}
                  title={secondsRemaining < 300 ? "Warning: Less than 5 minutes remaining!" : "Time Remaining"}
                >
                  <Clock className={`w-4 h-4 ${secondsRemaining < 300 ? 'text-red-400' : 'text-cyan-400'}`} />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSubmitAssessment}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                Submit Assessment
              </Button>
            </div>
          </div>

          {/* Question Palette Strip */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2 overflow-x-auto">
            {activeSession.questions.map((q, idx) => {
              const isAnswered = q.type === 'aptitude' ? bool(userAnswers[q.id]?.selected_option) : bool(codeDrafts[q.id]?.trim());
              const isMarked = markedForReview[q.id];
              const isCurrent = idx === currentQIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentQIndex(idx);
                    setRunOutput(null);
                  }}
                  className={`w-9 h-9 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition border ${
                    isCurrent
                      ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 scale-105'
                      : isMarked
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                      : isAnswered
                      ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question View */}
          {activeSession.questions[currentQIndex]?.type === 'coding' ? (
            /* CODING SPLIT VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Problem Statement */}
              <Card className="bg-slate-900/80 border-slate-800 h-[620px] flex flex-col">
                <CardHeader className="border-b border-slate-800/80 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-cyan-400" />
                      {activeSession.questions[currentQIndex]?.question}
                    </CardTitle>
                    <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-md">
                      {activeSession.questions[currentQIndex]?.difficulty}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 text-slate-300 text-sm">
                  <div className="whitespace-pre-line leading-relaxed">
                    {activeSession.questions[currentQIndex]?.description}
                  </div>

                  {activeSession.questions[currentQIndex]?.input_format && (
                    <div>
                      <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-1">Input Format</h5>
                      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono">
                        {activeSession.questions[currentQIndex]?.input_format}
                      </div>
                    </div>
                  )}

                  {activeSession.questions[currentQIndex]?.output_format && (
                    <div>
                      <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-1">Output Format</h5>
                      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono">
                        {activeSession.questions[currentQIndex]?.output_format}
                      </div>
                    </div>
                  )}

                  {activeSession.questions[currentQIndex]?.sample_test_cases && (
                    <div className="space-y-2">
                      <h5 className="text-white text-xs font-semibold uppercase tracking-wider">Sample Examples</h5>
                      {activeSession.questions[currentQIndex]?.sample_test_cases?.map((tc, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
                          <div>
                            <span className="text-slate-500">Input:</span> <span className="text-slate-200">{tc.input}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Expected Output:</span> <span className="text-emerald-400">{tc.expected_output}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progressive AI Hints Display */}
                  {hintMap[activeSession.questions[currentQIndex]?.id] && hintMap[activeSession.questions[currentQIndex]?.id].length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <h5 className="text-purple-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Progressive AI Hints
                        </h5>
                        <span className="text-[11px] text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          Used {hintMap[activeSession.questions[currentQIndex]?.id].length}/3
                        </span>
                      </div>
                      {hintMap[activeSession.questions[currentQIndex]?.id].map((h, hIdx) => (
                        <div key={hIdx} className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3 space-y-1.5 text-xs text-purple-200 shadow-inner">
                          <div className="font-semibold text-purple-300 flex items-center gap-1.5 text-[12px]">
                            {h.title}
                          </div>
                          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                            {h.hint_text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Code Editor + Runner */}
              <Card className="bg-slate-950 border-slate-800 h-[620px] flex flex-col">
                <CardHeader className="border-b border-slate-800/80 p-3 bg-slate-900/60 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCode2 className="w-4 h-4 text-cyan-400" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="python">Python 3</option>
                      <option value="javascript">JavaScript (Node.js)</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++ (GCC)</option>
                      <option value="c">C (GCC)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleGetHint}
                      disabled={isRequestingHint || (hintMap[activeSession.questions[currentQIndex]?.id]?.length || 0) >= 3}
                      className="flex items-center gap-1.5 text-xs py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
                    >
                      {isRequestingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                      Get Hint ({hintMap[activeSession.questions[currentQIndex]?.id]?.length || 0}/3)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleRunCode}
                      disabled={isRunningCode}
                      className="flex items-center gap-1.5 text-xs py-1"
                    >
                      {isRunningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Run Code
                    </Button>
                  </div>
                </CardHeader>

                {/* Monaco Editor Container */}
                <div className="flex-1 overflow-hidden bg-slate-950 border-b border-slate-800/80">
                  <Editor
                    height="100%"
                    language={selectedLanguage === 'cpp' || selectedLanguage === 'c' ? 'cpp' : selectedLanguage === 'javascript' ? 'javascript' : selectedLanguage === 'java' ? 'java' : 'python'}
                    theme="vs-dark"
                    value={getQuestionCode(
                      activeSession.questions[currentQIndex]?.id || '',
                      selectedLanguage,
                      activeSession.questions[currentQIndex]?.code_template
                    )}
                    onChange={(val) => {
                      const qid = activeSession.questions[currentQIndex]?.id;
                      if (qid) {
                        const key = `${qid}_${selectedLanguage}`;
                        setCodeDrafts((prev) => ({ ...prev, [key]: val || '', [qid]: val || '' }));
                      }
                    }}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                      insertSpaces: true,
                      bracketPairColorization: { enabled: true },
                      autoIndent: 'full',
                      lineNumbers: 'on',
                    }}
                  />
                </div>

                {/* LeetCode Standard Output Console Strip */}
                <div className="h-56 border-t border-slate-800/80 bg-slate-950 rounded-b-xl p-3 flex flex-col font-mono text-xs overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Output Console
                      </span>
                      {runOutput && (
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                            runOutput.status === 'ACCEPTED' || runOutput.status === 'PASSED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {runOutput.status === 'ACCEPTED' || runOutput.status === 'PASSED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          {runOutput.status === 'ACCEPTED' ? 'Accepted' : runOutput.status === 'WRONG_ANSWER' ? 'Wrong Answer' : runOutput.status === 'TIME_LIMIT_EXCEEDED' ? 'Time Limit Exceeded' : runOutput.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAnalyzeComplexity}
                        disabled={isAnalyzingComplexity}
                        className="text-[11px] py-0.5 px-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"
                      >
                        {isAnalyzingComplexity ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : <BrainCircuit className="w-3 h-3 text-cyan-400" />}
                        Analyze Complexity
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {runOutput ? (
                      <>
                        {/* LeetCode Standard Performance Summary Bar */}
                        <div className="flex items-center gap-4 text-xs font-sans text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-500 font-semibold">Testcases Passed: </span>
                            <span className="font-bold font-mono text-emerald-400">
                              {runOutput.passedTestCases ?? runOutput.passed_sample_cases ?? 0} / {runOutput.totalTestCases ?? runOutput.total_sample_cases ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Runtime: </span>
                            <span className="font-mono text-slate-200">{runOutput.executionTime || `${(runOutput as any).execution_time_ms || 0}ms`}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Memory: </span>
                            <span className="font-mono text-slate-200">{runOutput.memory || '34.2 MB'}</span>
                          </div>
                        </div>

                        {/* Compile / Runtime Error Stack trace if any */}
                        {runOutput.stderr && (
                          <div className="bg-red-950/40 border border-red-800/40 text-red-300 p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap">
                            <span className="font-bold text-red-400 block mb-1">Runtime / Compile Error:</span>
                            {runOutput.stderr}
                          </div>
                        )}

                        {/* LeetCode Interactive Test Case Tabs */}
                        {((runOutput.testResults || runOutput.test_results)?.length ?? 0) > 0 && (
                          <div className="space-y-2 pt-1 font-sans">
                            {/* Tabs Bar */}
                            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-1">
                              {(runOutput.testResults || runOutput.test_results || []).map((tr: any, idx: number) => {
                                const isPassed = tr.passed;
                                const tcId = tr.testCaseId || tr.test_case || (idx + 1);
                                const isActive = activeTestTab === idx;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setActiveTestTab(idx)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                                      isActive
                                        ? 'bg-slate-800 text-white border border-slate-700 font-bold shadow'
                                        : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60'
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                    Case {tcId}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Active Test Case Detail Panel */}
                            {(() => {
                              const list = runOutput.testResults || runOutput.test_results || [];
                              const currTc = list[activeTestTab] || list[0];
                              if (!currTc) return null;

                              return (
                                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs font-mono">
                                  {currTc.error && !currTc.passed && (
                                    <div className="text-red-400 font-bold text-xs bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                                      Status: {currTc.error}
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-slate-400 block font-semibold mb-1 font-sans">Input:</span>
                                    <div className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded whitespace-pre-wrap">
                                      {currTc.input}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="text-slate-400 block font-semibold mb-1 font-sans">Actual Output:</span>
                                      <div className={`border p-2 rounded whitespace-pre-wrap ${currTc.passed ? 'bg-slate-950 text-emerald-400 border-slate-800' : 'bg-red-950/20 text-red-400 border-red-500/30'}`}>
                                        {currTc.actualOutput || currTc.actual || '(empty)'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-semibold mb-1 font-sans">Expected Output:</span>
                                      <div className="bg-slate-950 border border-slate-800 text-emerald-400 p-2 rounded whitespace-pre-wrap">
                                        {currTc.expectedOutput || currTc.expected || '(empty)'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-500 italic p-2">Click "Run Code" to test your solution against sample test cases...</div>
                    )}

                    {/* Complexity Analysis Card */}
                    {complexityMap[activeSession.questions[currentQIndex]?.id] && (
                      <div className="mt-2 bg-slate-950 border border-cyan-500/30 rounded-lg p-2.5 text-xs text-slate-200 font-sans space-y-1.5">
                        <div className="flex items-center justify-between font-semibold text-cyan-300 border-b border-cyan-500/20 pb-1">
                          <span className="flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5 text-cyan-400" /> AI Complexity Breakdown</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                          <div><span className="text-cyan-400 font-bold">Time Complexity:</span> {complexityMap[activeSession.questions[currentQIndex]?.id].complexity_time}</div>
                          <div><span className="text-cyan-400 font-bold">Space Complexity:</span> {complexityMap[activeSession.questions[currentQIndex]?.id].complexity_space}</div>
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          <span className="text-amber-400 font-semibold">💡 Optimization Tip:</span> {complexityMap[activeSession.questions[currentQIndex]?.id].optimization_tip}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* APTITUDE MCQ VIEW */
            <Card className="bg-slate-900/80 border-slate-800 max-w-3xl mx-auto">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs rounded-full font-medium">
                    {activeSession.questions[currentQIndex]?.topic}
                  </span>
                  <span className="text-slate-400 text-xs">Points: {activeSession.questions[currentQIndex]?.points || 10}</span>
                </div>
                <CardTitle className="text-white text-base mt-3 leading-relaxed">
                  {activeSession.questions[currentQIndex]?.question}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  {activeSession.questions[currentQIndex]?.options?.map((opt, i) => {
                    const qid = activeSession.questions[currentQIndex]?.id;
                    const isSelected = userAnswers[qid]?.selected_option === opt;

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setUserAnswers((prev) => ({
                            ...prev,
                            [qid]: { ...prev[qid], selected_option: opt },
                          }));
                        }}
                        className={`w-full p-4 rounded-xl text-left border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                                : 'border-slate-600 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm font-medium">{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const qid = activeSession.questions[currentQIndex]?.id;
                      setMarkedForReview((prev) => ({ ...prev, [qid]: !prev[qid] }));
                    }}
                    className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <Bookmark className="w-4 h-4" />
                    {markedForReview[activeSession.questions[currentQIndex]?.id] ? 'Unmark Review' : 'Mark for Review'}
                  </button>

                  <button
                    onClick={() => {
                      const qid = activeSession.questions[currentQIndex]?.id;
                      setUserAnswers((prev) => {
                        const copy = { ...prev };
                        delete copy[qid];
                        return copy;
                      });
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear Selection
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom Prev / Next Nav Bar */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              disabled={currentQIndex === 0}
              onClick={() => {
                setCurrentQIndex((prev) => Math.max(0, prev - 1));
                setRunOutput(null);
              }}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Question
            </Button>

            <Button
              variant="secondary"
              disabled={currentQIndex === activeSession.questions.length - 1}
              onClick={() => {
                setCurrentQIndex((prev) => Math.min(activeSession.questions.length - 1, prev + 1));
                setRunOutput(null);
              }}
              className="flex items-center gap-1.5"
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: ASSESSMENT RESULTS & PERFORMANCE ANALYTICS                        */}
      {/* ========================================================================= */}
      {activeView === 'RESULTS' && assessmentResult && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <Card className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/80 border-slate-800">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Circular Score Gauge */}
                  <div className="w-24 h-24 rounded-full border-4 border-cyan-500 bg-slate-950 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20">
                    <span className="text-2xl font-bold text-white font-mono">{assessmentResult.percentage}%</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Overall</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">Assessment Evaluated</h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          assessmentResult.passed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {assessmentResult.passed ? 'PASSED' : 'PRACTICE NEEDED'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      Authoritative evaluation stored in MongoDB • Updated Placement Readiness
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center min-w-[110px]">
                    <div className="text-xs text-slate-400 font-medium">Coding Score</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{assessmentResult.coding_score}%</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center min-w-[110px]">
                    <div className="text-xs text-slate-400 font-medium">Aptitude Score</div>
                    <div className="text-xl font-bold text-purple-400 mt-1 font-mono">{assessmentResult.aptitude_score}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topic Performance & Strengths/Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topic Performance */}
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Topic-Wise Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessmentResult.topic_performance.map((tp, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-200">{tp.topic}</span>
                      <span className="text-cyan-400 font-mono">{tp.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          tp.percentage >= 75
                            ? 'bg-emerald-500'
                            : tp.percentage >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${tp.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommendations & Next Steps */}
            <Card className="bg-slate-900/60 border-slate-800 flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Preparation Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-300">
                  {assessmentResult.weaknesses.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                        Weak Areas Identified
                      </div>
                      <p className="text-xs text-slate-200">
                        {assessmentResult.weaknesses.join(', ')}
                      </p>
                    </div>
                  )}

                  <ul className="space-y-2 text-xs">
                    {assessmentResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    setActiveView('CHAT_SETUP');
                    handleSendMessage('Give me a focused test on my weak areas');
                  }}
                  className="flex-1"
                >
                  Practice Weak Areas Now
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/student/assessments')}
                >
                  My Assessments
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Time Limit Exceeded Alert Modal */}
      {isTimeUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl shadow-red-500/10 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white text-lg font-bold">⏰ Time Limit Exceeded!</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Your assessment time limit has reached 00:00. Your completed answers will now be evaluated.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setIsTimeUpModalOpen(false);
                handleSubmitAssessment();
              }}
              className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold py-2.5"
            >
              🚀 Submit Assessment Answers Now
            </Button>
          </div>
        </div>
      )}
      {/* Unified AI Interview Practice Studio Modal */}
      <AIInterviewPracticeStudioModal
        isOpen={isPracticeStudioOpen}
        onClose={() => setIsPracticeStudioOpen(false)}
      />
    </div>
  );
};
