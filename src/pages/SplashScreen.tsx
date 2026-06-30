import React, { useEffect, useState } from 'react';
import logoUrl from '../assets/logo.jpeg';
import { BrandTitle } from '../components/BrandTitle';

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // End the splash screen after 3.2s
    const exitTimer = setTimeout(() => setExiting(true), 2800);
    const doneTimer = setTimeout(() => onDone(), 3200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FFFFFF',
      zIndex: 9999,
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      pointerEvents: exiting ? 'none' : 'auto',
    }}>
      {/* Corner Glow Blobs */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle at top left, rgba(45, 125, 255, 0.08), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.08), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}>
        {/* Logo Icon Container */}
        <div style={{
          width: '130px',
          height: '130px',
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(8, 26, 69, 0.1)',
          border: '1px solid rgba(45, 125, 255, 0.08)',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transform: 'scale(0.9)',
          animation: 'logoFadeScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards, logoFloat 4s ease-in-out 0.9s infinite alternate',
          position: 'relative',
        }}>
          {/* Logo glow background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, transparent 80%)',
            pointerEvents: 'none',
          }} />
          <img src={logoUrl} alt="FINOVA Logo" style={{ width: '92px', height: '92px', objectFit: 'contain' }} />
        </div>

        {/* Title & Tagline Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Brand Name Text: slides up at 0.8s */}
          <div style={{
            opacity: 0,
            transform: 'translateY(15px)',
            animation: 'brandSlideUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.8s forwards',
          }}>
            <BrandTitle size="large" showTagline={false} textColor="#081A45" />
          </div>

          {/* Tagline: fades in at 1.6s */}
          <div style={{
            opacity: 0,
            animation: 'fadeInText 0.6s ease-out 1.6s forwards',
            fontFamily: "'Sora', 'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: '#64748B',
            fontSize: '0.75rem',
            marginTop: '12px',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            TRACK MONEY.
            <br />
            BUILD BETTER HABITS.
          </div>
        </div>
      </div>

      {/* Loading Indicator at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(4rem + env(safe-area-inset-bottom))',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        opacity: 0,
        animation: 'fadeInText 0.4s ease-out 2.0s forwards',
      }}>
        <div className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2D7DFF', animation: 'bounceDot 1s infinite 0s' }} />
        <div className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22D3EE', animation: 'bounceDot 1s infinite 0.15s' }} />
        <div className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', animation: 'bounceDot 1s infinite 0.3s' }} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes logoFadeScale {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes logoFloat {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-6px); }
        }
        @keyframes brandSlideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInText {
          to {
            opacity: 1;
          }
        }
        @keyframes bounceDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
