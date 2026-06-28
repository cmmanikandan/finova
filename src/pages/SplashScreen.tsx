import React, { useEffect, useState } from 'react';
import logoUrl from '../assets/logo.jpeg';

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 1800;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const exitTimer = setTimeout(() => setExiting(true), 1900);
    const doneTimer = setTimeout(() => onDone(), 2300);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC',
      zIndex: 9999,
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.4s ease',
      pointerEvents: exiting ? 'none' : 'auto',
    }}>
      {/* Radial blobs */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Centered brand */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'splashScaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ width: '128px', height: '128px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(37,99,235,0.22)', border: '2px solid rgba(37,99,235,0.12)', marginBottom: '24px' }}>
          <img src={logoUrl} alt="FINOVA" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '2.25rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-1px' }}>FINOVA</h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', color: '#64748B', margin: '6px 0 0', fontWeight: 600 }}>Track Money. Build Better Habits.</p>
      </div>

      {/* Linear progress bar */}
      <div style={{ position: 'absolute', bottom: 'calc(2.5rem + env(safe-area-inset-bottom))', left: '48px', right: '48px', height: '4px', background: 'rgba(37,99,235,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563EB, #3B82F6)', borderRadius: '99px', transition: 'width 0.08s linear' }} />
      </div>

      <style>{`
        @keyframes splashScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
