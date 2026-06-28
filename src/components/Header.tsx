import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getGreeting, formatDate } from '../utils/format';
import logoUrl from '../assets/logo.jpeg';

interface HeaderProps {
  onNotification?: () => void;
  onProfile?: () => void;
  showLogo?: boolean;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onNotification, onProfile, showLogo, title }) => {
  const { user } = useApp();
  const today = new Date().toISOString();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.25rem 0.75rem',
      background: '#fff',
      borderBottom: '1px solid #F1F5F9',
    }}>
      {/* Left: Logo or greeting */}
      {showLogo ? (
        <img src={logoUrl} alt="FINOVA" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }} />
      ) : (
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
            {formatDate(today)} · {getGreeting()}
          </p>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
            {title || `Hey, ${user?.name?.split(' ')[0] || 'there'}! 👋`}
          </h2>
        </div>
      )}

      {/* Right: Notification + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          id="notification-btn"
          onClick={onNotification}
          style={{
            width: '38px', height: '38px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B',
            position: 'relative',
          }}
        >
          <Bell size={18} />
          {/* Notification dot */}
          <span style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '7px', height: '7px',
            background: '#EF4444',
            borderRadius: '50%',
            border: '2px solid #fff',
          }} />
        </button>

        <button
          id="profile-btn"
          onClick={onProfile}
          style={{
            width: '38px', height: '38px',
            borderRadius: '50%',
            padding: 0, border: '2px solid #E2E8F0',
            cursor: 'pointer', overflow: 'hidden', background: '#EFF6FF',
          }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
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
