import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  XCircle,
  FolderGit2,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MatchScore } from '../../components/ui/MatchScore';
import { usePlacement } from '../../context/PlacementContext';
import { mockMatches } from '../../data/mockData';
import { CandidateMatch } from '../../types';
import { CandidateComparisonModal } from '../../components/candidates/CandidateComparisonModal';
import { EligibilityModal } from '../../components/candidates/EligibilityModal';

export const AIMatching: React.FC = () => {
  const navigate = useNavigate();
  const { drives, isShortlisted, toggleShortlist, toastNotice } = usePlacement();

  const [selectedDriveId, setSelectedDriveId] = useState('technova-backend');
  const selectedDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  // AI Matching Processing Execution State
  const [isMatching, setIsMatching] = useState(false);
  const [matchingStep, setMatchingStep] = useState(0);
  const [hasRunMatching, setHasRunMatching] = useState(true);

  // Expandable "Why this candidate?" state map
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Record<string, boolean>>({
    'rahul-verma': true,
  });

  // Candidate Selection for Comparison
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);

  // Filters State
  const [scoreFilter, setScoreFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  const handleRunMatching = () => {
    setIsMatching(true);
    setMatchingStep(1);

    setTimeout(() => setMatchingStep(2), 600);
    setTimeout(() => setMatchingStep(3), 1200);
    setTimeout(() => setMatchingStep(4), 1800);

    setTimeout(() => {
      setIsMatching(false);
      setHasRunMatching(true);
    }, 2200);
  };

  const toggleExpandWhy = (studentId: string) => {
    setExpandedCandidateIds({
      ...expandedCandidateIds,
      [studentId]: !expandedCandidateIds[studentId],
    });
  };

  const toggleSelectForComparison = (studentId: string) => {
    if (selectedForComparison.includes(studentId)) {
      setSelectedForComparison(selectedForComparison.filter((id) => id !== studentId));
    } else {
      if (selectedForComparison.length >= 3) {
        alert('You can compare up to 3 candidates simultaneously.');
        return;
      }
      setSelectedForComparison([...selectedForComparison, studentId]);
    }
  };

  // Filter candidates list
  const filteredMatches = mockMatches.filter((match) => {
    const matchesScore =
      scoreFilter === 'all' ||
      (scoreFilter === '90+' && match.matchScore >= 90) ||
      (scoreFilter === '80+' && match.matchScore >= 80) ||
      (scoreFilter === '70+' && match.matchScore >= 70);

    const matchesBranch = branchFilter === 'all' || match.branch.toUpperCase() === branchFilter.toUpperCase();

    const shortlisted = isShortlisted(match.studentId, selectedDriveId);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'shortlisted' && shortlisted) ||
      (statusFilter === 'eligible' && !shortlisted);

    const matchesSkill =
      skillFilter === 'all' || (match.matchedSkills && match.matchedSkills.some((s: string) => s.toLowerCase().includes(skillFilter.toLowerCase())));

    return matchesScore && matchesBranch && matchesStatus && matchesSkill;
  });

  const selectedMatches = mockMatches.filter((m) => selectedForComparison.includes(m.studentId));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="AI Candidate Matching Engine"
        subtitle="Ranked candidate evaluation, eligibility checks, and automated shortlisting recommendations."
        icon={<Sparkles className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setIsEligibilityModalOpen(true)}
            >
              Verify Eligibility Rules
            </Button>
            {selectedForComparison.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Layers className="w-4 h-4" />}
                onClick={() => setIsComparisonModalOpen(true)}
              >
                Compare Candidates ({selectedForComparison.length})
              </Button>
            )}
          </div>
        }
      />

      {/* Human Control Advisory Disclaimer */}
      <div className="p-3.5 bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.25)] rounded-xl flex items-center justify-between text-xs text-[#FCD34D] font-semibold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
          <span>AI recommendation — Human Placement Officer retains final candidate shortlisting authority.</span>
        </div>
        <span className="text-[10px] uppercase font-bold bg-[rgba(245,158,11,0.20)] text-[#FCD34D] px-2 py-0.5 rounded border border-[rgba(245,158,11,0.30)]">
          Human-in-the-Loop
        </span>
      </div>

      {/* Dynamic Toast Feedback */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-[#101D31] text-[#F8FAFC] border border-[#243650] flex items-center justify-between shadow-3d-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-[#3B82F6]" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* DRIVE SELECTOR & ACTION STRIP */}
      <Card className="p-5 border-[#243650] bg-[#101D31] shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Select Placement Drive
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="text-sm font-bold bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#3B82F6] cursor-pointer shadow-xs"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} — {d.roleTitle} (₹{d.packageLpa} LPA)
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                286 eligible candidates
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles className="w-4 h-4 text-white" />}
            onClick={handleRunMatching}
            disabled={isMatching}
          >
            {isMatching ? 'Analyzing Roster...' : 'Run AI Matching'}
          </Button>
        </div>
      </Card>

      {/* PROCESSING STATE INTERFACE */}
      {isMatching && (
        <Card className="p-6 border-[#243650] bg-[#101D31]">
          <h4 className="text-sm font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#3B82F6] animate-bounce" /> Executing AI Matching Pipeline
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-semibold">
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 1 ? 'bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.25)] text-[#86EFAC]' : 'bg-[#14243B] border-[#243650] text-[#64748B]'}`}>
              {matchingStep >= 1 ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <div className="w-4 h-4 rounded-full border-2 border-[#64748B]" />}
              <span>1. Eligibility verified</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 2 ? 'bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.25)] text-[#86EFAC]' : 'bg-[#14243B] border-[#243650] text-[#64748B]'}`}>
              {matchingStep >= 2 ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <div className="w-4 h-4 rounded-full border-2 border-[#64748B]" />}
              <span>2. Profiles loaded</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 3 ? 'bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.30)] text-[#60A5FA] animate-pulse' : 'bg-[#14243B] border-[#243650] text-[#64748B]'}`}>
              {matchingStep >= 3 ? <Sparkles className="w-4 h-4 text-[#3B82F6]" /> : <div className="w-4 h-4 rounded-full border-2 border-[#64748B]" />}
              <span>3. Analyzing skill alignment</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 4 ? 'bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.25)] text-[#86EFAC]' : 'bg-[#14243B] border-[#243650] text-[#64748B]'}`}>
              {matchingStep >= 4 ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <div className="w-4 h-4 rounded-full border-2 border-[#64748B]" />}
              <span>4. Generating recommendations</span>
            </div>
          </div>
        </Card>
      )}

      {/* AI INSIGHTS SUMMARY CARD */}
      {hasRunMatching && (
        <Card className="p-5 ai-card-surface text-[#F8FAFC]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">AI Candidate Insights &amp; Synthesis</h3>
              </div>
              <ul className="text-xs text-[#CBD5E1] space-y-1 list-disc list-inside">
                <li><span className="font-semibold text-white">Python and SQL</span> are the strongest skill matches across candidates.</li>
                <li>8 eligible candidates have strong technical alignment but lack <span className="text-[#FCD34D]">Docker</span> experience.</li>
                <li>3 candidates have excellent project relevance matching TechNova backend APIs.</li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#101D31] border-[#243650] text-[#CBD5E1] hover:text-white shrink-0 self-start md:self-center"
              icon={<BookOpen className="w-3.5 h-3.5" />}
              onClick={() => navigate('/analytics')}
            >
              View Skill Gaps
            </Button>
          </div>
        </Card>
      )}

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-[#101D31] border-[#243650]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Match Score</label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
            >
              <option value="all">All Match Scores</option>
              <option value="90+">90%+ Excellent Match</option>
              <option value="80+">80%+ Strong Match</option>
              <option value="70+">70%+ Moderate Match</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Shortlist Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
            >
              <option value="all">All Candidates</option>
              <option value="shortlisted">Shortlisted Only</option>
              <option value="eligible">Not Shortlisted Yet</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Required Skill</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer font-medium"
            >
              <option value="all">All Skills</option>
              <option value="Python">Python</option>
              <option value="SQL">SQL</option>
              <option value="REST APIs">REST APIs</option>
              <option value="FastAPI">FastAPI</option>
            </select>
          </div>
        </div>
      </Card>

      {/* RANKED CANDIDATE MATCH RESULTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#F8FAFC]">Ranked Candidate Evaluation List</h3>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredMatches.length} candidates</span>
        </div>

        {filteredMatches.map((m, idx) => {
          const shortlisted = isShortlisted(m.studentId, selectedDriveId);
          const isExpanded = expandedCandidateIds[m.studentId];
          const isSelectedForComp = selectedForComparison.includes(m.studentId);

          return (
            <Card key={m.studentId} className={`p-5 transition-all bg-[#101D31] border-[#243650] ${shortlisted ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Checkbox & Student Basic Info */}
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={isSelectedForComp}
                    onChange={() => toggleSelectForComparison(m.studentId)}
                    className="mt-2.5 w-4 h-4 rounded border-[#243650] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                    title="Select to compare"
                  />
                  <div className="w-7 h-7 rounded-full bg-[#14243B] text-[#F8FAFC] border border-[#243650] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    #{idx + 1}
                  </div>
                  <img
                    src={m.studentAvatar}
                    alt={m.studentName}
                    className="w-12 h-12 rounded-full object-cover border border-[#243650] shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#F8FAFC]">{m.studentName}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                        {m.branch} &bull; CGPA {m.cgpa}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.matchedSkills.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650] text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <MatchScore score={m.matchScore} />

                  <div className="flex items-center gap-2">
                    <Button
                      variant={shortlisted ? 'emerald' : 'primary'}
                      size="sm"
                      onClick={() => toggleShortlist(m.studentId, selectedDriveId)}
                    >
                      {shortlisted ? '✓ Shortlisted' : 'Shortlist Candidate'}
                    </Button>

                    <button
                      onClick={() => toggleExpandWhy(m.studentId)}
                      className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#14243B] transition-colors cursor-pointer"
                      title="Toggle match breakdown"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* EXPANDABLE "WHY THIS CANDIDATE?" BREAKDOWN */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#1B2A40] space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="p-3.5 ai-recommendation-box rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#3B82F6] flex items-center gap-1.5">
                        <Bot className="w-4 h-4" /> AI Match Rationale &amp; Synthesis
                      </span>
                      <span className="text-[10px] text-[#CBD5E1] font-semibold">
                        Overall Similarity: {m.matchScore}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Technical Fit */}
                      <div className="p-2.5 bg-[#0B1628] rounded-lg border border-[#243650] space-y-1">
                        <span className="font-bold text-[#86EFAC] block">✓ Technical Capability Fit ({m.skillMatchPercent}%)</span>
                        <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                          Demonstrates high proficiency in required stack items: {m.matchedSkills.join(', ')}.
                        </p>
                      </div>

                      {/* Project Relevance */}
                      <div className="p-2.5 bg-[#0B1628] rounded-lg border border-[#243650] space-y-1">
                        <span className="font-bold text-[#60A5FA] block">✓ Project Relevance ({m.whyDetails?.projectRelevanceCount || 2} Projects)</span>
                        <p className="text-[11px] text-[#CBD5E1] flex items-center gap-1">
                          <FolderGit2 className="w-3.5 h-3.5 text-[#3B82F6]" /> Relevant Projects Matched
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* MODALS */}
      <CandidateComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        candidates={selectedMatches}
      />

      <EligibilityModal
        isOpen={isEligibilityModalOpen}
        onClose={() => setIsEligibilityModalOpen(false)}
        drive={selectedDrive}
      />
    </div>
  );
};
