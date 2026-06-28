import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NavigationProvider } from './context/NavigationContext';
import SplashScreen from './pages/SplashScreen';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import PinLock from './pages/PinLock';
import BottomNav from './components/BottomNav';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading, settings, activeTab, setActiveTab } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const [unlocked, setUnlocked]     = useState(false);

  useEffect(() => {
    setUnlocked(!settings.pinEnabled);
  }, [settings.pinEnabled]);

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--color-bg, #F8FAFC)' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );

  if (!user) return <LandingPage onLogin={() => setActiveTab('home')} />;
  if (settings.pinEnabled && !unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

  const renderPage = () => {
    switch (activeTab) {
      case 'home':         return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'budgets':      return <Budgets />;
      case 'reports':      return <Reports />;
      case 'goals':        return <Goals />;
      case 'settings':     return <Settings onLogout={() => {}} />;
      default:             return <Dashboard />;
    }
  };

  return (
    // NavigationProvider must be inside AppProvider so pushed screens can call useApp()
    <NavigationProvider>
      <div className="app-shell">
        <div className="page-content">
          {renderPage()}
        </div>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    </NavigationProvider>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
