import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import SplashScreen from './pages/SplashScreen';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import type { NavTab } from './components/BottomNav';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading } = useApp();
  const [splashDone, setSplashDone]   = useState(false);
  const [activeTab, setActiveTab]     = useState<NavTab>('home');

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (loading)     return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F8FAFC' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
  if (!user)       return <LandingPage onLogin={() => setActiveTab('home')} />;

  const renderPage = () => {
    switch (activeTab) {
      case 'home':         return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'reports':      return <Reports />;
      case 'goals':        return <Goals />;
      case 'settings':     return <Settings onLogout={() => {}} />;
      default:             return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <div className="page-content">
        {renderPage()}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
