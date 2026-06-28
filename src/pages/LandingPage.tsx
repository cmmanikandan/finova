import React, { useState } from 'react';
import { signInWithGoogle } from '../services/auth';
import logoUrl from '../assets/logo.jpeg';
import { 
  TrendingUp, Target, BarChart3, ArrowRight, ArrowLeft, 
  Zap, Check, Database, PieChart
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [panel, setPanel] = useState<'landing' | 'login'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      if (user) onLogin();
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google sign-in failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      background: 'linear-gradient(135deg, #F0F4FF 0%, #FFFFFF 50%, #E6EEFF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflowX: 'hidden',
      color: '#1E293B',
      padding: '24px 16px',
    }}>
      {/* Glow Blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'pulseGlow 8s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '-15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'pulseGlow 10s ease-in-out infinite alternate-reverse',
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-slideup {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadein {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .feature-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 24px rgba(37,99,235,0.08);
        }
        .btn-tap-effect:active {
          transform: scale(0.96);
          opacity: 0.95;
        }
      `}</style>

      {panel === 'landing' ? (
        <div className="animate-slideup" style={{ zIndex: 10, width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Logo & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px', marginTop: '16px', textAlign: 'center' }}>
            <div className="animate-float" style={{
              width: '96px',
              height: '96px',
              borderRadius: '26px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              border: '2px solid rgba(37, 99, 235, 0.1)',
            }}>
              <img src={logoUrl} alt="FINOVA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px', margin: '8px 0 0', background: 'linear-gradient(135deg, #1E3A8A 30%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FINOVA
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#2563EB', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '2.5px' }}>
              Smart Personal Finance Manager
            </p>
            <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 500, margin: '12px 24px 0', lineHeight: 1.5 }}>
              Track expenses, manage budgets, build savings goals, and understand your money with beautiful insights.
            </p>
          </div>

          {/* Interactive CSS Dashboard Preview Mockup */}
          <div style={{
            width: '100%',
            borderRadius: '24px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 20px 40px rgba(37, 99, 235, 0.06)',
            marginBottom: '28px',
          }}>
            {/* Balance Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Balance</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 900, marginTop: '2px', color: '#1E293B', letterSpacing: '-0.5px' }}>₹1,48,250.00</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.12)', color: '#22C55E', padding: '4px 10px', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 800 }}>
                <TrendingUp size={12} strokeWidth={2.5} /> +12.4%
              </div>
            </div>

            {/* Income & Expense & Savings Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Income</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#22C55E', marginTop: '2px' }}>₹1,62,400</div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Expenses</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>-₹14,150</div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Savings</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>₹1,48,250</div>
              </div>
            </div>

            {/* Simulated Budget Bar */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={14} color="#F59E0B" strokeWidth={2.5} />
                  <span>Monthly Budget Limit</span>
                </div>
                <span style={{ color: '#F59E0B' }}>56% Spent</span>
              </div>
              <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: '56%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #E11D48)', borderRadius: '99px' }} />
              </div>
            </div>

            {/* Mini SVG graph path to make preview realistic */}
            <div style={{ height: '48px', position: 'relative', width: '100%', marginBottom: '16px', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="glow-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M 0 35 Q 20 15 40 25 T 80 10 T 100 20 L 100 40 L 0 40 Z" fill="url(#glow-grad)" />
                <path d="M 0 35 Q 20 15 40 25 T 80 10 T 100 20" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Quick Micro Transaction List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '8px 12px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }}>☕</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B' }}>Starbucks Coffee</div>
                    <div style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 500 }}>Today · 09:30 AM</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#EF4444' }}>-₹320.00</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '8px 12px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }}>💻</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B' }}>Freelance Income</div>
                    <div style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 500 }}>Yesterday · 04:15 PM</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#22C55E' }}>+₹24,500.00</span>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: '#2563EB', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', alignSelf: 'flex-start' }}>Key Features</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              {[
                { icon: <BarChart3 size={20} />, title: 'Smart Expense Tracking', desc: 'Track daily transactions', bg: '#EFF6FF', color: '#3B82F6' },
                { icon: <PieChart size={20} />, title: 'Budget Management', desc: 'Set monthly limits', bg: '#ECFDF5', color: '#10B981' },
                { icon: <Target size={20} />, title: 'Savings Goals', desc: 'Target key milestones', bg: '#FFFBEB', color: '#D97706' },
                { icon: <TrendingUp size={20} />, title: 'Analytics & Reports', desc: 'Visual breakdowns', bg: '#FDF2F8', color: '#DB2777' },
                { icon: <Database size={20} />, title: 'Secure Offline Storage', desc: 'Zero data sync delay', bg: '#F5F3FF', color: '#7C3AED' },
                { icon: <Zap size={20} />, title: 'Lightning Performance', desc: 'Fluid 120Hz response', bg: '#FFF7ED', color: '#EA580C' },
              ].map((f, i) => (
                <div key={i} className="feature-card" style={{
                  borderRadius: '20px',
                  padding: '16px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                }}>
                  <div style={{
                    width: '40px', height: '40px',
                    background: f.bg,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: f.color,
                    flexShrink: 0,
                  }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1E293B', lineHeight: 1.3 }}>{f.title}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: '#2563EB', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', alignSelf: 'flex-start' }}>Benefits</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              {[
                'No Ads', 'Offline First', 'Secure Local Storage', 
                'Google Sign-In', 'Fast Performance', 'Export Reports'
              ].map((b, i) => (
                <div key={i} style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#475569',
                }}>
                  <Check size={14} color="#22C55E" strokeWidth={3} />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Call */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <button
              onClick={() => setPanel('login')}
              className="btn-tap-effect"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 24px rgba(37,99,235,0.25)',
                transition: 'all 0.2s',
              }}
            >
              Get Started <ArrowRight size={18} strokeWidth={2.5} />
            </button>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '4px' }}>
              {['Free Forever', 'No Credit Card', 'Secure Sign In'].map((lbl, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#64748B', fontWeight: 600 }}>
                  <Check size={10} color="#22C55E" strokeWidth={3} />
                  <span>{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer style={{
            width: '100%',
            textAlign: 'center',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '20px',
            paddingBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: '#2563EB', cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ color: '#E2E8F0' }}>|</span>
              <span style={{ color: '#2563EB', cursor: 'pointer' }}>Terms</span>
              <span style={{ color: '#E2E8F0' }}>|</span>
              <span style={{ color: '#64748B' }}>v1.3.0</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 600 }}>
              Made with ❤️ in India
            </p>
          </footer>

        </div>
      ) : (
        <div className="animate-fadein" style={{ zIndex: 10, width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', padding: '0 8px' }}>
          
          {/* Back button */}
          <button 
            type="button"
            onClick={() => { setPanel('landing'); setError(''); }}
            className="btn-tap-effect"
            style={{
              alignSelf: 'flex-start',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#475569',
              width: '42px',
              height: '42px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: '24px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'transform 0.1s',
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          {/* Centered glassmorphic card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: '0 20px 40px rgba(37,99,235,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}>
            
            {/* Logo */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '22px',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              border: '2px solid rgba(37, 99, 235, 0.1)',
              marginBottom: '16px',
            }}>
              <img src={logoUrl} alt="FINOVA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {/* Header titles */}
            <h2 style={{ fontSize: '1.625rem', fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.5px' }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '6px 0 24px', textAlign: 'center', fontWeight: 500, lineHeight: 1.5 }}>
              Sign in securely with your Google Account to continue.
            </p>

            {/* Error Notification */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#EF4444',
                padding: '12px 14px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                width: '100%',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Large White Google sign-in button (18px radius) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn-tap-effect"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '18px',
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#1E293B',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2.5px solid #E2E8F0',
                  borderTopColor: '#2563EB',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                /* Google icon SVG */
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Below-button security checks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
              {[
                'Safe & Secure', 
                'Your data stays private', 
                'Offline data supported'
              ].map((text, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  <Check size={12} color="#22C55E" strokeWidth={3} />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Policy & Terms links */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.6875rem', fontWeight: 600, marginTop: '24px', width: '100%' }}>
              <span style={{ color: '#2563EB', cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ color: '#E2E8F0' }}>|</span>
              <span style={{ color: '#2563EB', cursor: 'pointer' }}>Terms of Service</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
