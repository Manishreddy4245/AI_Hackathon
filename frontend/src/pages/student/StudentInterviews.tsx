import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Clock, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';

export const StudentInterviews: React.FC = () => {
  const navigate = useNavigate();
  const { interviewsList } = usePlacement();
  const { user } = useAuth();

  const isDemo = user?.email === 'student@demo.com' || user?.id === 'student-demo' || user?.id === 'rahul-verma';

  const myInterviews = interviewsList.filter((i) => {
    if (isDemo) {
      return i.candidateName.includes('Rahul') || i.candidateId === 'rahul-verma';
    }
    return (
      i.candidateId === user?.id ||
      ((i as any).candidateEmail && (i as any).candidateEmail === user?.email) ||
      (user?.name && i.candidateName.toLowerCase() === user.name.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Scheduled Interviews"
        subtitle="View venue details, evaluation slots and panel confirmations."
        icon={<Calendar className="w-5 h-5 text-white" />}
        action={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/student')}>
            Back to Student Dashboard
          </Button>
        }
      />

      <div className="space-y-4">
        {myInterviews.length > 0 ? (
          myInterviews.map((item) => (
            <Card key={item.id} className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] font-bold text-base flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-[#3B82F6]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC]">{item.companyName}</h3>
                    <p className="text-xs font-semibold text-[#CBD5E1] mt-0.5">{item.round} &bull; {item.roleTitle}</p>
                    <div className="flex items-center gap-3 text-xs text-[#CBD5E1] mt-2 font-medium">
                      <span className="flex items-center gap-1 text-[#FCD34D] bg-[rgba(245,158,11,0.10)] px-2.5 py-0.5 rounded border border-[rgba(245,158,11,0.25)] font-bold">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> {item.date} — {item.timeSlot}
                      </span>
                      <span className="flex items-center gap-1 text-[#CBD5E1] bg-[#14243B] px-2.5 py-0.5 rounded border border-[#243650] font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" /> {item.panelName} ({item.roomName})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#86EFAC] bg-[rgba(34,197,94,0.10)] px-3 py-1.5 rounded-lg border border-[rgba(34,197,94,0.25)]">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Scheduled &amp; Confirmed
                  </span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-3 text-[#F8FAFC]">
            <Calendar className="w-12 h-12 text-[#3B82F6] mx-auto opacity-70" />
            <h3 className="text-base font-bold text-[#F8FAFC]">No Interviews Scheduled Yet</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              When recruitment panels shortlist your profile and assign interview time slots, your confirmed rounds and venue details will appear here.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/student/drives')}>
              Explore Active Placement Drives
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
