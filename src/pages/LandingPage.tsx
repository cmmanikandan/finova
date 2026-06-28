import React, { useState } from 'react';
import { signInWithGoogle } from '../services/auth';
import logoUrl from '../assets/logo.jpeg';
import { TrendingUp, Shield, BarChart3, Target } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const features = [
  { icon: <TrendingUp size={20} />, title: 'Track Expenses',   desc: 'Log every transaction effortlessly' },
  { icon: <BarChart3 size={20} />,  title: 'Visual Reports',   desc: 'Beautiful charts & insights' },
  { icon: <Target size={20} />,     title: 'Set Goals',        desc: 'Achieve your savings goals' },
  { icon: <Shield size={20} />,     title: 'Secure & Private', desc: 'Your data stays on your device' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) onLogin();
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 50%, #EEF2FF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '3rem 1.5rem 2.5rem',
      fontFamily: 'Inter, sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
        {/* Decorative ring */}
        <div style={{
          position: 'relative',
          width: '130px',
          height: '130px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: '-8px',
            borderRadius: '36px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(59,130,246,0.08))',
          }} />
          <img
            src={logoUrl}
            alt="FINOVA Logo"
            style={{
              width: '110px',
              height: '110px',
              objectFit: 'contain',
              borderRadius: '24px',
              boxShadow: '0 8px 24px rgba(37,99,235,0.18)',
              position: 'relative',
            }}
          />
        </div>

        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-1px' }}>
            FINOVA
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#2563EB', fontWeight: 600, margin: '0.25rem 0 0' }}>
            Smart Personal Finance Manager
          </p>
        </div>

        <p style={{ fontSize: '0.9375rem', color: '#64748B', lineHeight: 1.6, maxWidth: '300px', margin: 0 }}>
          Track expenses, manage budgets, monitor goals and understand your spending habits in one powerful app.
        </p>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '360px',
          marginTop: '0.5rem',
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '16px',
              padding: '1rem',
              border: '1px solid rgba(226,232,240,0.6)',
              backdropFilter: 'blur(8px)',
              textAlign: 'left',
            }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(37,99,235,0.1)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2563EB',
                marginBottom: '0.5rem',
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{f.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <button
          id="google-signin-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#0F172A',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* Google icon */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>
          Free forever · No ads · Private & secure
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
