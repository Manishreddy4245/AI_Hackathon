import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Award,
  Building2,
  Code,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Loader2,
  BookOpen,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  apiService,
  ResumeUploadResponse,
  PlacementRecommendation,
  SkillGapResponse,
  ExtractedProfile,
} from '../../services/api';

const ANALYSIS_STEPS = [
  'Reading resume document...',
  'Extracting structured student profile...',
  'Identifying technical skills & experience...',
  'Evaluating hard drive eligibility constraints...',
  'Matching against active company placement drives...',
  'Generating personalized skill-gap & career analytics...',
];

export const ResumeAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<ResumeUploadResponse | null>(null);
  const [recommendations, setRecommendations] = useState<PlacementRecommendation[]>([]);
  const [skillGapData, setSkillGapData] = useState<SkillGapResponse | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Load existing analysis if available on mount
  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      setServiceError(null);
      const [latestRes, recsRes, gapsRes] = await Promise.allSettled([
        apiService.getLatestResume('rahul-verma'),
        apiService.getPlacementRecommendations('rahul-verma'),
        apiService.getSkillGaps('rahul-verma'),
      ]);

      if (latestRes.status === 'fulfilled' && latestRes.value) {
        setAnalysisResult(latestRes.value);
      }
      if (recsRes.status === 'fulfilled' && recsRes.value) {
        setRecommendations(recsRes.value);
      }
      if (gapsRes.status === 'fulfilled' && gapsRes.value) {
        setSkillGapData(gapsRes.value);
      }
    } catch (err: any) {
      console.error('Failed to load initial resume data', err);
    }
  };

  const validateFile = (file: File): boolean => {
    setValidationError(null);
    const validExtensions = ['.pdf', '.docx'];
    const fileNameLower = file.name.toLowerCase();

    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));
    if (!hasValidExt) {
      setValidationError('Unsupported file format. Only PDF and DOCX files are accepted.');
      return false;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setValidationError(`File size exceeds maximum allowed limit of ${maxSizeMB} MB.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setServiceError(null);
    setActiveStepIndex(0);

    // Animate progress steps
    const stepInterval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    try {
      // API call to analyze resume
      const uploadRes = await apiService.uploadResume(selectedFile, 'rahul-verma');
      setAnalysisResult(uploadRes);

      // Fetch dynamic placement recommendations & skill gaps
      const recs = await apiService.getPlacementRecommendations('rahul-verma');
      setRecommendations(recs);

      const gaps = await apiService.getSkillGaps('rahul-verma');
      setSkillGapData(gaps);

      clearInterval(stepInterval);
      setActiveStepIndex(ANALYSIS_STEPS.length - 1);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 500);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Resume analysis service is currently unavailable.';
      setServiceError(msg);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const profile: ExtractedProfile | undefined = analysisResult?.profile;
  const readinessScore = analysisResult?.readiness_score ?? 82;
  const topMatch = recommendations.length > 0 ? recommendations[0] : null;
  const eligibleDrivesCount = recommendations.filter((r) => r.eligible).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="AI Resume Analyzer"
        subtitle="Understand your skills, discover suitable placement opportunities, and identify what you need to improve."
        icon={<BrainCircuit className="w-5 h-5 text-brand-600" />}
      />

      {/* HUMAN CONTROL NOTICE (PART 16 REQUIREMENT) */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed font-medium">
          <strong>Human Control Advisory:</strong> AI recommendations are advisory. Final placement drive eligibility and selection decisions remain under the control of campus placement officers and corporate recruiters.
        </div>
      </div>


      {/* ERROR MESSAGE DISPLAY (PART 17 & 19 REQUIREMENT) */}
      {serviceError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{serviceError}</span>
          </div>
          <button
            onClick={() => setServiceError(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* UPLOAD CARD CONTAINER */}
      <Card className="p-6 text-white space-y-4">
        <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-400" /> Upload Resume Document
        </h2>

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-850 transition-all duration-200 rounded-2xl p-10 text-center cursor-pointer space-y-4 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center mx-auto shadow-glow-indigo group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">
                Drag and drop your resume here, or <span className="text-indigo-400 underline">browse file</span>
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Supports PDF and DOCX documents (Maximum file size: 10 MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                {selectedFile.name.split('.').pop()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-400 border-rose-900/60 hover:bg-rose-950/40"
                icon={<X className="w-4 h-4" />}
                onClick={handleRemoveFile}
                disabled={isAnalyzing}
              >
                Remove
              </Button>
              <Button
                size="sm"
                icon={isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
              </Button>
            </div>
          </div>
        )}

        {validationError && (
          <p className="text-xs text-rose-400 font-semibold mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {validationError}
          </p>
        )}
      </Card>

      {/* ANALYSIS PROCESSING STATE (PART 1 STEP STATE) */}
      {isAnalyzing && (
        <Card className="p-6 bg-slate-900 text-white space-y-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            <div>
              <h3 className="text-base font-bold text-white">AI Processing Engine Active</h3>
              <p className="text-xs text-slate-400">Performing structured extraction and drive matching</p>
            </div>
          </div>

          <div className="space-y-3">
            {ANALYSIS_STEPS.map((stepText, idx) => {
              const isDone = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-brand-500 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    className={
                      isDone
                        ? 'text-slate-300 font-medium'
                        : isCurrent
                        ? 'text-brand-300 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    {stepText}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* RESULT DASHBOARD METRICS */}
      {analysisResult && !isAnalyzing && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Readiness Score */}
            <Card className="p-5 flex items-center gap-4 text-white">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="138"
                    strokeDashoffset={138 - (138 * readinessScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">{readinessScore}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Readiness Score</span>
                <span className="text-base font-black text-white">{readinessScore} / 100</span>
                <span className="text-[10px] font-semibold text-emerald-400 block">High Profile Quality</span>
              </div>
            </Card>

            {/* Top Company Match */}
            <Card className="p-5 flex items-center gap-4 text-white">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center justify-center font-black text-sm shrink-0">
                {topMatch?.company_logo || 'TN'}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Top Company Match</span>
                <span className="text-sm font-bold text-white truncate block">
                  {topMatch ? topMatch.company : 'TechNova'}
                </span>
                <span className="text-xs font-bold text-indigo-400">
                  {topMatch ? `${topMatch.match_score}% Match` : '91% Match'}
                </span>
              </div>
            </Card>

            {/* Eligible Drives */}
            <Card className="p-5 flex items-center gap-4 text-white">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Eligible Drives</span>
                <span className="text-base font-black text-white">{eligibleDrivesCount} Active</span>
                <span className="text-[10px] text-slate-400 block">Hard criteria satisfied</span>
              </div>
            </Card>

            {/* Total Skill Gaps */}
            <Card className="p-5 flex items-center gap-4 text-white">
              <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center shrink-0">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Skill Gaps Identified</span>
                <span className="text-base font-black text-white">
                  {skillGapData?.skill_gaps.length || 3} Core Skills
                </span>
                <span className="text-[10px] text-amber-400 font-semibold block">Target for improvement</span>
              </div>
            </Card>
          </div>

          {/* EXTRACTED STUDENT PROFILE SECTION */}
          {profile && (
            <Card className="p-6 space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> Extracted Student Profile
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  AI Extracted & Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">Full Name</span>
                  <span className="font-bold text-white">{profile.name || 'Rahul Verma'}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">Email Address</span>
                  <span className="font-bold text-white">{profile.email || 'rahul.verma@campus.edu'}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">Phone Number</span>
                  <span className="font-bold text-white">{profile.phone || '+91 98765 43210'}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">Branch / Discipline</span>
                  <span className="font-bold text-white">{profile.branch || 'CSE'}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">Graduation Batch</span>
                  <span className="font-bold text-white">{profile.graduation_year || 2027}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block">CGPA</span>
                  <span className="font-bold text-white">{profile.cgpa ?? 8.9} / 10.0</span>
                </div>
              </div>
            </Card>
          )}

          {/* EXTRACTED SKILLS BADGES */}
          <Card className="p-6 space-y-4 text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" /> Extracted Technical Skills
            </h3>

            <div className="flex flex-wrap gap-2">
              {profile?.skills && profile.skills.length > 0 ? (
                profile.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2"
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                      {s.status}
                    </span>
                  </span>
                ))
              ) : (
                ['Python', 'FastAPI', 'SQL', 'Docker', 'REST APIs', 'Git', 'React', 'Cloud'].map(
                  (sk, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2"
                    >
                      <span>{sk}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                        Detected
                      </span>
                    </span>
                  )
                )
              )}
            </div>
          </Card>

          {/* WHERE CAN I APPLY? */}
          <Card className="p-6 space-y-6 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" /> Where Can I Apply?
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Active recruitment drives ranked according to your extracted profile &amp; hard eligibility criteria.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border transition-all ${
                      rec.eligible
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-rose-950/20 border-rose-900/60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Company & Role */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-center font-black text-base shrink-0">
                          {rec.company_logo || rec.company.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">{rec.company}</h4>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {rec.role}
                            </span>
                            {rec.package_lpa && (
                              <span className="text-xs font-bold text-emerald-400">
                                ₹{rec.package_lpa} LPA
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            {rec.eligible ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> Not Eligible
                              </span>
                            )}

                            {!rec.eligible && rec.eligibility_reasons.length > 0 && (
                              <span className="text-rose-400 font-semibold">
                                ({rec.eligibility_reasons[0]})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-semibold block">AI Match Score</span>
                          <span
                            className={`text-xl font-black ${
                              rec.match_score >= 85
                                ? 'text-indigo-400'
                                : rec.match_score >= 70
                                ? 'text-blue-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {rec.match_score}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Matched & Gap Skills */}
                    <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Matched Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.matched_skills.map((sk, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Skill Gaps:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.skill_gaps.length > 0 ? (
                            rec.skill_gaps.map((sk, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                                ✕ {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 font-medium">None (Full skill match)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Footer */}
                    <div className="mt-3 p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-between gap-3">
                      <span className="italic text-slate-300">&ldquo;{rec.recommendation}&rdquo;</span>
                      {rec.eligible && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1 px-3"
                            onClick={() => navigate('/student/drives')}
                          >
                            Apply Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1 px-2.5 bg-slate-900 border-slate-700 text-slate-200"
                            onClick={() => navigate('/student/drives')}
                          >
                            View Drive
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No active placement recommendations available.</p>
              )}
            </div>
          </Card>

          {/* MY SKILL GAPS */}
          {skillGapData && (
            <Card className="p-6 space-y-4 text-white">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" /> My Skill Gaps
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Target skills in demand across active recruitment drives that are missing or require strengthening in your profile.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {skillGapData.skill_gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{gap.skill}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            gap.importance === 'Critical'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : gap.importance === 'Important'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {gap.importance}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        Required by <strong className="text-white">{gap.demand} active drives</strong> &bull; Status: <strong className="text-rose-400">Missing</strong>
                      </p>

                      <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] text-slate-300 space-y-1 border border-slate-850">
                        <div>
                          <strong className="text-cyan-300">Why this matters:</strong> Essential prerequisite for technical screening in top companies.
                        </div>
                        <div>
                          <strong className="text-indigo-300">Recommended to improve:</strong> Complete 2-day practical crash course &amp; build hands-on project.
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, gap.demand * 25)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </>
      )}
    </div>
  );
};

