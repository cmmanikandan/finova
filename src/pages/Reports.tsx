import React, { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Download, FileText, Calendar, BarChart3, TrendingUp, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import { formatCurrency, percentage } from '../utils/format';
import { format, subMonths } from 'date-fns';
import { exportPDF, exportCSV, exportExcel, exportJSON } from '../services/export';

const TABS = ['Overview', 'Category', 'Monthly', 'Yearly', 'Calendar'];
const PIE_COLORS = ['#EF4444','#F59E0B','#22C55E','#2563EB','#7C3AED','#0891B2','#EA580C','#DB2777','#059669'];

const Reports: React.FC = () => {
  const { categories } = useApp();
  const [tab, setTab] = useState('Overview');
  const [showExportOptions, setShowExportOptions] = useState(false);

  const now = new Date();
  const stats = db.getMonthlyStats(now.getFullYear(), now.getMonth());

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
  }, []);

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
  }, []);

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

  const handleExport = (formatType: 'pdf' | 'csv' | 'excel' | 'json') => {
    const txns = db.getTransactions();
    if (formatType === 'pdf') exportPDF(txns);
    else if (formatType === 'csv') exportCSV(txns);
    else if (formatType === 'excel') exportExcel(txns);
    else if (formatType === 'json') exportJSON(txns);
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
          gap: '0.5rem',
          overflowX: 'auto',
          padding: '0 16px 12px 16px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? 'chip-active' : 'chip-inactive'}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Main Content (Flat layout) */}
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>

        {tab === 'Overview' && (
          <>
            {/* Stats block (Full bleed table grid) */}
            <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-border)' }}>
                {[
                  { label: 'Income',     value: stats.income,  color: '#22C55E', bg: 'transparent', icon: <ArrowUpRight size={14} />, borderRight: '1px solid var(--color-border)' },
                  { label: 'Expenses',   value: stats.expense, color: '#EF4444', bg: 'transparent', icon: <ArrowDownLeft size={14} />, borderRight: 'none' }
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, padding: '16px', borderRight: s.borderRight }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{s.label}</div>
                      <div style={{ color: s.color }}>{s.icon}</div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{formatCurrency(s.value)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { label: 'Net Savings',value: stats.savings, color: '#2563EB', bg: 'transparent', icon: <TrendingUp size={14} />, borderRight: '1px solid var(--color-border)' },
                  { label: 'Avg/Day',    value: avgDaily,      color: '#F59E0B', bg: 'transparent', icon: <Calendar size={14} />, borderRight: 'none' }
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, padding: '16px', borderRight: s.borderRight }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{s.label}</div>
                      <div style={{ color: s.color }}>{s.icon}</div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{formatCurrency(s.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra Stats list group */}
            <div className="list-group" style={{ marginTop: '16px' }}>
              <div className="list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Highest Category</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{highestCategory}</span>
              </div>
              <div className="list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Txn Count</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{txnCount} logs</span>
              </div>
            </div>

            {/* Monthly bar chart (Full bleed) */}
            <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden', marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Income vs Expense</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barCategoryGap="25%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income"  name="Income"  fill="#22C55E" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Savings line chart (Full bleed) */}
            <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)', padding: '20px 16px', overflow: 'hidden', marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Savings Trend</h4>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="savings" name="Savings" stroke="#2563EB" strokeWidth={2.5} dot={{ fill: '#2563EB', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === 'Category' && (
          <>
            {categoryData.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 16px' }}>
                <img src="/icon-96x96.png" alt="FINOVA" style={{ width: '64px', opacity: 0.3 }} />
                <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>No expenses this month</p>
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

      {/* Export Options Dialog Overlay (no bottom sheets) */}
      {showExportOptions && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', padding: '16px' }} onClick={() => setShowExportOptions(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', margin: 'auto', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Export Reports</h3>
              <button onClick={() => setShowExportOptions(false)} style={{ border: 'none', background: 'var(--color-bg)', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: '8px', borderRadius: '16px', height: 'auto' }} onClick={() => handleExport('pdf')}>
                <FileText size={24} color="#EF4444" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>PDF</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: '8px', borderRadius: '16px', height: 'auto' }} onClick={() => handleExport('excel')}>
                <BarChart3 size={24} color="#22C55E" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>Excel</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: '8px', borderRadius: '16px', height: 'auto' }} onClick={() => handleExport('csv')}>
                <FileText size={24} color="#3B82F6" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>CSV</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: '8px', borderRadius: '16px', height: 'auto' }} onClick={() => handleExport('json')}>
                <FileText size={24} color="#7C3AED" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>JSON</span>
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
