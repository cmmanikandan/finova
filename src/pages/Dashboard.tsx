import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Target,
  ChevronRight, TrendingUp, TrendingDown, Eye, EyeOff, Zap, AlertTriangle
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

const Dashboard: React.FC = () => {
  const { user, categories, settings } = useApp();
  const navigate = useNavigate();
  const [hideBalance, setHideBalance] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

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
  const balance = db.getTotalBalance();
  const budgets = db.getBudgets();
  const goals = db.getGoals().filter(g => g.status === 'active');
  const recentTxns = db.getTransactions().slice(0, 5);

  const getCatInfo = (catId: string) => categories.find(c => c.id === catId);

  // Daily limit status
  const dailyStatus = useMemo(() => db.getDailyLimitStatus(), []);
  const savingsRate = useMemo(() => db.getSavingsRate(now.getFullYear(), now.getMonth()), []);

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
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {currentTimeString}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {currentDateString}
              </p>
            </div>
          </div>
        </div>

        {/* 1.6. Daily Limit Widget */}
        {settings.dailyLimitEnabled && settings.dailyLimit > 0 && (
          <div style={{ padding: '10px 16px 0' }}>
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

        {/* 2. Full-Width Balance Card — padded inside the page */}
        <div style={{ padding: '16px 16px 0' }}>
          <div className="balance-gradient" style={{
            borderRadius: '20px',
            padding: '24px 20px 20px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevated)',
          }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '110px', height: '110px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '25%', width: '130px', height: '130px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

            <p style={{ margin: 0, fontSize: '0.6875rem', opacity: 0.8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Total Balance</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 16px' }}>
              <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                {hideBalance ? '₹••••••' : formatCurrency(balance)}
              </h2>
              <button
                onClick={() => setHideBalance(v => !v)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
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

        {/* 3. Quick Actions */}
        <p className="section-header">Quick Actions</p>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <QuickAction icon={<ArrowDownLeft size={20} />} label="Add Expense" color="#EF4444" bg="rgba(239,68,68,0.1)" onClick={() => openForm('expense')} />
          <QuickAction icon={<ArrowUpRight size={20} />}  label="Add Income"  color="#22C55E" bg="rgba(34,197,94,0.1)"  onClick={() => openForm('income')} />
          <QuickAction icon={<ArrowLeftRight size={20} />} label="Transfer"   color="#2563EB" bg="rgba(37,99,235,0.1)"  onClick={() => openForm('transfer')} />
          <QuickAction icon={<Target size={20} />}         label="Goals"      color="#F59E0B" bg="rgba(245,158,11,0.1)" onClick={() => navigate('/goals')} />
          <QuickAction icon={<Zap size={20} />}            label="Day Limit"  color="#7C3AED" bg="rgba(124,58,237,0.1)" onClick={() => navigate('/budgets')} />
          <QuickAction icon={<ChevronRight size={20} />}   label="Reports"    color="#06B6D4" bg="rgba(6,182,212,0.1)"  onClick={() => navigate('/reports')} />
        </div>

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
                        background: isIncome ? 'rgba(34,197,94,0.1)' : t.type === 'transfer' ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.1)',
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
