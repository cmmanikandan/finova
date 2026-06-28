import React, { useState, useEffect } from 'react';
import logoUrl from '../assets/logo.jpeg';
import { BrandTitle } from '../components/BrandTitle';

interface PinLockProps {
  onUnlock: () => void;
}

const CORRECT_HASH_KEY = 'finova_pin_hash';

function simpleHash(pin: string): string {
  // Simple djb2 hash (not crypto-secure, but sufficient for local PIN)
  let hash = 5381;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash * 33) ^ pin.charCodeAt(i);
  }
  return String(hash >>> 0);
}

export function setPIN(pin: string) {
  localStorage.setItem(CORRECT_HASH_KEY, simpleHash(pin));
}

export function clearPIN() {
  localStorage.removeItem(CORRECT_HASH_KEY);
}

export function verifyPIN(pin: string): boolean {
  const stored = localStorage.getItem(CORRECT_HASH_KEY);
  return stored !== null && stored === simpleHash(pin);
}

export function isPINSet(): boolean {
  return localStorage.getItem(CORRECT_HASH_KEY) !== null;
}

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const PinLock: React.FC<PinLockProps> = ({ onUnlock }) => {
  const [pin, setPin]       = useState('');
  const [shake, setShake]   = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (pin.length === 4) {
      if (verifyPIN(pin)) {
        onUnlock();
      } else {
        setShake(true);
        setAttempts(a => a + 1);
        setTimeout(() => { setPin(''); setShake(false); }, 600);
      }
    }
  }, [pin, onUnlock]);

  const handleDigit = (d: string) => {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (d === '')   return;
    if (pin.length < 4) setPin(p => p + d);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 60%, #EEF2FF 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <img src={logoUrl} alt="FINOVA" style={{ width: '72px', height: '72px', borderRadius: '20px', objectFit: 'contain', marginBottom: '1.25rem', boxShadow: '0 6px 20px rgba(8,26,69,0.08)' }} />
      <BrandTitle size="medium" showTagline={false} style={{ marginBottom: '10px' }} />
      <p style={{ margin: '0 0 2.5rem', color: '#64748B', fontWeight: 600 }}>Enter your PIN to continue</p>

      {/* PIN dots */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '2.5rem',
        animation: shake ? 'pinShake 0.5s ease' : 'none',
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: i < pin.length ? '#2563EB' : '#CBD5E1',
            transition: 'background 0.2s, transform 0.2s',
            transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
          }} />
        ))}
      </div>

      {/* Dial pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', width: '280px' }}>
        {DIGITS.map((d, i) => (
          <button key={i} onClick={() => handleDigit(d)}
            disabled={d === ''}
            style={{
              height: '68px', borderRadius: '20px', border: 'none',
              background: d === '⌫' ? 'rgba(239,68,68,0.08)' : d === '' ? 'transparent' : '#fff',
              color: d === '⌫' ? '#EF4444' : '#0F172A',
              fontSize: d === '⌫' ? '1.25rem' : '1.625rem',
              fontWeight: 700, cursor: d === '' ? 'default' : 'pointer',
              boxShadow: d && d !== '⌫' ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseDown={e => { if (d) e.currentTarget.style.transform = 'scale(0.92)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {d}
          </button>
        ))}
      </div>

      {attempts > 0 && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#EF4444', fontWeight: 500 }}>
          {attempts === 1 ? 'Wrong PIN. Try again.' : `${attempts} failed attempts.`}
        </p>
      )}

      <style>{`
        @keyframes pinShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

export default PinLock;
