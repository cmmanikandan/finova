import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import SplashScreen from './pages/SplashScreen';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import TransactionDetails from './pages/TransactionDetails';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import PinLock from './pages/PinLock';
import BottomNav from './components/BottomNav';
import { ScrollRestoration } from './components/ScrollRestoration';
import { AndroidBackHandler, PageTransitionTracker } from './components/AndroidBackHandler';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading, settings } = useApp();
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

  // If user is not authenticated, lock down to landing screen
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LandingPage onLogin={() => {}} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      {/* Intercept back button gestures and determine page transitions */}
      <AndroidBackHandler />
      <PageTransitionTracker />
      
      {/* Scroll restoration helper */}
      <ScrollRestoration />

      {/* Render PIN lock screen if active */}
      {settings.pinEnabled && !unlocked && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <PinLock onUnlock={() => setUnlocked(true)} />
        </div>
      )}

      <div className="page-content">
        <Routes>
          {/* Main Redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Primary Tabs */}
          <Route path="/home" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/goals" element={<Goals />} />
          
          {/* Subpages / CRUD */}
          <Route path="/transactions/new" element={<AddTransaction />} />
          <Route path="/transactions/:id" element={<TransactionDetails />} />
          <Route path="/transactions/:id/edit" element={<AddTransaction />} />
          <Route path="/budgets/new" element={<Budgets />} />
          <Route path="/budgets/:id" element={<Budgets />} />
          <Route path="/goals/new" element={<Goals />} />
          <Route path="/goals/:id" element={<Goals />} />
          <Route path="/goals/:id/deposit" element={<Goals />} />
          <Route path="/goals/:id/withdraw" element={<Goals />} />
          
          {/* Settings Sub-Routing */}
          <Route path="/settings" element={<Settings onLogout={() => {}} />} />
          <Route path="/settings/:subpage" element={<Settings onLogout={() => {}} />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>

      <BottomNav />
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AppProvider>
);

export default App;
