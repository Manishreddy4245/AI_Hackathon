import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Clock, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';

export const StudentInterviews: React.FC = () => {
  const navigate = useNavigate();
  const { interviewsList } = usePlacement();

  const myInterviews = interviewsList.filter((i) => i.candidateName.includes('Rahul'));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Scheduled Interviews"
        subtitle="View venue details, evaluation slots and panel confirmations."
        icon={<Calendar className="w-5 h-5 text-brand-600" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      <div className="space-y-4">
        {myInterviews.map((item) => (
          <Card key={item.id} className="p-6 bg-white border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-bold text-base flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{item.companyName}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{item.round} &bull; {item.roleTitle}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 font-bold">
                      <Clock className="w-3.5 h-3.5" /> {item.date} — {item.timeSlot}
                    </span>
                    <span className="flex items-center gap-1 text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.panelName} ({item.roomName})
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Scheduled & Confirmed
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
