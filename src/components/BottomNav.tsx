import React from 'react';
import { Home, ArrowLeftRight, BarChart2, Target, Settings, Sliders } from 'lucide-react';

export type NavTab = 'home' | 'transactions' | 'budgets' | 'reports' | 'goals' | 'settings';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'home',         label: 'Home',     icon: Home },
  { id: 'transactions', label: 'Txns',     icon: ArrowLeftRight },
  { id: 'budgets',      label: 'Budgets',  icon: Sliders },
  { id: 'reports',      label: 'Reports',  icon: BarChart2 },
  { id: 'goals',        label: 'Goals',    icon: Target },
  { id: 'settings',     label: 'Settings', icon: Settings },
];

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => (
  <nav className="bottom-nav">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-label={tab.label}
        >
          <div className="nav-icon-wrapper">
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span className="nav-label">{tab.label}</span>
        </button>
      );
    })}
  </nav>
);

export default BottomNav;

