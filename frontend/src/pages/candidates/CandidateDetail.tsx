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
      <Card className="p-6 bg-gradient-to-r from-white via-slate-50/60 to-brand-50/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                <StatusBadge status={shortlisted ? 'shortlisted' : student.placementStatus} />
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                Roll No: <span className="font-mono text-slate-900">{student.rollNumber}</span> &bull; {student.branch} ({student.batch})
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.email}
                </span>
                <span className="flex items-center gap-1 font-bold text-slate-900">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-600" /> CGPA: {student.cgpa}
                </span>
              </div>
            </div>
          </div>

          {/* PLACEMENT READINESS SCORE GAUGE */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#e2e8f0" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#0284c7"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * (student.readinessScore || 82)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-slate-900">{student.readinessScore || 82}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Placement Readiness</span>
              <span className="text-[11px] text-slate-500 block">Score: {student.readinessScore || 82} / 100</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                High Qualification
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* APPLICATION PIPELINE STAGE BREAKDOWN */}
      <Card>
        <CardHeader>
          <CardTitle>Placement Activity Breakdown</CardTitle>
          <p className="text-xs text-slate-500">Student participation history across campus drives</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Registered</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">Yes ✓</div>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Applied Drives</span>
              <div className="text-xl font-bold text-blue-800 mt-0.5">{student.applicationsCount} Drives</div>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80">
              <span className="text-[10px] font-bold text-purple-600 uppercase">Shortlisted</span>
              <div className="text-xl font-bold text-purple-800 mt-0.5">{student.shortlistsCount} Drives</div>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Interviews</span>
              <div className="text-xl font-bold text-amber-800 mt-0.5">{student.interviewsCount} Rounds</div>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Selected</span>
              <div className="text-xl font-bold text-emerald-800 mt-0.5">
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
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-brand-600" /> Technical Skills Portfolio
            </h3>
            <div className="flex flex-wrap gap-2">
              {student.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-2xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Technical Projects */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-brand-600" /> Notable Software Projects
            </h3>
            <div className="space-y-3">
              {student.projects && student.projects.length > 0 ? (
                student.projects.map((proj) => (
                  <div key={proj.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">{proj.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.techStack.map((tech) => (
                        <span key={tech} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No project details uploaded yet.</p>
              )}
            </div>
          </Card>
        </div>

        {/* CERTIFICATIONS & QUICK ACTIONS (1 col) */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Verified Certifications
            </h3>
            <div className="space-y-3">
              {student.certifications && student.certifications.length > 0 ? (
                student.certifications.map((cert) => (
                  <div key={cert.name} className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-xs font-bold text-slate-900 block leading-snug">{cert.name}</span>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{cert.issuer}</span>
                      <span>Issued: {cert.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No external certifications linked.</p>
              )}
            </div>
          </Card>

          {/* Quick Match Action */}
          <Card className="p-5 border-brand-200 bg-gradient-to-br from-brand-50 to-white space-y-3">
            <span className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" /> AI Recommendation
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
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
