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
      {/* Custom Geometric Wordmark Vector Logo */}
      <svg
        width={config.logoWidth}
        viewBox="0 0 386 100"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="finova-gradient-o" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D7DFF" />
            <stop offset="35%" stopColor="#27C5FF" />
            <stop offset="70%" stopColor="#20D4AA" />
            <stop offset="100%" stopColor="#5CE35A" />
          </linearGradient>
        </defs>
        
        {/* Letter F */}
        <path d="M 21.5,19.5 V 80.5 M 21.5,19.5 H 48.5 M 21.5,47.5 H 41.5" stroke="#081A45" strokeWidth="11" />
        
        {/* Letter I */}
        <path d="M 78.5,19.5 V 80.5" stroke="#081A45" strokeWidth="11" />
        
        {/* Letter N */}
        <path d="M 108.5,80.5 V 19.5 L 143.5,80.5 V 19.5" stroke="#081A45" strokeWidth="11" />
        
        {/* Special Gradient 'O' Ring */}
        <circle cx="204" cy="50" r="30.5" stroke="url(#finova-gradient-o)" strokeWidth="11" />
        
        {/* Letter V */}
        <path d="M 264.5,19.5 L 282,80.5 L 299.5,19.5" stroke="#081A45" strokeWidth="11" />
        
        {/* Letter A */}
        <path d="M 329.5,80.5 L 347,19.5 L 364.5,80.5 M 336.5,57.5 H 357.5" stroke="#081A45" strokeWidth="11" />
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
