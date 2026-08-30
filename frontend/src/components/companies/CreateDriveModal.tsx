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
  FileText,
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

  // Primary Raw Input States
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [packageLpa, setPackageLpa] = useState<number>(0);
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Internship' | 'Contract'>('Full-time');
  const [deadline, setDeadline] = useState('');

  // Structured / Extracted Requirements States
  const [extractedMinCgpa, setExtractedMinCgpa] = useState<number>(0);
  const [extractedGradYear, setExtractedGradYear] = useState<number | null>(null);
  const [extractedGradYears, setExtractedGradYears] = useState<number[]>([]);
  const [extractedBranches, setExtractedBranches] = useState<string[]>([]);
  const [extractedRequiredSkills, setExtractedRequiredSkills] = useState<string[]>([]);
  const [extractedPreferredSkills, setExtractedPreferredSkills] = useState<string[]>([]);
  const [extractedExplanation, setExtractedExplanation] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<string>('');

  // Modal Flow & Analysis State
  const [step, setStep] = useState<'form' | 'analyzing' | 'review'>('form');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState('AI is analyzing the current raw job description...');
  const [isEditingRequirements, setIsEditingRequirements] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Helper inputs for adding new items in review step
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newPrefSkillInput, setNewPrefSkillInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');
  const [newGradYearInput, setNewGradYearInput] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);

  // Initialize or reset state when modal opens or initialDrive changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialDrive) {
      const d: any = initialDrive;
      const comp = d.companyName || d.company_name || d.company || d.name || user?.companyName || (user?.role === 'recruiter' && user?.name && !user.name.toLowerCase().includes('demo') ? user.name : '') || '';
      const role = d.roleTitle || d.role_title || d.job_title || d.title || d.role || d.designation || '';
      let desc = d.description || d.rawText || d.raw_text || d.job_description || d.jobDescription || d.jd_text || d.jdText || '';
      const loc = d.location || d.job_location || d.jobLocation || d.city || '';
      const pkg = d.packageLpa ?? d.package_lpa ?? d.ctc ?? d.package ?? d.salary ?? 0;
      const empType = d.employmentType || d.employment_type || d.type || 'Full-time';
      const dead = d.deadline || d.applicationDeadline || d.application_deadline || d.driveDate || d.drive_date || d.endDate || d.end_date || '';
      const cgpa = d.minCgpa ?? d.min_cgpa ?? d.cgpa_cutoff ?? d.cgpaCutoff ?? d.cgpa ?? 0;
      const gradYear = d.graduationYear ?? d.graduation_year ?? d.grad_year ?? d.batch ?? null;
      const gradYears = d.graduationYears || d.graduation_years || (gradYear ? [gradYear] : []);
      const branches = d.eligibleBranches || d.eligible_branches || d.branches || d.department || d.departments || [];
      const reqSkills = d.requiredSkills || d.required_skills || d.skills || d.technical_skills || [];
      const prefSkills = d.preferredSkills || d.preferred_skills || d.good_to_have_skills || d.goodToHaveSkills || [];
      const aiExp = d.aiExplanation || d.ai_explanation || d.explanation || '';

      // If raw description is empty, synthesize a descriptive summary so the edit textarea is never blank
      if (!desc.trim()) {
        const parts = [];
        if (role) parts.push(`Role: ${role}${comp ? ` at ${comp}` : ''}`);
        if (loc) parts.push(`Location: ${loc}`);
        if (pkg) parts.push(`Package: ₹${pkg} LPA`);
        if (cgpa) parts.push(`Minimum CGPA: ${cgpa}`);
        if (branches.length) parts.push(`Eligible Branches: ${branches.join(', ')}`);
        if (gradYears.length) parts.push(`Graduation Batch: ${gradYears.join(', ')}`);
        if (reqSkills.length) parts.push(`Required Skills: ${reqSkills.join(', ')}`);
        if (prefSkills.length) parts.push(`Preferred Skills: ${prefSkills.join(', ')}`);
        desc = parts.join('\n');
      }

      setCompanyName(comp);
      setRoleTitle(role);
      setJobDescription(desc);
      setLocation(loc);
      setPackageLpa(pkg);
      setEmploymentType(empType as any);
      setDeadline(dead);
      setExtractedMinCgpa(cgpa);
      setExtractedGradYear(gradYear);
      setExtractedGradYears(gradYears);
      setExtractedBranches(branches);
      setExtractedRequiredSkills(reqSkills);
      setExtractedPreferredSkills(prefSkills);
      setExtractedExplanation(aiExp);
      setLastAnalyzedText(desc);
      setHasAnalyzed(Boolean(reqSkills.length > 0 || branches.length > 0 || cgpa > 0));
      setStep('form');
      setAnalysisError(null);

      // Asynchronously fetch complete document from backend to ensure deep consistency
      if (d.id) {
        apiService.getDrive(d.id).then((fullDrive: any) => {
          if (!fullDrive) return;
          const fullComp = fullDrive.companyName || fullDrive.company_name || fullDrive.company;
          const fullRole = fullDrive.roleTitle || fullDrive.role_title || fullDrive.job_title;
          const fullDesc = fullDrive.description || fullDrive.rawText || fullDrive.raw_text;
          const fullLoc = fullDrive.location;
          const fullPkg = fullDrive.packageLpa ?? fullDrive.package_lpa;
          const fullDead = fullDrive.deadline || fullDrive.applicationDeadline || fullDrive.driveDate;
          const fullCgpa = fullDrive.minCgpa ?? fullDrive.min_cgpa;
          const fullBranches = fullDrive.eligibleBranches || fullDrive.eligible_branches;
          const fullReqSkills = fullDrive.requiredSkills || fullDrive.required_skills;
          const fullPrefSkills = fullDrive.preferredSkills || fullDrive.preferred_skills;

          if (fullComp) setCompanyName(fullComp);
          if (fullRole) setRoleTitle(fullRole);
          if (fullDesc && fullDesc.trim()) setJobDescription(fullDesc);
          if (fullLoc) setLocation(fullLoc);
          if (fullPkg != null) setPackageLpa(fullPkg);
          if (fullDead) setDeadline(fullDead);
          if (fullCgpa != null) setExtractedMinCgpa(fullCgpa);
          if (fullBranches?.length) setExtractedBranches(fullBranches);
          if (fullReqSkills?.length) setExtractedRequiredSkills(fullReqSkills);
          if (fullPrefSkills?.length) setExtractedPreferredSkills(fullPrefSkills);
        }).catch(() => {});
      }
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

  const handleSaveDraft = async () => {
    const rawText = jobDescription.trim();
    if (!rawText) {
      setAnalysisError('Please enter a job description to save draft.');
      return;
    }

    const initD: any = initialDrive;
    const drivePayload: any = {
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
      status: 'DRAFT',
      registeredCount: initD?.registeredCount ?? initD?.registered_count ?? 0,
      shortlistedCount: initD?.shortlistedCount ?? initD?.shortlisted_count ?? 0,
      selectedCount: initD?.selectedCount ?? initD?.selected_count ?? 0,
      deadline,
      description: rawText,
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiConfirmed: false,
      recruiter_id: initD?.recruiter_id ?? initD?.recruiterId ?? user?.id,
      recruiter_email: initD?.recruiter_email ?? initD?.recruiterEmail ?? user?.email,
    };

    setIsSaving(true);
    try {
      let savedDrive: PlacementDrive;
      if (initialDrive && initialDrive.id) {
        savedDrive = await apiService.updateDrive(initialDrive.id, drivePayload);
        if (onDriveUpdated) onDriveUpdated(savedDrive);
      } else {
        savedDrive = await apiService.createDrive(drivePayload);
        if (onDriveCreated) onDriveCreated(savedDrive);
      }
      onClose();
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRequirements = async () => {
    const rawText = jobDescription.trim();
    if (!rawText) {
      setAnalysisError('Raw job description cannot be empty.');
      setStep('form');
      return;
    }

    const initD: any = initialDrive;
    const drivePayload: any = {
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
      status: 'SUBMITTED_TO_OFFICER',
      registeredCount: initD?.registeredCount ?? initD?.registered_count ?? 0,
      shortlistedCount: initD?.shortlistedCount ?? initD?.shortlisted_count ?? 0,
      selectedCount: initD?.selectedCount ?? initD?.selected_count ?? 0,
      deadline,
      description: rawText,
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiExplanation: extractedExplanation || `Requirements extracted strictly from the recruiter-provided job description for ${roleTitle}.`,
      aiConfirmed: true,
      recruiter_id: initD?.recruiter_id ?? initD?.recruiterId ?? user?.id,
      recruiter_email: initD?.recruiter_email ?? initD?.recruiterEmail ?? user?.email,
    };

    setIsSaving(true);
    try {
      let savedDrive: PlacementDrive;
      if (initialDrive && initialDrive.id) {
        savedDrive = await apiService.updateDrive(initialDrive.id, drivePayload);
        const currSt = (initialDrive.status || '').toUpperCase();
        if (currSt !== 'ACTIVE' && currSt !== 'ANNOUNCED') {
          try {
            savedDrive = await apiService.submitDriveToOfficer(initialDrive.id);
          } catch {
            // Already submitted or updated
          }
        }
        if (onDriveUpdated) onDriveUpdated(savedDrive);
      } else {
        savedDrive = await apiService.createDrive(drivePayload);
        if (onDriveCreated) onDriveCreated(savedDrive);
      }
      onClose();
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'Failed to submit placement drive.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0B1628] border border-[#243650] rounded-2xl w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between p-3.5 sm:p-4 border-b border-[#243650] bg-[#101D31] gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#F8FAFC] truncate">
                {initialDrive ? 'Edit Placement Drive Requirements' : 'Create Campus Placement Drive'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
                Driven strictly by recruiter raw text & dynamic AI requirement extraction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
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

          {/* Step Navigation Tabs for Existing Drive */}
          {initialDrive && (
            <div className="flex items-center gap-2 p-1 bg-[#101D31] border border-[#243650] rounded-xl">
              <button
                type="button"
                onClick={() => setStep('form')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  step === 'form'
                    ? 'bg-[#3B82F6] text-white shadow-sm'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> 1. Job Description & Details
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasAnalyzed(true);
                  setStep('review');
                }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  step === 'review'
                    ? 'bg-[#3B82F6] text-white shadow-sm'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> 2. Extracted Criteria ({extractedRequiredSkills.length} skills, {extractedBranches.length} branches)
              </button>
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
