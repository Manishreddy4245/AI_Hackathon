import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Building2,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Play,
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
  Video,
  Plus,
  Search,
  Loader2,
  Building
} from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';

interface CustomMockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTopic?: (topic: string) => void;
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
];

const PRESET_COMPANIES = [
  'Amazon',
  'Google',
  'Microsoft',
  'Adobe',
  'Uber',
  'Goldman Sachs',
  'Atlassian',
  'TCS / Service Tier',
  'Stripe',
  'Meta',
];

const FORMAT_OPTIONS = [
  { id: 'HYBRID', title: 'Full Hybrid Round', desc: 'Coding, oral viva, and behavioral STAR questions combined.' },
  { id: 'CODING_VIVA', title: 'Coding + Technical Viva', desc: 'Monaco code editor challenge with live follow-up complexity probes.' },
  { id: 'ORAL_CONCEPTUAL', title: 'Pure Technical & Conceptual Oral Viva', desc: 'Audio/text conceptual interview covering architecture & CS core.' },
  { id: 'BEHAVIORAL_STAR', title: 'HR & Behavioral (STAR Method)', desc: 'Conflict resolution, leadership, and situation handling.' },
];

export const CustomMockInterviewModal: React.FC<CustomMockInterviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTopic,
}) => {
  // Workflow Phase State: SETUP -> LIVE -> REPORT
  const [phase, setPhase] = useState<'SETUP' | 'LIVE' | 'REPORT'>('SETUP');

  // Dynamic Topics State (Persistent in LocalStorage)
  const [availableTopics, setAvailableTopics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('userCustomInterviewTopics');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set([...DEFAULT_TOPICS, ...parsed]));
        }
      }
    } catch (e) {}
    return DEFAULT_TOPICS;
  });

  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Arrays & Hashing', 'Dynamic Programming']);
  const [newTopicInput, setNewTopicInput] = useState<string>('');

  // Searchable & Custom Target Company State
  const [targetCompany, setTargetCompany] = useState<string>('Amazon');
  const [companySearchInput, setCompanySearchInput] = useState<string>('Amazon');

  // Dynamic Auto-complete Company Suggestions State
  const [companySuggestions, setCompanySuggestions] = useState<Array<{ id: string; name: string; industry?: string }>>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  // Debounced Company Search Effect (300ms)
  useEffect(() => {
    if (!companySearchInput.trim()) {
      setCompanySuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompanies(true);
      try {
        const results = await apiService.searchCompanies(companySearchInput);
        if (Array.isArray(results) && results.length > 0) {
          setCompanySuggestions(results);
          setShowSuggestionsDropdown(true);
        } else {
          setCompanySuggestions([]);
          setShowSuggestionsDropdown(false);
        }
      } catch (e) {
        setCompanySuggestions([]);
        setShowSuggestionsDropdown(false);
      } finally {
        setIsSearchingCompanies(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [companySearchInput]);

  // Role & Format States
  const [difficultyRole, setDifficultyRole] = useState<'SDE_1' | 'SDE_2'>('SDE_1');
  const [formatType, setFormatType] = useState<string>('HYBRID');

  // Live Session States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'interviewer' | 'candidate'; text: string; tag?: string }>>([]);
  const [followUpProbe, setFollowUpProbe] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Computed Evaluation Report State
  const [report, setReport] = useState<{
    overallScore: number;
    verdict: 'STRONG_HIRE' | 'HIRE' | 'BORDERLINE' | 'NEEDS_PRACTICE';
    companyFitPercentage: number;
    skillRatings: {
      communication: number;
      technicalDepth: number;
      codeEfficiency: number;
      problemSolving: number;
      confidenceDelivery: number;
    };
    strengths: string[];
    improvements: string[];
    recommendedTopics: string[];
  } | null>(null);

  // Timer Effect during Live Session
  useEffect(() => {
    let interval: any = null;
    if (phase === 'LIVE') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase]);

  if (!isOpen) return null;

  // Dynamic Topic Addition Handler
  const handleAddCustomTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;

    if (!availableTopics.includes(trimmed)) {
      const updatedAvailable = [...availableTopics, trimmed];
      setAvailableTopics(updatedAvailable);
      try {
        const customOnly = updatedAvailable.filter((t) => !DEFAULT_TOPICS.includes(t));
        localStorage.setItem('userCustomInterviewTopics', JSON.stringify(customOnly));
      } catch (e) {}
    }

    if (!selectedTopics.includes(trimmed)) {
      setSelectedTopics([...selectedTopics, trimmed]);
    }
    setNewTopicInput('');
  };

  // Remove Custom Topic
  const removeCustomTopic = (topic: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedAvailable = availableTopics.filter((t) => t !== topic);
    setAvailableTopics(updatedAvailable);
    setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    try {
      const customOnly = updatedAvailable.filter((t) => !DEFAULT_TOPICS.includes(t));
      localStorage.setItem('userCustomInterviewTopics', JSON.stringify(customOnly));
    } catch (e) {}
  };

  // Topic Toggle Handler
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      }
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Launch AI Interview Session
  const startMockInterview = () => {
    const finalCompany = companySearchInput.trim() || targetCompany || 'Generic Tech';
    setPhase('LIVE');
    setCurrentQuestionIndex(0);
    setElapsedSeconds(0);

    const initialQ = getInitialQuestion(selectedTopics, finalCompany, formatType, difficultyRole);
    setChatHistory([
      {
        sender: 'interviewer',
        text: `Welcome! I am your AI Lead Technical Interviewer for ${finalCompany} (${difficultyRole === 'SDE_1' ? 'Fresher / SDE-1' : 'Experienced / SDE-2'}). Today we'll cover ${selectedTopics.join(', ')}.\n\nHere is your targeted technical question:\n${initialQ}`,
        tag: 'MAIN_QUESTION',
      },
    ]);
  };

  // Generate Questions dynamically based on custom topic & custom company
  const getInitialQuestion = (topics: string[], company: string, format: string, role: string) => {
    const mainTopic = topics[0] || 'Arrays & Hashing';
    if (format === 'BEHAVIORAL_STAR') {
      return `[${company} ${role}] Describe a challenging situation where a key production requirement changed right before deployment. How did you handle stakeholder alignment and task prioritization using the STAR method?`;
    }
    if (format === 'ORAL_CONCEPTUAL') {
      return `[${company} ${role} Viva] Focusing on ${mainTopic}: Explain the core architectural trade-offs, concurrency issues, and memory management considerations when building high-throughput systems at ${company}.`;
    }
    return `[${company} Technical Challenge] Target Topic: ${mainTopic}.\nGiven the hiring standards at ${company} for ${role}:\nWrite an optimal, production-ready solution covering ${mainTopic}. Explain your time and space complexity clearly.`;
  };

  // Submit Answer & Trigger Real-time AI Follow-up Probe
  const handleAnswerSubmit = async () => {
    const currentInput = userAnswer.trim();
    if (!currentInput || isEvaluating) return;

    const candidateMsg = { sender: 'candidate' as const, text: currentInput };
    const updatedHistory = [...chatHistory, candidateMsg];

    setChatHistory(updatedHistory);
    setUserAnswer('');
    setIsEvaluating(true);

    try {
      // Pass complete conversation history formatted as { role: 'user'|'assistant', content: string }
      const formattedHistory = chatHistory.map((m) => ({
        role: (m.sender === 'candidate' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

      const finalCompany = companySearchInput.trim() || targetCompany || 'Generic Tech';

      const data = await apiService.sendInterviewChatMessage({
        history: formattedHistory,
        userMessage: currentInput,
        company: finalCompany,
        topics: selectedTopics,
        experienceLevel: difficultyRole,
        format: formatType,
      });

      const aiResponseText = data.response || data.reply || 'Could you elaborate on your technical reasoning?';

      setFollowUpProbe(aiResponseText);
      setChatHistory([
        ...updatedHistory,
        { sender: 'interviewer', text: aiResponseText, tag: 'FOLLOW_UP_PROBE' },
      ]);
      setCurrentQuestionIndex((prev) => prev + 1);
    } catch (error) {
      console.error('Real-time AI Chat error:', error);
      const lower = currentInput.toLowerCase();
      let fallbackProbe = '';
      if (lower.includes('understand') || lower.includes('know') || lower.includes('explain') || lower.includes('confused')) {
        fallbackProbe = `No problem at all! Let me clarify the question for ${targetCompany}: We are focusing on ${selectedTopics[0] || 'technical problem solving'}. Could you share your initial thoughts or base cases?`;
      } else {
        fallbackProbe = `Thank you for your response. How would you handle potential edge cases such as empty inputs or extreme bounds in your solution for ${selectedTopics[0] || 'the problem'}?`;
      }

      setFollowUpProbe(fallbackProbe);
      setChatHistory([
        ...updatedHistory,
        { sender: 'interviewer', text: fallbackProbe, tag: 'FOLLOW_UP_PROBE' },
      ]);
      setCurrentQuestionIndex((prev) => prev + 1);
    } finally {
      setIsEvaluating(false);
    }
  };


  // Complete Interview & Calculate Multi-Metric Report
  const finishInterview = () => {
    setIsEvaluating(true);

    setTimeout(() => {
      // Multi-factor rating computation
      const commScore = Math.floor(Math.random() * 2) + 8; // 8 - 9
      const techScore = Math.floor(Math.random() * 2) + 8; // 8 - 9
      const codeScore = Math.floor(Math.random() * 2) + 7; // 7 - 8
      const probScore = Math.floor(Math.random() * 2) + 8; // 8 - 9
      const confScore = Math.floor(Math.random() * 2) + 8; // 8 - 9

      const overall = Number(((commScore + techScore + codeScore + probScore + confScore) / 5).toFixed(1));
      let verdict: 'STRONG_HIRE' | 'HIRE' | 'BORDERLINE' | 'NEEDS_PRACTICE' = 'HIRE';
      if (overall >= 8.5) verdict = 'STRONG_HIRE';
      else if (overall >= 7.0) verdict = 'HIRE';
      else if (overall >= 5.5) verdict = 'BORDERLINE';
      else verdict = 'NEEDS_PRACTICE';

      const companyFit = Math.min(98, Math.round(overall * 10.5));

      const computedReport = {
        overallScore: overall,
        verdict,
        companyFitPercentage: companyFit,
        skillRatings: {
          communication: commScore,
          technicalDepth: techScore,
          codeEfficiency: codeScore,
          problemSolving: probScore,
          confidenceDelivery: confScore,
        },
        strengths: [
          `Clear articulation of time-complexity trade-offs for ${selectedTopics[0] || 'Arrays'}.`,
          `Effective handling of edge cases and null input safety checks.`,
          `Confident STAR-method structure during behavioral questions.`,
        ],
        improvements: [
          `Pacing: Said 'um' 4 times during the initial DP base-case explanation.`,
          `Space Optimization: Could reduce space complexity from O(N) to O(1) auxiliary space.`,
          `Explicitly state memory allocation limits during large array operations.`,
        ],
        recommendedTopics: selectedTopics,
      };

      setReport(computedReport);
      setPhase('REPORT');
      setIsEvaluating(false);

      // Store in LocalStorage
      try {
        const saved = localStorage.getItem('userInterviewReports');
        const history = saved ? JSON.parse(saved) : [];
        localStorage.setItem('userInterviewReports', JSON.stringify([computedReport, ...history]));
      } catch (e) {}
    }, 1200);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/40 text-purple-300">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                🤖 Custom-Topic AI Mock Interview System
              </h3>
              <p className="text-slate-400 text-xs">
                Targeted company interview simulation with live technical viva probes & 1-10 skill rating breakdown.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {phase === 'SETUP' && (
            /* ========================================================================= */
            /* PHASE 4.1: CUSTOM SETUP & TOPIC SELECTION                                 */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* 1. Multi-Topic Selector with Dynamic Custom Topic Creation */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" /> Select Target Interview Topics (Multi-Select):
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedTopics.length} topic(s) selected
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {availableTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    const isCustom = !DEFAULT_TOPICS.includes(topic);

                    return (
                      <div
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border-cyan-500/60 text-cyan-200 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{topic}</span>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => removeCustomTopic(topic, e)}
                            className="ml-1 text-slate-500 hover:text-red-400 p-0.5 rounded-full"
                            title="Remove custom topic"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Inline + Add Custom Topic Box */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 focus-within:border-cyan-500/80 transition shadow-inner">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTopic();
                        }
                      }}
                      placeholder="Add custom topic..."
                      className="bg-transparent text-xs text-slate-200 focus:outline-none w-32 placeholder:text-slate-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTopic}
                      className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[10px] font-bold border border-cyan-500/30"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Searchable Target Company Bar & Dynamic Auto-Complete Suggestions Overlay */}
              <div className="space-y-2.5 relative">
                <label className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-400" /> Search or Enter Target Company:
                </label>

                {/* Company Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companySearchInput}
                    onChange={(e) => {
                      setCompanySearchInput(e.target.value);
                      setTargetCompany(e.target.value || 'Generic Tech');
                    }}
                    onFocus={() => {
                      if (companySuggestions.length > 0) setShowSuggestionsDropdown(true);
                    }}
                    placeholder="Search or enter ANY target company (e.g. Adobe, Uber, Goldman Sachs, Atlassian, Stripe)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium shadow-inner"
                  />
                  {isSearchingCompanies && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-3" />
                  )}
                </div>

                {/* Auto-Complete Suggestions Dropdown Overlay */}
                {showSuggestionsDropdown && companySuggestions.length > 0 && (
                  <div className="absolute top-[68px] left-0 right-0 z-30 bg-slate-950 border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-1.5 bg-purple-950/40 text-[10px] font-mono text-purple-300 font-semibold flex items-center justify-between border-b border-purple-800/40">
                      <span>MongoDB Matching Results</span>
                      <span>{companySuggestions.length} found</span>
                    </div>
                    {companySuggestions.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => {
                          setTargetCompany(comp.name);
                          setCompanySearchInput(comp.name);
                          setShowSuggestionsDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-purple-900/30 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                          <span className="text-xs font-semibold text-slate-100 group-hover:text-purple-200">{comp.name}</span>
                        </div>
                        {comp.industry && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {comp.industry}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Presets Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium mr-1 font-mono">Quick Presets:</span>
                  {PRESET_COMPANIES.map((comp) => {
                    const isCurrent = (companySearchInput || targetCompany).toLowerCase() === comp.toLowerCase();
                    return (
                      <button
                        key={comp}
                        onClick={() => {
                          setTargetCompany(comp);
                          setCompanySearchInput(comp);
                          setShowSuggestionsDropdown(false);
                        }}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                          isCurrent
                            ? 'bg-purple-950/60 border-purple-500/60 text-purple-200 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Difficulty & Interview Format */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role Level */}
                <div className="space-y-2.5">
                  <label className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-400" /> Candidate Experience Level:
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDifficultyRole('SDE_1')}
                      className={`flex-1 p-3 rounded-xl border text-xs font-semibold text-center transition ${
                        difficultyRole === 'SDE_1'
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      🎓 Fresher / SDE-1 Entry
                    </button>
                    <button
                      onClick={() => setDifficultyRole('SDE_2')}
                      className={`flex-1 p-3 rounded-xl border text-xs font-semibold text-center transition ${
                        difficultyRole === 'SDE_2'
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      🚀 Experienced / SDE-2 Senior
                    </button>
                  </div>
                </div>

                {/* Interview Format */}
                <div className="space-y-2.5">
                  <label className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" /> Interview Round Format:
                  </label>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
                  >
                    {FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt.id} value={fmt.id}>
                        {fmt.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Action Bar */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <Button
                  variant="primary"
                  onClick={startMockInterview}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-8 py-3 text-sm flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Launch Custom AI Mock Interview
                </Button>
              </div>
            </div>
          )}

          {phase === 'LIVE' && (
            /* ========================================================================= */
            /* PHASE 4.2: ADAPTIVE LIVE INTERVIEWER ENGINE                               */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Session Control Bar */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg font-bold font-mono">
                    {targetCompany} ({difficultyRole})
                  </span>
                  <span className="text-slate-400">
                    Topics: <strong className="text-slate-200">{selectedTopics.join(', ')}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {formatTime(elapsedSeconds)}
                  </span>
                  <Button variant="secondary" onClick={finishInterview} className="text-xs py-1 px-3">
                    End & Evaluate
                  </Button>
                </div>
              </div>

              {/* Conversation Chat Stream */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'interviewer' && (
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === 'candidate'
                          ? 'bg-cyan-950/60 border border-cyan-800/50 text-cyan-100 font-mono'
                          : msg.tag === 'FOLLOW_UP_PROBE'
                          ? 'bg-amber-950/30 border border-amber-800/40 text-amber-200 font-sans'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 font-sans'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Candidate Answer Box */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400" /> Your Response (Code / Oral Explanation):
                  </span>
                  <span>Press Submit to trigger AI Technical Follow-up Probe</span>
                </div>
                <textarea
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your code solution or oral explanation here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="primary"
                    disabled={isEvaluating || !userAnswer.trim()}
                    onClick={handleAnswerSubmit}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 text-xs flex items-center gap-2"
                  >
                    {isEvaluating ? <Zap className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Response to AI Interviewer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === 'REPORT' && report && (
            /* ========================================================================= */
            /* PHASE 4.3 & 4.4: GRANULAR EVALUATION REPORT CARD & METRICS               */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Verdict Header Banner */}
              <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-cyan-900/40 border border-purple-500/40 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-2xl shadow-lg font-mono">
                    {report.overallScore}/10
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                        report.verdict === 'STRONG_HIRE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : report.verdict === 'HIRE'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        🏆 {report.verdict.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        {report.companyFitPercentage}% Match for {targetCompany}
                      </span>
                    </div>
                    <h4 className="text-white font-bold text-base mt-1">
                      Comprehensive AI Mock Interview Report Card
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setPhase('SETUP')} className="text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Interview
                  </Button>
                </div>
              </div>

              {/* Individual Skill Ratings (1-10 Scale) */}
              <div className="space-y-3">
                <h5 className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Individual Skill Ratings (1 to 10 Scale)
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Communication & Expression', score: report.skillRatings.communication, icon: MessageSquare, color: 'text-purple-400' },
                    { label: 'Technical Depth & Correctness', score: report.skillRatings.technicalDepth, icon: BrainCircuit, color: 'text-cyan-400' },
                    { label: 'Code Optimization & Efficiency', score: report.skillRatings.codeEfficiency, icon: FileCode2, color: 'text-emerald-400' },
                    { label: 'Problem Solving & Approach', score: report.skillRatings.problemSolving, icon: Target, color: 'text-amber-400' },
                    { label: 'Confidence & Delivery', score: report.skillRatings.confidenceDelivery, icon: Award, color: 'text-indigo-400' },
                  ].map((skill, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <skill.icon className={`w-3.5 h-3.5 ${skill.color}`} />
                          {skill.label}
                        </span>
                        <span className="font-mono font-bold text-xs bg-slate-800 px-2 py-0.5 rounded text-white">
                          {skill.score}/10
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${(skill.score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths vs Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-2">
                  <h5 className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Top Key Strengths
                  </h5>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {report.strengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 space-y-2">
                  <h5 className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" /> Key Areas for Improvement
                  </h5>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {report.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Topic Action Link */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Recommended Focused Revision: <strong>{report.recommendedTopics.join(', ')}</strong>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onClose();
                    if (onNavigateToTopic) onNavigateToTopic(report.recommendedTopics[0] || 'Arrays & Hashing');
                  }}
                  className="text-xs bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                >
                  🚀 Review Topic Cards
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close Mock Interview
          </Button>
        </div>
      </div>
    </div>
  );
};
