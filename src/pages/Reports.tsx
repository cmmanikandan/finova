import React, { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Download, Calendar, TrendingUp, ArrowUpRight, ArrowDownLeft, X, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import { formatCurrency, percentage } from '../utils/format';
import { format, subMonths } from 'date-fns';
import { exportPDF, exportCSV, exportExcel, exportJSON } from '../services/export';

const TABS = ['Overview', 'Category', 'Account', 'Monthly', 'Yearly', 'Calendar'];
const PIE_COLORS = ['#EF4444','#F59E0B','#22C55E','#2563EB','#7C3AED','#0891B2','#EA580C','#DB2777','#059669'];

const Reports: React.FC = () => {
  const { categories, accounts, transactions } = useApp();
  const [tab, setTab] = useState('Overview');
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Export Filters State
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | 'json'>('pdf');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_week' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  const visibleAccounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      const hiddenIds = raw ? JSON.parse(raw) : [];
      return accounts.filter(a => !hiddenIds.includes(a.id));
    } catch {
      return accounts;
    }
  }, [accounts]);

  const now = new Date();
  const stats = useMemo(() => db.getMonthlyStats(now.getFullYear(), now.getMonth()), [transactions]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    stats.transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([catId, val]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name || catId, value: val, icon: cat?.icon || '📦' };
    }).sort((a, b) => b.value - a.value);
  }, [stats.transactions, categories]);

  // Account asset share breakdown
  const accountData = useMemo(() => {
    return accounts.map(a => ({
      name: a.name,
      value: a.balance,
      icon: a.icon,
      color: a.color
    })).filter(a => a.value > 0);
  }, [accounts, transactions]);

  const totalWealth = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, transactions]);

  // Monthly comparison (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const s = db.getMonthlyStats(d.getFullYear(), d.getMonth());
      return {
        month: format(d, 'MMM'),
        income: s.income,
        expense: s.expense,
        savings: s.savings,
      };
    });
  }, [transactions]);

  // Yearly comparison (last 12 months)
  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const s = db.getMonthlyStats(d.getFullYear(), d.getMonth());
      return {
        month: format(d, 'MMM yy'),
        income: s.income,
        expense: s.expense,
        savings: s.savings,
      };
    });
  }, [transactions]);

  const avgDaily = stats.expense / (now.getDate() || 1);
  const highestCategory = categoryData[0]?.name || 'N/A';
  const txnCount = stats.transactions.length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--color-card)',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-elevated)',
        fontSize: '0.8125rem'
      }}>
        <div style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{p.name}:</span>
            <span style={{ fontWeight: 800 }}>{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleGenerateExport = async () => {
    let txns = db.getTransactions();

    // 1. Filter by Date Range
    const today = new Date();
    let start = new Date(0); // far past
    let end = new Date(); // today
    
    if (dateRangeFilter === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRangeFilter === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    } else if (dateRangeFilter === 'this_week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
    } else if (dateRangeFilter === 'custom') {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }

    txns = txns.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    // 2. Filter by Category
    if (categoryFilter !== 'all') {
      txns = txns.filter(t => t.category === categoryFilter);
    }

    // 3. Filter by Account
    if (accountFilter !== 'all') {
      txns = txns.filter(t => t.account === accountFilter);
    }

    // 4. Trigger Export
    if (exportFormat === 'pdf') {
      const filterSummary = {
        range: dateRangeFilter === 'custom' ? `${customStartDate} to ${customEndDate}` : dateRangeFilter.replace('_', ' ').toUpperCase(),
        category: categoryFilter === 'all' ? 'All' : categories.find(c => c.id === categoryFilter)?.name || 'Custom',
        account: accountFilter === 'all' ? 'All' : accounts.find(a => a.id === accountFilter)?.name || 'Custom',
      };
      await exportPDF(txns, filterSummary);
    } else if (exportFormat === 'csv') {
      exportCSV(txns);
    } else if (exportFormat === 'excel') {
      exportExcel(txns);
    } else if (exportFormat === 'json') {
      exportJSON(txns);
    }

    setShowExportOptions(false);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div className="app-bar" style={{ borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none' }}>
          <h2>Reports</h2>
          <button id="report-export-btn" className="btn-ghost" onClick={() => setShowExportOptions(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem' }}>
            <Download size={15} /> Export
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.375rem',
          overflowX: 'auto',
          padding: '0 16px 12px 16px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.8125rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                background: tab === t ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content (Flat layout) */}
      <div className="pb-nav-safe" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>

        {tab === 'Overview' && (
          <>
            {/* Stats block (Gradient visual cards) */}
            <div style={{ padding: '16px 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Income', value: stats.income, color: '#22C55E', bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.01) 100%)', border: '1px solid rgba(34, 197, 94, 0.15)', icon: <ArrowUpRight size={16} /> },
                { label: 'Expenses', value: stats.expense, color: '#EF4444', bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.01) 100%)', border: '1px solid rgba(239, 68, 68, 0.15)', icon: <ArrowDownLeft size={16} /> }
              ].map(s => (
                <div key={s.label} className="card" style={{ background: s.bg, border: s.border, padding: '16px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                      {s.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: s.color }}>{formatCurrency(s.value)}</div>
                </div>
              ))}

              {[
                { label: 'Net Savings', value: stats.savings, color: '#2563EB', bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.01) 100%)', border: '1px solid rgba(37, 99, 235, 0.15)', icon: <TrendingUp size={16} /> },
                { label: 'Avg / Day', value: avgDaily, color: '#F59E0B', bg: 'linear-gradient(135deg, rgba(245, 158, 11) 0%, rgba(245, 158, 11, 0.01) 100%)', border: '1px solid rgba(245, 158, 11, 0.15)', icon: <Calendar size={16} /> }
              ].map(s => (
                <div key={s.label} className="card" style={{ background: s.bg, border: s.border, padding: '16px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                      {s.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: s.color }}>{formatCurrency(s.value)}</div>
                </div>
              ))}
            </div>

            {/* Extra Stats list group */}
            <div className="list-group" style={{ margin: '8px 16px 0', border: '1px solid var(--color-border)', borderRadius: '18px', overflow: 'hidden' }}>
              <div className="list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Highest Category</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{highestCategory}</span>
              </div>
              <div className="list-row" style={{ cursor: 'default', borderBottom: 'none' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Txn Count</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{txnCount} logs</span>
              </div>
            </div>

            {/* Monthly bar chart (Floating Card) */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '20px 16px', overflow: 'hidden', margin: '20px 16px 0', boxShadow: 'var(--shadow-card)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Income vs Expense</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barCategoryGap="25%" barGap={4}>
                    <defs>
                      <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income"  name="Income"  fill="url(#barIncome)" radius={[6,6,0,0]} />
                    <Bar dataKey="expense" name="Expense" fill="url(#barExpense)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Savings line chart (Floating Card) */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '20px 16px', overflow: 'hidden', margin: '20px 16px 0', boxShadow: 'var(--shadow-card)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Savings Trend</h4>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="areaSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="savings" name="Savings" stroke="#2563EB" strokeWidth={2.5} fill="url(#areaSavings)" dot={{ fill: '#2563EB', r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === 'Category' && (
          <>
            {categoryData.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 16px' }}>
                <span style={{ fontSize: '3rem' }}>📊</span>
                <p style={{ margin: '8px 0', color: 'var(--color-text)', fontWeight: 800 }}>No expenses this month</p>
                <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Your transactions category breakdown will appear here</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category Breakdown</h4>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => v != null ? formatCurrency(Number(v)) : ''} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="list-group" style={{ marginTop: '20px' }}>
                  {categoryData.map((item, i) => {
                    const pct = percentage(item.value, stats.expense);
                    return (
                      <div key={i} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatCurrency(item.value)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.375rem', fontWeight: 600 }}>{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="progress-bar" style={{ margin: 0, height: '6px' }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'Account' && (
          <>
            {accountData.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 16px' }}>
                <span style={{ fontSize: '3rem' }}>🏦</span>
                <p style={{ margin: '8px 0', color: 'var(--color-text)', fontWeight: 800 }}>No accounts with positive balance</p>
                <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Asset distribution charts will show up once balances are logged</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Asset Share</h4>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={accountData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                          {accountData.map((item, i) => <Cell key={i} fill={item.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => v != null ? formatCurrency(Number(v)) : ''} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="list-group" style={{ marginTop: '20px' }}>
                  {accountData.map((item, i) => {
                    const pct = totalWealth > 0 ? (item.value / totalWealth) * 100 : 0;
                    return (
                      <div key={i} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatCurrency(item.value)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.375rem', fontWeight: 600 }}>{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="progress-bar" style={{ margin: 0, height: '6px' }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: item.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'Monthly' && (
          <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>6-Month Comparison</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barCategoryGap="25%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }} />
                  <Bar dataKey="income"  name="Income"  fill="#22C55E" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4,4,0,0]} />
                  <Bar dataKey="savings" name="Savings" fill="#2563EB" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'Yearly' && (
          <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>12-Month Area Trend</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'Calendar' && (
          <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '20px 16px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {format(now, 'MMMM yyyy')} — Daily Spend
            </h4>
            <CalendarView transactions={stats.transactions} year={now.getFullYear()} month={now.getMonth()} />
          </div>
        )}

      </div>

      {/* Export Options Dialog Overlay */}
      {showExportOptions && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowExportOptions(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '380px', gap: '16px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '24px 20px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>Export Statement</h3>
              <button onClick={() => setShowExportOptions(false)} style={{ border: 'none', background: 'var(--color-bg)', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Format Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { key: 'pdf', label: 'PDF', color: '#EF4444' },
                  { key: 'excel', label: 'Excel', color: '#22C55E' },
                  { key: 'csv', label: 'CSV', color: '#3B82F6' },
                  { key: 'json', label: 'JSON', color: '#7C3AED' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setExportFormat(item.key as any)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: exportFormat === item.key ? item.color : 'var(--color-border)',
                      background: exportFormat === item.key ? `${item.color}15` : 'var(--color-card)',
                      color: exportFormat === item.key ? item.color : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Scope */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={dateRangeFilter} 
                  onChange={e => setDateRangeFilter(e.target.value as any)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: 0,
                    paddingBottom: 0
                  }}
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_week">This Week</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Date Range</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Custom Dates Inputs */}
            {dateRangeFilter === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Start Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    style={{ 
                      borderRadius: '12px',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      height: '48px',
                      paddingTop: 0,
                      paddingBottom: 0
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>End Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    style={{ 
                      borderRadius: '12px',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      height: '48px',
                      paddingTop: 0,
                      paddingBottom: 0
                    }} 
                  />
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={categoryFilter} 
                  onChange={e => setCategoryFilter(e.target.value)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: 0,
                    paddingBottom: 0
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Account Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={accountFilter} 
                  onChange={e => setAccountFilter(e.target.value)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: 0,
                    paddingBottom: 0
                  }}
                >
                  <option value="all">All Accounts</option>
                  {visibleAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '46px', borderRadius: '16px', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 800, cursor: 'pointer' }} onClick={() => setShowExportOptions(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '16px', fontWeight: 800 }} onClick={handleGenerateExport}>
                Generate Report
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const CalendarView: React.FC<{ transactions: any[]; year: number; month: number }> = ({ transactions, year, month }) => {
  const days: React.ReactNode[] = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyTotals: Record<number, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const d = new Date(t.date).getDate();
    dailyTotals[d] = (dailyTotals[d] || 0) + t.amount;
  });

  const maxDaily = Math.max(...Object.values(dailyTotals), 1);

  for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const total = dailyTotals[d] || 0;
    const intensity = total / maxDaily;
    const today = new Date();
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    days.push(
      <div key={d} title={total ? `₹${total.toFixed(0)}` : ''} style={{
        aspectRatio: '1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: isToday ? 800 : 600,
        background: total ? `rgba(239,68,68,${0.15 + intensity * 0.6})` : 'var(--color-bg)',
        color: isToday ? 'var(--color-primary)' : 'var(--color-text)',
        border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
        cursor: total ? 'pointer' : 'default',
      }}>
        {d}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', padding: '0.25rem 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>{days}</div>
      <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        🔴 Darker red = higher spending.
      </div>
    </>
  );
};

export default Reports;

