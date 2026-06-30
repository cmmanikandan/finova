import React, { useState } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import logoUrl from '../assets/logo.jpeg';
import { BrandTitle } from './BrandTitle';

interface HeaderProps {
  onNotification?: () => void;
  onProfile?: () => void;
  showLogo?: boolean;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onNotification, onProfile }) => {
  const { user, settings, saveSettings } = useApp();
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...settings, theme: next });
  };

  const isDark = settings.theme === 'dark';

  const handlePress = (id: string) => {
    setPressedBtn(id);
    setTimeout(() => setPressedBtn(null), 180);
  };

  const iconBtnStyle = (id: string): React.CSSProperties => ({
    width: '46px',
    height: '46px',
    borderRadius: '16px',
    border: isDark
      ? '1px solid rgba(255,255,255,0.08)'
      : '1px solid rgba(47,107,255,0.10)',
    background: isDark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(255,255,255,0.80)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: isDark ? '#CBD5E1' : '#475569',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isDark
      ? '0 2px 8px rgba(0,0,0,0.25)'
      : '0 2px 8px rgba(47,107,255,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    transform: pressedBtn === id ? 'scale(0.91)' : 'scale(1)',
    position: 'relative',
  });

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      height: '72px',
      background: isDark
        ? 'rgba(15,23,42,0.92)'
        : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: isDark
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(47,107,255,0.08)',
      boxShadow: isDark
        ? '0 2px 24px rgba(0,0,0,0.30)'
        : '0 2px 24px rgba(47,107,255,0.07), 0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
    }}>
      {/* Left: Logo + Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '11px',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(47,107,255,0.18)',
          border: '1.5px solid rgba(47,107,255,0.12)',
        }}>
          <img
            src={logoUrl}
            alt="FINOVA"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <BrandTitle size="small" showTagline={false} />
      </div>

      {/* Right: Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={() => { handlePress('theme'); toggleTheme(); }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            ...iconBtnStyle('theme'),
            color: isDark ? '#FDE047' : '#64748B',
            background: isDark
              ? 'rgba(253,224,71,0.10)'
              : 'rgba(255,255,255,0.80)',
            border: isDark
              ? '1px solid rgba(253,224,71,0.22)'
              : '1px solid rgba(47,107,255,0.10)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
              ? '0 0 0 3px rgba(253,224,71,0.18), 0 2px 8px rgba(0,0,0,0.20)'
              : '0 0 0 3px rgba(47,107,255,0.14), 0 2px 8px rgba(47,107,255,0.10)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
              ? '0 2px 8px rgba(0,0,0,0.25)'
              : '0 2px 8px rgba(47,107,255,0.08), 0 1px 2px rgba(0,0,0,0.04)';
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          id="notification-btn"
          onClick={() => { handlePress('notif'); onNotification?.(); }}
          style={iconBtnStyle('notif')}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(47,107,255,0.14), 0 2px 8px rgba(47,107,255,0.10)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
              ? '0 2px 8px rgba(0,0,0,0.25)'
              : '0 2px 8px rgba(47,107,255,0.08), 0 1px 2px rgba(0,0,0,0.04)';
          }}
        >
          <Bell size={18} />
          {/* Pulsing notification badge */}
          <span style={{
            position: 'absolute',
            top: '9px',
            right: '9px',
            width: '8px',
            height: '8px',
            background: '#EF4444',
            borderRadius: '50%',
            border: `2px solid ${isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)'}`,
            animation: 'notif-pulse 2s ease-in-out infinite',
          }} />
        </button>

        {/* Profile Avatar */}
        <button
          id="profile-btn"
          onClick={() => { handlePress('profile'); onProfile?.(); }}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            padding: 0,
            border: isDark
              ? '2px solid rgba(255,255,255,0.12)'
              : '2px solid rgba(47,107,255,0.18)',
            cursor: 'pointer',
            overflow: 'hidden',
            background: 'var(--color-bg)',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: pressedBtn === 'profile' ? 'scale(0.91)' : 'scale(1)',
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.25)'
              : '0 2px 8px rgba(47,107,255,0.14)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(47,107,255,0.18), 0 2px 8px rgba(47,107,255,0.14)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
              ? '0 2px 8px rgba(0,0,0,0.25)'
              : '0 2px 8px rgba(47,107,255,0.14)';
          }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #2F6BFF 0%, #4F8CFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
