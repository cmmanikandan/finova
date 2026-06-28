import React from 'react';
import { Home, ArrowLeftRight, BarChart2, Target, Settings } from 'lucide-react';

export type NavTab = 'home' | 'transactions' | 'reports' | 'goals' | 'settings';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home',         label: 'Home',     icon: <Home size={22} strokeWidth={2} /> },
  { id: 'transactions', label: 'Txns',     icon: <ArrowLeftRight size={22} strokeWidth={2} /> },
  { id: 'reports',      label: 'Reports',  icon: <BarChart2 size={22} strokeWidth={2} /> },
  { id: 'goals',        label: 'Goals',    icon: <Target size={22} strokeWidth={2} /> },
  { id: 'settings',     label: 'Settings', icon: <Settings size={22} strokeWidth={2} /> },
];

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => (
  <nav className="bottom-nav">
    {TABS.map(tab => (
      <button
        key={tab.id}
        id={`nav-${tab.id}`}
        className={`nav-item${active === tab.id ? ' active' : ''}`}
        onClick={() => onChange(tab.id)}
        aria-label={tab.label}
      >
        <span className="nav-icon">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);

export default BottomNav;
