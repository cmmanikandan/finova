import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import logoUrl from '../assets/logo.jpeg';

interface HeaderProps {
  onNotification?: () => void;
  onProfile?: () => void;
  showLogo?: boolean;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onNotification, onProfile }) => {
  const { user } = useApp();

  return (
    <header className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Left: Logo and FINOVA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logoUrl} alt="FINOVA" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
        <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '0.5px' }}>FINOVA</span>
      </div>

      {/* Right: Notification + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          id="notification-btn"
          onClick={onNotification}
          style={{
            width: '38px', height: '38px',
            borderRadius: '12px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text-muted)',
            position: 'relative',
          }}
        >
          <Bell size={18} />
          {/* Notification dot */}
          <span style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '7px', height: '7px',
            background: 'var(--color-danger, #EF4444)',
            borderRadius: '50%',
            border: '2px solid var(--color-card)',
          }} />
        </button>

        <button
          id="profile-btn"
          onClick={onProfile}
          style={{
            width: '38px', height: '38px',
            borderRadius: '50%',
            padding: 0, border: '2px solid var(--color-border)',
            cursor: 'pointer', overflow: 'hidden', background: 'var(--color-bg)',
          }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
