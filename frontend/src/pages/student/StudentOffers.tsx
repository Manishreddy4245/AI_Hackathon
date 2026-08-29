import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Briefcase,
  X,
  FileCheck,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { OfferLetterCard } from '../../components/offers/OfferLetterCard';
import { apiService } from '../../services/api';
import { PlacementOffer } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { useAuth } from '../../context/AuthContext';

export const StudentOffers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerToast } = usePlacement();

  const [offers, setOffers] = useState<PlacementOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<PlacementOffer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Accept Modal State
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState<boolean>(false);
  const [joiningDate, setJoiningDate] = useState<string>('');
  const [preferredLocation, setPreferredLocation] = useState<string>('');
  const [emergencyName, setEmergencyName] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [accepting, setAccepting] = useState<boolean>(false);

  // Decline Modal State
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declining, setDeclining] = useState<boolean>(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await apiService.getMyOffers();
      setOffers(data || []);
      if (data && data.length > 0) {
        setSelectedOffer(data[0]);
      } else {
        setSelectedOffer(null);
      }
    } catch (err: any) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  const openAcceptModal = (offer: PlacementOffer) => {
    setSelectedOffer(offer);
    setJoiningDate(offer.joining_date || new Date().toISOString().split('T')[0]);
    setPreferredLocation(offer.job_location || 'Bengaluru, India');
    setEmergencyName('');
    setEmergencyPhone('');
    setStudentNotes('');
    setIsAcceptModalOpen(true);
  };

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    if (!joiningDate) {
      triggerToast('Please provide your confirmed date of joining.', 'warning');
      return;
    }

    setAccepting(true);
    try {
      const payload = {
        action: 'ACCEPT' as const,
        joining_date: joiningDate,
        preferred_location: preferredLocation,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        notes: studentNotes.trim() || undefined,
      };

      const updated = await apiService.respondToOffer(selectedOffer.id, payload);
      triggerToast(`🎉 Congratulations! You have successfully accepted the offer from ${selectedOffer.company_name}!`, 'success');
      setIsAcceptModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      console.error('Accept offer failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to accept offer.';
      triggerToast(msg, 'error');
    } finally {
      setAccepting(false);
    }
  };

  const openDeclineModal = (offer: PlacementOffer) => {
    setSelectedOffer(offer);
    setDeclineReason('');
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;

    setDeclining(true);
    try {
      const payload = {
        action: 'DECLINE' as const,
        decline_reason: declineReason.trim() || 'Candidate chose not to accept this placement offer.',
      };

      await apiService.respondToOffer(selectedOffer.id, payload);
      triggerToast(`You have formally declined the offer from ${selectedOffer.company_name}.`, 'info');
      setIsDeclineModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      console.error('Decline offer failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to decline offer.';
      triggerToast(msg, 'error');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Placement Offers &amp; Joining"
          subtitle="Review official employment letters, compensation packages, and confirm onboarding logistics."
          icon={<Award className="w-5 h-5 text-emerald-400" />}
        />

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/student/drives')}
            className="text-xs text-[#CBD5E1] border-[#243650]"
          >
            Browse Active Drives
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        /* Empty State */
        <Card className="bg-[#101D31] border-[#243650] text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg">No placement offers released yet</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-2 leading-relaxed">
            When recruiters finalize round selections, official employment offer letters and compensation breakdowns will be delivered here for your review and formal acceptance.
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => navigate('/student/applications')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              View My Applications
            </Button>
          </div>
        </Card>
      ) : (
        /* Offers Hub Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Navigation: Offers List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] px-1">
              Received Offers ({offers.length})
            </h3>
            {offers.map((off) => {
              const isSelected = selectedOffer?.id === off.id;
              const isAccepted = off.status === 'ACCEPTED' || off.status === 'JOINING_CONFIRMED';
              const isDeclined = off.status === 'DECLINED';

              return (
                <div
                  key={off.id}
                  onClick={() => setSelectedOffer(off)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#14243B] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-[#101D31] border-[#243650] hover:border-[#31527A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {off.company_name}
                      </h4>
                      <p className="text-xs font-semibold text-cyan-400 mt-0.5">{off.designation || off.job_title}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400">₹{off.package_lpa?.toFixed(1)} LPA</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1C2C42] text-[11px]">
                    <span className="text-[#94A3B8] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joining: {off.joining_date}
                    </span>
                    {isAccepted && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Accepted
                      </span>
                    )}
                    {isDeclined && (
                      <span className="text-rose-400 font-bold">Declined</span>
                    )}
                    {!isAccepted && !isDeclined && (
                      <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Action Required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Main View: Formal Offer Letter Display */}
          <div className="lg:col-span-8">
            {selectedOffer ? (
              <OfferLetterCard
                offer={selectedOffer}
                onAccept={() => openAcceptModal(selectedOffer)}
                onDecline={() => openDeclineModal(selectedOffer)}
              />
            ) : (
              <div className="p-12 text-center text-[#94A3B8]">Select an offer to inspect details.</div>
            )}
          </div>
        </div>
      )}

      {/* ACCEPT OFFER MODAL */}
      {isAcceptModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#243650] flex items-center justify-between bg-[#14243B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Accept Employment Offer</h3>
                  <p className="text-xs text-[#94A3B8]">
                    {selectedOffer.company_name} — {selectedOffer.designation || selectedOffer.job_title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0B1628] border border-[#243650] text-[#94A3B8] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAccept} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 leading-relaxed">
                🎉 By accepting, your student profile will be officially marked as <strong>Placed</strong> and your confirmed joining date will be communicated to {selectedOffer.company_name}.
              </div>

              <div>
                <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Confirmed Date of Joining *
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Preferred Joining Location
                </label>
                <input
                  type="text"
                  required
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Parent / Guardian"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">Student Remarks / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any dietary preferences, onboarding queries, or relocation notes."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-4 border-t border-[#243650] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAcceptModalOpen(false)}
                  disabled={accepting}
                  className="border-[#243650] text-[#CBD5E1]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={accepting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-2"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm &amp; Sign Acceptance
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECLINE OFFER MODAL */}
      {isDeclineModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#101D31] border border-[#243650] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-[#243650] flex items-center justify-between bg-[#14243B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Decline Offer Letter</h3>
                  <p className="text-xs text-[#94A3B8]">{selectedOffer.company_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeclineModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0B1628] border border-[#243650] text-[#94A3B8] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecline} className="p-6 space-y-4">
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Are you sure you want to decline this employment offer from <strong>{selectedOffer.company_name}</strong>? This action will notify the placement cell and cannot be undone.
              </p>

              <div>
                <label className="text-xs font-bold text-[#CBD5E1] block mb-1.5">Reason for Declining (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Pursuing higher studies, accepted another off-campus/dream opportunity, or location constraints."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1628] border border-[#243650] text-white rounded-xl text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="pt-4 border-t border-[#243650] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeclineModalOpen(false)}
                  disabled={declining}
                  className="border-[#243650] text-[#CBD5E1]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={declining}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2"
                >
                  {declining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Declining...
                    </>
                  ) : (
                    'Confirm Decline'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
