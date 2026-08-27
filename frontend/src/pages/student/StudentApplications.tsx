import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../services/api';

export const StudentApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'shortlisted' | 'applied'>('all');

  const fetchApplications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiService.getMyApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch student applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const shortlistedCount = applications.filter((a) => a.status === 'SHORTLISTED').length;
  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'shortlisted') return app.status === 'SHORTLISTED';
    if (statusFilter === 'applied') return app.status !== 'SHORTLISTED';
    return true;
  });

  return (
    <div className="space-y-6 pb-12 text-[#CBD5E1]">
      <PageHeader
        title="My Applications"
        subtitle="Track your campus placement drives and external job applications in real-time."
        icon={<Briefcase className="w-5 h-5 text-white" />}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchApplications(true)}
              disabled={refreshing}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => navigate('/student/drives')}
            >
              Explore Drives
            </Button>
          </div>
        }
      />

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8] font-semibold">Total Submitted</span>
            <Briefcase className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <p className="text-2xl font-black mt-2">{applications.length}</p>
          <span className="text-[11px] text-[#94A3B8]">Active recruitment applications</span>
        </Card>

        <Card className="p-4 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8] font-semibold">Shortlisted for Rounds</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <p className="text-2xl font-black mt-2 text-[#86EFAC]">{shortlistedCount}</p>
          <span className="text-[11px] text-[#86EFAC]">Ready for technical interviews</span>
        </Card>

        <Card className="p-4 bg-[#101D31] border-[#243650] text-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8] font-semibold">Under Review</span>
            <Layers className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-black mt-2 text-[#FCD34D]">
            {Math.max(0, applications.length - shortlistedCount)}
          </p>
          <span className="text-[11px] text-[#94A3B8]">Recruiter screening in progress</span>
        </Card>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 bg-[#0B1628] p-1.5 rounded-xl border border-[#243650] w-fit">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#14243B]'
          }`}
        >
          All Applications ({applications.length})
        </button>
        <button
          onClick={() => setStatusFilter('shortlisted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            statusFilter === 'shortlisted'
              ? 'bg-[#22C55E] text-[#0F172A] shadow-sm font-extrabold'
              : 'text-[#86EFAC] hover:text-white hover:bg-[#14243B]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Shortlisted ({shortlistedCount})
        </button>
        <button
          onClick={() => setStatusFilter('applied')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'applied'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#14243B]'
          }`}
        >
          Under Review ({Math.max(0, applications.length - shortlistedCount)})
        </button>
      </div>

      {/* APPLICATIONS LIST */}
      {loading ? (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650]">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#94A3B8] font-medium">Loading your applications...</p>
        </Card>
      ) : filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApps.map((app) => {
            const isShortlisted = app.status === 'SHORTLISTED';
            return (
              <Card
                key={app.id || `${app.drive_id}-${app.applied_at}`}
                className={`p-5 bg-[#101D31] border transition-all text-[#F8FAFC] ${
                  isShortlisted
                    ? 'border-[rgba(34,197,94,0.40)] bg-gradient-to-br from-[#101D31] to-[rgba(34,197,94,0.06)]'
                    : 'border-[#243650]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#F8FAFC]">{app.company_name}</h3>
                      {app.source === 'external' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30">
                          External Opportunity
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                          Campus Drive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] font-semibold mt-0.5">{app.job_title}</p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1 shrink-0 ${
                      isShortlisted
                        ? 'bg-[rgba(34,197,94,0.20)] text-[#86EFAC] border-[rgba(34,197,94,0.40)]'
                        : app.status === 'EXTERNAL_APPLICATION_COMPLETED'
                        ? 'bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border-[rgba(34,197,94,0.30)]'
                        : app.status === 'APPLICATION_STARTED'
                        ? 'bg-[rgba(245,158,11,0.15)] text-[#FCD34D] border-[rgba(245,158,11,0.30)]'
                        : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.30)]'
                    }`}
                  >
                    {isShortlisted ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> : null}
                    {isShortlisted
                      ? 'Shortlisted'
                      : app.status === 'EXTERNAL_APPLICATION_COMPLETED'
                      ? 'Application Completed'
                      : app.status === 'APPLICATION_STARTED'
                      ? 'Application Started'
                      : 'Applied'}
                  </span>
                </div>

                {app.interview && (
                  <div className="mt-4 p-3 bg-[#0B1628] rounded-xl border border-[rgba(34,197,94,0.30)] text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[#86EFAC] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {app.interview.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {app.interview.time}
                      </span>
                    </div>
                    <div className="text-[#CBD5E1] text-[11px] flex items-center justify-between pt-1 border-t border-[#243650]">
                      <span>Panel: <strong>{app.interview.panel_name}</strong></span>
                      <span>Room: <strong>{app.interview.room_number || app.interview.room_name}</strong></span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#243650]/60 flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Applied on: <strong className="text-[#CBD5E1]">{app.applied_at}</strong></span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 px-2.5 bg-[#0B1628] border-[#243650] text-[#CBD5E1]"
                    onClick={() => navigate('/student/drives')}
                  >
                    View Opportunity &rarr;
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-[#101D31] border-[#243650] text-[#94A3B8] space-y-3">
          <Briefcase className="w-10 h-10 text-[#64748B] mx-auto" />
          <h3 className="text-base font-bold text-[#F8FAFC]">No applications submitted yet</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            Discover campus placement drives and external tech opportunities matched against your resume profile.
          </p>
          <Button
            variant="primary"
            className="mt-2"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => navigate('/student/drives')}
          >
            Discover Placement Drives
          </Button>
        </Card>
      )}
    </div>
  );
};
