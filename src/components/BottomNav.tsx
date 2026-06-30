import React, { useState, useRef } from 'react';
import { Home, ArrowLeftRight, Sliders, BarChart2, Settings, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export type NavTab = 'home' | 'transactions' | 'budgets' | 'planner' | 'reports' | 'settings';

const TABS: { id: NavTab; label: string; path: string; icon: React.ComponentType<any> }[] = [
  { id: 'home',         label: 'Home',     path: '/home',         icon: Home },
  { id: 'transactions', label: 'Txns',     path: '/transactions', icon: ArrowLeftRight },
  { id: 'budgets',      label: 'Budgets',  path: '/budgets',      icon: Sliders },
  { id: 'planner',      label: 'Planner',  path: '/planner',      icon: Calendar },
  { id: 'reports',      label: 'Reports',  path: '/reports',      icon: BarChart2 },
  { id: 'settings',     label: 'Settings', path: '/settings',     icon: Settings },
];

const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { settings } = useApp();
  const isDark = settings.theme === 'dark';

  const [ripple, setRipple] = useState<{ id: string; x: number; y: number } | null>(null);
  const rippleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPrimaryTab = TABS.some(t => pathname === t.path) || pathname === '/';
  if (!isPrimaryTab) return null;

  const handleTabClick = (tab: typeof TABS[0], e: React.MouseEvent<HTMLButtonElement>) => {
    if (pathname === tab.path) return;
    // Ripple origin relative to button
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ id: tab.id, x, y });
    if (rippleTimeout.current) clearTimeout(rippleTimeout.current);
    rippleTimeout.current = setTimeout(() => setRipple(null), 480);
    navigate(tab.path);
  };

  return (
    <nav style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      right: '16px',
      height: '72px',
      background: isDark
        ? 'rgba(15,23,42,0.95)'
        : '#F5F9FF',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: '22px',
      border: isDark
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(47,107,255,0.08)',
      boxShadow: isDark
        ? '0 12px 35px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.25)'
        : '0 12px 35px rgba(0,0,0,0.10), 0 2px 8px rgba(47,107,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      zIndex: 100,
      // Safe area for notch devices
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = pathname === tab.path || (pathname === '/' && tab.id === 'home');

        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={e => handleTabClick(tab, e)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: '100%',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              padding: '6px 4px',
              gap: '3px',
              overflow: 'hidden',
              borderRadius: '14px',
              transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(47,107,255,0.07)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {/* Ripple Effect */}
            {ripple?.id === tab.id && (
              <span style={{
                position: 'absolute',
                left: ripple.x,
                top: ripple.y,
                width: '80px',
                height: '80px',
                marginLeft: '-40px',
                marginTop: '-40px',
                borderRadius: '50%',
                background: isActive
                  ? 'rgba(255,255,255,0.28)'
                  : 'rgba(47,107,255,0.14)',
                animation: 'ripple-expand 0.48s cubic-bezier(0.4,0,0.2,1) forwards',
                pointerEvents: 'none',
                zIndex: 0,
              }} />
            )}

            {/* Icon Pill (active) or plain icon (inactive) */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isActive ? '52px' : '34px',
              height: '32px',
              borderRadius: '18px',
              background: isActive
                ? 'linear-gradient(135deg, #2F6BFF 0%, #4F8CFF 100%)'
                : 'transparent',
              boxShadow: isActive
                ? '0 4px 14px rgba(47,107,255,0.38)'
                : 'none',
              transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.7}
                color={isActive
                  ? '#FFFFFF'
                  : isDark ? '#94A3B8' : '#64748B'
                }
                style={{ transition: 'all 0.22s ease' }}
              />
            </div>

            {/* Label */}
            <span style={{
              position: 'relative',
              zIndex: 1,
              fontSize: '10.5px',
              fontWeight: isActive ? 800 : 600,
              letterSpacing: isActive ? '0.01em' : '0.02em',
              color: isActive
                ? (isDark ? '#93C5FD' : '#2F6BFF')
                : (isDark ? '#64748B' : '#94A3B8'),
              transition: 'all 0.22s ease',
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
