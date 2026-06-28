import React, { useState } from 'react';
import { signInWithGoogle, signInWithEmail } from '../services/auth';
import logoUrl from '../assets/logo.jpeg';
import { 
  TrendingUp, Shield, BarChart3, Target, ArrowRight, ArrowLeft, 
  Mail, Lock, Eye, EyeOff
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [panel, setPanel] = useState<'landing' | 'login'>('landing');
  const [loading, setLoading] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      if (user) onLogin();
    } catch (err) {
      console.error('Login error:', err);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await signInWithEmail(email);
      if (user) onLogin();
    } catch (err) {
      console.error('Email sign in error:', err);
      setError('Authentication failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{
      height: '100%',
      minHeight: '100%',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 60%, #F1F5F9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      fontFamily: 'Inter, sans-serif',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      color: '#0F172A',
    }}>
      {/* Background Decorative Mesh Gradients */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '-20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(6px) rotate(-0.5deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(37,99,235,0.15); }
          50% { box-shadow: 0 0 25px rgba(37,99,235,0.3); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-rev { animation: floatReverse 7s ease-in-out infinite; }
        .glow-logo { animation: glowPulse 4s infinite; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
        }
        .glass-card-light {
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {panel === 'landing' ? (
        <div style={{ zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.4s ease' }}>
          
          {/* Logo & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', textAlign: 'center' }}>
            <div className="glow-logo" style={{
              width: '80px',
              height: '80px',
              borderRadius: '22px',
              overflow: 'hidden',
              border: '2px solid rgba(37, 99, 235, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0F172A',
            }}>
              <img src={logoUrl} alt="FINOVA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-1px', margin: 0, background: 'linear-gradient(135deg, #0F172A 60%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FINOVA
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#2563EB', fontWeight: 700, margin: '0.125rem 0 0', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Next-Gen Finance Manager
              </p>
            </div>
          </div>

          {/* Interactive CSS Dashboard Preview Mockup */}
          <div className="animate-float glass-panel" style={{
            width: '100%',
            borderRadius: '24px',
            padding: '16px',
            marginBottom: '2rem',
            position: 'relative',
          }}>
            {/* Balance Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Balance</div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>₹1,48,250.00</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.15)', color: '#4ADE80', padding: '4px 8px', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 700 }}>
                <TrendingUp size={12} /> +12.4%
              </div>
            </div>

            {/* Simulated Budget Bar */}
            <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Target size={12} color="#F59E0B" />
                  <span>Savings Goal</span>
                </div>
                <span style={{ color: '#F59E0B' }}>78%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #10B981)', borderRadius: '99px' }} />
              </div>
            </div>

            {/* Quick Micro Transaction List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>☕</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Starbucks Coffee</div>
                    <div style={{ fontSize: '0.625rem', color: '#475569' }}>Today · 09:30 AM</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444' }}>-₹320.00</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>💻</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Freelance Income</div>
                    <div style={{ fontSize: '0.625rem', color: '#475569' }}>Yesterday · 04:15 PM</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#22C55E' }}>+₹24,500.00</span>
              </div>
            </div>
          </div>

          {/* Core Feature Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '2.5rem' }}>
            {[
              { icon: <TrendingUp size={16} />, title: 'Smart Tracking', color: '#3B82F6' },
              { icon: <BarChart3 size={16} />, title: 'Deep Insights', color: '#10B981' },
              { icon: <Target size={16} />, title: 'Milestones', color: '#F59E0B' },
              { icon: <Shield size={16} />, title: 'Encrypted', color: '#EC4899' },
            ].map((f, i) => (
              <div key={i} className="glass-card-light" style={{
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: `rgba(${f.color === '#3B82F6' ? '59,130,246' : f.color === '#10B981' ? '16,185,129' : f.color === '#F59E0B' ? '245,158,11' : '236,72,153'}, 0.12)`,
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: f.color,
                  flexShrink: 0,
                }}>{f.icon}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{f.title}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={() => setPanel('login')}
              style={{
                width: '100%',
                padding: '1.05rem',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(37,99,235,0.18)',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>

          <p style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '1.5rem', fontWeight: 600 }}>
            ⚡ Fast setup · No credit card required · Local offline data model supported
          </p>
        </div>
      ) : (
        <div style={{ zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
          
          {/* Back Action */}
          <button 
            type="button"
            onClick={() => { setPanel('landing'); setError(''); }}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              color: '#475569',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'background 0.2s',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Login Card Glass Container */}
          <div className="glass-panel" style={{
            borderRadius: '28px',
            padding: '24px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {isSignUp ? 'Create your Account' : 'Welcome Back'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '4px 0 0' }}>
                {isSignUp ? 'Sign up to lock in your transactions' : 'Sign in to access your dashboard'}
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#F87171',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Email */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: '14px',
                      color: 'var(--color-text)',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      background: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: '14px',
                      color: 'var(--color-text)',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Action Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
                  transition: 'opacity 0.2s',
                  marginTop: '0.5rem',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            {/* Google sign-in inside the card */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '14px',
                border: '1px solid var(--color-border)',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'background 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {/* Google icon SVG */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google
            </button>

            {/* Toggle Sign Up / Sign In */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
