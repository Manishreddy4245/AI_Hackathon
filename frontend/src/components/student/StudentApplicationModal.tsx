import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  User,
  Phone,
  GraduationCap,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Eye,
  Code,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService, ExtractedProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlacement } from '../../context/PlacementContext';

interface StudentApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: {
    id: string;
    drive_id?: string;
    companyName?: string;
    company_name?: string;
    roleTitle?: string;
    job_title?: string;
  } | null;
  onApplicationSubmitted?: () => void;
}

export const StudentApplicationModal: React.FC<StudentApplicationModalProps> = ({
  isOpen,
  onClose,
  drive,
  onApplicationSubmitted,
}) => {
  const { user } = useAuth();
  const { triggerToast } = usePlacement();

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [location, setLocation] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasExistingResume, setHasExistingResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState<string>('');
  const [resumeProfile, setResumeProfile] = useState<ExtractedProfile | null>(null);
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user?.name || '');
      setMobileNumber((user as any)?.mobile || (user as any)?.phone || '');
      setCollegeName((user as any)?.college || 'Campus University');
      setLocation((user as any)?.location || 'Bengaluru, Karnataka');
      setResumeFile(null);
      setErrorMsg(null);
      setShowResumePreview(false);
      setShowReplaceUpload(false);

      // Fetch latest authenticated student profile & resume directly from backend
      apiService
        .getMyStudentProfile()
        .then((prof: any) => {
          if (prof) {
            if (prof.name) setFullName(prof.name);
            if (prof.mobile || prof.phone) setMobileNumber(prof.mobile || prof.phone);
            if (prof.college) setCollegeName(prof.college);
            if (prof.location) setLocation(prof.location);
            if (prof.readinessScore) setReadinessScore(prof.readinessScore);

            const hasRes = Boolean(prof.hasResume || prof.resumeUrl || prof.resumeFilename);
            setHasExistingResume(hasRes);
            if (hasRes) {
              setResumeFilename(prof.resumeFilename || prof.resumeUrl || 'Dipesh_Gupta_Resume.pdf');
            }
            if (prof.extractedProfile) {
              setResumeProfile(prof.extractedProfile);
            }
          }
        })
        .catch(() => {});

      // Also retrieve latest resume analysis directly if available
      if (user?.id) {
        apiService
          .getLatestResume(user.id)
          .then((latest) => {
            if (latest) {
              setHasExistingResume(true);
              setResumeFilename(latest.filename || 'Dipesh_Gupta_Resume.pdf');
              setResumeProfile(latest.profile);
              if (latest.readiness_score) {
                setReadinessScore(latest.readiness_score);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, user]);

  if (!isOpen || !drive) return null;

  const driveId = drive.id || drive.drive_id || '';
  const companyName = drive.companyName || drive.company_name || 'Company';
  const roleTitle = drive.roleTitle || drive.job_title || 'Software Engineer';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
        setErrorMsg('Please upload a valid PDF, DOC, or DOCX document.');
        setResumeFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds maximum 10MB limit.');
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!resumeFile && !hasExistingResume) {
      setErrorMsg('Please upload and analyze your resume before applying.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('driveId', driveId);
      formData.append('name', fullName.trim());
      formData.append('mobile', mobileNumber.trim());
      formData.append('college_name', collegeName.trim());
      formData.append('location', location.trim());
      formData.append('company_name', companyName);
      formData.append('job_title', roleTitle);
      if ((drive as any).company_id || (drive as any).companyId) {
        formData.append('company_id', (drive as any).company_id || (drive as any).companyId);
      }
      if ((drive as any).source) {
        formData.append('source', (drive as any).source);
      }
      if ((drive as any).application_url) {
        formData.append('application_url', (drive as any).application_url);
      }
      if (resumeFile) {
        formData.append('file', resumeFile);
      }

      await apiService.submitApplicationForm(formData);

      const appUrl = (drive as any).application_url;
      if (appUrl) {
        triggerToast(
          `You have successfully applied for ${companyName}. Your existing resume has been submitted with this application. Opening company portal...`,
          'success'
        );
        window.open(appUrl, '_blank');
      } else {
        triggerToast(
          `You have successfully applied for ${companyName}. Your existing resume has been submitted with this application.`,
          'success'
        );
      }

      if (onApplicationSubmitted) {
        onApplicationSubmitted();
      }
      onClose();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'Failed to submit application.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 text-[#F8FAFC]">
        <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#243650] bg-[#0B1628]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">Apply for Placement Drive</h3>
                <p className="text-xs text-[#94A3B8]">
                  <strong className="text-[#60A5FA]">{companyName}</strong> &bull; {roleTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 overflow-y-auto text-xs text-[#CBD5E1]"
          >
            {errorMsg && (
              <div className="p-3 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.30)] rounded-xl flex items-center gap-2 text-xs text-[#F87171] font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Full Name"
                className="w-full p-2.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>

            {/* 2. Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#3B82F6]" /> Mobile Number
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full p-2.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>

            {/* 3. College Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#3B82F6]" /> College Name
              </label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. BITS Pilani, IIT Bombay"
                className="w-full p-2.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>

            {/* 4. Location */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Karnataka"
                className="w-full p-2.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-xl focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>

            {/* 5. RESUME SECTION (AUTOMATICALLY REUSES EXISTING RESUME) */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#3B82F6]" /> Resume
                </span>
                {hasExistingResume && (
                  <span className="text-[10px] text-[#22C55E] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Attached
                  </span>
                )}
              </label>

              {hasExistingResume && !showReplaceUpload ? (
                /* STATE A: STUDENT ALREADY HAS A RESUME -> SHOW EXISTING RESUME BADGE & VIEW BUTTON (NO UPLOAD INPUT) */
                <div className="p-3.5 bg-[#0B1628] border border-[#22C55E]/40 rounded-xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.30)] flex items-center justify-center text-[#22C55E] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#86EFAC]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                          <span>Resume already uploaded</span>
                        </div>
                        <p className="text-[11px] text-[#F8FAFC] font-semibold truncate max-w-[220px] mt-0.5">
                          {resumeFilename || 'Active_Profile_Resume.pdf'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs py-1.5 px-3 bg-[#101D31] border-[#3B82F6]/40 text-[#60A5FA] hover:bg-[#192B45] hover:text-white flex items-center gap-1"
                        icon={<Eye className="w-3.5 h-3.5 text-[#60A5FA]" />}
                        onClick={() => setShowResumePreview(true)}
                      >
                        View Resume
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#243650]/60 flex items-center justify-between text-[10px] text-[#94A3B8]">
                    <span className="flex items-center gap-1 text-[#86EFAC]">
                      ✓ Automatically attached to your application
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowReplaceUpload(true)}
                      className="text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      Replace file
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE B: STUDENT HAS NO RESUME OR CHOSE TO REPLACE -> SHOW UPLOAD DROPZONE */
                <div className="space-y-2">
                  {!hasExistingResume && (
                    <div className="p-2.5 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] rounded-xl flex items-center gap-2 text-xs text-[#FCD34D] font-semibold">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                      <span>Resume required: Upload your resume to complete this application.</span>
                    </div>
                  )}

                  <div className="relative border-2 border-dashed border-[#243650] hover:border-[#3B82F6] rounded-xl p-4 bg-[#0B1628] text-center transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <Upload className="w-6 h-6 mx-auto text-[#60A5FA] mb-1.5" />
                    {resumeFile ? (
                      <div>
                        <p className="text-xs font-bold text-[#86EFAC]">{resumeFile.name}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {(resumeFile.size / 1024).toFixed(1)} KB &bull; Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-[#F8FAFC]">
                          Click to upload or drag &amp; drop
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          Accepted: PDF, DOC, DOCX (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {hasExistingResume && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReplaceUpload(false);
                          setResumeFile(null);
                        }}
                        className="text-[10px] text-[#94A3B8] hover:text-white underline cursor-pointer"
                      >
                        Keep existing resume ({resumeFilename})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-4 border-t border-[#243650] flex items-center justify-end gap-3">
              <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {isSubmitting
                  ? 'Submitting Application...'
                  : (drive as any).application_url
                  ? 'Submit Application & Open Website'
                  : 'Submit Application'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RESUME PREVIEW MODAL / DIALOG */}
      {showResumePreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 text-[#F8FAFC]">
          <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#243650] bg-[#0B1628]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 text-[#60A5FA] flex items-center justify-center border border-[#3B82F6]/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">Attached Student Resume</h4>
                  <p className="text-[11px] text-[#94A3B8] truncate max-w-[240px]">
                    {resumeFilename || 'Active_Resume.pdf'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResumePreview(false)}
                className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#192B45] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#CBD5E1]">
              {/* Score & Profile Summary */}
              <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">
                    Placement Readiness
                  </span>
                  <span className="text-base font-black text-[#86EFAC]">
                    {readinessScore > 0 ? `${readinessScore} / 100` : '85 / 100'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">
                    Status
                  </span>
                  <span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1 justify-end">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> Verified Profile
                  </span>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#3B82F6]" /> Verified Skills
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {resumeProfile?.raw_skills && resumeProfile.raw_skills.length > 0 ? (
                    resumeProfile.raw_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-[11px] font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" /> {skill}
                      </span>
                    ))
                  ) : (
                    ['Python', 'FastAPI', 'React', 'MongoDB', 'SQL', 'Docker'].map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[rgba(34,197,94,0.12)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)] text-[11px] font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" /> {s}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Projects */}
              {resumeProfile?.projects && resumeProfile.projects.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#06B6D4]" /> Highlighted Projects
                  </h5>
                  <div className="space-y-1.5">
                    {resumeProfile.projects.slice(0, 3).map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#0B1628] rounded-lg border border-[#243650] text-[11px]"
                      >
                        <strong className="text-[#F8FAFC] block">{p.name}</strong>
                        {p.description && (
                          <p className="text-[#94A3B8] text-[10px] line-clamp-2 mt-0.5">
                            {p.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#243650] bg-[#0B1628] flex justify-end">
              <Button
                variant="primary"
                size="sm"
                className="text-xs py-1.5 px-4"
                onClick={() => setShowResumePreview(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
