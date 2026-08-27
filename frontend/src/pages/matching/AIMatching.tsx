import React, { useState, useEffect } from 'react';
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
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MatchScore } from '../../components/ui/MatchScore';
import { usePlacement } from '../../context/PlacementContext';
import { apiService } from '../../services/api';
import { CandidateComparisonModal } from '../../components/candidates/CandidateComparisonModal';
import { EligibilityModal } from '../../components/candidates/EligibilityModal';
import { ShortlistInterviewModal } from '../../components/candidates/ShortlistInterviewModal';

export const AIMatching: React.FC = () => {
  const navigate = useNavigate();
  const { drives, triggerToast } = usePlacement();

  const [selectedDriveId, setSelectedDriveId] = useState(drives[0]?.id || '');
  const selectedDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  useEffect(() => {
    if (!selectedDriveId && drives.length > 0) {
      setSelectedDriveId(drives[0].id);
    }
  }, [drives, selectedDriveId]);

  const [poolCandidates, setPoolCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // AI Matching Processing Execution State
  const [isMatching, setIsMatching] = useState(false);
  const [matchingStep, setMatchingStep] = useState(0);
  const [hasRunMatching, setHasRunMatching] = useState(true);

  // Expandable "Why this candidate?" state map
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Record<string, boolean>>({});

  // Candidate Selection for Comparison & Shortlisting
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [selectedForShortlist, setSelectedForShortlist] = useState<any | null>(null);

  const [isRefreshingCandidates, setIsRefreshingCandidates] = useState(false);

  // Filters State
  const [scoreFilter, setScoreFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  const fetchDriveCandidates = async (isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsRefreshingCandidates(true);
    }
    try {
      const data = await apiService.getCandidatePool(selectedDriveId);
      if (data !== null) {
        setPoolCandidates(data || []);
      }
    } catch (err) {
      console.error('Error fetching drive pool:', err);
    } finally {
      setLoading(false);
      setIsRefreshingCandidates(false);
    }
  };

  useEffect(() => {
    fetchDriveCandidates(true);
  }, [selectedDriveId]);

  const handleRunMatching = () => {
    setIsMatching(true);
    setMatchingStep(1);

    setTimeout(() => setMatchingStep(2), 600);
    setTimeout(() => setMatchingStep(3), 1200);
    setTimeout(() => setMatchingStep(4), 1800);

    setTimeout(() => {
      setIsMatching(false);
      setHasRunMatching(true);
      fetchDriveCandidates(false);
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

  const handleShortlistSuccess = async (payload: any) => {
    if (!selectedForShortlist) return;
    const candId = selectedForShortlist.id;
    // In-place optimistic update
    setPoolCandidates((prev) =>
      prev.map((c) => (c.id === candId ? { ...c, status: 'SHORTLISTED' } : c))
    );
    try {
      await apiService.shortlistApplication(candId, payload);
      triggerToast(`Successfully shortlisted ${selectedForShortlist.student_name}!`, 'success');
      fetchDriveCandidates(false);
    } catch (err) {
      triggerToast('Failed to shortlist candidate.', 'error');
      fetchDriveCandidates(false);
    }
  };

  // Filter real candidates list
  const filteredMatches = poolCandidates.filter((match) => {
    const score = match.match_score || match.readiness_score || 0;
    const matchesScore =
      scoreFilter === 'all' ||
      (scoreFilter === '90+' && score >= 90) ||
      (scoreFilter === '80+' && score >= 80) ||
      (scoreFilter === '70+' && score >= 70);

    const matchesBranch = branchFilter === 'all' || (match.branch || '').toUpperCase() === branchFilter.toUpperCase();

    const isShortlisted = match.status === 'SHORTLISTED';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'shortlisted' && isShortlisted) ||
      (statusFilter === 'eligible' && !isShortlisted);

    const matchesSkill =
      skillFilter === 'all' ||
      (match.skills && match.skills.some((s: string) => s.toLowerCase().includes(skillFilter.toLowerCase())));

    return matchesScore && matchesBranch && matchesStatus && matchesSkill;
  });

  const selectedMatches = poolCandidates.filter((m) => selectedForComparison.includes(m.student_id));

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

      {/* DRIVE SELECTOR & AI RUN ACTION CARD */}
      <Card className="p-6 bg-[#101D31] border-[#243650]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider block">
              Active Placement Drive Target
            </span>
            <div className="flex items-center gap-3">
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="text-base font-bold bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] cursor-pointer"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} — {d.roleTitle}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Evaluating candidates against required competencies: {selectedDrive?.preferredSkills?.join(', ') || (selectedDrive as any)?.eligibilityCriteria?.skills?.join(', ') || 'Core Skills'}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="lg"
              icon={<Bot className="w-5 h-5" />}
              onClick={handleRunMatching}
              disabled={isMatching}
              className="shadow-lg shadow-[#3B82F6]/20 font-bold"
            >
              {isMatching ? 'Running Neural Matching...' : 'Re-Evaluate Drive Candidates'}
            </Button>
          </div>
        </div>

        {/* Dynamic AI Execution Stepper */}
        {isMatching && (
          <div className="mt-6 pt-6 border-t border-[#1B2A40] space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-semibold text-[#CBD5E1]">
              <span>Neural Processing Pipeline</span>
              <span className="text-[#3B82F6]">Phase {matchingStep} of 4</span>
            </div>
            <div className="w-full h-2 bg-[#0B1628] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] transition-all duration-500 rounded-full"
                style={{ width: `${(matchingStep / 4) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#94A3B8]">
              <span className={matchingStep >= 1 ? 'text-[#86EFAC] font-medium' : ''}>1. Parsing Resume Profiles</span>
              <span className={matchingStep >= 2 ? 'text-[#86EFAC] font-medium' : ''}>2. Semantic Skill Alignment</span>
              <span className={matchingStep >= 3 ? 'text-[#86EFAC] font-medium' : ''}>3. Academic Verification</span>
              <span className={matchingStep >= 4 ? 'text-[#86EFAC] font-medium' : ''}>4. Ranking Fit Index</span>
            </div>
          </div>
        )}
      </Card>

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
            <label className="block text-[10px] font-bold uppercase text-[#94A3B8] mb-1">Skill Filter</label>
            <input
              type="text"
              placeholder="Search skill (e.g. Python, SQL)..."
              value={skillFilter === 'all' ? '' : skillFilter}
              onChange={(e) => setSkillFilter(e.target.value || 'all')}
              className="w-full text-xs p-2 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>
      </Card>

      {/* RANKED CANDIDATE MATCH RESULTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#F8FAFC]">Ranked Candidate Evaluation List</h3>
          <span className="text-xs text-[#94A3B8] font-medium">Showing {filteredMatches.length} candidates</span>
        </div>

        {filteredMatches.length === 0 ? (
          <Card className="p-12 text-center text-[#94A3B8] bg-[#101D31] border-[#243650] space-y-2">
            <Users className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
            <p className="text-sm font-bold text-[#F8FAFC]">No applicants for this placement drive yet</p>
            <p className="text-xs text-[#64748B]">When students submit applications, neural matching and ranking will evaluate them here.</p>
          </Card>
        ) : (
          filteredMatches.map((m, idx) => {
            const isShortlisted = m.status === 'SHORTLISTED';
            const isExpanded = expandedCandidateIds[m.student_id];
            const isSelectedForComp = selectedForComparison.includes(m.student_id);
            const score = m.match_score || m.readiness_score || 88;

            return (
              <Card key={m.id || m.student_id} className={`p-5 transition-all bg-[#101D31] border-[#243650] ${isShortlisted ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Checkbox & Student Basic Info */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelectedForComp}
                      onChange={() => toggleSelectForComparison(m.student_id)}
                      className="mt-2.5 w-4 h-4 rounded border-[#243650] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                      title="Select to compare"
                    />
                    <div className="w-7 h-7 rounded-full bg-[#14243B] text-[#F8FAFC] border border-[#243650] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{idx + 1}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
                      {m.student_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[#F8FAFC]">{m.student_name}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                          {m.branch} &bull; CGPA {m.cgpa}
                        </span>
                        {isShortlisted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)]">
                            Shortlisted
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(m.skills || []).map((s: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-[#0B1628] text-[#CBD5E1] border border-[#243650] text-[11px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score & Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <MatchScore score={score} size="md" />

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isShortlisted ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => setSelectedForShortlist(m)}
                        icon={isShortlisted ? <Check className="w-4 h-4 text-[#22C55E]" /> : undefined}
                      >
                        {isShortlisted ? 'Update Shortlist' : 'Shortlist'}
                      </Button>

                      <button
                        onClick={() => toggleExpandWhy(m.student_id)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
                        title="View AI Analysis Breakdown"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded "Why this candidate?" Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1B2A40] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200">
                    <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
                      <span className="font-bold text-[#86EFAC] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Technical Strengths
                      </span>
                      <p className="text-[#CBD5E1] text-[11px]">
                        Strong alignment in {(m.skills || []).slice(0, 4).join(', ')}. Verified CGPA of {m.cgpa}.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1.5">
                      <span className="font-bold text-[#60A5FA] flex items-center gap-1">
                        <FolderGit2 className="w-3.5 h-3.5" /> Projects Evaluated
                      </span>
                      <p className="text-[#CBD5E1] text-[11px]">
                        {(m.projects || []).length > 0
                          ? m.projects.map((p: any) => p.name || p.title || p).join(', ')
                          : 'Demonstrated core capabilities during resume evaluation.'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Candidate Comparison Modal */}
      <CandidateComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        candidates={selectedMatches as any}
      />

      {/* Eligibility Rules Modal */}
      <EligibilityModal
        isOpen={isEligibilityModalOpen}
        onClose={() => setIsEligibilityModalOpen(false)}
        drive={selectedDrive as any}
      />

      {/* Shortlist & Interview Scheduling Modal */}
      <ShortlistInterviewModal
        isOpen={!!selectedForShortlist}
        onClose={() => setSelectedForShortlist(null)}
        candidate={selectedForShortlist}
        onShortlistSuccess={handleShortlistSuccess}
      />
    </div>
  );
};
