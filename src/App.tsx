import React, { useState, useEffect, useRef } from 'react';
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
import DebtTracker from './pages/DebtTracker';
import Challenges from './pages/Challenges';
import SplitBill from './pages/SplitBill';
import Forecast from './pages/Forecast';
import DailyPlanner from './pages/DailyPlanner';
import BottomNav from './components/BottomNav';
import { ScrollRestoration } from './components/ScrollRestoration';
import { AndroidBackHandler, PageTransitionTracker } from './components/AndroidBackHandler';
import * as db from './services/db';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading, settings, refresh } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const [unlocked, setUnlocked]     = useState(false);
  const [showReminderToast, setShowReminderToast] = useState(false);

  const pageContentRef = useRef<HTMLDivElement>(null);

  // ─── PWA States ───────────────────────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    });
  };

  // ─── Pull-to-Refresh States & Event Handlers ──────────────────────────────
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = pageContentRef.current;
    if (container && container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  useEffect(() => {
    const el = pageContentRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      if (el.scrollTop > 0) {
        setIsPulling(false);
        setPullY(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0) {
        if (e.cancelable) e.preventDefault();
        // Non-linear visual resistance
        const pullDistance = Math.pow(diff, 0.85);
        setPullY(pullDistance);
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    setIsPulling(false);
    if (pullY > 70) {
      setIsRefreshing(true);
      setPullY(60); // Hold spinner container visible
      try {
        await db.pullAllFromSupabase();
        await db.processRecurringTransactions();
        refresh();
      } catch (e) {
        console.error('Failed to sync on pull-to-refresh:', e);
      } finally {
        setIsRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  };

  useEffect(() => {
    setUnlocked(!settings.pinEnabled);
  }, [settings.pinEnabled]);

  useEffect(() => {
    if (!user || !settings.dailyReminderEnabled) return;

    const checkReminder = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeVal = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
      
      const targetTimeVal = settings.dailyReminderTime || '21:00';
      
      if (currentTimeVal >= targetTimeVal) {
        const spentToday = db.getDailyExpenses(now.toISOString());
        if (spentToday === 0) {
          const formatLocalDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          const todayStr = formatLocalDate(now);
          const lastDismissed = localStorage.getItem('finova_last_reminder_dismissed_date');
          
          if (lastDismissed !== todayStr) {
            setShowReminderToast(true);
          }
        }
      }
    };

    // Run check immediately
    checkReminder();

    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [user, settings.dailyReminderEnabled, settings.dailyReminderTime]);

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-bg, #F8FAFC)' }}>
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

      {/* Custom Pull-to-Refresh Indicator */}
      {pullY > 0 && (
        <div style={{
          position: 'absolute',
          top: `${Math.min(pullY - 30, 45)}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--color-card)',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: isPulling ? 'none' : 'top 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s ease',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            transform: isRefreshing ? 'none' : `rotate(${pullY * 4.5}deg)`,
          }} />
        </div>
      )}

      <div 
        className="page-content"
        ref={pageContentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Routes>
          {/* Main Redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Primary Tabs */}
          <Route path="/home" element={
            <Dashboard 
              deferredPrompt={deferredPrompt} 
              isInstalled={isInstalled} 
              onInstallPWA={handleInstallPWA} 
            />
          } />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/planner" element={<DailyPlanner />} />
          
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
          <Route path="/debts" element={<DebtTracker />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/split-bill" element={<SplitBill />} />
          <Route path="/forecast" element={<Forecast />} />
          
          {/* Settings Sub-Routing */}
          <Route path="/settings" element={
            <Settings 
              onLogout={() => {}} 
              deferredPrompt={deferredPrompt} 
              isInstalled={isInstalled} 
              onInstallPWA={handleInstallPWA} 
            />
          } />
          <Route path="/settings/:subpage" element={
            <Settings 
              onLogout={() => {}} 
              deferredPrompt={deferredPrompt} 
              isInstalled={isInstalled} 
              onInstallPWA={handleInstallPWA} 
            />
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>

      {showReminderToast && (
        <div style={{
          position: 'fixed',
          bottom: '76px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          background: 'linear-gradient(135deg, #7C3AED, #6366F1)',
          color: '#fff',
          borderRadius: '18px',
          padding: '14px 18px',
          boxShadow: '0 10px 30px rgba(99,102,241,0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 99999,
          animation: 'slideUp 0.3s ease-out',
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>🔔 Daily Log Reminder</div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.9, fontWeight: 500 }}>
              Don't forget to log your daily expenses to keep your streak alive!
            </div>
          </div>
          <button
            onClick={() => {
              const formatLocalDate = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              };
              localStorage.setItem('finova_last_reminder_dismissed_date', formatLocalDate(new Date()));
              setShowReminderToast(false);
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: '12px',
            }}
          >
            Got it
          </button>
        </div>
      )}

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
