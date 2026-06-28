import React from 'react';
import { Home, ArrowLeftRight, BarChart2, Target, Settings, Sliders } from 'lucide-react';

export type NavTab = 'home' | 'transactions' | 'budgets' | 'reports' | 'goals' | 'settings';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home',         label: 'Home',     icon: <Home size={22} strokeWidth={2} /> },
  { id: 'transactions', label: 'Txns',     icon: <ArrowLeftRight size={22} strokeWidth={2} /> },
  { id: 'budgets',      label: 'Budgets',  icon: <Sliders size={22} strokeWidth={2} /> },
  { id: 'reports',      label: 'Reports',  icon: <BarChart2 size={22} strokeWidth={2} /> },
  { id: 'goals',        label: 'Goals',    icon: <Target size={22} strokeWidth={2} /> },
  { id: 'settings',     label: 'Settings', icon: <Settings size={22} strokeWidth={2} /> },
];

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => (
  <nav className="bottom-nav" style={{ padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))' }}>
    {TABS.map(tab => (
      <button
        key={tab.id}
        id={`nav-${tab.id}`}
        className={`nav-item${active === tab.id ? ' active' : ''}`}
        onClick={() => onChange(tab.id)}
        aria-label={tab.label}
        style={{ fontSize: '0.625rem' }} // slightly smaller text for 6 tabs on mobile
      >
        <span className="nav-icon" style={{ padding: '2px' }}>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);

export default BottomNav;
