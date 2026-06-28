import React from 'react';

interface BrandTitleProps {
  size?: 'small' | 'medium' | 'large' | 'huge';
  showTagline?: boolean;
  taglineColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const BrandTitle: React.FC<BrandTitleProps> = ({
  size = 'medium',
  showTagline = false,
  taglineColor = '#1E293B',
  style,
}) => {
  // Configs based on size
  const configs = {
    small: {
      logoWidth: '96px',
      taglineSize: '0.5rem', // 8px
      taglineSpacing: '0.22em',
    },
    medium: {
      logoWidth: '136px',
      taglineSize: '0.625rem', // 10px
      taglineSpacing: '0.25em',
    },
    large: {
      logoWidth: '200px',
      taglineSize: '0.75rem', // 12px
      taglineSpacing: '0.25em',
    },
    huge: {
      logoWidth: '240px',
      taglineSize: '0.8125rem', // 13px
      taglineSpacing: '0.25em',
    },
  };

  const config = configs[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', ...style }}>
      {/* Redesigned Custom Geometric FinTech Wordmark Vector Logo */}
      <svg
        width={config.logoWidth}
        viewBox="0 0 386 100"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="finova-premium-gradient-o" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        
        {/* Letter F */}
        <path d="M 22.25,18 V 82 M 22.25,18 H 47.75 M 22.25,47 H 41" stroke="#081A45" strokeWidth="8.5" />
        
        {/* Letter I */}
        <path d="M 77.25,18 V 82" stroke="#081A45" strokeWidth="8.5" />
        
        {/* Letter N */}
        <path d="M 106.75,82 V 18 L 142.25,82 V 18" stroke="#081A45" strokeWidth="8.5" />
        
        {/* Signature 'O' (Circle Diameter = 73, Thickness = 8.5 (11.6%), Inner Opening = 56 (76.7%)) */}
        <circle cx="204" cy="50" r="32.25" stroke="url(#finova-premium-gradient-o)" strokeWidth="8.5" />
        
        {/* Letter V */}
        <path d="M 265.75,18 L 283.25,82 L 300.75,18" stroke="#081A45" strokeWidth="8.5" />
        
        {/* Letter A */}
        <path d="M 330.25,82 L 347.75,18 L 365.25,82 M 337.5,56 H 358" stroke="#081A45" strokeWidth="8.5" />
      </svg>

      {showTagline && (
        <div style={{
          fontFamily: "'Sora', 'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
          fontWeight: 600,
          letterSpacing: config.taglineSpacing,
          color: taglineColor,
          fontSize: config.taglineSize,
          marginTop: '8px',
          textTransform: 'uppercase',
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          TRACK MONEY.
          <br />
          BUILD BETTER HABITS.
        </div>
      )}
    </div>
  );
};

export default BrandTitle;
