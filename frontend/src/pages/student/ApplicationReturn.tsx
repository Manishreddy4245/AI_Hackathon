import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Building2,
  Briefcase,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../services/api';
import { usePlacement } from '../../context/PlacementContext';

export const ApplicationReturn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { triggerToast } = usePlacement();

  const driveId = searchParams.get('drive_id') || '';
  const token = searchParams.get('token') || undefined;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appData, setAppData] = useState<any>(null);
  const [statusState, setStatusState] = useState<'pending' | 'completed' | 'not_confirmed'>('pending');

  useEffect(() => {
    if (!driveId) {
      setLoading(false);
      return;
    }

    apiService.getExternalApplicationStatus(driveId, token)
      .then((res) => {
        setAppData(res);
        if (res.is_completed || res.application_status === 'EXTERNAL_APPLICATION_COMPLETED') {
          setStatusState('completed');
        } else if (res.application_status === 'APPLICATION_NOT_CONFIRMED') {
          setStatusState('not_confirmed');
        } else {
          setStatusState('pending');
        }
      })
      .catch((err) => {
        console.warn('Could not load application return status:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [driveId, token]);

  const handleConfirm = async (completed: boolean) => {
    if (!driveId) return;
    setSubmitting(true);

    try {
      const res = await apiService.confirmExternalApplication({
        drive_id: driveId,
        token: token,
        completed: completed
      });

      if (completed) {
        setStatusState('completed');
        triggerToast(`You have successfully applied for ${res.company_name || 'the company'}!`, 'success');
      } else {
        setStatusState('not_confirmed');
        triggerToast('Application marked as not confirmed.', 'warning');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to update application confirmation.';
      triggerToast(detail, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-xs font-semibold">Verifying external application return status...</p>
      </div>
    );
  }

  const company = appData?.company_name || 'Company';
  const role = appData?.job_title || 'Software Engineer';
  const externalUrl = appData?.application_url;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 text-[#CBD5E1]">
      <PageHeader
        title="External Application Return"
        subtitle="Confirmation and status tracking for company-hosted applications."
        icon={<ExternalLink className="w-5 h-5 text-white" />}
      />

      {/* ========================================================= */}
      {/* STATE 1: PENDING CONFIRMATION                             */}
      {/* ========================================================= */}
      {statusState === 'pending' && (
        <Card className="p-6 sm:p-8 bg-[#101D31] border-[#243650] shadow-2xl text-center space-y-6 text-[#F8FAFC]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/30 text-[#60A5FA] flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 uppercase tracking-wider">
              Application In Progress
            </span>
            <h2 className="text-2xl font-black text-[#F8FAFC] tracking-tight">{company}</h2>
            <p className="text-sm font-semibold text-[#60A5FA]">{role}</p>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-left text-xs space-y-2 text-[#CBD5E1]">
            <p className="font-semibold text-[#F8FAFC]">External Application Website:</p>
            {externalUrl ? (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#38BDF8] hover:underline flex items-center gap-1.5 break-all text-[11px]"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {externalUrl}
              </a>
            ) : (
              <span className="text-[#94A3B8] italic">Direct portal submission</span>
            )}
            <p className="text-[11px] text-[#94A3B8] pt-1 leading-relaxed">
              PlaceMind cannot automatically verify external forms without an authorized employer callback.
              Please confirm whether you submitted your application on their portal.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Did you complete your application on the company website?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                disabled={submitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleConfirm(true)}
                className="w-full sm:w-auto bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold"
              >
                {submitting ? 'Confirming...' : 'Yes, I completed it'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={submitting}
                icon={<XCircle className="w-4 h-4" />}
                onClick={() => handleConfirm(false)}
                className="w-full sm:w-auto border-[#243650] text-[#CBD5E1]"
              >
                No, not yet
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* STATE 2: SUCCESS / CONFIRMED                              */}
      {/* ========================================================= */}
      {statusState === 'completed' && (
        <Card className="p-6 sm:p-8 bg-[#101D31] border-[#22C55E]/40 shadow-2xl text-center space-y-6 text-[#F8FAFC]">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.30)] text-[#4ADE80] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.30)] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" /> Application Recorded
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
              Application Successful!
            </h2>
            <p className="text-sm text-[#CBD5E1]">
              You have successfully applied for:
            </p>
            <div className="pt-2">
              <span className="text-xl font-black text-[#F8FAFC] block">{company}</span>
              <span className="text-sm font-semibold text-[#60A5FA]">{role}</span>
            </div>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-xs text-[#94A3B8] space-y-1">
            <p className="text-[#CBD5E1] font-semibold">✓ External application recorded in PlaceMind.</p>
            <p className="text-[11px]">
              Status: <span className="font-mono text-[#4ADE80] font-bold">EXTERNAL_APPLICATION_COMPLETED (Self-confirmed)</span>
            </p>
            <p className="text-[11px]">Placement Officers have been notified of your completed application.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/student/dashboard')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Go to My Applications
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/student/drives')}
            >
              Back to Placement Drives
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* STATE 3: NOT CONFIRMED / CANCELLED                        */}
      {/* ========================================================= */}
      {statusState === 'not_confirmed' && (
        <Card className="p-6 sm:p-8 bg-[#101D31] border-[rgba(239,68,68,0.30)] shadow-2xl text-center space-y-6 text-[#F8FAFC]">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.30)] text-[#F87171] flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#F8FAFC] tracking-tight">
              Application Not Confirmed
            </h2>
            <p className="text-xs text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
              Your external application for <strong className="text-white">{company}</strong> ({role}) could not be verified as completed.
            </p>
          </div>

          <div className="p-4 bg-[#0B1628] rounded-xl border border-[#243650] text-xs text-[#94A3B8] space-y-1 text-left">
            <p className="text-[#CBD5E1] font-semibold">Want to complete it now?</p>
            <p className="text-[11px]">
              You can reopen the company application portal anytime. Once submitted, return here to record your confirmed application.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {externalUrl && (
              <Button
                variant="primary"
                onClick={() => {
                  window.open(externalUrl, '_blank');
                  setStatusState('pending');
                }}
                icon={<ExternalLink className="w-4 h-4" />}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              >
                Try Again / Open Career Page
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/student/drives')}
            >
              Back to Placement Drives
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
