import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface CompanyLogoProps {
  logo?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  logo,
  name = 'Company',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs font-bold',
    lg: 'w-14 h-14 text-xl font-bold',
  };

  const isUrl =
    typeof logo === 'string' &&
    (logo.startsWith('http://') ||
      logo.startsWith('https://') ||
      logo.startsWith('data:image/') ||
      logo.startsWith('/'));

  // Clean company name (remove random timestamp or numeric ID suffixes for initials)
  const cleanName = (name || '').replace(/\b\d{6,}\b/g, '').trim();

  // Compute initials if not a URL
  const initials =
    !isUrl && logo && logo.length > 0 && logo.length <= 4
      ? logo.toUpperCase()
      : cleanName
          .split(' ')
          .filter(Boolean)
          .map((word) => word[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'CO';

  return (
    <div
      className={`rounded-xl bg-[#0B1628] border border-[#243650] text-[#3B82F6] flex items-center justify-center shrink-0 overflow-hidden shadow-sm select-none ${sizeClasses[size]} ${className}`}
      title={cleanName}
    >
      {isUrl && !imgError ? (
        <img
          src={logo}
          alt={cleanName}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : initials ? (
        <span className="leading-none tracking-tight">{initials}</span>
      ) : (
        <Building2 className="w-4 h-4 text-[#3B82F6]" />
      )}
    </div>
  );
};
