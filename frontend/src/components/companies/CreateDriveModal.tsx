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
  const [extractedGradYear, setExtractedGradYear] = useState<number | null>(null);
  const [extractedGradYears, setExtractedGradYears] = useState<number[]>([]);
  const [extractedBranches, setExtractedBranches] = useState<string[]>([]);
  const [extractedRequiredSkills, setExtractedRequiredSkills] = useState<string[]>([]);
  const [extractedPreferredSkills, setExtractedPreferredSkills] = useState<string[]>([]);
  const [extractedExplanation, setExtractedExplanation] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<string>('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');
  const [newGradYearInput, setNewGradYearInput] = useState('');

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
      setExtractedGradYear(initialDrive.graduationYear ?? null);
      setExtractedGradYears(initialDrive.graduationYears || (initialDrive.graduationYear ? [initialDrive.graduationYear] : []));
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
      setExtractedGradYear(null);
      setExtractedGradYears([]);
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
      if ((extracted as any).graduationYears && Array.isArray((extracted as any).graduationYears)) {
        setExtractedGradYears((extracted as any).graduationYears);
      } else if (extracted.graduationYear) {
        setExtractedGradYears([extracted.graduationYear]);
      } else {
        setExtractedGradYears([]);
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

  const handleAddGradYear = () => {
    const parsed = parseInt(newGradYearInput.trim(), 10);
    if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100 && !extractedGradYears.includes(parsed)) {
      setExtractedGradYears([...extractedGradYears, parsed].sort((a, b) => a - b));
      setNewGradYearInput('');
    }
  };

  const handleRemoveGradYear = (year: number) => {
    setExtractedGradYears(extractedGradYears.filter((y) => y !== year));
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
      graduationYear: extractedGradYears[0],
      graduationYears: extractedGradYears,
      driveDate: deadline,
      status: 'draft',
      registeredCount: initialDrive?.registeredCount || 0,
      shortlistedCount: initialDrive?.shortlistedCount || 0,
      selectedCount: initialDrive?.selectedCount || 0,
      deadline,
      description: rawText,
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
      graduationYear: extractedGradYears[0],
      graduationYears: extractedGradYears,
      driveDate: deadline,
      status: (initialDrive?.status || 'PENDING_APPROVAL') as any,
      registeredCount: initialDrive?.registeredCount || 0,
      shortlistedCount: initialDrive?.shortlistedCount || 0,
      selectedCount: initialDrive?.selectedCount || 0,
      deadline,
      description: rawText,
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
    };

    try {
      if (initialDrive && onDriveUpdated) {
        onDriveUpdated(drivePayload);
      } else {
        onDriveCreated(drivePayload);
      }
      onClose();
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to save confirmed placement drive.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0B1628] border border-[#243650] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#243650] bg-[#101D31]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                {initialDrive ? 'Edit Placement Drive Requirements' : 'Create Campus Placement Drive'}
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Driven strictly by recruiter raw text & dynamic AI requirement extraction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {analysisError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* STEP 1: RAW TEXT FORM INPUT */}
          {step === 'form' && (
            <form onSubmit={(e) => { e.preventDefault(); handleStartAIAnalysis(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#CBD5E1] block mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#CBD5E1] block mb-1">Role Title (Optional - AI extracts if empty)</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Backend Developer"
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#CBD5E1]">
                    Raw Job Description Text <span className="text-[#EF4444]">*</span>
                  </label>
                  <span className="text-[10px] text-[#94A3B8]">AI parses skills, CGPA, branches & graduation years</span>
                </div>
                <textarea
                  required
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste or type raw job requirements, e.g.:&#10;Backend Developer for Bengaluru office. Minimum CGPA: 7.5. Eligible branches: CSE, IT. Graduation batch: 2027. Required skills: Python, FastAPI, MongoDB. Good to have: AWS. Package: 12 LPA."
                  className="w-full text-xs p-3 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none font-mono leading-relaxed resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#CBD5E1] block mb-1">Location (Optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru / Remote"
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#CBD5E1] block mb-1">Package (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageLpa || ''}
                    onChange={(e) => setPackageLpa(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 12"
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#CBD5E1] block mb-1">Application Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#101D31] border border-[#243650] text-[#F8FAFC] rounded-xl focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#243650] flex items-center justify-between">
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
            </div>
          )}

          {/* STEP 3: AI EXTRACTED REVIEW & HUMAN-IN-THE-LOOP EDITOR */}
          {step === 'review' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#243650]">
                <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Review AI Requirements</span>
                <Button
                  variant={isEditingRequirements ? 'primary' : 'outline'}
                  size="sm"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditingRequirements(!isEditingRequirements)}
                >
                  {isEditingRequirements ? 'Done Fine-Tuning' : 'Fine-Tune Requirements'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#101D31] p-3.5 rounded-xl border border-[#243650]">
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Role</span>
                  <span className="text-xs font-bold text-[#F8FAFC]">{roleTitle || 'Campus Role'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Location</span>
                  <span className="text-xs font-bold text-[#F8FAFC]">{location || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Package</span>
                  <span className="text-xs font-bold text-[#86EFAC]">
                    {packageLpa > 0 ? `₹${packageLpa} LPA` : 'As per policy'}
                  </span>
                </div>
              </div>

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
                        className="w-full mt-1 text-xs p-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded font-bold"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#F8FAFC]">{extractedMinCgpa > 0 ? extractedMinCgpa : 'None'}</span>
                    )}
                  </div>

                  <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl sm:col-span-2">
                    <span className="text-[10px] font-semibold text-[#CBD5E1] block mb-1">Eligible Branches</span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedBranches.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]"
                          >
                            {b}
                            {isEditingRequirements && (
                              <button onClick={() => handleRemoveBranch(b)} className="hover:text-[#EF4444] cursor-pointer">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                      ))}
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
                        <button type="button" onClick={handleAddBranch} className="px-2 py-1 text-xs bg-[#3B82F6] text-white rounded font-medium cursor-pointer">+ Add</button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-[#101D31] border border-[#243650] rounded-xl sm:col-span-3">
                    <span className="text-[10px] font-semibold text-[#CBD5E1] block mb-1.5">Eligible Graduation Year(s)</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {extractedGradYears.length === 0 ? (
                        <span className="text-xs text-[#94A3B8] italic">No graduation year specified (All batches eligible)</span>
                      ) : (
                        extractedGradYears.map((year) => (
                          <span
                            key={year}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          >
                            Batch {year}
                            {isEditingRequirements && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGradYear(year)}
                                className="hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                    {isEditingRequirements && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#243650]/50">
                        <input
                          type="number"
                          placeholder="Add year e.g. 2029..."
                          value={newGradYearInput}
                          onChange={(e) => setNewGradYearInput(e.target.value)}
                          className="text-xs p-1 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded w-36"
                        />
                        <button
                          type="button"
                          onClick={handleAddGradYear}
                          className="px-2 py-1 text-xs bg-[#3B82F6] text-white rounded font-medium cursor-pointer"
                        >
                          + Add Batch
                        </button>
                      </div>
                    )}
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
