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
      <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '0.8125rem' }}>
        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <span>{p.name}:</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(p.value)}</span>
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
    <div className="page-enter">
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Reports</h2>
          <button id="report-export-btn" className="btn-ghost" onClick={() => setShowExportOptions(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', borderRadius: '10px' }}>
            <Download size={14} /> Export Report
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? 'chip-active' : 'chip-inactive'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {tab === 'Overview' && (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Income',     value: stats.income,  color: '#22C55E', bg: 'rgba(34,197,94,0.08)', icon: <ArrowUpRight size={14} /> },
                { label: 'Expenses',   value: stats.expense, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: <ArrowDownLeft size={14} /> },
                { label: 'Net Savings',value: stats.savings, color: '#2563EB', bg: 'rgba(37,99,235,0.08)', icon: <TrendingUp size={14} /> },
                { label: 'Avg/Day',    value: avgDaily,      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <Calendar size={14} /> },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: '16px', padding: '1rem', border: '1px solid rgba(226,232,240,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ color: s.color }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{formatCurrency(s.value)}</div>
                </div>
              ))}
            </div>

            {/* Extra Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.375rem' }}>Highest Category</div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>{highestCategory}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.375rem' }}>Transactions Count</div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>{txnCount} logs</div>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="card" style={{ padding: '1.125rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Income vs Expense</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income"  name="Income"  fill="#22C55E" radius={[6,6,0,0]} />
                  <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Savings line chart */}
            <div className="card" style={{ padding: '1.125rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Savings Trend</h4>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="savings" name="Savings" stroke="#2563EB" strokeWidth={2.5} dot={{ fill: '#2563EB', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === 'Category' && (
          <>
            {categoryData.length === 0 ? (
              <div className="empty-state">
                <img src="/icon-96x96.png" alt="FINOVA" style={{ width: '64px', opacity: 0.3 }} />
                <p style={{ color: '#94A3B8', fontWeight: 600 }}>No expenses this month</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: '1.125rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>Category Breakdown</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => v != null ? formatCurrency(Number(v)) : ''} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card" style={{ padding: '1.125rem', overflow: 'hidden' }}>
                  {categoryData.map((item, i) => {
                    const pct = percentage(item.value, stats.expense);
                    return (
                      <div key={i} style={{ marginBottom: i < categoryData.length - 1 ? '0.875rem' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatCurrency(item.value)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: '0.375rem' }}>{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="progress-bar">
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
          <div className="card" style={{ padding: '1.125rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>6-Month Comparison</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barCategoryGap="25%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                <Bar dataKey="income"  name="Income"  fill="#22C55E" radius={[6,6,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6,6,0,0]} />
                <Bar dataKey="savings" name="Savings" fill="#2563EB" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'Yearly' && (
          <div className="card" style={{ padding: '1.125rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>12-Month Area Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'Calendar' && (
          <div className="card" style={{ padding: '1.125rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>
              {format(now, 'MMMM yyyy')} — Daily Spend
            </h4>
            <CalendarView transactions={stats.transactions} year={now.getFullYear()} month={now.getMonth()} />
          </div>
        )}

      </div>

      {/* Export Options Sheet */}
      {showExportOptions && (
        <div className="modal-overlay" onClick={() => setShowExportOptions(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>Export Reports</h3>
              <button onClick={() => setShowExportOptions(false)} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', gap: '0.5rem' }} onClick={() => handleExport('pdf')}>
                <FileText size={24} color="#EF4444" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>PDF Document</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', gap: '0.5rem' }} onClick={() => handleExport('excel')}>
                <BarChart3 size={24} color="#22C55E" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Excel Spreadsheet</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', gap: '0.5rem' }} onClick={() => handleExport('csv')}>
                <FileText size={24} color="#3B82F6" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>CSV Format</span>
              </button>
              <button className="btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', gap: '0.5rem' }} onClick={() => handleExport('json')}>
                <FileText size={24} color="#7C3AED" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>JSON Format</span>
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
        fontSize: '0.75rem', fontWeight: isToday ? 700 : 500,
        background: total ? `rgba(239,68,68,${0.1 + intensity * 0.6})` : '#F8FAFC',
        color: isToday ? '#2563EB' : '#0F172A',
        border: isToday ? '2px solid #2563EB' : '1px solid #F1F5F9',
        cursor: total ? 'pointer' : 'default',
      }}>
        {d}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '3px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8', padding: '0.25rem 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>{days}</div>
      <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: '#94A3B8' }}>
        🔴 Darker = higher spending. Tap a day to see transactions.
      </div>
    </>
  );
};

export default Reports;
