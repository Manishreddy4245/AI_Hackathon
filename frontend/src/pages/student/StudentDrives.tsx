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
        icon={<Briefcase className="w-5 h-5 text-white" />}
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
            <Card key={drive.id} className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-base flex items-center justify-center shrink-0 shadow-md">
                    {drive.companyLogo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#F8FAFC]">{drive.companyName}</h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[rgba(34,197,94,0.10)] text-[#86EFAC] border border-[rgba(34,197,94,0.25)]">
                        Eligible ✓
                      </span>
                      {applied && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.30)]">
                          Application Submitted
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#CBD5E1] mt-1">
                      {drive.roleTitle} &bull; Package: <strong className="text-[#F8FAFC]">₹{drive.packageLpa} LPA</strong>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[#94A3B8] mt-2 flex-wrap font-medium">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> {drive.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#06B6D4]" /> Drive Date: {drive.driveDate}</span>
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
                    <span className="text-xs font-bold text-[#60A5FA] bg-[rgba(59,130,246,0.15)] px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.30)] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" /> Applied
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
