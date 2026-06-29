import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import * as db from '../services/db';
import type { RecurringTransaction } from '../types';

interface ForecastDay {
  dateStr: string;
  date: Date;
  balance: number;
  isProjected: boolean;
}

const Forecast: React.FC = () => {
  const navigate = useNavigate();
  const [historyDays, setHistoryDays] = useState<ForecastDay[]>([]);
  const [projectedDays, setProjectedDays] = useState<ForecastDay[]>([]);
  const [velocity, setVelocity] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [deficitDate, setDeficitDate] = useState<string | null>(null);

  useEffect(() => {
    calculateForecast();
    db.registerWriteListener(calculateForecast);
  }, []);

  const calculateForecast = () => {
    const txns = db.getTransactions();
    const accounts = db.getAccounts();
    const recurring = db.getRecurringTransactions();
    
    // 1. Current Balance
    const totalCurrent = accounts.reduce((sum, a) => sum + a.balance, 0);
    setCurrentBalance(totalCurrent);

    // 2. Historical Daily Spending Velocity (over last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const last30DaysExpenses = txns.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= thirtyDaysAgo && tDate <= today && t.type === 'expense';
    });

    const total30dExpense = last30DaysExpenses.reduce((sum, t) => sum + t.amount, 0);
    const dailyVelocity = total30dExpense / 30;
    setVelocity(dailyVelocity);

    // 3. Generate Past 30 Days Balances
    // Work backwards from current balance
    const past: ForecastDay[] = [];
    let runningBalance = totalCurrent;
    
    // Sort transactions by date descending (newest first)
    const sortedTxns = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      // Add to past
      past.unshift({
        dateStr: dStr,
        date: d,
        balance: runningBalance,
        isProjected: false
      });

      // Find transactions that happened on this day to roll back balance for the previous iteration
      const dayTxns = sortedTxns.filter(t => new Date(t.date).toISOString().split('T')[0] === dStr);
      for (const t of dayTxns) {
        if (t.type === 'expense') {
          runningBalance += t.amount; // roll back subtraction
        } else if (t.type === 'income') {
          runningBalance -= t.amount; // roll back addition
        }
      }
    }
    setHistoryDays(past);

    // 4. Project Future 90 Days Balances
    const future: ForecastDay[] = [];
    let projBalance = totalCurrent;
    let deficitDayStr: string | null = null;

    for (let i = 1; i <= 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dStr = d.toISOString().split('T')[0];

      // A. Subtract daily spending velocity
      projBalance -= dailyVelocity;

      // B. Process recurring bills that fall on this date
      const activeRecurring = recurring.filter(r => r.active);
      for (const rec of activeRecurring) {
        if (isRecurringDueOnDate(rec, d)) {
          if (rec.type === 'expense') {
            projBalance -= rec.amount;
          } else {
            projBalance += rec.amount;
          }
        }
      }

      if (projBalance < 0 && !deficitDayStr) {
        deficitDayStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }

      future.push({
        dateStr: dStr,
        date: d,
        balance: projBalance,
        isProjected: true
      });
    }

    setProjectedDays(future);
    setDeficitDate(deficitDayStr);
  };

  // Helper to determine if a recurring transaction is scheduled on a projected date
  const isRecurringDueOnDate = (rec: RecurringTransaction, date: Date): boolean => {
    const start = new Date(rec.startDate);
    // Ignore if before start date
    if (date < start) return false;

    const diffTime = Math.abs(date.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (rec.frequency === 'daily') {
      return true;
    }
    if (rec.frequency === 'weekly') {
      return diffDays % 7 === 0;
    }
    if (rec.frequency === 'monthly') {
      return date.getDate() === start.getDate();
    }
    if (rec.frequency === 'yearly') {
      return date.getDate() === start.getDate() && date.getMonth() === start.getMonth();
    }
    return false;
  };

  // SVG Chart Render Helpers
  const renderSvgChart = () => {
    const allDays = [...historyDays, ...projectedDays];
    if (allDays.length === 0) return null;

    const balances = allDays.map(d => d.balance);
    const maxVal = Math.max(...balances, 5000); // minimum height limit
    const minVal = Math.min(...balances, 0);
    const range = maxVal - minVal || 1;

    // Viewbox specs
    const width = 500;
    const height = 200;
    const padding = 20;

    const getX = (idx: number) => {
      return padding + (idx / (allDays.length - 1)) * (width - padding * 2);
    };

    const getY = (val: number) => {
      // higher y coordinate in SVG is lower on screen
      return height - padding - ((val - minVal) / range) * (height - padding * 2);
    };

    // Construct paths
    let histPathStr = '';
    let projPathStr = '';
    
    // Split index between history and projection
    const splitIdx = historyDays.length - 1;

    // 1. History Path (Solid)
    historyDays.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.balance);
      if (i === 0) {
        histPathStr = `M ${x} ${y}`;
      } else {
        histPathStr += ` L ${x} ${y}`;
      }
    });

    // 2. Projection Path (Dashed)
    allDays.forEach((d, i) => {
      if (i < splitIdx) return;
      const x = getX(i);
      const y = getY(d.balance);
      if (i === splitIdx) {
        projPathStr = `M ${x} ${y}`;
      } else {
        projPathStr += ` L ${x} ${y}`;
      }
    });

    // Gradients fill path
    const fillHistPath = `${histPathStr} L ${getX(splitIdx)} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`;
    const fillProjPath = `M ${getX(splitIdx)} ${getY(projectedDays[0]?.balance || 0)} ${projPathStr.substring(projPathStr.indexOf('L'))} L ${getX(allDays.length - 1)} ${getY(minVal)} L ${getX(splitIdx)} ${getY(minVal)} Z`;

    const splitX = getX(splitIdx);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Zero baseline line */}
        <line 
          x1={padding} 
          y1={getY(0)} 
          x2={width - padding} 
          y2={getY(0)} 
          stroke="rgba(239,68,68,0.25)" 
          strokeWidth="1" 
          strokeDasharray="4 4" 
        />

        {/* Fills */}
        <path d={fillHistPath} fill="url(#histGrad)" />
        <path d={fillProjPath} fill="url(#projGrad)" />

        {/* Lines */}
        <path d={histPathStr} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
        <path d={projPathStr} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />

        {/* Divider dotted line at today's split */}
        <line 
          x1={splitX} 
          y1={padding} 
          x2={splitX} 
          y2={height - padding} 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="1.5" 
          strokeDasharray="2 2" 
        />

        {/* Label labels */}
        <text x={padding} y={height - 2} fill="var(--text-secondary)" fontSize="8" textAnchor="start">30d Ago</text>
        <text x={splitX} y={height - 2} fill="var(--accent)" fontSize="8" fontWeight="600" textAnchor="middle">Today</text>
        <text x={width - padding} y={height - 2} fill="var(--text-secondary)" fontSize="8" textAnchor="end">90d Forecast</text>
      </svg>
    );
  };

  const getProjBalanceAtDay = (daysCount: number) => {
    if (projectedDays.length < daysCount) return 0;
    return projectedDays[daysCount - 1].balance;
  };

  return (
    <div className="page-container pb-24">
      <header className="app-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="header-title">Savings Forecast</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="page-content" style={{ padding: '16px' }}>
        {/* Deficit Alert Warning */}
        {deficitDate ? (
          <div 
            className="card animate-fade-in" 
            style={{ 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid #EF4444', 
              color: '#EF4444', 
              padding: '16px', 
              borderRadius: '16px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700 }}>Projected Cash Deficit!</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                At your current daily spending velocity of <strong>₹{Math.round(velocity).toLocaleString()}/day</strong> and upcoming recurring bills, you are projected to run out of money on <strong>{deficitDate}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="card animate-fade-in" 
            style={{ 
              background: 'rgba(34,197,94,0.1)', 
              border: '1px solid #22C55E', 
              color: '#22C55E', 
              padding: '16px', 
              borderRadius: '16px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <ShieldCheck size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700 }}>Cashflow is Healthy</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                Great! Based on your current habits, your account balance is projected to remain positive over the next 90 days.
              </p>
            </div>
          </div>
        )}

        {/* 1. CHART CONTAINER CARD */}
        <div className="card glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} className="text-blue-500" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Aggregate Balance Trend</h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} /> Projections
            </span>
          </div>

          <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
            {renderSvgChart()}
          </div>
        </div>

        {/* 2. STATS SUMMARY GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div className="card glass-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Current Balance</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
              ₹{currentBalance.toLocaleString()}
            </div>
          </div>
          <div className="card glass-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>30d Spending Speed</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: '#EF4444' }}>
              ₹{Math.round(velocity).toLocaleString()}<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/day</span>
            </div>
          </div>
        </div>

        {/* 3. DETAILED FORECAST OUTLOOK */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 650 }}>Projection Milestones</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 30 Day Outlook */}
            <div className="card list-item-card flex-between" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', fontSize: '1rem' }}>
                  📅
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600 }}>30-Day Outlook</h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Projected savings trajectory</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: getProjBalanceAtDay(30) >= 0 ? 'var(--text-primary)' : '#EF4444' }}>
                  ₹{Math.round(getProjBalanceAtDay(30)).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {getProjBalanceAtDay(30) >= currentBalance ? '📈 Upwards' : '📉 Downwards'}
                </div>
              </div>
            </div>

            {/* 60 Day Outlook */}
            <div className="card list-item-card flex-between" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', fontSize: '1rem' }}>
                  ⏳
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600 }}>60-Day Outlook</h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Medium-term health profile</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: getProjBalanceAtDay(60) >= 0 ? 'var(--text-primary)' : '#EF4444' }}>
                  ₹{Math.round(getProjBalanceAtDay(60)).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {getProjBalanceAtDay(60) >= currentBalance ? '📈 Upwards' : '📉 Downwards'}
                </div>
              </div>
            </div>

            {/* 90 Day Outlook */}
            <div className="card list-item-card flex-between" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', fontSize: '1rem' }}>
                  🔮
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600 }}>90-Day Outlook</h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Long-term cash reserve forecast</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: getProjBalanceAtDay(90) >= 0 ? 'var(--text-primary)' : '#EF4444' }}>
                  ₹{Math.round(getProjBalanceAtDay(90)).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {getProjBalanceAtDay(90) >= currentBalance ? '📈 Upwards' : '📉 Downwards'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note Disclaimer */}
        <div 
          className="flex-center" 
          style={{ 
            marginTop: '20px', 
            padding: '12px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '12px', 
            gap: '8px', 
            fontSize: '0.7rem', 
            color: 'var(--text-secondary)',
            lineHeight: 1.3
          }}
        >
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>Note: Forecast calculations assume your average spending rate and active recurring payments remain unchanged. Unexpected transactions will shift the curve.</span>
        </div>
      </div>
    </div>
  );
};

export default Forecast;
