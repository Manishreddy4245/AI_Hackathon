import React from 'react';

interface MatchScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const MatchScore: React.FC<MatchScoreProps> = ({ score, size = 'sm' }) => {
  const getLabelAndStyle = () => {
    if (score >= 90) {
      return {
        label: 'Excellent Match',
        style: 'text-[#86EFAC] bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.25)]',
      };
    }
    if (score >= 75) {
      return {
        label: 'Strong Match',
        style: 'text-[#60A5FA] bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.30)]',
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Match',
        style: 'text-[#FCD34D] bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.25)]',
      };
    }
    return {
      label: 'Low Match',
      style: 'text-[#FCA5A5] bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.25)]',
    };
  };

  const { label, style } = getLabelAndStyle();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${style}`}>
      <span>{label}</span>
      <span className="font-black text-sm">{score}%</span>
    </div>
  );
};
