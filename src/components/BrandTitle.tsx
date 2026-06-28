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
      taglineSize: '0.4375rem', // 7px
      taglineSpacing: '0.18em',
      containerWidth: '220px',
    },
    medium: {
      logoWidth: '136px',
      taglineSize: '0.5rem', // 8px
      taglineSpacing: '0.22em',
      containerWidth: '310px',
    },
    large: {
      logoWidth: '200px',
      taglineSize: '0.625rem', // 10px
      taglineSpacing: '0.25em',
      containerWidth: '400px',
    },
    huge: {
      logoWidth: '240px',
      taglineSize: '0.75rem', // 12px
      taglineSpacing: '0.25em',
      containerWidth: '450px',
    },
  };

  const config = configs[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', ...style }}>
      {/* Redesigned Premium Bold Geometric FinTech Wordmark Vector Logo */}
      <svg
        width={config.logoWidth}
        viewBox="0 0 398 100"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="finova-premium-bold-o" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2F80FF" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#00D084" />
          </linearGradient>
        </defs>
        
        {/* Letter F */}
        <path d="M 22,20 V 80 M 22,20 H 48 M 22,46.5 H 41" stroke="#081A45" strokeWidth="12" />
        
        {/* Letter I */}
        <path d="M 80,20 V 80" stroke="#081A45" strokeWidth="12" />
        
        {/* Letter N */}
        <path d="M 112,80 V 20 L 148,80 V 20" stroke="#081A45" strokeWidth="12" />
        
        {/* Signature 'O' (Visually balanced bold weight, diameter = 72, stroke = 12) */}
        <circle cx="210" cy="50" r="30" stroke="url(#finova-premium-bold-o)" strokeWidth="12" />
        
        {/* Letter V */}
        <path d="M 272,20 L 290,80 L 308,20" stroke="#081A45" strokeWidth="12" />
        
        {/* Letter A */}
        <path d="M 340,80 L 358,20 L 376,80 M 348,56 H 368" stroke="#081A45" strokeWidth="12" />
      </svg>

      {showTagline && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: config.containerWidth,
          marginTop: '10px'
        }}>
          {/* Left thin blue accent gradient line */}
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to right, transparent, #2F80FF)',
            opacity: 0.5
          }} />
          
          <div style={{
            fontFamily: "'Sora', 'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
            fontWeight: 700,
            letterSpacing: config.taglineSpacing,
            color: taglineColor,
            fontSize: config.taglineSize,
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            TRACK MONEY · BUILD BETTER HABITS
          </div>
          
          {/* Right thin green accent gradient line */}
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to left, transparent, #00D084)',
            opacity: 0.5
          }} />
        </div>
      )}
    </div>
  );
};

export default BrandTitle;
