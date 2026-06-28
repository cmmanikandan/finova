import React, { useMemo } from 'react';
import {
  Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Target,
  ChevronRight, TrendingUp, TrendingDown, Sliders, BarChart2, Calendar
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
  const { categories } = useApp();
  const navigate = useNavigate();

  const now = new Date();
  const stats = db.getMonthlyStats(now.getFullYear(), now.getMonth());
  const balance = db.getTotalBalance();
  const budgets = db.getBudgets();
  const goals = db.getGoals().filter(g => g.status === 'active');
  const recentTxns = db.getTransactions().slice(0, 5);

  const getCatInfo = (catId: string) => categories.find(c => c.id === catId);

  // Calculate highest spending category
  const highestSpendCategory = useMemo(() => {
    const map: Record<string, number> = {};
    stats.transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const cat = categories.find(c => c.id === sorted[0][0]);
      return {
        name: cat?.name || sorted[0][0],
        icon: cat?.icon || '📦',
        amount: sorted[0][1],
      };
    }
    return null;
  }, [stats.transactions, categories]);

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

      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingBottom: '120px', // Clear Bottom Navigation and FAB
      }}>

        {/* 2. Full-Width Balance Card */}
        <div className="balance-gradient" style={{
          borderRadius: '16px',
          padding: '24px 20px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-elevated)',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '110px', height: '110px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '25%', width: '130px', height: '130px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Total Balance</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {formatCurrency(balance)}
          </h2>
        </div>

        {/* 3. Equally Aligned Income, Expense, and Savings Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Income',  value: stats.income,   icon: <TrendingUp size={14} />,  color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Expense', value: stats.expense,  icon: <TrendingDown size={14} />, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Savings', value: stats.savings,  icon: <TrendingUp size={14} />,  color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--color-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: item.color }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatCurrency(item.value)}</div>
            </div>
          ))}
        </div>

        {/* 4. Quick Actions in a 2-column x 3-row grid */}
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <QuickAction icon={<ArrowDownLeft size={20} />} label="Add Expense" color="#EF4444" bg="rgba(239,68,68,0.1)" onClick={() => openForm('expense')} />
            <QuickAction icon={<ArrowUpRight size={20} />}  label="Add Income"  color="#22C55E" bg="rgba(34,197,94,0.1)"  onClick={() => openForm('income')} />
            <QuickAction icon={<ArrowLeftRight size={20} />} label="Transfer"   color="#2563EB" bg="rgba(37,99,235,0.1)"  onClick={() => openForm('transfer')} />
            <QuickAction icon={<Target size={20} />}         label="Add Goal"   color="#F59E0B" bg="rgba(245,158,11,0.1)" onClick={() => navigate('/goals/new')} />
            <QuickAction icon={<Sliders size={20} />}        label="Budgets"    color="#7C3AED" bg="rgba(124,58,237,0.1)" onClick={() => navigate('/budgets')} />
            <QuickAction icon={<BarChart2 size={20} />}      label="Reports"    color="#06B6D4" bg="rgba(6,182,212,0.1)" onClick={() => navigate('/reports')} />
          </div>
        </div>

        {/* 5. Monthly Summary (Flat page section) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: '4px 0 4px 4px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monthly Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px', fontWeight: 600 }}>Monthly Income</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#22C55E' }}>{formatCurrency(stats.income)}</span>
            </div>
            <div style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px', fontWeight: 600 }}>Monthly Expense</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#EF4444' }}>{formatCurrency(stats.expense)}</span>
            </div>
            <div style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px', fontWeight: 600 }}>Monthly Savings</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#2563EB' }}>{formatCurrency(stats.savings)}</span>
            </div>
            <div style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px', fontWeight: 600 }}>Top Category</span>
              {highestSpendCategory ? (
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {highestSpendCategory.icon} {highestSpendCategory.name}
                </span>
              ) : (
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>None</span>
              )}
            </div>
          </div>
        </div>

        {/* 6. Recent Transactions (Flat section with thin dividers) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recent Transactions</h3>
            <button
              onClick={() => navigate('/transactions')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              See All <ChevronRight size={14} />
            </button>
          </div>

          {recentTxns.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'var(--color-card)' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <p style={{ margin: '8px 0 12px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>No transactions yet</p>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8125rem', height: '40px' }} onClick={() => openForm('expense')}>
                + Add Transaction
              </button>
            </div>
          ) : (
            <div className="list-group">
              {recentTxns.map(t => {
                const cat = getCatInfo(t.category);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id}
                    className="list-row"
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    style={{ padding: '12px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                        background: isIncome ? 'rgba(34,197,94,0.1)' : t.type === 'transfer' ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                      }}>
                        {cat?.icon || (isIncome ? '💰' : '💸')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cat?.name || t.category}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDate(t.date)} · {formatTime(t.date)}</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 800,
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

        {/* 7. Goals Preview (Flat section with thin dividers) */}
        {goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Active Goals</h3>
              <button
                onClick={() => navigate('/goals')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div className="list-group">
              {goals.slice(0, 2).map(g => {
                const pct = percentage(g.currentAmount, g.targetAmount);
                return (
                  <div key={g.id} className="list-row" onClick={() => navigate(`/goals/${g.id}`)} style={{ padding: '14px 16px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>{g.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar" style={{ margin: 0 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. Budget Preview (Flat section with thin dividers) */}
        {budgets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Budgets</h3>
              <button
                onClick={() => navigate('/budgets')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div className="list-group">
              {budgets.slice(0, 2).map(b => {
                const pct = percentage(b.spent, b.limit);
                const cat = getCatInfo(b.category);
                const overBudget = pct >= 100;
                return (
                  <div key={b.id} className="list-row" onClick={() => navigate(`/budgets`)} style={{ padding: '14px 16px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '📦'}</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: overBudget ? '#EF4444' : 'var(--color-text-muted)' }}>
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
          </div>
        )}

        {/* 9. Recent Activity Footer */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '99px' }}>
            <Calendar size={12} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              Last synced: Just now
            </span>
          </div>
        </div>

      </div>

      {/* FAB */}
      <button id="fab-add" className="fab" onClick={() => openForm('expense')} aria-label="Add transaction">
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default Dashboard;
