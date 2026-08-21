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
      skillFilter === 'all' || match.matchedSkills.some((s) => s.toLowerCase() === skillFilter.toLowerCase());

    return matchesScore && matchesBranch && matchesStatus && matchesSkill;
  });

  const selectedCandidateMatches = mockMatches.filter((m) => selectedForComparison.includes(m.studentId));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="AI Candidate Matching Engine"
        subtitle="Rank eligible candidates against placement requirements with explainable AI recommendations."
        icon={<Sparkles className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => setIsEligibilityModalOpen(true)}
            >
              Verify Eligibility
            </Button>
            {selectedForComparison.length > 0 && (
              <Button
                variant="brand"
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
      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>AI recommendation — Human Placement Officer retains final candidate shortlisting authority.</span>
        </div>
        <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          Human-in-the-Loop
        </span>
      </div>

      {/* Dynamic Toast Feedback */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* DRIVE SELECTOR & ACTION STRIP */}
      <Card className="p-5 border-brand-200/80 bg-gradient-to-r from-white via-slate-50 to-brand-50/30 shadow-3d-sm">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select Placement Drive
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="text-sm font-bold bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-2xs"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} — {d.roleTitle} (₹{d.packageLpa} LPA)
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                286 eligible candidates
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles className="w-4 h-4 text-brand-300" />}
            onClick={handleRunMatching}
            disabled={isMatching}
          >
            {isMatching ? 'Analyzing Roster...' : 'Run AI Matching'}
          </Button>
        </div>
      </Card>

      {/* PROCESSING STATE INTERFACE */}
      {isMatching && (
        <Card className="p-6 border-brand-200 bg-white">
          <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-brand-600 animate-bounce" /> Executing AI Matching Pipeline
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-semibold">
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
              {matchingStep >= 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>1. Eligibility verified</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
              {matchingStep >= 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>2. Profiles loaded</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 3 ? 'bg-brand-50 border-brand-200 text-brand-800 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              {matchingStep >= 3 ? <Sparkles className="w-4 h-4 text-brand-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>3. Analyzing skill alignment</span>
            </div>
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${matchingStep >= 4 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
              {matchingStep >= 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>4. Generating recommendations</span>
            </div>
          </div>
        </Card>
      )}

      {/* AI INSIGHTS SUMMARY CARD */}
      {hasRunMatching && (
        <Card className="p-5 border-brand-200/80 bg-gradient-to-br from-slate-900 to-slate-850 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Candidate Insights & Synthesis</h3>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li><span className="font-semibold text-white">Python and SQL</span> are the strongest skill matches across candidates.</li>
                <li>8 eligible candidates have strong technical alignment but lack <span className="text-amber-300">Docker</span> experience.</li>
                <li>3 candidates have excellent project relevance matching TechNova backend APIs.</li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white shrink-0 self-start md:self-center"
              icon={<BookOpen className="w-3.5 h-3.5" />}
              onClick={() => navigate('/analytics')}
            >
              View Skill Gaps
            </Button>
          </div>
        </Card>
      )}

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Match Score</label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Match Scores</option>
              <option value="90+">90%+ Excellent Match</option>
              <option value="80+">80%+ Strong Match</option>
              <option value="70+">70%+ Moderate Match</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Shortlist Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Candidates</option>
              <option value="shortlisted">Shortlisted Only</option>
              <option value="eligible">Not Shortlisted Yet</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Required Skill</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium"
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
          <h3 className="text-base font-bold text-slate-900">Ranked Candidate Evaluation List</h3>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredMatches.length} candidates</span>
        </div>

        {filteredMatches.map((m, idx) => {
          const shortlisted = isShortlisted(m.studentId, selectedDriveId);
          const isExpanded = expandedCandidateIds[m.studentId];
          const isSelectedForComp = selectedForComparison.includes(m.studentId);

          return (
            <Card key={m.studentId} className={`p-5 transition-all ${shortlisted ? 'border-purple-300 bg-purple-50/10' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Checkbox & Student Basic Info */}
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={isSelectedForComp}
                    onChange={() => toggleSelectForComparison(m.studentId)}
                    className="mt-2.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    title="Select to compare"
                  />
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    #{idx + 1}
                  </div>
                  <img
                    src={m.studentAvatar}
                    alt={m.studentName}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        onClick={() => navigate(`/candidates/${m.studentId}`)}
                        className="text-base font-bold text-slate-900 hover:text-brand-600 cursor-pointer"
                      >
                        {m.studentName}
                      </h4>
                      <span className="text-xs text-slate-500 font-semibold">({m.branch} &bull; CGPA: {m.cgpa})</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Eligible ✓
                      </span>
                    </div>

                    {/* Matched Skills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Matched:</span>
                      {m.matchedSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                          ✓ {s}
                        </span>
                      ))}
                      {m.missingSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium text-[11px] border border-rose-200">
                          ✕ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Match Score & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end md:self-center">
                  <MatchScore score={m.matchScore} />
                  <Button
                    variant={shortlisted ? 'outline' : 'primary'}
                    size="sm"
                    icon={shortlisted ? <Check className="w-3.5 h-3.5 text-purple-600" /> : <Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => toggleShortlist(m.studentId, selectedDriveId)}
                  >
                    {shortlisted ? 'Remove Shortlist' : 'Shortlist'}
                  </Button>
                </div>
              </div>

              {/* AI Recommendation Quote */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2 text-slate-700 font-medium leading-relaxed">
                  <Bot className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <span>"{m.aiRecommendation}"</span>
                </div>
                <button
                  onClick={() => toggleExpandWhy(m.studentId)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Why this candidate?</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* EXPANDABLE EXPLAINABLE AI SECTION (SECTION 9 REQUIREMENT) */}
              {isExpanded && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Explainable AI Decision Breakdown
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Transparency Score
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Eligibility Status</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All mandatory requirements satisfied
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Skill Alignment Ratio</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {m.whyDetails?.skillMatchCount || '4 / 4 required skills matched'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Project Relevance</span>
                      <span className="text-xs font-bold text-brand-700 mt-1 block">
                        {m.whyDetails?.projectRelevanceCount || 2} relevant projects identified
                      </span>
                    </div>
                  </div>

                  {/* Relevant Projects list */}
                  {m.relevantProjects && m.relevantProjects.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block">Identified Project Alignment</span>
                      <div className="space-y-1.5">
                        {m.relevantProjects.map((p) => (
                          <div key={p.name} className="p-2.5 bg-white rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-900 block">{p.name}</span>
                            <span className="text-[11px] text-slate-600 block mt-0.5">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths vs Gaps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-emerald-700 block">Candidate Key Strengths</span>
                      <div className="flex flex-wrap gap-1">
                        {(m.whyDetails?.strengths || m.matchedSkills).map((st) => (
                          <span key={st} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                            + {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-amber-700 block">Skill Gaps to Address</span>
                      <div className="flex flex-wrap gap-1">
                        {(m.whyDetails?.gaps || m.missingSkills).map((gp) => (
                          <span key={gp} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                            - {gp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* HUMAN-IN-THE-LOOP MANDATORY NOTICE (SECTION 9 REQUIREMENT) */}
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] font-semibold text-amber-900 flex items-center justify-between">
                    <span>AI recommendation — final decision remains with Placement Officer.</span>
                    <span className="text-[10px] text-amber-700 uppercase font-bold">Human-In-The-Loop Control</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* SIDE-BY-SIDE COMPARISON MODAL */}
      <CandidateComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        candidates={selectedCandidateMatches}
      />

      {/* ELIGIBILITY VERIFICATION MODAL */}
      <EligibilityModal
        isOpen={isEligibilityModalOpen}
        onClose={() => setIsEligibilityModalOpen(false)}
        drive={selectedDrive}
      />
    </div>
  );
};
