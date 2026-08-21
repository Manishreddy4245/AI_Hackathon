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
    } else if (q.includes('skill gap') || q.includes('docker')) {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'Skill Gap Analysis across active drives shows Docker and Cloud Containerization is the highest demand gap:',
        timestamp,
        cards: [
          { title: 'Docker & Containerization', subtitle: 'Missing in 42% eligible candidates', detail: 'Required by 4 active placement drives.', badge: 'High Demand' },
          { title: 'System Architecture', subtitle: 'Missing in 35% candidates', detail: 'Evaluated in TechNova Round 2.', badge: 'Medium Demand' },
        ],
        actionButton: { label: 'View Analytics', route: '/analytics' },
      };
    } else {
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: `I have processed your query regarding "${query}". Placement operations data shows 12 active drives, 286 eligible candidates, and 0 unhandled critical conflicts.`,
        timestamp,
        actionButton: { label: 'Go to Operations Dashboard', route: '/dashboard' },
      };
    }

    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Placement Copilot AI"
        subtitle="Conversational AI assistant for placement intelligence, conflict resolution, and candidate analysis."
        icon={<Bot className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<History className="w-4 h-4" />}
              onClick={() => setShowHistoryModal(true)}
            >
              Session History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setMessages([])}
            >
              Clear Chat
            </Button>
          </div>
        }
      />

      {/* MAIN COPILOT WORKSPACE CARD */}
      <Card className="p-0 border-[#243650] bg-[#101D31] overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
        {/* COPILOT HEADER */}
        <div className="p-4 border-b border-[#243650] bg-[#14243B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center font-bold shadow-glow-brand">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                <span>PlaceMind Operations Copilot</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                  Online
                </span>
              </h3>
              <p className="text-[11px] text-[#94A3B8]">Powered by FastAPI LLM Engine &amp; Placement Context</p>
            </div>
          </div>
        </div>

        {/* CHAT MESSAGES DISPLAY */}
        <div className="p-6 min-h-[420px] max-h-[500px] overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-center mx-auto shadow-glow-brand">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">How can I assist your placement drive today?</h3>
                <p className="text-xs text-[#CBD5E1] mt-1 max-w-md mx-auto leading-relaxed">
                  I can help you monitor drives, candidates, interviews and placement readiness. Select a suggested prompt or type your query below.
                </p>
              </div>

              {/* SUGGESTED PROMPTS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-2">
                {mockSuggestedPrompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSend(p.text)}
                    className="p-3.5 rounded-xl border border-[#243650] bg-[#14243B] hover:bg-[#192B45] hover:border-[#3B82F6] transition-all text-xs font-semibold text-[#CBD5E1] hover:text-white flex items-start gap-2.5 group cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#14243B] text-[#06B6D4] border border-[#243650]'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-lg space-y-3 ${
                    msg.sender === 'user'
                      ? 'bg-[#3B82F6] text-white p-3.5 rounded-2xl rounded-tr-none font-medium'
                      : 'bg-[#14243B] border border-[#243650] text-[#F8FAFC] p-4 rounded-2xl rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed font-medium">{msg.text}</p>

                  {/* STRUCTURED CARDS */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.cards.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg bg-[#101D31] border border-[#243650] text-[#F8FAFC] space-y-1 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{c.title}</span>
                            {c.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                                {c.badge}
                              </span>
                            )}
                          </div>
                          {c.subtitle && <p className="text-[11px] font-semibold text-[#CBD5E1]">{c.subtitle}</p>}
                          {c.detail && <p className="text-[11px] text-[#94A3B8] font-medium">{c.detail}</p>}
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

          {/* PROCESSING STATE */}
          {isProcessing && (
            <div className="flex items-center gap-3 text-xs text-[#60A5FA] font-semibold bg-[rgba(59,130,246,0.10)] p-3.5 rounded-xl border border-[rgba(59,130,246,0.25)] animate-pulse">
              <Bot className="w-4 h-4 animate-spin text-[#3B82F6]" />
              <span>{processingStage}</span>
            </div>
          )}
        </div>

        {/* INPUT COMPOSER (SECTION 24) */}
        <div className="p-4 border-t border-[#243650] bg-[#0B1628]">
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
              className="flex-1 text-xs p-3 bg-[#101D31] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-xl focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 font-medium"
            />
            <Button variant="primary" type="submit" icon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
