import React from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  Award,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Briefcase,
  DollarSign,
  FileText,
} from 'lucide-react';
import { PlacementOffer } from '../../types';
import { Button } from '../ui/Button';

interface OfferLetterCardProps {
  offer: PlacementOffer;
  onAccept?: () => void;
  onDecline?: () => void;
  hideActions?: boolean;
}

export const OfferLetterCard: React.FC<OfferLetterCardProps> = ({
  offer,
  onAccept,
  onDecline,
  hideActions = false,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (offer.status) {
      case 'ACCEPTED':
      case 'JOINING_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Offer Accepted
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Offer Declined
          </span>
        );
      case 'OFFERED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Action Required: Awaiting Decision
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0B1628] border border-[#243650] rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#243650]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">{offer.company_name}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-sm font-semibold text-cyan-400 mt-0.5">{offer.designation || offer.job_title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-[#CBD5E1] border-[#243650]"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" /> Print Letter
          </Button>
        </div>
      </div>

      {/* CTC & Key Compensation Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#101D31] border border-[#243650] rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-1">
            Total Compensation (CTC)
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ₹{offer.package_lpa?.toFixed(2)} <span className="text-xs font-semibold text-[#94A3B8]">LPA</span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">Annual Cost to Company</span>
        </div>

        <div className="bg-[#101D31] border border-[#243650] rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-1">
            Fixed Base Salary
          </span>
          <div className="text-xl font-black text-white">
            ₹{(offer.base_salary_lpa || offer.package_lpa * 0.8)?.toFixed(2)}{' '}
            <span className="text-xs font-semibold text-[#94A3B8]">LPA</span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">Base Pay &amp; Allowances</span>
        </div>

        <div className="bg-[#101D31] border border-[#243650] rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-1">
            Joining Date &amp; Location
          </span>
          <div className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" /> {offer.joining_date}
          </div>
          <div className="text-xs text-[#CBD5E1] flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" /> {offer.job_location}
          </div>
        </div>
      </div>

      {/* Official Offer Letter Document Content */}
      <div className="bg-[#080F1D] border border-[#1C2C42] rounded-xl p-6 text-sm text-[#CBD5E1] leading-relaxed space-y-4 font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C2C42] text-xs text-[#64748B]">
          <span>Offer Ref: #{offer.id}</span>
          <span>Issued on: {new Date(offer.issued_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        <div className="whitespace-pre-line text-[#F8FAFC]">
          {offer.offer_letter_text || (
            <>
              Dear {offer.student_name},<br /><br />
              On behalf of {offer.company_name}, we are delighted to formally extend this offer of employment for the position of {offer.designation || offer.job_title}.<br /><br />
              Your starting compensation package will be INR {offer.package_lpa} LPA, located at our {offer.job_location} office with a planned joining date of {offer.joining_date}.
            </>
          )}
        </div>

        {/* Terms & Conditions */}
        {offer.terms_and_conditions && offer.terms_and_conditions.length > 0 && (
          <div className="pt-4 border-t border-[#1C2C42]">
            <h4 className="text-xs font-bold uppercase text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Offer Terms &amp; Pre-requisites
            </h4>
            <ul className="space-y-1.5">
              {offer.terms_and_conditions.map((term, idx) => (
                <li key={idx} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {offer.benefits && offer.benefits.length > 0 && (
          <div className="pt-4 border-t border-[#1C2C42]">
            <h4 className="text-xs font-bold uppercase text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" /> Corporate Benefits &amp; Perks
            </h4>
            <ul className="space-y-1.5">
              {offer.benefits.map((benefit, idx) => (
                <li key={idx} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation Details (If Accepted) */}
        {offer.status === 'ACCEPTED' && offer.joining_details && (
          <div className="pt-4 border-t border-[#1C2C42] bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20">
            <h4 className="text-xs font-bold uppercase text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Confirmed Joining Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#94A3B8]">Confirmed Date: </span>
                <span className="font-bold text-white">{offer.joining_details.confirmed_joining_date}</span>
              </div>
              <div>
                <span className="text-[#94A3B8]">Location: </span>
                <span className="font-bold text-white">{offer.joining_details.preferred_location || offer.job_location}</span>
              </div>
              {offer.joining_details.emergency_contact_name && (
                <div>
                  <span className="text-[#94A3B8]">Emergency Contact: </span>
                  <span className="text-white">{offer.joining_details.emergency_contact_name} ({offer.joining_details.emergency_contact_phone})</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer for Student Decision */}
      {!hideActions && offer.status === 'OFFERED' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#243650]">
          <div className="text-xs text-[#94A3B8]">
            {offer.response_deadline && (
              <span>Please respond by: <strong className="text-amber-400">{offer.response_deadline}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onDecline && (
              <Button
                variant="outline"
                onClick={onDecline}
                className="w-full sm:w-auto border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
              >
                Decline Offer
              </Button>
            )}
            {onAccept && (
              <Button
                variant="primary"
                onClick={onAccept}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept Offer &amp; Confirm Joining
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
