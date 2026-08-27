import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ArrowLeft,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  Users,
  DoorOpen,
  Building,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../services/api';

import { VideoPracticeModal } from '../../components/student/VideoPracticeModal';
import { CustomMockInterviewModal } from '../../components/student/CustomMockInterviewModal';
import { Video, BrainCircuit } from 'lucide-react';

export const StudentInterviews: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVideoPracticeOpen, setIsVideoPracticeOpen] = useState(false);
  const [isMockInterviewOpen, setIsMockInterviewOpen] = useState(false);

  const fetchMyInterviews = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiService.getMyInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch student interviews:', err);
      setInterviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyInterviews();
  }, []);

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      <PageHeader
        title="My Scheduled Interviews"
        subtitle="View your interview panel assignments, assessment rooms, date & time schedules."
        icon={<Calendar className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<BrainCircuit className="w-3.5 h-3.5 text-cyan-300" />}
              onClick={() => setIsMockInterviewOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold"
            >
              🤖 Custom AI Mock Interview
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Video className="w-3.5 h-3.5 text-purple-300" />}
              onClick={() => setIsVideoPracticeOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold"
            >
              🎥 AI Video Practice Mode
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchMyInterviews(true)}
              disabled={refreshing}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/student')}
            >
              Back to Dashboard
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650]">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#94A3B8] font-medium">Loading your scheduled interview assignments...</p>
        </Card>
      ) : interviews.length > 0 ? (
        <div className="space-y-5">
          {interviews.map((item, idx) => {
            const company = item.company_name || item.companyName || 'Company';
            const role = item.job_title || item.roleTitle || 'Software Engineer';
            const panel = item.panel_name || item.panelName || 'Technical Interview Panel';
            const members: string[] = item.panel_members || item.panelMembers || [];
            const block = item.block || 'Block B';
            const room = item.room_number || item.roomNumber || item.room_name || item.roomName || 'B-204';
            const dateStr = item.date || 'TBD';
            const timeStr = item.start_time && item.end_time
              ? `${item.start_time} - ${item.end_time}`
              : (item.time || item.timeSlot || '10:00 AM - 10:30 AM');
            const status = (item.status || 'SCHEDULED').toUpperCase();

            return (
              <Card
                key={item.id || item.interview_id || idx}
                className="p-6 bg-[#101D31] border-[#243650] text-[#F8FAFC] shadow-xl hover:border-[#3B82F6]/50 transition-all"
              >
                {/* Header Row: Company, Role & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1B2A40]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/30 text-[#60A5FA] flex items-center justify-center shrink-0 font-bold shadow-sm">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-black text-[#F8FAFC] tracking-tight">{company}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> SHORTLISTED / INTERVIEW SCHEDULED
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#60A5FA] mt-0.5">
                        {role} &bull; <span className="text-[#CBD5E1]">{item.round || 'Technical Round 1'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#38BDF8] bg-[#0284C7]/15 px-3 py-1.5 rounded-xl border border-[#0284C7]/30">
                      Status: <strong className="text-white">{status}</strong>
                    </span>
                  </div>
                </div>

                {/* Interview Logistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  {/* 1. Date */}
                  <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" /> Interview Date
                    </span>
                    <p className="text-xs font-bold text-[#F8FAFC]">{dateStr}</p>
                  </div>

                  {/* 2. Time */}
                  <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Time Slot
                    </span>
                    <p className="text-xs font-bold text-[#FCD34D] font-mono">{timeStr}</p>
                  </div>

                  {/* 3. Block */}
                  <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#06B6D4]" /> Academic Block
                    </span>
                    <p className="text-xs font-bold text-[#F8FAFC]">{block}</p>
                  </div>

                  {/* 4. Room */}
                  <div className="p-3.5 bg-[#0B1628] rounded-xl border border-[#243650] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-[#A855F7]" /> Room Number
                    </span>
                    <p className="text-xs font-bold text-[#C084FC]">{room}</p>
                  </div>
                </div>

                {/* Panel & Panel Members Section */}
                <div className="mt-4 p-4 bg-[#0B1628] rounded-xl border border-[#243650] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#3B82F6]" /> Interview Panel
                    </span>
                    <p className="text-xs font-bold text-[#F8FAFC]">{panel}</p>
                  </div>

                  {members && members.length > 0 && (
                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                        Panel Members
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        {members.map((member, mIdx) => (
                          <span
                            key={mIdx}
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[#14243B] text-[#E2E8F0] border border-[#243650]"
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650] space-y-3 text-[#F8FAFC]">
          <Calendar className="w-12 h-12 text-[#3B82F6] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-[#F8FAFC]">No interviews scheduled yet.</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            When recruitment panels shortlist your profile and assign interview time slots, your confirmed rounds and venue details will appear here.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/student/drives')}>
            Explore Active Placement Drives
          </Button>
        </Card>
      )}

      {/* Video & Speech Practice Modal */}
      <VideoPracticeModal
        isOpen={isVideoPracticeOpen}
        onClose={() => setIsVideoPracticeOpen(false)}
      />

      {/* Custom AI Mock Interview Modal */}
      <CustomMockInterviewModal
        isOpen={isMockInterviewOpen}
        onClose={() => setIsMockInterviewOpen(false)}
        onNavigateToTopic={() => navigate('/student/assessment')}
      />
    </div>
  );
};
