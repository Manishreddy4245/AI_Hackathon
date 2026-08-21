import React from 'react';

interface MatchScoreProps {
  score: number;
}

export const MatchScore: React.FC<MatchScoreProps> = ({ score }) => {
  const getLabelAndStyle = () => {
    if (score >= 90) {
      return {
        label: 'Excellent Match',
        style: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (score >= 75) {
      return {
        label: 'Strong Match',
        style: 'text-sky-700 bg-sky-50 border-sky-200',
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Match',
        style: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }
    return {
      label: 'Low Match',
      style: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  };

  const { label, style } = getLabelAndStyle();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${style}`}>
      <span>{label}</span>
      <span className="font-bold text-sm">{score}%</span>
    </div>
  );
};
