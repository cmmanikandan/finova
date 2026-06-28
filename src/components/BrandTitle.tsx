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
      fontSize: '1.25rem', // 20px
      taglineSize: '0.5rem', // 8px
      taglineSpacing: '0.22em',
      letterSpacing: '0.02em',
    },
    medium: {
      fontSize: '1.75rem', // 28px
      taglineSize: '0.625rem', // 10px
      taglineSpacing: '0.25em',
      letterSpacing: '0.02em',
    },
    large: {
      fontSize: '2.625rem', // 42px
      taglineSize: '0.75rem', // 12px
      taglineSpacing: '0.25em',
      letterSpacing: '0.02em',
    },
    huge: {
      fontSize: '3rem', // 48px
      taglineSize: '0.8125rem', // 13px
      taglineSpacing: '0.25em',
      letterSpacing: '0.02em',
    },
  };

  const config = configs[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', ...style }}>
      {/* Brand letters layout */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Sora', 'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
        fontWeight: 900,
        fontSize: config.fontSize,
        letterSpacing: config.letterSpacing,
        color: '#081A45',
        lineHeight: 1,
      }}>
        <span>F</span>
        <span>I</span>
        <span>N</span>
        {/* Special 'O' gradient ring - dynamically scales and aligns using em units */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '0.74em',
          height: '0.74em',
          margin: '0 0.02em',
          flexShrink: 0,
        }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{ overflow: 'visible', display: 'block' }}
          >
            <defs>
              <linearGradient id="special-o-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2D7DFF" />
                <stop offset="50%" stopColor="#22D3EE" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="41.5"
              fill="none"
              stroke="url(#special-o-gradient)"
              strokeWidth="17"
            />
          </svg>
        </span>
        <span>V</span>
        <span>A</span>
      </div>

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
