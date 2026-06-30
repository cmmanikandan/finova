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
import { to24h } from './utils/format';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading, settings, dailyTasks, dailyTaskLogs, accounts, goals, refresh } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const [unlocked, setUnlocked]     = useState(false);
  const [showReminderToast, setShowReminderToast] = useState(false);

  const pageContentRef = useRef<HTMLDivElement>(null);

  // Routine Habit background alert & log states
  const [routineAlert, setRoutineAlert] = useState<{ task: any; message: string } | null>(null);
  const [habitToLog, setHabitToLog] = useState<any | null>(null);
  const [habitSpendAmount, setHabitSpendAmount] = useState('');
  const [habitSpendAccount, setHabitSpendAccount] = useState('');
  const [celebrationSavings, setCelebrationSavings] = useState<{ title: string; limit: number; spent: number; saved: number } | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  // Auto set default account and goal ID when habitToLog or celebrationSavings changes
  useEffect(() => {
    if (habitToLog && accounts && accounts.length > 0) {
      setHabitSpendAccount(accounts[0].id);
    }
  }, [habitToLog, accounts]);

  useEffect(() => {
    if (celebrationSavings && goals && goals.length > 0) {
      const activeGoals = goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        setSelectedGoalId(activeGoals[0].id);
      }
    }
  }, [celebrationSavings, goals]);

  // Routine Alert background check (runs every minute)
  useEffect(() => {
    if (!user || !dailyTasks) return;

    const checkRoutines = () => {
      const now = new Date();
      const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const todayStr = formatLocalDate(now);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentMinutesOfDay = currentHours * 60 + currentMinutes;

      dailyTasks.forEach(task => {
        if (!task.reminderTime) return;

        const task24h = to24h(task.reminderTime);
        if (!task24h) return;
        const [tHours, tMinutes] = task24h.split(':').map(Number);
        const taskMinutesOfDay = tHours * 60 + tMinutes;

        // Trigger alert exactly 10 minutes before the scheduled time
        const targetMinutesOfDay = taskMinutesOfDay - 10;

        if (currentMinutesOfDay === targetMinutesOfDay) {
          // Check if task is already completed/skipped today
          const log = dailyTaskLogs.find(l => l.taskId === task.id && l.date === todayStr);
          const isDoneOrSkipped = log && (log.status === 'completed' || log.status === 'skipped');

          if (!isDoneOrSkipped) {
            const notifyKey = `finova_routine_alert_${task.id}_${todayStr}`;
            if (!localStorage.getItem(notifyKey)) {
              localStorage.setItem(notifyKey, 'true');

              let message = `Time for your routine: "${task.title}"!`;
              const lowerTitle = task.title.toLowerCase();
              if (lowerTitle.includes('breakfast')) {
                message = "🍳 Time to eat breakfast! Go and eat!";
              } else if (lowerTitle.includes('lunch')) {
                message = "🍱 Time to eat lunch! Go and eat!";
              } else if (lowerTitle.includes('dinner')) {
                message = "🥗 Time to eat dinner! Go and eat!";
              } else if (lowerTitle.includes('eat') || lowerTitle.includes('food') || lowerTitle.includes('snack')) {
                message = "🍕 Go and eat!";
              }

              setRoutineAlert({ task, message });
            }
          }
        }
      });
    };

    checkRoutines();
    const interval = setInterval(checkRoutines, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [user, dailyTasks, dailyTaskLogs]);

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

      <div 
        className="page-content"
        ref={pageContentRef}
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
          <Route path="/split-bill/:subview" element={<SplitBill />} />
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

      {/* Background Routine Habits alerts & logging */}
      {routineAlert && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.22s ease-out',
        }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '380px', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>{routineAlert.task.icon || '⏰'}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>Routine Alert</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Starting in 10 minutes (at {routineAlert.task.reminderTime})
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--color-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4 }}>
                {routineAlert.message}
              </p>
              {routineAlert.task.budgetLimit > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, marginTop: '8px' }}>
                  Budget Limit: ₹{routineAlert.task.budgetLimit}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {routineAlert.task.budgetLimit > 0 ? (
                <button
                  onClick={() => {
                    setHabitToLog(routineAlert.task);
                    setRoutineAlert(null);
                  }}
                  className="btn-primary"
                  style={{ height: '44px', borderRadius: '14px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  Go & Eat (Log Spend) 🍱
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    await db.setTaskStatus(routineAlert.task.id, todayStr, 'completed');
                    setRoutineAlert(null);
                    refresh();
                  }}
                  className="btn-primary"
                  style={{ height: '44px', borderRadius: '14px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  Mark Complete
                </button>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    await db.setTaskStatus(routineAlert.task.id, todayStr, 'skipped');
                    setRoutineAlert(null);
                    refresh();
                  }}
                  className="btn-ghost"
                  style={{ flex: 1, height: '40px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Skip
                </button>
                <button
                  onClick={() => setRoutineAlert(null)}
                  className="btn-ghost"
                  style={{ flex: 1, height: '40px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {habitToLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.22s ease-out',
        }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '380px', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex-between">
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Log Spend: {habitToLog.title}</h4>
              <button 
                onClick={() => setHabitToLog(null)} 
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.12)', padding: '14px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Routine Budget Limit</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{habitToLog.budgetLimit}</span>
              </div>
              <span style={{ fontSize: '1.75rem' }}>{habitToLog.icon}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Actual Amount Spent (₹)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 40" 
                  value={habitSpendAmount} 
                  onChange={e => setHabitSpendAmount(e.target.value)} 
                  className="input-field"
                  required
                  style={{ fontWeight: 800, fontSize: '1rem' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Pay From Account</label>
                <select
                  value={habitSpendAccount}
                  onChange={e => setHabitSpendAccount(e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 600 }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.icon} {acc.name} (Bal: ₹{acc.balance})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={async () => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  await db.setTaskStatus(habitToLog.id, todayStr, 'completed');
                  setHabitToLog(null);
                  refresh();
                }}
                className="btn-ghost"
                style={{ flex: 1, height: '44px', borderRadius: '14px', fontSize: '0.8125rem' }}
              >
                Spent ₹0
              </button>
              <button 
                onClick={async () => {
                  const spentVal = Number(habitSpendAmount);
                  if (isNaN(spentVal) || spentVal < 0) {
                    alert('Please enter a valid amount!');
                    return;
                  }
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  await db.addTransaction({
                    type: 'expense',
                    amount: spentVal,
                    category: habitToLog.category || 'food',
                    account: habitSpendAccount || 'cash',
                    date: new Date().toISOString(),
                    note: `${habitToLog.title} Habit Log (Budget: ₹${habitToLog.budgetLimit})`
                  });

                  await db.setTaskStatus(habitToLog.id, todayStr, 'completed');

                  const saved = habitToLog.budgetLimit - spentVal;
                  if (saved > 0) {
                    setCelebrationSavings({
                      title: habitToLog.title,
                      limit: habitToLog.budgetLimit,
                      spent: spentVal,
                      saved
                    });
                  }

                  setHabitToLog(null);
                  setHabitSpendAmount('');
                  refresh();
                }}
                className="btn-primary"
                style={{ flex: 2, height: '44px', borderRadius: '14px', fontWeight: 800 }}
              >
                Log & Complete 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrationSavings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px',
          animation: 'fadeIn 0.22s ease-out',
        }}>
          <div className="card animate-scale-up text-center" style={{ width: '100%', maxWidth: '360px', padding: '30px 24px', borderRadius: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'var(--color-card)', border: 'none', boxShadow: 'var(--shadow-modal)' }}>
            <span style={{ fontSize: '4rem', animation: 'bounce 1s infinite' }}>🎉</span>
            
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>Excellent Savings!</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                Sticking to your budget is a superpower. You successfully completed your <strong>{celebrationSavings.title}</strong> routine under budget!
              </p>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1.5px dashed rgba(16,185,129,0.25)', padding: '16px', borderRadius: '20px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Routine Limit</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{celebrationSavings.limit}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Actual Spent</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>₹{celebrationSavings.spent}</span>
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(16,185,129,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Your Savings Today</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981' }}>+ ₹{celebrationSavings.saved}</span>
              </div>
            </div>

            {goals && goals.filter(g => g.status === 'active').length > 0 && (
              <div style={{
                background: 'rgba(37,99,235,0.04)',
                border: '1px solid rgba(37,99,235,0.15)',
                borderRadius: '20px',
                padding: '16px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left'
              }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>
                  🎯 Transfer Savings to Financial Goal:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={e => setSelectedGoalId(e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 600, fontSize: '0.8125rem', height: '38px', padding: '0 8px' }}
                >
                  {goals.filter(g => g.status === 'active').map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name} (Saved: ₹{g.currentAmount} / ₹{g.targetAmount})
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const targetGoal = goals.find(g => g.id === selectedGoalId);
                    if (!targetGoal) return;
                    
                    try {
                      const newAmount = targetGoal.currentAmount + celebrationSavings.saved;
                      const nextStatus = newAmount >= targetGoal.targetAmount ? 'completed' as const : 'active' as const;
                      await db.updateGoal(targetGoal.id, { currentAmount: newAmount, status: nextStatus });
                      
                      await db.addTransaction({
                        type: 'expense',
                        amount: celebrationSavings.saved,
                        category: 'savings',
                        account: habitSpendAccount || 'cash',
                        date: new Date().toISOString(),
                        note: `Deposited habit savings to Goal: ${targetGoal.name}`
                      });

                      alert(`Deposited ₹${celebrationSavings.saved} into "${targetGoal.name}"! 🎯`);
                      setCelebrationSavings(null);
                      refresh();
                    } catch (err) {
                      console.error('Failed to deposit savings to goal:', err);
                      alert('Failed to save to Goal.');
                    }
                  }}
                  className="btn-primary"
                  style={{ height: '38px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  🚀 Transfer ₹{celebrationSavings.saved} to Goal
                </button>
              </div>
            )}

            <button
              onClick={() => setCelebrationSavings(null)}
              className="btn-ghost"
              style={{ width: '100%', height: '44px', borderRadius: '16px', fontWeight: 800, border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              Just Complete Routine 👍
            </button>
          </div>
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
