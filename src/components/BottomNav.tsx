import React from 'react';
import { Home, ArrowLeftRight, Sliders, BarChart2, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export type NavTab = 'home' | 'transactions' | 'budgets' | 'reports' | 'settings';

const TABS: { id: NavTab; label: string; path: string; icon: React.ComponentType<any> }[] = [
  { id: 'home',         label: 'Home',     path: '/home',         icon: Home },
  { id: 'transactions', label: 'Txns',     path: '/transactions', icon: ArrowLeftRight },
  { id: 'budgets',      label: 'Budgets',  path: '/budgets',      icon: Sliders },
  { id: 'reports',      label: 'Reports',  path: '/reports',      icon: BarChart2 },
  { id: 'settings',     label: 'Settings', path: '/settings',     icon: Settings },
];

const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isPrimaryTab = TABS.some(t => pathname === t.path) || pathname === '/';
  if (!isPrimaryTab) return null;

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = pathname === tab.path || (pathname === '/' && tab.id === 'home');
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
          >
            <div className="nav-icon-wrapper">
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
