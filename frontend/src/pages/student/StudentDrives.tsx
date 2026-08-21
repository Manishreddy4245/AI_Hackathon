import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, Building2, MapPin, CheckCircle2, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';

export const StudentDrives: React.FC = () => {
  const navigate = useNavigate();
  const { drives, hasAppliedToDrive, applyToDrive } = usePlacement();

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Eligible Placement Drives"
        subtitle="Explore active campus drives, requirement breakdowns and submit applications."
        icon={<Briefcase className="w-5 h-5 text-brand-600" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      <div className="space-y-4">
        {drives.map((drive) => {
          const applied = hasAppliedToDrive(drive.id);

          return (
            <Card key={drive.id} className="p-6 bg-white border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                    {drive.companyLogo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{drive.companyName}</h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Eligible ✓
                      </span>
                      {applied && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Application Submitted
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1">
                      {drive.roleTitle} &bull; Package: <strong className="text-slate-900">₹{drive.packageLpa} LPA</strong>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap font-medium">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {drive.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Drive Date: {drive.driveDate}</span>
                      <span>Min CGPA: {drive.minCgpa}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/companies/${drive.id}`)}
                  >
                    View Drive Details
                  </Button>
                  {applied ? (
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" /> Applied
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => applyToDrive(drive.id)}
                    >
                      Apply Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
