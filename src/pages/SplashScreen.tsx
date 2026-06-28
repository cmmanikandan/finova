import React, { useEffect, useState } from 'react';
import logoUrl from '../assets/logo.jpeg';

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const doneTimer = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash-screen ${exiting ? 'splash-exit' : ''}`}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: '220px', height: '220px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Logo */}
      <div className="splash-logo" style={{ marginBottom: '1.5rem' }}>
        <img
          src={logoUrl}
          alt="FINOVA Logo"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(37,99,235,0.18)',
          }}
        />
      </div>

      {/* Text */}
      <div className="splash-text" style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '2rem',
          fontWeight: 800,
          color: '#0F172A',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          FINOVA
        </h1>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.9375rem',
          color: '#64748B',
          margin: '0.375rem 0 0',
          fontWeight: 500,
        }}>
          Track Money. Build Better Habits.
        </p>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute',
        bottom: '3rem',
        display: 'flex',
        gap: '6px',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px',
            borderRadius: '50%',
            background: '#2563EB',
            animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            opacity: 0.7,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%       { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
