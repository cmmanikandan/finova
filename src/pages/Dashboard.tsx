import React, { useMemo } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Target, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigation } from '../context/NavigationContext';
import * as db from '../services/db';
import { formatCurrency, formatDate, formatTime, percentage } from '../utils/format';
import Header from '../components/Header';
import AddTransaction from './AddTransaction';
import type { TransactionType } from '../types';

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; color: string; bg: string; onClick: () => void }> = ({ icon, label, color, bg, onClick }) => (
  <button onClick={onClick} id={`qa-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
    background: bg, borderRadius: '16px', padding: '0.875rem 0.5rem',
    border: 'none', cursor: 'pointer', flex: 1,
    transition: 'transform 0.15s ease',
  }}
    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
  >
    <div style={{
      width: '42px', height: '42px', borderRadius: '14px', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    }}>{icon}</div>
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0F172A', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
  </button>
);

const Dashboard: React.FC = () => {
  const { categories } = useApp();
  const { push } = useNavigation();

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
    push({ id: 'add-transaction', component: AddTransaction, props: { defaultType: type } });
  };

  return (
    <div className="page-enter">
      <Header />

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '6rem' }}>

        {/* Balance Card */}
        <div className="balance-gradient" style={{ borderRadius: '24px', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '30%', width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

          <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.8, fontWeight: 500 }}>Total Balance</p>
          <h2 style={{ margin: '0.25rem 0 1.25rem', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {formatCurrency(balance)}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Income',  value: stats.income,   icon: <TrendingUp size={14} />,  color: 'rgba(34,197,94,0.9)' },
              { label: 'Expense', value: stats.expense,  icon: <TrendingDown size={14} />, color: 'rgba(239,68,68,0.9)' },
              { label: 'Savings', value: stats.savings,  icon: <TrendingUp size={14} />,  color: 'rgba(255,255,255,0.7)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '0.75rem 0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem', color: item.color }}>
                  {item.icon}
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.9 }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <QuickAction icon={<ArrowDownLeft size={20} />} label="Add Expense" color="#EF4444" bg="rgba(239,68,68,0.08)" onClick={() => openForm('expense')} />
            <QuickAction icon={<ArrowUpRight size={20} />}  label="Add Income"  color="#22C55E" bg="rgba(34,197,94,0.08)"  onClick={() => openForm('income')} />
            <QuickAction icon={<ArrowLeftRight size={20} />} label="Transfer"   color="#2563EB" bg="rgba(37,99,235,0.08)"  onClick={() => openForm('transfer')} />
            <QuickAction icon={<Target size={20} />}         label="Add Goal"   color="#F59E0B" bg="rgba(245,158,11,0.08)" onClick={() => {}} />
          </div>
        </div>
        {/* Monthly Summary */}
        <div className="card" style={{ padding: '1.125rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Monthly Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Monthly Income</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#22C55E' }}>{formatCurrency(stats.income)}</span>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Monthly Expense</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#EF4444' }}>{formatCurrency(stats.expense)}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Monthly Savings</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2563EB' }}>{formatCurrency(stats.savings)}</span>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Top Expense Cat</span>
                {highestSpendCategory ? (
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {highestSpendCategory.icon} {highestSpendCategory.name} ({formatCurrency(highestSpendCategory.amount)})
                  </span>
                ) : (
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#94A3B8' }}>N/A</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Overview */}
        {budgets.length > 0 && (
          <div className="card" style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Budgets</h3>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>See All <ChevronRight size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {budgets.slice(0, 3).map(b => {
                const pct = percentage(b.spent, b.limit);
                const cat = getCatInfo(b.category);
                const overBudget = pct >= 100;
                return (
                  <div key={b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>{cat?.icon || '📦'}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: overBudget ? '#EF4444' : '#64748B' }}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: overBudget ? '#EF4444' : pct > 75 ? '#F59E0B' : '#22C55E',
                      }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem', textAlign: 'right' }}>
                      {overBudget ? 'Over budget!' : `${formatCurrency(b.limit - b.spent)} remaining`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="card" style={{ padding: '1.125rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Recent Transactions</h3>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>See All <ChevronRight size={14} /></button>
          </div>

          {recentTxns.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94A3B8' }}>No transactions yet</p>
              <button className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }} onClick={() => openForm('expense')}>
                + Add First Transaction
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTxns.map(t => {
                const cat = getCatInfo(t.category);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                      background: isIncome ? 'rgba(34,197,94,0.1)' : t.type === 'transfer' ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                    }}>
                      {cat?.icon || (isIncome ? '💰' : '💸')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{cat?.name || t.category}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatDate(t.date)} · {formatTime(t.date)}</div>
                    </div>
                    <div style={{
                      fontSize: '0.9375rem', fontWeight: 700,
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

        {/* Goals Overview */}
        {goals.length > 0 && (
          <div className="card" style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Active Goals</h3>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>See All <ChevronRight size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {goals.slice(0, 2).map(g => {
                const pct = percentage(g.currentAmount, g.targetAmount);
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{g.name}</span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatCurrency(g.currentAmount)} saved</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Goal: {formatCurrency(g.targetAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* FAB */}
      <button id="fab-add" className="fab" onClick={() => openForm('expense')} aria-label="Add transaction">
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default Dashboard;
