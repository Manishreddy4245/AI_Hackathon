import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  ArrowLeft,
  GraduationCap,
  Mail,
  Award,
  Code,
  Briefcase,
  CheckCircle2,
  Sparkles,
  BookOpen,
  FolderGit2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MatchScore } from '../../components/ui/MatchScore';
import { usePlacement } from '../../context/PlacementContext';

export const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, isShortlisted, toggleShortlist } = usePlacement();

  const student = students.find((s) => s.id === id) || students[0];
  const shortlisted = isShortlisted(student.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={`Candidate Profile — ${student.name}`}
        subtitle="Detailed student readiness evaluation, technical projects, and placement history."
        icon={<UserCheck className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/candidates')}>
              Back to Candidates
            </Button>
            <Button
              variant={shortlisted ? 'outline' : 'primary'}
              onClick={() => toggleShortlist(student.id)}
            >
              {shortlisted ? 'Remove Shortlist' : 'Shortlist Candidate'}
            </Button>
          </div>
        }
      />

      {/* PROFILE SUMMARY HERO CARD */}
      <Card className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#243650] shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#F8FAFC]">{student.name}</h2>
                <StatusBadge status={shortlisted ? 'shortlisted' : student.placementStatus} />
              </div>
              <p className="text-xs font-bold text-[#CBD5E1] mt-1">
                Roll No: <span className="font-mono text-[#F8FAFC]">{student.rollNumber}</span> &bull; {student.branch} ({student.batch})
              </p>
              <div className="flex items-center gap-4 text-xs text-[#CBD5E1] mt-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#3B82F6]" /> {student.email}
                </span>
                <span className="flex items-center gap-1 font-bold text-[#F8FAFC]">
                  <GraduationCap className="w-3.5 h-3.5 text-[#3B82F6]" /> CGPA: {student.cgpa}
                </span>
              </div>
            </div>
          </div>

          {/* PLACEMENT READINESS SCORE GAUGE */}
          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] shadow-sm flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#17253A" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#3B82F6"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * (student.readinessScore || 82)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-black text-[#FFFFFF]">{student.readinessScore || 82}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#F8FAFC] block">Placement Readiness</span>
              <span className="text-[11px] text-[#CBD5E1] block">Score: {student.readinessScore || 82} / 100</span>
              <span className="text-[10px] font-bold text-[#86EFAC] bg-[rgba(34,197,94,0.10)] px-2 py-0.5 rounded border border-[rgba(34,197,94,0.25)] mt-1 inline-block">
                High Qualification
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* APPLICATION PIPELINE STAGE BREAKDOWN */}
      <Card className="bg-[#101D31] border-[#243650] text-[#F8FAFC]">
        <CardHeader className="border-b border-[#1B2A40]">
          <CardTitle>Placement Activity Breakdown</CardTitle>
          <p className="text-xs text-[#CBD5E1]">Student participation history across campus drives</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-[#0B1628] rounded-xl border border-[#243650]">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Registered</span>
              <div className="text-xl font-bold text-[#F8FAFC] mt-0.5">Yes ✓</div>
            </div>
            <div className="p-3 bg-[rgba(59,130,246,0.10)] rounded-xl border border-[rgba(59,130,246,0.25)]">
              <span className="text-[10px] font-bold text-[#60A5FA] uppercase">Applied Drives</span>
              <div className="text-xl font-bold text-[#60A5FA] mt-0.5">{student.applicationsCount} Drives</div>
            </div>
            <div className="p-3 bg-[rgba(168,85,247,0.10)] rounded-xl border border-[rgba(168,85,247,0.25)]">
              <span className="text-[10px] font-bold text-[#C084FC] uppercase">Shortlisted</span>
              <div className="text-xl font-bold text-[#C084FC] mt-0.5">{student.shortlistsCount} Drives</div>
            </div>
            <div className="p-3 bg-[rgba(245,158,11,0.10)] rounded-xl border border-[rgba(245,158,11,0.25)]">
              <span className="text-[10px] font-bold text-[#FCD34D] uppercase">Interviews</span>
              <div className="text-xl font-bold text-[#FCD34D] mt-0.5">{student.interviewsCount} Rounds</div>
            </div>
            <div className="p-3 bg-[rgba(34,197,94,0.10)] rounded-xl border border-[rgba(34,197,94,0.25)]">
              <span className="text-[10px] font-bold text-[#86EFAC] uppercase">Selected</span>
              <div className="text-xl font-bold text-[#86EFAC] mt-0.5">
                {student.placementStatus === 'placed' ? `Placed (${student.placedPackage} LPA)` : 'Pending'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRID: SKILLS, PROJECTS & CERTIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SKILLS & PROJECTS (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills Badges */}
          <Card className="p-5 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-[#3B82F6]" /> Technical Skills Portfolio
            </h3>
            <div className="flex flex-wrap gap-2">
              {student.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-lg bg-[#0B1628] border border-[#243650] text-[#60A5FA] text-xs font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Technical Projects */}
          <Card className="p-5 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#3B82F6]" /> Notable Software Projects
            </h3>
            <div className="space-y-3">
              {student.projects && student.projects.length > 0 ? (
                student.projects.map((proj) => (
                  <div key={proj.name} className="p-4 rounded-xl border border-[#243650] bg-[#0B1628] space-y-2">
                    <h4 className="text-sm font-bold text-[#F8FAFC]">{proj.name}</h4>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">{proj.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.techStack.map((tech) => (
                        <span key={tech} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#14243B] text-[#CBD5E1] border border-[#243650]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#94A3B8]">No project details uploaded yet.</p>
              )}
            </div>
          </Card>
        </div>

        {/* CERTIFICATIONS & QUICK ACTIONS (1 col) */}
        <div className="space-y-6">
          <Card className="p-5 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#22C55E]" /> Verified Certifications
            </h3>
            <div className="space-y-3">
              {student.certifications && student.certifications.length > 0 ? (
                student.certifications.map((cert) => (
                  <div key={cert.name} className="p-3 rounded-lg border border-[#243650] bg-[#0B1628] space-y-1">
                    <span className="text-xs font-bold text-[#F8FAFC] block leading-snug">{cert.name}</span>
                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-medium">
                      <span>{cert.issuer}</span>
                      <span>Issued: {cert.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#94A3B8]">No external certifications linked.</p>
              )}
            </div>
          </Card>

          {/* Quick Match Action */}
          <Card className="p-5 border-[#243650] bg-[#0B1628] text-[#F8FAFC] space-y-3">
            <span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" /> AI Recommendation
            </span>
            <p className="text-xs text-[#CBD5E1] leading-relaxed font-medium">
              "Strong technical readiness for backend development roles. Highly recommended for TechNova and DataSphere screening rounds."
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => navigate('/matching')}
            >
              Evaluate in AI Matching Hub
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
