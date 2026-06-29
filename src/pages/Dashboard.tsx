import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Target,
  ChevronRight, TrendingUp, TrendingDown, Eye, EyeOff, Zap, AlertTriangle,
  Handshake, Scale, Download, Trophy, Users, LineChart, Flame, Check, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as db from '../services/db';
import { formatCurrency, formatDate, formatTime, percentage } from '../utils/format';
import Header from '../components/Header';
import type { TransactionType } from '../types';

const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}> = ({ icon, label, color, bg, onClick }) => (
  <button
    onClick={onClick}
    id={`qa-${label.toLowerCase().replace(/\s+/g, '-')}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'var(--color-card)',
      borderRadius: '16px',
      padding: '12px 16px',
      border: '1px solid var(--color-border)',
      cursor: 'pointer',
      height: '64px',
      width: '100%',
      transition: 'all 0.15s ease',
      boxShadow: 'var(--shadow-card)',
      textAlign: 'left',
    }}
    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
  >
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      flexShrink: 0
    }}>{icon}</div>
    <span style={{
      fontSize: '0.8125rem',
      fontWeight: 700,
      color: 'var(--color-text)',
      lineHeight: 1.2,
    }}>{label}</span>
  </button>
);

interface DashboardProps {
  deferredPrompt?: any;
  isInstalled?: boolean;
  onInstallPWA?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ deferredPrompt, isInstalled, onInstallPWA }) => {
  const {
    user, categories, settings, refresh,
    dailyTasks, dailyTaskLogs, plannerSchedules, userLevel, streakData
  } = useApp();
  const navigate = useNavigate();
  const [hideBalance, setHideBalance] = useState(() => {
    return localStorage.getItem('finova_hide_balance') === 'true';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await db.pullAllFromSupabase();
      refresh();
    } catch (e) {
      console.error('Failed to sync on manual trigger:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Daily Planner widget calculations
  const todayWeekday = new Date().getDay();
  const todaySchedule = useMemo(() => {
    return plannerSchedules.find(s => s.dayOfWeek === todayWeekday);
  }, [plannerSchedules, todayWeekday]);

  const todayTasks = useMemo(() => {
    if (!todaySchedule) return [];
    return dailyTasks.filter(t => todaySchedule.taskIds.includes(t.id));
  }, [dailyTasks, todaySchedule]);

  const todayLogsMap = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = dailyTaskLogs.filter(l => l.date === todayStr);
    const map: Record<string, any> = {};
    logs.forEach(l => {
      map[l.taskId] = l;
    });
    return map;
  }, [dailyTaskLogs]);

  const plannerCompletionPct = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    let completedCount = 0;
    todayTasks.forEach(t => {
      const log = todayLogsMap[t.id];
      if (log && log.status === 'completed') completedCount++;
    });
    return Math.round((completedCount / todayTasks.length) * 100);
  }, [todayTasks, todayLogsMap]);

  const nextPendingTask = useMemo(() => {
    return todayTasks.find(t => {
      const log = todayLogsMap[t.id];
      return !log || log.status === 'pending';
    });
  }, [todayTasks, todayLogsMap]);

  const handleQuickComplete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await db.setTaskStatus(taskId, todayStr, 'completed', 0);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev;
      localStorage.setItem('finova_hide_balance', String(next));
      return next;
    });
  };

  const [time, setTime] = useState(new Date());

  // Onboarding welcome card state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const dismissed = localStorage.getItem('finova_onboarding_dismissed') === 'true';
    if (dismissed) return false;
    return db.getTransactions().length === 0;
  });

  const onboardingSteps = useMemo(() => {
    const hasTxns = db.getTransactions().length > 0;
    const hasDailyLimit = db.getBudgets().length > 0;
    const hasGoals = db.getGoals().length > 0;
    
    // Configured balances (non-zero balance or added account)
    const hasAccounts = db.getAccounts().some(a => a.balance !== 0) || db.getAccounts().length > 6;
    
    // Customized categories (edited template properties or created new custom ones)
    const defaultsMap: Record<string, { name: string; icon: string; color: string }> = {
      food: { name: 'Food', icon: '🍕', color: '#EA580C' },
      travel: { name: 'Travel', icon: '✈️', color: '#4F46E5' },
      shopping: { name: 'Shopping', icon: '🛍️', color: '#DB2777' },
      education: { name: 'Education', icon: '📚', color: '#059669' },
      medical: { name: 'Medical', icon: '🏥', color: '#DC2626' },
      bills: { name: 'Bills', icon: '⚡', color: '#D97706' },
      entertainment: { name: 'Entertainment', icon: '🎮', color: '#7C3AED' },
      fuel: { name: 'Fuel', icon: '⛽', color: '#0F766E' },
      hostel: { name: 'Hostel', icon: '🏠', color: '#0369A1' },
      canteen: { name: 'Canteen', icon: '🍱', color: '#92400E' },
      stationery: { name: 'Stationery', icon: '✏️', color: '#1D4ED8' },
      transport: { name: 'Transport', icon: '🚌', color: '#065F46' },
      salary: { name: 'Salary', icon: '💰', color: '#16A34A' },
      business: { name: 'Business', icon: '💼', color: '#0891B2' },
      investment: { name: 'Investment', icon: '📈', color: '#1D4ED8' },
      freelance: { name: 'Freelance', icon: '💻', color: '#7C3AED' },
      transfer: { name: 'Transfer', icon: '🔄', color: '#475569' },
      others: { name: 'Others', icon: '📦', color: '#475569' },
    };
    const currentCats = db.getCategories();
    const hasCategories = currentCats.length !== 18 || currentCats.some(c => {
      const baseId = c.id.split('_')[0];
      const def = defaultsMap[baseId];
      if (!def) return true;
      return c.name !== def.name || c.icon !== def.icon || c.color !== def.color;
    });

    return {
      txns: hasTxns,
      dailyLimit: hasDailyLimit,
      goals: hasGoals,
      accounts: hasAccounts,
      categories: hasCategories,
      allDone: hasTxns && hasDailyLimit && hasGoals && hasAccounts && hasCategories
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Process any due recurring subscriptions/bills
    db.processRecurringTransactions().then(changed => {
      if (changed) {
        refresh();
      }
    });
  }, [refresh]);

  const getGreeting = () => {
    const hr = time.getHours();
    if (hr < 12) return 'Good Morning ☀️';
    if (hr < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  const currentTimeString = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDateString = time.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const now = new Date();
  const stats = db.getMonthlyStats(now.getFullYear(), now.getMonth());
  const balance = db.getTotalBalance((() => {
    try { return JSON.parse(localStorage.getItem('finova_hidden_accounts') || '[]'); }
    catch { return []; }
  })());
  const budgets = db.getBudgets();
  const goals = db.getGoals().filter(g => g.status === 'active');
  const recentTxns = db.getTransactions().slice(0, 5);

  const getCatInfo = (catId: string) => categories.find(c => c.id === catId);

  // Daily limit status
  const dailyStatus = useMemo(() => db.getDailyLimitStatus(), []);
  const savingsRate = useMemo(() => db.getSavingsRate(now.getFullYear(), now.getMonth()), []);

  // Last month stats for insights
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastStats = useMemo(() => db.getMonthlyStats(lastMonthDate.getFullYear(), lastMonthDate.getMonth()), []);
  const expenseDiff = stats.expense - lastStats.expense;
  const expensePct  = lastStats.expense > 0 ? Math.round(Math.abs(expenseDiff) / lastStats.expense * 100) : null;

  // Top spending category this month
  const topCategory = useMemo(() => {
    const txns = db.getTransactions().filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && t.type === 'expense';
    });
    const catTotals: Record<string, number> = {};
    txns.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    const [catId, total] = sorted[0];
    const cat = categories.find(c => c.id === catId);
    return cat ? { cat, total } : null;
  }, [categories]);

  // Debt summary for net worth
  const debtSummary = useMemo(() => db.getPendingDebtsSummary(), []);
  const netWorth = balance + debtSummary.totalLent - debtSummary.totalBorrowed;

  // Filter bills due within 7 days
  const upcomingBills = useMemo(() => {
    const list = db.getRecurringTransactions();
    const activeRecurring = list.filter(rt => rt.active);
    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);
    
    return activeRecurring.filter(rt => {
      const due = new Date(rt.nextDueDate + 'T00:00:00');
      return due >= today && due <= targetDate;
    }).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, []);

  const openForm = (type: TransactionType) => {
    navigate('/transactions/new', { state: { defaultType: type } });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* 1. Greeting App Bar */}
      <Header
        onProfile={() => navigate('/settings')}
        onNotification={() => navigate('/settings/notifications')}
      />

      <div style={{ paddingBottom: '120px' }}>

        {/* 1.5. Greeting Card under header */}
        <div style={{ padding: '16px 16px 0' }}>
          <div className="card-elevated" style={{
            borderRadius: '20px',
            padding: '16px 20px',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-subtle)',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {getGreeting()}
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
                Hey, {user?.name?.split(' ')[0] || 'there'}!
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                  {currentTimeString}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {currentDateString}
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                style={{
                  border: 'none',
                  background: 'var(--color-bg)',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-subtle)',
                }}
                title="Sync database data"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Onboarding Welcome Card */}
        {showOnboarding && (
          <div style={{ padding: '16px 16px 0' }}>
            <div className="card-elevated" style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1.5px dashed var(--color-primary)',
              borderRadius: '24px',
              padding: '20px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>Welcome to FINOVA! 🚀</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.4 }}>
                    Let's get you set up to manage your finance hub in 3 quick steps:
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('finova_onboarding_dismissed', 'true');
                    setShowOnboarding(false);
                  }}
                  style={{
                    background: 'var(--color-border)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '24px',
                    height: '24px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Steps List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {[
                  {
                    key: 'accounts',
                    label: 'Configure your account balances',
                    done: onboardingSteps.accounts,
                    action: () => navigate('/settings/accounts')
                  },
                  {
                    key: 'txns',
                    label: 'Add your first transaction log',
                    done: onboardingSteps.txns,
                    action: () => navigate('/transactions/new')
                  },
                  {
                    key: 'categories',
                    label: 'Customize your category tags & icons',
                    done: onboardingSteps.categories,
                    action: () => navigate('/settings/categories')
                  },
                  {
                    key: 'dailyLimit',
                    label: 'Set up your daily spending limit',
                    done: onboardingSteps.dailyLimit,
                    action: () => navigate('/budgets')
                  },
                  {
                    key: 'goals',
                    label: 'Create a savings goal milestone',
                    done: onboardingSteps.goals,
                    action: () => navigate('/goals')
                  }
                ].map((step, idx) => (
                  <div
                    key={step.key}
                    onClick={step.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: step.done ? '#22C55E' : 'var(--color-text-muted)',
                        background: step.done ? '#22C55E' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.625rem',
                        fontWeight: 900
                      }}>
                        {step.done ? '✓' : idx + 1}
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: step.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: step.done ? 'line-through' : 'none'
                      }}>
                        {step.label}
                      </span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                ))}
              </div>

              {onboardingSteps.allDone && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#22C55E',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  🎉 All steps completed! You're ready to master your money.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1.6. Daily Limit Widget */}
        {/* 1. Full-Width Balance Card — padded inside the page */}
        <div style={{ padding: '16px 16px 0' }}>
          <div className="balance-gradient" style={{
            borderRadius: '20px',
            padding: '24px 20px 20px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevated)',
          }}>
            {/* Decorative circles (pointerEvents none to prevent blocking eye button click) */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '110px', height: '110px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '25%', width: '130px', height: '130px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%', pointerEvents: 'none' }} />

            <p style={{ margin: 0, fontSize: '0.6875rem', opacity: 0.8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Total Balance</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 16px' }}>
              <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                {hideBalance ? '₹••••••' : formatCurrency(balance)}
              </h2>
              <button
                onClick={toggleHideBalance}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0, zIndex: 5, position: 'relative' }}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Inline stats inside the balance card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px' }}>
              {[
                { label: 'Income',  value: hideBalance ? '••••' : formatCurrency(stats.income),  icon: <TrendingUp size={12} />,  color: 'rgba(134,239,172,1)' },
                { label: 'Expense', value: hideBalance ? '••••' : formatCurrency(stats.expense), icon: <TrendingDown size={12} />, color: 'rgba(252,165,165,1)' },
                { label: 'Savings', value: hideBalance ? '••••' : formatCurrency(stats.savings), icon: <TrendingUp size={12} />,  color: stats.savings >= 0 ? 'rgba(147,197,253,1)' : 'rgba(252,165,165,1)' },
              ].map((item, i) => (
                <div key={item.label} style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  paddingLeft: i > 0 ? '12px' : 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: item.color, opacity: 0.9 }}>
                    {item.icon}
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PWA Promotion Card */}
        {deferredPrompt && !isInstalled && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
              border: '1.5px dashed rgba(37, 99, 235, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <Download size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>Install FINOVA App</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>Access transactions instantly from your home screen.</div>
              </div>
              <button
                onClick={onInstallPWA}
                style={{
                  padding: '8px 16px',
                  background: '#2563EB',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  transition: 'transform 0.1s ease',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* 2. Daily Budget Limit Progress Card — rendered under the balance card */}
        {settings.dailyLimitEnabled && settings.dailyLimit > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <button
              onClick={() => navigate('/budgets')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '14px',
                background: dailyStatus.over ? '#FEF2F2' : dailyStatus.warn ? '#FFFBEB' : 'var(--color-card)',
                border: `1.5px solid ${dailyStatus.over ? '#FECACA' : dailyStatus.warn ? '#FDE68A' : 'var(--color-border)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-subtle)',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {dailyStatus.over
                  ? <AlertTriangle size={20} color="#DC2626" />
                  : <Zap size={20} color={dailyStatus.warn ? '#D97706' : '#2563EB'} />}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: dailyStatus.over ? '#DC2626' : dailyStatus.warn ? '#D97706' : 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {dailyStatus.over ? '⚠️ Daily Limit Exceeded' : dailyStatus.warn ? '⚠️ Approaching Daily Limit' : 'Day Budget'}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '2px' }}>
                  {settings.currencySymbol}{formatCurrency(dailyStatus.spent).replace(settings.currencySymbol, '')} spent of {settings.currencySymbol}{formatCurrency(settings.dailyLimit).replace(settings.currencySymbol, '')}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: dailyStatus.over ? '#DC2626' : '#2563EB' }}>
                  {Math.round(dailyStatus.pct)}%
                </div>
                {/* Mini progress bar */}
                <div style={{ width: '60px', height: '4px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '99px',
                    width: `${Math.min(dailyStatus.pct, 100)}%`,
                    background: dailyStatus.over ? '#DC2626' : dailyStatus.warn ? '#F59E0B' : '#22C55E',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Daily Planner Home Widget */}
        <div style={{ padding: '12px 16px 0' }}>
          <div
            onClick={() => navigate('/planner')}
            className="card-elevated"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(37,99,235,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)'
                }}>
                  <Target size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>Today's Planner Progress</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Lvl {userLevel.currentLevel} • {userLevel.currentXP} XP</div>
                </div>
              </div>

              {streakData.plannerCurrentStreak ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(234,88,12,0.1)', padding: '4px 8px', borderRadius: '10px', color: '#EA580C', fontSize: '0.6875rem', fontWeight: 800 }}>
                  <Flame size={12} fill="#EA580C" stroke="none" />
                  <span>{streakData.plannerCurrentStreak}d Streak</span>
                </div>
              ) : null}
            </div>

            {/* Completion Rate indicator row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  <span>Routines completion</span>
                  <span>{plannerCompletionPct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                    width: `${plannerCompletionPct}%`,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Next task shortcut */}
            {nextPendingTask ? (
              <div style={{
                background: 'var(--color-card)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.125rem' }}>{nextPendingTask.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Next Up: {nextPendingTask.title}</div>
                    {nextPendingTask.reminderTime && (
                      <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>⏰ {nextPendingTask.reminderTime}</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleQuickComplete(e, nextPendingTask.id)}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={12} /> Complete
                </button>
              </div>
            ) : todayTasks.length > 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 800, textAlign: 'center', padding: '4px' }}>
                🎉 Great job! You have checked off all routines for today!
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 650, textAlign: 'center', padding: '4px' }}>
                💡 Click to build your schedule and earn bonus XP!
              </div>
            )}
          </div>
        </div>

        {/* 3. Quick Actions */}
        <p className="section-header">Quick Actions</p>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <QuickAction icon={<ArrowDownLeft size={20} />} label="Add Expense" color="#EF4444" bg="rgba(239,68,68,0.1)" onClick={() => openForm('expense')} />
          <QuickAction icon={<ArrowUpRight size={20} />}  label="Add Income"  color="#22C55E" bg="rgba(34,197,94,0.1)"  onClick={() => openForm('income')} />
          <QuickAction icon={<ArrowLeftRight size={20} />} label="Transfer"   color="#2563EB" bg="rgba(37,99,235,0.1)"  onClick={() => openForm('transfer')} />
          <QuickAction icon={<Trophy size={20} />}         label="Challenges" color="#F59E0B" bg="rgba(245,158,11,0.1)" onClick={() => navigate('/challenges')} />
          <QuickAction icon={<Users size={20} />}          label="Split Bill"  color="#EC4899" bg="rgba(236,72,153,0.1)" onClick={() => navigate('/split-bill')} />
          <QuickAction icon={<LineChart size={20} />}      label="Forecasts"  color="#8B5CF6" bg="rgba(139,92,246,0.1)" onClick={() => navigate('/forecast')} />
          <QuickAction icon={<Target size={20} />}         label="Goals"      color="#3B82F6" bg="rgba(59,130,246,0.1)" onClick={() => navigate('/goals')} />
          <QuickAction icon={<Handshake size={20} />}     label="Debts"      color="#10B981" bg="rgba(16,185,129,0.1)" onClick={() => navigate('/debts')} />
          <QuickAction icon={<Scale size={20} />}          label="Recurring"  color="#F97316" bg="rgba(249,115,22,0.1)" onClick={() => navigate('/settings/recurring')} />
        </div>

        {/* Upcoming Bills Alert widget */}
        {upcomingBills.length > 0 && (
          <>
            <p className="section-header">Upcoming Bills</p>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingBills.map(rt => {
                const cat = getCatInfo(rt.category);
                
                // Date logic to count due days
                const diffTime = new Date(rt.nextDueDate + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const dueLabel = diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days (${rt.nextDueDate})`;
                
                return (
                  <div key={rt.id} className="card-elevated" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderLeft: '4px solid #8B5CF6', cursor: 'pointer'
                  }} onClick={() => navigate('/settings/recurring')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '📦'}</span>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          {rt.note || cat?.name || 'Auto Bill'}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
                          {dueLabel}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: rt.type === 'expense' ? '#DC2626' : '#16A34A' }}>
                      {rt.type === 'expense' ? '-' : '+'}₹{rt.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 4. Monthly Summary */}
        <p className="section-header">Monthly Summary</p>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Income',      value: stats.income,  color: '#16A34A', asStr: null },
            { label: 'Expenses',    value: stats.expense, color: '#DC2626', asStr: null },
            { label: 'Savings',     value: stats.savings, color: stats.savings >= 0 ? '#2563EB' : '#DC2626', asStr: null },
            { label: 'Savings Rate', value: null, color: savingsRate >= 20 ? '#16A34A' : savingsRate < 0 ? '#DC2626' : '#2563EB', asStr: `${savingsRate}%` },
          ].map(item => (
            <div key={item.label} className="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="text-caption" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</span>
              {item.value !== null
                ? <span className="text-body" style={{ fontWeight: 800, color: item.color }}>{formatCurrency(item.value)}</span>
                : <span className="text-body" style={{ fontWeight: 800, color: item.color }}>{item.asStr}</span>
              }
            </div>
          ))}
        </div>

        {/* 4b. Spending Insights */}
        {(expensePct !== null || topCategory) && (
          <>
            <p className="section-header">Spending Insights</p>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expensePct !== null && (
                <div style={{
                  background: expenseDiff > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                  border: `1.5px solid ${expenseDiff > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  borderRadius: '14px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{ fontSize: '1.5rem' }}>{expenseDiff > 0 ? '📈' : '📉'}</div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      {expenseDiff > 0
                        ? `Spending up ${expensePct}% vs last month`
                        : `Spending down ${expensePct}% vs last month`}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                      {expenseDiff > 0
                        ? `You spent ${formatCurrency(Math.abs(expenseDiff))} more than ${lastMonthDate.toLocaleString('default', { month: 'long' })}`
                        : `You saved ${formatCurrency(Math.abs(expenseDiff))} more than ${lastMonthDate.toLocaleString('default', { month: 'long' })}`}
                    </div>
                  </div>
                </div>
              )}
              {topCategory && (
                <div style={{
                  background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
                  borderRadius: '14px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{ fontSize: '1.5rem' }}>{topCategory.cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      Top spend: {topCategory.cat.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                      {formatCurrency(topCategory.total)} this month
                    </div>
                  </div>
                  {stats.expense > 0 && (
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 900,
                      color: topCategory.cat.color || 'var(--color-text-muted)'
                    }}>
                      {Math.round(topCategory.total / stats.expense * 100)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 4c. Net Worth Snapshot */}
        <p className="section-header">Net Worth</p>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
            borderRadius: '18px', padding: '16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0',
          }}>
            {[
              { label: 'Assets', value: balance + debtSummary.totalLent, icon: '🏦', color: '#16A34A' },
              { label: 'Owed', value: debtSummary.totalBorrowed, icon: '💸', color: '#DC2626' },
              { label: 'Net Worth', value: netWorth, icon: '💎', color: netWorth >= 0 ? '#2563EB' : '#DC2626' },
            ].map((item, i) => (
              <div key={item.label} style={{
                display: 'flex', flexDirection: 'column', gap: '4px',
                paddingLeft: i > 0 ? '12px' : 0,
                borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: item.color }}>
                  {hideBalance ? '••••' : formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Recent Transactions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 16px 8px' }}>
          <span className="text-card-title" style={{ color: 'var(--color-text)', fontWeight: 700 }}>Recent Transactions</span>
          <button
            onClick={() => navigate('/transactions')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            See All <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {recentTxns.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>No Transactions Yet</p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Start tracking your daily expenses.</p>
            </div>
          ) : (
            <div className="card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
              {recentTxns.map((t, idx) => {
                const cat = getCatInfo(t.category);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id}
                    className="list-row"
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    style={{ borderBottom: idx === recentTxns.length - 1 ? 'none' : '1px solid var(--color-border)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                        background: isIncome ? 'rgba(34,197,94,0.1)' : t.type === 'transfer' ? 'rgba(37,99,235,0.1)' : `${cat?.color || '#EF4444'}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                      }}>
                        {cat?.icon || (isIncome ? '💰' : '💸')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cat?.name || t.category}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{formatDate(t.date)} · {formatTime(t.date)}</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 800, flexShrink: 0, marginLeft: '8px',
                      color: isIncome ? '#16A34A' : t.type === 'transfer' ? '#2563EB' : '#DC2626',
                    }}>
                      {isIncome ? '+' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Goals Preview */}
        {goals.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 16px 8px' }}>
              <span className="text-card-title" style={{ color: 'var(--color-text)', fontWeight: 700 }}>Active Goals</span>
              <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goals.slice(0, 2).map(g => {
                const pct = percentage(g.currentAmount, g.targetAmount);
                return (
                  <div key={g.id} className="card-elevated" onClick={() => navigate(`/goals/${g.id}`)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                        <span className="text-body" style={{ fontWeight: 700, color: 'var(--color-text)' }}>{g.name}</span>
                      </div>
                      <span className="text-caption" style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar" style={{ margin: 0 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 7. Budget Preview */}
        {budgets.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 16px 8px' }}>
              <span className="text-card-title" style={{ color: 'var(--color-text)', fontWeight: 700 }}>Budgets</span>
              <button onClick={() => navigate('/budgets')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {budgets.slice(0, 2).map(b => {
                const pct = percentage(b.spent, b.limit);
                const cat = getCatInfo(b.category);
                const overBudget = pct >= 100;
                return (
                  <div key={b.id} className="card-elevated" onClick={() => navigate('/budgets')} style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '📦'}</span>
                        <span className="text-body" style={{ fontWeight: 700, color: 'var(--color-text)' }}>{b.name}</span>
                      </div>
                      <span className="text-caption" style={{ fontWeight: 700, color: overBudget ? '#EF4444' : 'var(--color-text-muted)' }}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ margin: 0 }}>
                      <div className="progress-fill" style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: overBudget ? '#EF4444' : pct > 80 ? '#F59E0B' : '#22C55E',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* FAB */}
      <button id="fab-add" className="fab" onClick={() => openForm('expense')} aria-label="Add transaction">
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default Dashboard;
