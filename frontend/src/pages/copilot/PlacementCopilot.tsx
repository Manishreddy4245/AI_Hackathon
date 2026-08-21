import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  ArrowRight,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  BarChart2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Layers,
  History,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { CopilotMessage, CopilotPrompt } from '../../types';
import { mockSuggestedPrompts, mockCopilotHistory } from '../../data/mockData';
import { apiService } from '../../services/api';


export const PlacementCopilot: React.FC = () => {
  const navigate = useNavigate();
  const { drives, students, exceptionsList } = usePlacement();

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('Analyzing placement data...');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    setIsProcessing(true);
    setProcessingStage('Querying PlaceMind AI Knowledge Engine...');

    try {
      const response = await apiService.sendCopilotQuery(query);
      setIsProcessing(false);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      setIsProcessing(false);
      generateMockResponse(query);
    }
  };


  const generateMockResponse = (query: string) => {
    const q = query.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let botMsg: CopilotMessage;

    if (q.includes('top candidates') || q.includes('technova')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'Based on current eligibility rules and skill alignment, these are the top ranked candidates for TechNova Solutions:',
        timestamp,
        cards: [
          { title: '1. Rahul Verma', subtitle: 'CSE • CGPA: 8.9', detail: 'FastAPI, SQL, REST APIs (92% Match Score)', badge: 'Excellent Match' },
          { title: '2. Aarav Sharma', subtitle: 'CSE • CGPA: 8.7', detail: 'Python, SQL, React (87% Match Score)', badge: 'Strong Match' },
          { title: '3. Karthik Rao', subtitle: 'CSE • CGPA: 7.8', detail: 'Java, SQL, REST APIs (81% Match Score)', badge: 'Strong Match' },
        ],
        actionButton: { label: 'View Candidates', route: '/candidates' },
      };
    } else if (q.includes('conflict')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: '3 interview scheduling conflicts require your attention today:',
        timestamp,
        cards: [
          { title: 'Rahul Verma', subtitle: 'Candidate Overlap', detail: 'Double-booked at 10:30 AM across 2 evaluation sessions.', badge: 'Critical' },
          { title: 'Panel B', subtitle: 'Panel Double Booking', detail: 'Assigned to TechNova and DataSphere at 11:30 AM.', badge: 'Critical' },
          { title: 'Lab 101', subtitle: 'Room Conflict', detail: 'Capacity of 30 exceeded by concurrent booking.', badge: 'Warning' },
        ],
        actionButton: { label: 'Open Operations Center', route: '/exceptions' },
      };
    } else if (q.includes('datasphere') || q.includes('eligible for')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'DataSphere Data Analyst Drive Eligibility Summary:\n• Eligible: 186 Candidates\n• Ineligible: 94 Candidates\n\nTop candidates satisfying mandatory requirements:',
        timestamp,
        cards: [
          { title: 'Ananya Reddy', subtitle: 'IT • CGPA: 8.4', detail: 'Java, SQL, Spring Boot (84% Alignment)', badge: 'Eligible ✓' },
          { title: 'Aarav Sharma', subtitle: 'CSE • CGPA: 8.7', detail: 'Python, SQL, Analytics (88% Alignment)', badge: 'Eligible ✓' },
          { title: 'Rahul Verma', subtitle: 'CSE • CGPA: 8.9', detail: 'Python, FastAPI, SQL (92% Alignment)', badge: 'Eligible ✓' },
        ],
        actionButton: { label: 'View Eligible Students', route: '/candidates' },
      };
    } else if (q.includes('rooms') || q.includes('free at 2 pm')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'Venue Availability Breakdown at 2:00 PM:\n\nAvailable Rooms:\n✓ Lab 102 (Capacity: 30)\n✓ Conference Room A (Capacity: 15)\n✓ Seminar Hall (Capacity: 120)\n\nOccupied Rooms:\n✕ Lab 101 (FinEdge Online Exam)',
        timestamp,
        cards: [
          { title: 'Lab 102', subtitle: 'Tech Block A', detail: 'Available Now (30 Seats)', badge: 'Free' },
          { title: 'Conference Room A', subtitle: 'Admin Block', detail: 'Available Now (15 Seats)', badge: 'Free' },
        ],
        actionButton: { label: 'Schedule Interview', route: '/interviews' },
      };
    } else if (q.includes('skill gap')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'Campus Skill Deficit Analysis:\n• SQL — 21% deficit (126 students)\n• Docker — 18% deficit (82 students)\n• Cloud / AWS — 16% deficit (78 students)\n• System Design — 14% deficit (94 students)\n\nRecommendation:\nPrioritize SQL and backend preparation workshops because they are highly requested across active drives.',
        timestamp,
        actionButton: { label: 'View Skill Analytics', route: '/analytics' },
      };
    } else if (q.includes('pending action') || q.includes('attention')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: '8 placement operations require officer review:\n• 3 Critical Exceptions (Conflicts)\n• 5 Warnings (Panel Confirmation & Unapplied Nudges)\n\nHigh Priority Actions:\n1. Confirm Panel B availability for tomorrow 9:30 AM\n2. Resolve Rahul Verma candidate overlap\n3. Broadcast TechNova deadline nudge to 12 students',
        timestamp,
        actionButton: { label: 'Open Operations Center', route: '/exceptions' },
      };
    } else {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: `Analyzed query regarding "${query}". Placement operations data confirms 12 active drives, 286 eligible candidates, and 24 interviews scheduled today.`,
        timestamp,
        actionButton: { label: 'Open Dashboard', route: '/dashboard' },
      };
    }

    setMessages((prev) => [...prev, botMsg]);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Placement Copilot"
        subtitle="Ask questions, analyze placement operations and get AI-assisted recommendations."
        icon={<Sparkles className="w-5 h-5 text-brand-600" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<History className="w-4 h-4" />}
              onClick={() => setShowHistoryModal(!showHistoryModal)}
            >
              Recent History
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleClearHistory}
              >
                Clear
              </Button>
            )}
          </div>
        }
      />

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CONVERSATION WORKSPACE & COMPOSER (2 COLS) */}
        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between min-h-[620px]">
          <Card className="flex-1 flex flex-col justify-between overflow-hidden border-slate-200 bg-white">
            {/* CONVERSATION MESSAGES AREA */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
              {messages.length === 0 ? (
                /* WELCOME STATE & SUGGESTED PROMPTS (SECTIONS 3 & 4) */
                <div className="space-y-6 py-6 text-center animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto shadow-2xs">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Good morning, Placement Officer.</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      I can help you monitor drives, candidates, interviews and placement readiness. Select a suggested prompt or type your query below.
                    </p>
                  </div>

                  {/* SUGGESTED PROMPTS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-2">
                    {mockSuggestedPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSend(p.text)}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-brand-300 hover:shadow-xs transition-all text-xs font-semibold text-slate-800 flex items-start gap-2.5 group cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span>{p.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ACTIVE CHAT HISTORY */
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 text-xs animate-in fade-in ${
                      msg.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-brand-600 text-white'
                      }`}
                    >
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-lg space-y-3 ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white p-3.5 rounded-2xl rounded-tr-none'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed font-medium">{msg.text}</p>

                      {/* STRUCTURED CARDS */}
                      {msg.cards && msg.cards.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {msg.cards.map((c, i) => (
                            <div key={i} className="p-3 rounded-lg bg-white border border-slate-200 text-slate-900 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{c.title}</span>
                                {c.badge && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                                    {c.badge}
                                  </span>
                                )}
                              </div>
                              {c.subtitle && <p className="text-[11px] font-semibold text-slate-500">{c.subtitle}</p>}
                              {c.detail && <p className="text-[11px] text-slate-600 font-medium">{c.detail}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CONTEXTUAL ACTION BUTTON */}
                      {msg.actionButton && (
                        <div className="pt-2">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<ArrowRight className="w-3.5 h-3.5" />}
                            onClick={() => navigate(msg.actionButton!.route)}
                          >
                            {msg.actionButton.label}
                          </Button>
                        </div>
                      )}

                      <span className="text-[10px] opacity-70 block text-right font-medium">{msg.timestamp}</span>
                    </div>
                  </div>
                ))
              )}

              {/* PROCESSING SIMULATION STATE (SECTION 13) */}
              {isProcessing && (
                <div className="flex items-center gap-3 text-xs text-brand-700 font-semibold bg-brand-50 p-3.5 rounded-xl border border-brand-200 animate-pulse">
                  <Bot className="w-4 h-4 animate-spin text-brand-600" />
                  <span>{processingStage}</span>
                </div>
              )}
            </div>

            {/* INPUT COMPOSER (SECTION 12) */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask Placement Copilot anything..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                />
                <Button variant="primary" type="submit" icon={<Send className="w-4 h-4" />}>
                  Send
                </Button>
              </form>
            </div>
          </Card>

          {/* NON-BINDING ADVISORY DISCLAIMER (SECTION 18 REQUIREMENT) */}
          <p className="text-[11px] text-slate-400 italic text-center">
            * AI recommendations are advisory. Placement officers retain final decision authority.
          </p>
        </div>

        {/* RIGHT COLUMN: OPERATIONS CONTEXT & ACTIONS PANEL (SECTION 14 REQUIREMENT) */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4 bg-gradient-to-br from-white to-slate-50 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-brand-600" /> Operations Context & Actions
            </h3>

            {/* Current Drive */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Drive Focus</span>
              <span className="text-xs font-bold text-slate-900 block">TechNova Solutions</span>
              <span className="text-[11px] text-slate-500 font-medium">Backend Developer (₹16.5 LPA)</span>
            </div>

            {/* Today's Operations */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Today's Operations</span>
              <div className="flex items-center justify-between pt-1">
                <span>Interviews Today:</span>
                <strong className="text-slate-900">24 Slots</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Conflicts:</span>
                <strong className="text-rose-600">3 Overlaps</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending Actions:</span>
                <strong className="text-amber-600">8 Items</strong>
              </div>
            </div>

            {/* Candidate Overview */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Candidate Pool</span>
              <div className="flex items-center justify-between pt-1">
                <span>Eligible Roster:</span>
                <strong className="text-slate-900">286 Candidates</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Shortlisted:</span>
                <strong className="text-purple-600">96 Candidates</strong>
              </div>
            </div>

            {/* Placement Readiness */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Batch Readiness Index</span>
              <div className="flex items-center justify-between pt-1">
                <span>Average Readiness:</span>
                <strong className="text-emerald-600 text-sm">78%</strong>
              </div>
            </div>

            {/* Action Link */}
            <Button
              variant="outline"
              className="w-full justify-center"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/dashboard')}
            >
              Open Dashboard
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
