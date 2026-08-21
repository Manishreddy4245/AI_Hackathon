import React, { useState } from 'react';
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
} from 'lucide-react';
import { PlacementDrive } from '../../types';
import { Button } from '../ui/Button';

interface CreateDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriveCreated: (drive: PlacementDrive) => void;
}

export const CreateDriveModal: React.FC<CreateDriveModalProps> = ({
  isOpen,
  onClose,
  onDriveCreated,
}) => {
  const [step, setStep] = useState<'form' | 'analyzing' | 'review'>('form');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState('AI is analyzing the job description...');

  // Form State
  const [companyName, setCompanyName] = useState('TechNova Solutions');
  const [roleTitle, setRoleTitle] = useState('Backend Developer');
  const [jobDescription, setJobDescription] = useState(
    'We are seeking a Backend Developer proficient in Python and SQL to build high-scale microservices. Candidates should have solid experience with REST APIs. Familiarity with FastAPI, Docker, Git, and Cloud infrastructure is highly preferred. Minimum CGPA requirement is 7.5 for CSE and IT branches of 2027 batch.'
  );
  const [location, setLocation] = useState('Hyderabad');
  const [packageLpa, setPackageLpa] = useState<number>(10.5);
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Internship' | 'PPO'>('Full-time');
  const [deadline, setDeadline] = useState('2026-08-30');

  // Extracted AI Requirements State (Human-in-the-Loop Editable)
  const [isEditingRequirements, setIsEditingRequirements] = useState(false);
  const [extractedMinCgpa, setExtractedMinCgpa] = useState<number>(7.5);
  const [extractedGradYear, setExtractedGradYear] = useState<number>(2027);
  const [extractedBranches, setExtractedBranches] = useState<string[]>(['CSE', 'IT']);
  const [extractedRequiredSkills, setExtractedRequiredSkills] = useState<string[]>(['Python', 'SQL', 'REST APIs']);
  const [extractedPreferredSkills, setExtractedPreferredSkills] = useState<string[]>(['FastAPI', 'Docker', 'Git', 'Cloud']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');

  if (!isOpen) return null;

  const handleStartAIAnalysis = () => {
    setStep('analyzing');
    setAnalysisProgress(15);
    setAnalysisStatusText('Extracting semantic skill tokens...');

    setTimeout(() => {
      setAnalysisProgress(55);
      setAnalysisStatusText('Evaluating CGPA and branch eligibility rules...');
    }, 700);

    setTimeout(() => {
      setAnalysisProgress(90);
      setAnalysisStatusText('Generating placement matching strategy...');
    }, 1400);

    setTimeout(() => {
      setAnalysisProgress(100);
      setStep('review');
    }, 2000);
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

  const handleRemovePreferredSkill = (skill: string) => {
    setExtractedPreferredSkills(extractedPreferredSkills.filter((s) => s !== skill));
  };

  const handleSaveDraft = () => {
    const newDrive: PlacementDrive = {
      id: `drive-${Date.now()}`,
      companyId: `comp-${Date.now()}`,
      companyName,
      companyLogo: companyName.substring(0, 2).toUpperCase(),
      roleTitle,
      packageLpa,
      location,
      employmentType,
      eligibleBranches: extractedBranches,
      minCgpa: extractedMinCgpa,
      graduationYear: extractedGradYear,
      driveDate: deadline,
      status: 'draft',
      registeredCount: 0,
      shortlistedCount: 0,
      selectedCount: 0,
      deadline,
      description: jobDescription,
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiConfirmed: false,
    };
    onDriveCreated(newDrive);
    onClose();
  };

  const handleConfirmRequirements = () => {
    const newDrive: PlacementDrive = {
      id: `drive-${Date.now()}`,
      companyId: `comp-${Date.now()}`,
      companyName,
      companyLogo: companyName.substring(0, 2).toUpperCase(),
      roleTitle,
      packageLpa,
      location,
      employmentType,
      eligibleBranches: extractedBranches,
      minCgpa: extractedMinCgpa,
      graduationYear: extractedGradYear,
      driveDate: deadline,
      status: 'open',
      registeredCount: 0,
      shortlistedCount: 0,
      selectedCount: 0,
      deadline,
      description: jobDescription,
      requiredSkills: extractedRequiredSkills,
      preferredSkills: extractedPreferredSkills,
      aiExplanation: 'This role primarily requires backend development skills with Python and SQL. Candidates with REST API experience and FastAPI exposure are likely to be strong matches.',
      aiConfirmed: true,
      pipeline: {
        eligible: 150,
        applied: 0,
        shortlisted: 0,
        interview: 0,
        selected: 0,
      },
      aiInsights: {
        topMatchingSkills: extractedRequiredSkills,
        commonSkillGaps: extractedPreferredSkills.slice(0, 2),
        preparationAdvice: 'Schedule a 1-day revision workshop covering REST API standards and database querying.',
      },
    };
    onDriveCreated(newDrive);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Create Placement Drive</h3>
              <p className="text-xs text-slate-400">AI Job Description Analysis & Requirement Extraction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-400"
                    placeholder="e.g. TechNova Solutions"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-400"
                    placeholder="e.g. Backend Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    placeholder="e.g. Hyderabad"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={packageLpa}
                    onChange={(e) => setPackageLpa(parseFloat(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="PPO">PPO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Raw Job Description</label>
                  <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Paste raw text for AI auto-extraction
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste company JD requirements here..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 focus:outline-none focus:bg-white focus:border-slate-400 leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
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
                <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin"></div>
                <Bot className="w-8 h-8 text-brand-600 absolute inset-0 m-auto" />
              </div>
              <h4 className="text-base font-bold text-slate-900">AI Job Description Analysis</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{analysisStatusText}</p>
              <div className="w-48 bg-slate-100 h-2 rounded-full mx-auto overflow-hidden">
                <div
                  className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: AI EXTRACTED REVIEW & HUMAN-IN-THE-LOOP EDITOR */}
          {step === 'review' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Extracted Requirements</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                    <Sparkles className="w-3 h-3" /> AI Extracted
                  </span>
                </div>
                <Button
                  variant={isEditingRequirements ? 'primary' : 'outline'}
                  size="sm"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditingRequirements(!isEditingRequirements)}
                >
                  {isEditingRequirements ? 'Done Editing' : 'Edit Requirements'}
                </Button>
              </div>

              {/* Extracted Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Role</span>
                  <span className="text-xs font-bold text-slate-900">{roleTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="text-xs font-bold text-slate-900">{location}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Package</span>
                  <span className="text-xs font-bold text-emerald-700">₹{packageLpa} LPA</span>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Eligibility Criteria</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-semibold text-slate-500 block">Minimum CGPA</span>
                    {isEditingRequirements ? (
                      <input
                        type="number"
                        step="0.1"
                        value={extractedMinCgpa}
                        onChange={(e) => setExtractedMinCgpa(parseFloat(e.target.value))}
                        className="w-full mt-1 text-xs p-1.5 border border-slate-300 rounded font-bold"
                      />
                    ) : (
                      <span className="text-base font-bold text-slate-900">{extractedMinCgpa}</span>
                    )}
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Eligible Branches</span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedBranches.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {b}
                          {isEditingRequirements && (
                            <button onClick={() => handleRemoveBranch(b)} className="hover:text-rose-600">
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
                          placeholder="e.g. ECE"
                          value={newBranchInput}
                          onChange={(e) => setNewBranchInput(e.target.value)}
                          className="text-xs p-1 border rounded w-24 uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleAddBranch}
                          className="px-2 py-1 text-xs bg-slate-900 text-white rounded font-medium"
                        >
                          + Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Required Skills</h5>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                  {extractedRequiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-slate-900 text-white"
                    >
                      {skill}
                      {isEditingRequirements && (
                        <button onClick={() => handleRemoveRequiredSkill(skill)} className="hover:text-rose-300">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditingRequirements && (
                    <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-slate-100">
                      <input
                        type="text"
                        placeholder="Add required skill..."
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        className="text-xs p-1.5 border rounded flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddRequiredSkill}
                        className="px-2.5 py-1 text-xs bg-brand-600 text-white rounded font-semibold"
                      >
                        + Add Skill
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Preferred Skills</h5>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                  {extractedPreferredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200"
                    >
                      {skill}
                      {isEditingRequirements && (
                        <button onClick={() => handleRemovePreferredSkill(skill)} className="hover:text-rose-600">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Explanation & Human-in-the-Loop Footer Notice */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand-500/10 via-slate-50 to-brand-50 border border-brand-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-brand-600" /> AI Summary & Rationale
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                    AI-generated — review before publishing
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  "This role primarily requires backend development skills with Python and SQL. Candidates with REST API experience and FastAPI exposure are likely to be strong matches."
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
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
                    icon={<Check className="w-3.5 h-3.5" />}
                    onClick={handleConfirmRequirements}
                  >
                    Confirm & Publish Drive
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
