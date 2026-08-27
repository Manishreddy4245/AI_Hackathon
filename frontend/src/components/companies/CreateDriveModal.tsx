import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Bot,
  Loader2,
  Check,
  Send,
  RefreshCw,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { PlacementDrive } from '../../types';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

interface CreateDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriveCreated: (drive: PlacementDrive) => void;
  initialDrive?: PlacementDrive | null;
  onDriveUpdated?: (drive: PlacementDrive) => void;
}

export const CreateDriveModal: React.FC<CreateDriveModalProps> = ({
  isOpen,
  onClose,
  onDriveCreated,
  initialDrive,
  onDriveUpdated,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'analyzing' | 'review'>('form');

  // Recruiter Form Inputs
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [packageLpa, setPackageLpa] = useState<number>(0);
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Internship' | 'PPO'>('Full-time');
  const [deadline, setDeadline] = useState('');

  // AI Extraction State strictly derived from Raw Text
  const [lastAnalyzedText, setLastAnalyzedText] = useState<string>('');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState('AI is analyzing the current raw job description...');

  // Extracted AI Requirements State (Editable by Recruiter)
  const [isEditingRequirements, setIsEditingRequirements] = useState(false);
  const [extractedMinCgpa, setExtractedMinCgpa] = useState<number>(0);
  const [extractedGradYear, setExtractedGradYear] = useState<number>(2027);
  const [extractedGradYears, setExtractedGradYears] = useState<number[]>([2027]);
  const [extractedBranches, setExtractedBranches] = useState<string[]>([]);
  const [extractedRequiredSkills, setExtractedRequiredSkills] = useState<string[]>([]);
  const [extractedPreferredSkills, setExtractedPreferredSkills] = useState<string[]>([]);
  const [extractedExplanation, setExtractedExplanation] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<string>('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');

  // Race condition & request cancellation protection
  const latestRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize or reset state when modal opens or initialDrive changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialDrive) {
      setCompanyName(initialDrive.companyName || '');
      setRoleTitle(initialDrive.roleTitle || '');
      setJobDescription(initialDrive.description || '');
      setLocation(initialDrive.location || '');
      setPackageLpa(initialDrive.packageLpa || 0);
      setEmploymentType(initialDrive.employmentType || 'Full-time');
      setDeadline(initialDrive.deadline || initialDrive.driveDate || '');
      setExtractedMinCgpa(initialDrive.minCgpa ?? 0);
      setExtractedGradYear(initialDrive.graduationYear || 2027);
      setExtractedGradYears(initialDrive.graduationYears || [initialDrive.graduationYear || 2027]);
      setExtractedBranches(initialDrive.eligibleBranches || []);
      setExtractedRequiredSkills(initialDrive.requiredSkills || []);
      setExtractedPreferredSkills(initialDrive.preferredSkills || []);
      setExtractedExplanation(initialDrive.aiExplanation || '');
      setLastAnalyzedText(initialDrive.description || '');
      setHasAnalyzed(Boolean(initialDrive.description && initialDrive.requiredSkills?.length));
      setStep('form');
      setAnalysisError(null);
    } else {
      // Clean slate for creating a new drive
      const initialCompany = user?.companyName || (user?.role === 'recruiter' && user?.name && !user.name.toLowerCase().includes('demo') ? user.name : '');
      setCompanyName(initialCompany);
      setRoleTitle('');
      setJobDescription('');
      setLocation('');
      setPackageLpa(0);
      setEmploymentType('Full-time');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setDeadline(defaultDate.toISOString().split('T')[0]);
      setExtractedMinCgpa(0);
      setExtractedGradYear(2027);
      setExtractedGradYears([2027]);
      setExtractedBranches([]);
      setExtractedRequiredSkills([]);
      setExtractedPreferredSkills([]);
      setExtractedExplanation('');
      setExtractedSummary('');
      setLastAnalyzedText('');

      setHasAnalyzed(false);
      setStep('form');
      setAnalysisError(null);
    }
  }, [isOpen, initialDrive, user]);

  // Check if raw text changed since last analysis
  const isAnalysisStale = hasAnalyzed && (
    jobDescription.trim() !== lastAnalyzedText.trim()
  );

  if (!isOpen) return null;

  const handleStartAIAnalysis = async () => {
    const rawTextToAnalyze = jobDescription.trim();
    if (!rawTextToAnalyze) {
      setAnalysisError('Please enter the raw job description before analyzing.');
      return;
    }

    // Cancel previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentRequestId = ++latestRequestIdRef.current;
    setStep('analyzing');
    setAnalysisError(null);
    setAnalysisStatusText(`Sending raw text to AI engine for ${companyName || 'the placement drive'}...`);

    try {
      // Call backend AI extractor with recruiter's current Raw Text
      const extracted = await apiService.extractJd(rawTextToAnalyze, companyName, abortController.signal);

      // Protect against race conditions: only latest request wins
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

      // Update state strictly from the returned analysis
      if (extracted.roleTitle) {
        setRoleTitle(extracted.roleTitle);
      }
      if (extracted.companyName && extracted.companyName !== 'Company') {
        setCompanyName(extracted.companyName);
      }
      if (extracted.location) {
        setLocation(extracted.location);
      }
      if (extracted.packageLpa !== undefined && extracted.packageLpa !== null && extracted.packageLpa > 0) {
        setPackageLpa(extracted.packageLpa);
      }
      if ((extracted as any).graduationYears && (extracted as any).graduationYears.length > 0) {
        setExtractedGradYears((extracted as any).graduationYears);
      } else if (extracted.graduationYear) {
        setExtractedGradYears([extracted.graduationYear]);
      }
      setExtractedMinCgpa(extracted.minCgpa ?? 0);
      setExtractedBranches(extracted.eligibleBranches || []);
      setExtractedRequiredSkills(extracted.requiredSkills || []);
      setExtractedPreferredSkills(extracted.preferredSkills || []);
      setExtractedExplanation(
        extracted.aiExplanation ||
        `Requirements extracted strictly from raw text for ${extracted.roleTitle || roleTitle || 'this role'}.`
      );
      setExtractedSummary(
        extracted.summary ||
        `Evaluated placement drive requirements for ${extracted.roleTitle || roleTitle || 'the role'}.`
      );

      setLastAnalyzedText(rawTextToAnalyze);
      setHasAnalyzed(true);
      setStep('review');
    } catch (err: any) {
      if (currentRequestId !== latestRequestIdRef.current) return;
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      const errorMsg = err?.response?.data?.detail || err?.message || 'AI analysis failed. Please check the raw text and try again.';
      setAnalysisError(errorMsg);
      setStep('form');
    }

  };

  const handleAddBranch = () => {
    if (newBranchInput.trim() && !extractedBranches.includes(newBranchInput.trim().toUpperCase())) {
      setExtractedBranches([...extractedBranches, newBranchInput.trim().toUpperCase()]);
      setNewBranchInput('');
    }
  };

  const handleRemoveBranch = (branch: string) => {
    setExtractedBranches(extractedBranches.filter((b) => b !== branch));
  };

  const handleAddRequiredSkill = () => {
    if (newSkillInput.trim() && !extractedRequiredSkills.includes(newSkillInput.trim())) {
      setExtractedRequiredSkills([...extractedRequiredSkills, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    setExtractedRequiredSkills(extractedRequiredSkills.filter((s) => s !== skill));
  };

  const handleAddPreferredSkill = () => {
    if (newSkillInput.trim() && !extractedPreferredSkills.includes(newSkillInput.trim())) {
      setExtractedPreferredSkills([...extractedPreferredSkills, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const handleRemovePreferredSkill = (skill: string) => {
    setExtractedPreferredSkills(extractedPreferredSkills.filter((s) => s !== skill));
  };

  const handleSaveDraft = () => {
    const rawText = jobDescription.trim();
    if (!rawText) {
      setAnalysisError('Please enter a job description to save draft.');
      return;
    }

    const drivePayload: PlacementDrive = {
      id: initialDrive?.id || `drive-${Date.now()}`,
      companyId: initialDrive?.companyId || `comp-${Date.now()}`,
      companyName: companyName.trim() || 'Company',
      companyLogo: (companyName.trim() || 'CO').substring(0, 2).toUpperCase(),
      roleTitle: roleTitle.trim() || 'Placement Role (Draft)',
      packageLpa: packageLpa || 0,
      location: location.trim() || 'TBD',
      employmentType,
      eligibleBranches: extractedBranches,
      minCgpa: extractedMinCgpa,
      graduationYear: extractedGradYears[0] || extractedGradYear || 2027,
      graduationYears: extractedGradYears,
      driveDate: deadline,
      status: 'draft',
      registeredCount: initialDrive?.registeredCount || 0,
      shortlistedCount: initialDrive?.shortlistedCount || 0,
      selectedCount: initialDrive?.selectedCount || 0,
      deadline,
      description: rawText, // Raw Text as source of truth
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiConfirmed: false,
      recruiter_id: initialDrive?.recruiter_id || user?.id,
      recruiter_email: initialDrive?.recruiter_email || user?.email,
      created_at: initialDrive?.created_at || new Date().toISOString(),
    };

    if (initialDrive && onDriveUpdated) {
      onDriveUpdated(drivePayload);
    } else {
      onDriveCreated(drivePayload);
    }
    onClose();
  };

  const handleConfirmRequirements = async () => {
    const rawText = jobDescription.trim();
    if (!rawText) {
      setAnalysisError('Raw job description cannot be empty.');
      setStep('form');
      return;
    }

    const drivePayload: PlacementDrive = {
      id: initialDrive?.id || `drive-${Date.now()}`,
      companyId: initialDrive?.companyId || `comp-${Date.now()}`,
      companyName: companyName.trim() || 'Company',
      companyLogo: (companyName.trim() || 'CO').substring(0, 2).toUpperCase(),
      roleTitle: roleTitle.trim() || 'Campus Placement Opportunity',
      packageLpa: packageLpa || 0,
      location: location.trim() || 'Location as per JD',
      employmentType,
      eligibleBranches: extractedBranches,
      minCgpa: extractedMinCgpa,
      graduationYear: extractedGradYears[0] || extractedGradYear || 2027,
      graduationYears: extractedGradYears,
      driveDate: deadline,
      status: (initialDrive?.status || 'PENDING_APPROVAL') as any,
      registeredCount: initialDrive?.registeredCount || 0,
      shortlistedCount: initialDrive?.shortlistedCount || 0,
      selectedCount: initialDrive?.selectedCount || 0,
      deadline,
      description: rawText, // Current Raw Text is single source of truth
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiExplanation: extractedExplanation || `Requirements extracted strictly from the recruiter-provided job description for ${roleTitle}.`,
      aiConfirmed: true,
      recruiter_id: initialDrive?.recruiter_id || user?.id,
      recruiter_email: initialDrive?.recruiter_email || user?.email,
      created_at: initialDrive?.created_at || new Date().toISOString(),
      pipeline: initialDrive?.pipeline || {
        eligible: 150,
        applied: 0,
        shortlisted: 0,
        interview: 0,
        selected: 0,
      },
      aiInsights: {
        topMatchingSkills: extractedRequiredSkills,
        commonSkillGaps: extractedPreferredSkills.slice(0, 2),
        preparationAdvice: extractedRequiredSkills.length > 0
          ? `Target revision for core requirements: ${extractedRequiredSkills.join(', ')}.`
          : 'Review standard technical assessment concepts.',
      },
    };

    try {
      if (initialDrive && onDriveUpdated) {
        const updated = await apiService.updateDrive(initialDrive.id, drivePayload);
        onDriveUpdated(updated || drivePayload);
      } else {
        const created = await apiService.createDrive(drivePayload);
        onDriveCreated(created || drivePayload);
      }
    } catch (err: any) {
      console.error('CreateDriveModal: Failed API drive creation', err);
      onDriveCreated(drivePayload);
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B1628] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden border border-[#243650] my-8 animate-in fade-in zoom-in-95 duration-150 text-[#F8FAFC]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#101D31] border-b border-[#243650] text-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#3B82F6] to-[#06B6D4] text-white font-bold text-xs shadow-glow-brand">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                {initialDrive ? 'Edit Placement Drive' : 'Create Placement Drive'}
              </h3>
              <p className="text-xs text-[#CBD5E1]">Raw Text AI Analysis &amp; Requirement Extraction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner */}
          {analysisError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[#FCA5A5] flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Analysis Failed</p>
                <p className="text-[11px] opacity-90">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Stale Analysis Alert */}
          {isAnalysisStale && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#FCD34D] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="font-semibold">Analysis outdated — Raw text changed. Analyze again to update job details.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-3 h-3" />}
                onClick={handleStartAIAnalysis}
              >
                Analyze Again
              </Button>
            </div>
          )}

          {/* STEP 1: FORM INPUT */}
          {step === 'form' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartAIAnalysis();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                    placeholder="e.g. Acme Corp / TechNova Solutions"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Job Title (Optional — AI will auto-detect)</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                    placeholder="e.g. Backend Developer / Auto-detected from JD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                    placeholder="e.g. Bengaluru / Pune / Remote"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Package (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageLpa || ''}
                    onChange={(e) => setPackageLpa(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 12.0"
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="PPO">PPO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E2E8F0] mb-1">Application Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#E2E8F0]">Raw Job Description (Single Source of Truth) *</label>
                  <span className="text-[10px] text-[#60A5FA] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#06B6D4]" /> AI parses ONLY this text
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste current raw job description, requirements, or hiring info here (e.g. React Developer with React, TypeScript... or Python Developer with FastAPI, Docker...)"
                  className="w-full text-xs p-3 bg-[#101D31] border border-[#243650] rounded-lg font-mono text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] leading-relaxed"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Paste the full job description. AI analysis dynamically extracts skills, eligibility, CGPA, and branch requirements strictly from this text.
                </p>
              </div>

              <div className="pt-4 border-t border-[#243650] flex items-center justify-between">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                  <Button variant="primary" size="sm" type="submit" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    Analyze with AI
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: PROCESSING STATE */}
          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#3B82F6]/20 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-[#3B82F6] border-t-transparent animate-spin"></div>
                <Bot className="w-8 h-8 text-[#06B6D4] absolute inset-0 m-auto" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">AI Job Description Analysis</h4>
              <p className="text-xs text-[#CBD5E1] max-w-sm mx-auto">{analysisStatusText}</p>
              <div className="flex items-center justify-center gap-2 text-xs text-[#60A5FA]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing raw text in real-time...</span>
              </div>
            </div>
          )}

          {/* STEP 3: AI EXTRACTED REVIEW & HUMAN-IN-THE-LOOP EDITOR */}
          {step === 'review' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#243650]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">AI Extracted Requirements</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                    <Sparkles className="w-3 h-3 text-[#06B6D4]" /> Dynamic AI Extraction
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('form')}
                  >
                    Edit Raw Text
                  </Button>
                  <Button
                    variant={isEditingRequirements ? 'primary' : 'outline'}
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => setIsEditingRequirements(!isEditingRequirements)}
                  >
                    {isEditingRequirements ? 'Done Editing' : 'Fine-Tune'}
                  </Button>
                </div>
              </div>

              {/* Extracted Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#101D31] p-3.5 rounded-xl border border-[#243650]">
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Role</span>
                  <span className="text-xs font-bold text-[#F8FAFC]">{roleTitle || 'Campus Role'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Location</span>
                  <span className="text-xs font-bold text-[#F8FAFC]">{location || 'TBD'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Package</span>
                  <span className="text-xs font-bold text-[#86EFAC]">
                    {packageLpa > 0 ? `₹${packageLpa} LPA` : 'As per policy'}
                  </span>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Eligibility Criteria</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl">
                    <span className="text-[10px] font-semibold text-[#CBD5E1] block">Minimum CGPA</span>
                    {isEditingRequirements ? (
                      <input
                        type="number"
                        step="0.1"
                        value={extractedMinCgpa || ''}
                        onChange={(e) => setExtractedMinCgpa(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 7.5"
                        className="w-full mt-1 text-xs p-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded font-bold"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#F8FAFC]">
                        {extractedMinCgpa > 0 ? extractedMinCgpa : 'No minimum CGPA'}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl sm:col-span-2">
                    <span className="text-[10px] font-semibold text-[#CBD5E1] block mb-1">Eligible Branches</span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedBranches.length === 0 ? (
                        <span className="text-xs text-[#94A3B8] italic">All branches eligible</span>
                      ) : (
                        extractedBranches.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]"
                          >
                            {b}
                            {isEditingRequirements && (
                              <button onClick={() => handleRemoveBranch(b)} className="hover:text-[#EF4444]">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                    {isEditingRequirements && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Add branch..."
                          value={newBranchInput}
                          onChange={(e) => setNewBranchInput(e.target.value)}
                          className="text-xs p-1 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded w-24 uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleAddBranch}
                          className="px-2 py-1 text-xs bg-[#3B82F6] text-white rounded font-medium cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl sm:col-span-3">
                    <span className="text-[10px] font-semibold text-[#CBD5E1] block mb-1.5">Eligible Graduation Year(s)</span>
                    <div className="flex flex-wrap gap-2">
                      {[2024, 2025, 2026, 2027, 2028].map((year) => {
                        const isSelected = extractedGradYears.includes(year);
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (extractedGradYears.length > 1) {
                                  setExtractedGradYears(extractedGradYears.filter((y) => y !== year));
                                }
                              } else {
                                setExtractedGradYears([...extractedGradYears, year].sort());
                              }
                            }}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-[#0B1628] text-[#94A3B8] border-[#243650] hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                            Batch {year}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Required Skills (Extracted from Raw Text)</h5>
                  <span className="text-[11px] text-[#94A3B8]">{extractedRequiredSkills.length} Detected</span>
                </div>
                <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl flex flex-wrap gap-1.5 min-h-[48px] items-center">
                  {extractedRequiredSkills.length === 0 ? (
                    <span className="text-xs text-[#64748B] italic">No mandatory skills detected in text</span>
                  ) : (
                    extractedRequiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30"
                      >
                        {skill}
                        {isEditingRequirements && (
                          <button onClick={() => handleRemoveRequiredSkill(skill)} className="hover:text-[#EF4444]">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                  {isEditingRequirements && (
                    <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-[#243650]">
                      <input
                        type="text"
                        placeholder="Add required skill..."
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        className="text-xs p-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddRequiredSkill}
                        className="px-2.5 py-1 text-xs bg-[#3B82F6] text-white rounded font-semibold cursor-pointer"
                      >
                        + Add Skill
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Preferred / Secondary Skills</h5>
                <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl flex flex-wrap gap-1.5 min-h-[40px] items-center">
                  {extractedPreferredSkills.length === 0 ? (
                    <span className="text-xs text-[#64748B] italic">No secondary skills specified</span>
                  ) : (
                    extractedPreferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border border-[rgba(6,182,212,0.30)]"
                      >
                        {skill}
                        {isEditingRequirements && (
                          <button onClick={() => handleRemovePreferredSkill(skill)} className="hover:text-[#EF4444]">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* AI Explanation & Human-in-the-Loop Footer Notice */}
              <div className="p-3.5 rounded-xl bg-[#14243B] border border-[#243650]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-[#06B6D4]" /> AI Analysis Rationale
                  </span>
                  <span className="text-[10px] font-semibold text-[#CBD5E1] bg-[#0B1628] px-2 py-0.5 rounded border border-[#243650]">
                    Generated strictly from Raw Text
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">
                  {extractedExplanation || extractedSummary || "AI extracted placement requirements strictly from the provided raw text."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#243650] flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setStep('form')}>
                  Back to Raw Text
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send className="w-3.5 h-3.5" />}
                    onClick={handleConfirmRequirements}
                  >
                    {initialDrive ? 'Update Drive' : 'Save & Submit for Approval'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
