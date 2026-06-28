import React, { useMemo } from 'react';
import {
  Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Target,
  ChevronRight, TrendingUp, TrendingDown, Sliders, BarChart2
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

      <div style={{ paddingBottom: '120px' }}>

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
            <h2 style={{ margin: '6px 0 16px', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {formatCurrency(balance)}
            </h2>

            {/* Inline stats inside the balance card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px' }}>
              {[
                { label: 'Income',  value: stats.income,  icon: <TrendingUp size={12} />,  color: 'rgba(134,239,172,1)' },
                { label: 'Expense', value: stats.expense, icon: <TrendingDown size={12} />, color: 'rgba(252,165,165,1)' },
                { label: 'Savings', value: stats.savings, icon: <TrendingUp size={12} />,  color: stats.savings >= 0 ? 'rgba(147,197,253,1)' : 'rgba(252,165,165,1)' },
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
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff' }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Quick Actions */}
        <p className="section-header">Quick Actions</p>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <QuickAction icon={<ArrowDownLeft size={20} />} label="Add Expense" color="#EF4444" bg="rgba(239,68,68,0.1)" onClick={() => openForm('expense')} />
          <QuickAction icon={<ArrowUpRight size={20} />}  label="Add Income"  color="#22C55E" bg="rgba(34,197,94,0.1)"  onClick={() => openForm('income')} />
          <QuickAction icon={<ArrowLeftRight size={20} />} label="Transfer"   color="#2563EB" bg="rgba(37,99,235,0.1)"  onClick={() => openForm('transfer')} />
          <QuickAction icon={<Target size={20} />}         label="Add Goal"   color="#F59E0B" bg="rgba(245,158,11,0.1)" onClick={() => navigate('/goals/new')} />
          <QuickAction icon={<Sliders size={20} />}        label="Budgets"    color="#7C3AED" bg="rgba(124,58,237,0.1)" onClick={() => navigate('/budgets')} />
          <QuickAction icon={<BarChart2 size={20} />}      label="Reports"    color="#06B6D4" bg="rgba(6,182,212,0.1)"  onClick={() => navigate('/reports')} />
        </div>

        {/* 4. Monthly Summary */}
        <p className="section-header">Monthly Summary</p>
        <div className="list-group">
          {[
            { label: 'Income',   value: stats.income,   color: '#16A34A' },
            { label: 'Expenses', value: stats.expense,  color: '#DC2626' },
            { label: 'Savings',  value: stats.savings,  color: stats.savings >= 0 ? '#2563EB' : '#DC2626' },
            { label: 'Top Category', value: null, extra: highestSpendCategory
                ? `${highestSpendCategory.icon} ${highestSpendCategory.name}`
                : 'None', color: 'var(--color-text)' },
          ].map(item => (
            <div key={item.label} className="list-row" style={{ cursor: 'default' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</span>
              {item.value !== null
                ? <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: item.color }}>{formatCurrency(item.value)}</span>
                : <span style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color }}>{item.extra}</span>
              }
            </div>
          ))}
        </div>

        {/* 5. Recent Transactions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 6px' }}>
          <span className="section-header" style={{ padding: 0 }}>Recent Transactions</span>
          <button
            onClick={() => navigate('/transactions')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            See All <ChevronRight size={14} />
          </button>
        </div>

        {recentTxns.length === 0 ? (
          <div style={{ margin: '0 16px', background: 'var(--color-card)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '2.5rem' }}>📭</span>
            <p style={{ margin: '8px 0 16px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>No transactions yet</p>
            <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.8125rem', height: '40px' }} onClick={() => openForm('expense')}>
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

        {/* 6. Goals Preview */}
        {goals.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 6px' }}>
              <span className="section-header" style={{ padding: 0 }}>Active Goals</span>
              <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div className="list-group">
              {goals.slice(0, 2).map(g => {
                const pct = percentage(g.currentAmount, g.targetAmount);
                return (
                  <div key={g.id} className="list-row" onClick={() => navigate(`/goals/${g.id}`)} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{g.name}</span>
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
          </>
        )}

        {/* 7. Budget Preview */}
        {budgets.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 6px' }}>
              <span className="section-header" style={{ padding: 0 }}>Budgets</span>
              <button onClick={() => navigate('/budgets')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                See All <ChevronRight size={14} />
              </button>
            </div>
            <div className="list-group">
              {budgets.slice(0, 2).map(b => {
                const pct = percentage(b.spent, b.limit);
                const cat = getCatInfo(b.category);
                const overBudget = pct >= 100;
                return (
                  <div key={b.id} className="list-row" onClick={() => navigate('/budgets')} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '📦'}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{b.name}</span>
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
