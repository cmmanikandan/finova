import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AlertTriangle, Plus, Trash2, Edit3, X, Save, Sliders, Flame, Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import { fireConfetti } from '../utils/confetti';
import { formatCurrency } from '../utils/format';
import type { Budget } from '../types';

// ── Circular progress ring ────────────────────────────────────────────────────
const Ring: React.FC<{ pct: number; size?: number; stroke?: number; color: string }> = ({
  pct, size = 120, stroke = 10, color,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

// ── Budget period label ───────────────────────────────────────────────────────
function periodLabel(p: Budget['period']): string {
  if (p === 'monthly') return 'Monthly';
  if (p === 'weekly')  return 'Weekly';
  if (p === 'daily')   return 'Daily';
  return 'Custom';
}

// ── Color from pct ────────────────────────────────────────────────────────────
function ringColor(pct: number): string {
  if (pct >= 100) return '#DC2626'; // red
  if (pct >= 80)  return '#F59E0B'; // amber
  if (pct >= 60)  return '#F97316'; // orange
  return '#22C55E';                 // green
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-day bar chart (SVG)
// ─────────────────────────────────────────────────────────────────────────────
const WeeklyChart: React.FC<{ limit: number; currencySymbol: string }> = ({ limit, currencySymbol }) => {
  const data = useMemo(() => db.get7DaySpending(), []);
  const maxAmt = Math.max(...data.map(d => d.amount), limit > 0 ? limit : 1, 1);

  const W = 280, H = 90, barW = 28, gap = 12;
  const totalW = data.length * (barW + gap) - gap;
  const startX = (W - totalW) / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        7-Day Spending
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 24}`} style={{ overflow: 'visible' }}>
        {/* Limit line */}
        {limit > 0 && (
          <>
            <line
              x1={startX} y1={H - (limit / maxAmt) * H}
              x2={startX + totalW} y2={H - (limit / maxAmt) * H}
              stroke="#DC2626" strokeWidth="1" strokeDasharray="4,3"
            />
            <text x={startX + totalW + 4} y={H - (limit / maxAmt) * H + 4} fill="#DC2626" fontSize="8" fontWeight="600">
              limit
            </text>
          </>
        )}
        {data.map((d, i) => {
          const x = startX + i * (barW + gap);
          const barH = maxAmt > 0 ? (d.amount / maxAmt) * H : 0;
          const y = H - barH;
          const isToday = i === data.length - 1;
          const over = limit > 0 && d.amount > limit;
          const barColor = over ? '#DC2626' : isToday ? '#2563EB' : '#93C5FD';
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx="6" ry="6" fill={barColor} opacity="0.9" />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--color-text-secondary)" fontWeight={isToday ? 700 : 400}>
                {d.label.slice(0, 3)}
              </text>
              {d.amount > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill="var(--color-text-secondary)">
                  {currencySymbol}{d.amount >= 1000 ? `${(d.amount/1000).toFixed(1)}k` : Math.round(d.amount)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Limits Tab
// ─────────────────────────────────────────────────────────────────────────────
const MILESTONES = [3, 7, 15, 30, 50, 100, 365];

const LimitsTab: React.FC = () => {
  const { settings, saveSettings, transactions, budgets, refresh } = useApp();
  const cs = settings.currencySymbol;

  const daily  = useMemo(() => db.getDailyLimitStatus(),  [settings, transactions, budgets]);
  const weekly = useMemo(() => db.getWeeklyLimitStatus(), [settings, transactions, budgets]);
  const streakData = useMemo(() => db.getStreakData(), [settings, transactions]);
  const now = new Date();
  const savingsRate = useMemo(() => db.getSavingsRate(now.getFullYear(), now.getMonth()), [transactions]);

  const [editingDaily, setEditingDaily]   = useState(false);
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [dailyInput, setDailyInput]       = useState('');
  const [weeklyInput, setWeeklyInput]     = useState('');

  // ── Streak animations & UI state ──
  const [animatedStreak, setAnimatedStreak] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Helper to format date YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Sync animation values
  useEffect(() => {
    setAnimatedStreak(streakData.currentStreak);
  }, []);

  useEffect(() => {
    if (streakData.currentStreak > animatedStreak) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 800);

      // Trigger Confetti
      fireConfetti();

      // Trigger Haptics
      if (window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }

      // Count up
      let startVal = animatedStreak;
      const endVal = streakData.currentStreak;
      const interval = setInterval(() => {
        startVal += 1;
        setAnimatedStreak(startVal);
        if (startVal >= endVal) {
          clearInterval(interval);
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setAnimatedStreak(streakData.currentStreak);
    }
  }, [streakData.currentStreak]);

  // Milestone triggers
  useEffect(() => {
    if (settings.dailyLimitEnabled && streakData.currentStreak > 0) {
      const nextMilestone = MILESTONES.find(m => 
        streakData.currentStreak >= m && 
        (streakData.lastMilestoneClaimed || 0) < m
      );
      if (nextMilestone) {
        setActiveMilestone(nextMilestone);
      }
    }
  }, [streakData.currentStreak, streakData.lastMilestoneClaimed, settings.dailyLimitEnabled]);

  // End of day toast notifications
  useEffect(() => {
    if (settings.dailyLimitEnabled && streakData.lastSuccessfulDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatLocalDate(yesterday);
      
      const lastNotifDate = streakData.lastNotificationShownDate || '';
      if (lastNotifDate < yesterdayStr) {
        if (streakData.lastSuccessfulDay === yesterdayStr) {
          setToastType('success');
          setToastMessage(`🎉 Great job! Your spending streak is now ${streakData.currentStreak} days.`);
          db.saveStreakData({ lastNotificationShownDate: yesterdayStr });
        } else if (streakData.lastFailedDay === yesterdayStr) {
          setToastType('error');
          setToastMessage(`⚠️ Daily limit exceeded. Your spending streak has been reset.`);
          db.saveStreakData({ lastNotificationShownDate: yesterdayStr });
        }
        
        // Auto-dismiss toast
        const dismissTimer = setTimeout(() => {
          setToastMessage(null);
        }, 5000);
        return () => clearTimeout(dismissTimer);
      }
    }
  }, [streakData.lastSuccessfulDay, streakData.lastFailedDay, settings.dailyLimitEnabled]);

  const toggleDailyLimit = () => {
    const updated = { ...settings, dailyLimitEnabled: !settings.dailyLimitEnabled };
    saveSettings(updated);
    refresh();
  };

  const toggleWeeklyLimit = () => {
    const updated = { ...settings, weeklyLimitEnabled: !settings.weeklyLimitEnabled };
    saveSettings(updated);
    refresh();
  };

  const saveDailyLimit = () => {
    const val = parseFloat(dailyInput);
    if (!isNaN(val) && val > 0) {
      saveSettings({ ...settings, dailyLimit: val, dailyLimitEnabled: true });
      refresh();
    }
    setEditingDaily(false);
  };

  const saveWeeklyLimit = () => {
    const val = parseFloat(weeklyInput);
    if (!isNaN(val) && val > 0) {
      saveSettings({ ...settings, weeklyLimit: val, weeklyLimitEnabled: true });
      refresh();
    }
    setEditingWeekly(false);
  };

  const dailyColor  = settings.dailyLimitEnabled  ? ringColor(daily.pct)  : '#94A3B8';
  const weeklyColor = settings.weeklyLimitEnabled ? ringColor(weekly.pct) : '#94A3B8';

  // Get color based on streak count
  const getStreakColor = (days: number) => {
    if (days === 0) return '#94A3B8'; // Grey
    if (days <= 7) return '#3B82F6';  // Blue
    if (days <= 30) return '#22C55E'; // Green
    if (days <= 100) return '#EA580C'; // Orange
    return '#D97706'; // Gold
  };

  const streakColor = getStreakColor(animatedStreak);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '110px' }}>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          background: toastType === 'success' ? '#10B981' : '#EF4444',
          color: '#fff',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 99999,
          animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Milestone Congratulations Popup Modal */}
      {activeMilestone && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px',
          animation: 'fadeInText 0.3s ease forwards',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px 24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1.5px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            animation: 'logoFadeScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#D97706', marginBottom: '8px',
            }}>
              <Award size={48} strokeWidth={2} />
            </div>
            
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#081A45' }}>Milestone Unlocked!</h3>
              <p style={{ margin: '8px 0 0', fontSize: '0.9375rem', color: 'var(--color-text-secondary)', fontWeight: 600, lineHeight: 1.45 }}>
                You've stayed within your daily spending limit for <strong style={{ color: streakColor }}>{activeMilestone} Days</strong> in a row!
              </p>
            </div>

            <div style={{
              width: '100%', padding: '12px', background: '#F8FAFC', borderRadius: '16px',
              border: '1px solid var(--color-border)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)',
            }}>
              🔥 Achievement Badge Earned
            </div>

            <button
              onClick={() => {
                db.saveStreakData({ lastMilestoneClaimed: activeMilestone });
                setActiveMilestone(null);
              }}
              style={{
                width: '100%', padding: '14px', background: '#2563EB', color: '#fff',
                border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '0.9375rem',
                cursor: 'pointer', transition: 'transform 0.1s', boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Warning banner */}
      {settings.dailyLimitEnabled && daily.over && (
        <div style={{
          background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '14px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <AlertTriangle size={20} color="#DC2626" />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#DC2626' }}>Daily Limit Exceeded!</div>
            <div style={{ fontSize: '0.75rem', color: '#991B1B' }}>
              You spent {cs}{formatCurrency(daily.spent - daily.limit).replace(cs, '')} more than your {cs}{formatCurrency(daily.limit).replace(cs, '')} limit today.
            </div>
          </div>
        </div>
      )}

      {settings.dailyLimitEnabled && daily.warn && !daily.over && (
        <div style={{
          background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '14px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <AlertTriangle size={20} color="#D97706" />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D97706' }}>Approaching Daily Limit</div>
            <div style={{ fontSize: '0.75rem', color: '#92400E' }}>
              Only {cs}{formatCurrency(daily.remaining).replace(cs, '')} remaining for today.
            </div>
          </div>
        </div>
      )}

      {/* Streak + Savings Rate pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Daily Spending Streak Card */}
        <div style={{
          background: 'var(--color-card)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '16px', padding: '16px', textAlign: 'center',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            color: streakColor,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: pulse ? 'scale(1.35)' : 'scale(1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
          }}>
            <Flame size={28} fill={streakColor} strokeWidth={1.5} />
          </div>
          
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>
            {animatedStreak}
          </div>
          
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700, marginTop: '2px' }}>
            Days
          </div>
          
          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.2 }}>
            Stayed within limit
          </div>

          <div style={{
            fontSize: '0.625rem', fontWeight: 800, color: '#D97706',
            background: '#FEF3C7', padding: '2px 8px', borderRadius: '8px',
            marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px',
          }}>
            🏆 Best: {streakData.bestStreak}
          </div>
        </div>
        <div style={{
          background: savingsRate >= (settings.savingsGoalPercent || 20) ? '#F0FDF4' : savingsRate > 0 ? 'var(--color-card)' : '#FEF2F2',
          border: `1.5px solid ${savingsRate >= (settings.savingsGoalPercent || 20) ? '#BBF7D0' : savingsRate > 0 ? 'var(--color-border)' : '#FECACA'}`,
          borderRadius: '16px', padding: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.75rem' }}>💰</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: savingsRate >= 20 ? '#16A34A' : savingsRate < 0 ? '#DC2626' : 'var(--color-text)', lineHeight: 1.1 }}>{savingsRate}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '4px' }}>Savings Rate</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Goal: {settings.savingsGoalPercent || 20}% this month
          </div>
        </div>
      </div>

      {/* Daily Limit Card */}
      <div style={{
        background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
        borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>Daily Limit</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Today's spending cap</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { setDailyInput(String(settings.dailyLimit)); setEditingDaily(true); }}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit3 size={13} /> Edit
            </button>
            {/* Toggle switch */}
            <button
              onClick={toggleDailyLimit}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: settings.dailyLimitEnabled ? '#2563EB' : '#CBD5E1',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: settings.dailyLimitEnabled ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>

        {editingDaily ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{cs}</span>
              <input
                type="number" value={dailyInput} onChange={e => setDailyInput(e.target.value)}
                autoFocus
                style={{ width: '100%', paddingLeft: '30px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', border: '2px solid var(--color-primary)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={saveDailyLimit} style={{ padding: '10px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
              <Save size={16} />
            </button>
            <button onClick={() => setEditingDaily(false)} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Ring pct={settings.dailyLimitEnabled ? daily.pct : 0} size={110} stroke={10} color={dailyColor} />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dailyColor, lineHeight: 1 }}>
                {settings.dailyLimitEnabled ? Math.round(daily.pct) : 0}%
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>used</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Spent today</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{cs}{formatCurrency(daily.spent).replace(cs, '')}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Daily limit</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{cs}{formatCurrency(settings.dailyLimit).replace(cs, '')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Remaining</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: daily.over ? '#DC2626' : '#16A34A' }}>
                {daily.over ? `−${cs}${formatCurrency(daily.spent - daily.limit).replace(cs, '')}` : `${cs}${formatCurrency(daily.remaining).replace(cs, '')}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Limit Card */}
      <div style={{
        background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
        borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>Weekly Limit</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Last 7 days spending cap</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { setWeeklyInput(String(settings.weeklyLimit)); setEditingWeekly(true); }}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              onClick={toggleWeeklyLimit}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: settings.weeklyLimitEnabled ? '#2563EB' : '#CBD5E1',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: settings.weeklyLimitEnabled ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>

        {editingWeekly ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{cs}</span>
              <input
                type="number" value={weeklyInput} onChange={e => setWeeklyInput(e.target.value)}
                autoFocus
                style={{ width: '100%', paddingLeft: '30px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', border: '2px solid var(--color-primary)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={saveWeeklyLimit} style={{ padding: '10px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
              <Save size={16} />
            </button>
            <button onClick={() => setEditingWeekly(false)} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Ring pct={settings.weeklyLimitEnabled ? weekly.pct : 0} size={110} stroke={10} color={weeklyColor} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: weeklyColor, lineHeight: 1 }}>
                {settings.weeklyLimitEnabled ? Math.round(weekly.pct) : 0}%
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>used</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Spent (7 days)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{cs}{formatCurrency(weekly.spent).replace(cs, '')}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Weekly limit</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{cs}{formatCurrency(settings.weeklyLimit).replace(cs, '')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Remaining</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: weekly.over ? '#DC2626' : '#16A34A' }}>
                {weekly.over ? `−${cs}${formatCurrency(weekly.spent - weekly.limit).replace(cs, '')}` : `${cs}${formatCurrency(weekly.remaining).replace(cs, '')}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div style={{
        background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
        borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-card)',
      }}>
        <WeeklyChart limit={settings.dailyLimitEnabled ? settings.dailyLimit : 0} currencySymbol={cs} />
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Budget form modal
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = ['#2563EB','#16A34A','#DC2626','#D97706','#7C3AED','#0891B2','#EA580C','#059669'];

const BudgetForm: React.FC<{
  initial?: Budget;
  categories: { id: string; name: string; icon: string }[];
  onSave: (data: Omit<Budget, 'id' | 'spent'>) => void;
  onClose: () => void;
}> = ({ initial, categories, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [limit, setLimit] = useState(String(initial?.limit ?? ''));
  const [period, setPeriod] = useState<Budget['period']>(initial?.period ?? 'monthly');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);

  const handleSave = () => {
    const l = parseFloat(limit);
    if (!name.trim() || !category || isNaN(l) || l <= 0) return;
    onSave({
      name: name.trim(), category, limit: l, period,
      startDate: new Date().toISOString(), color, alertThreshold: 80,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '430px', margin: '0 auto',
        background: 'var(--color-card)', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 36px', display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {initial ? 'Edit Budget' : 'New Budget'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><X size={20} /></button>
        </div>

        {/* Name */}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Budget name"
          style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9375rem', fontWeight: 600 }} />

        {/* Category */}
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9375rem', fontWeight: 600 }}>
          <option value="">— Select Category —</option>
          {categories.filter(c => !c.id.startsWith('transfer')).map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>

        {/* Limit */}
        <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Budget limit amount"
          style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9375rem', fontWeight: 600 }} />

        {/* Period */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
          {(['monthly','weekly','daily'] as Budget['period'][]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '10px', borderRadius: '12px', border: `2px solid ${period === p ? '#2563EB' : 'var(--color-border)'}`,
                background: period === p ? '#EFF6FF' : 'var(--color-surface)', color: period === p ? '#2563EB' : 'var(--color-text-secondary)',
                fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              }}>{periodLabel(p)}</button>
          ))}
        </div>

        {/* Color */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--color-text)' : 'transparent'}`,
              cursor: 'pointer', transition: 'border 0.15s',
            }} />
          ))}
        </div>

        <button onClick={handleSave} style={{
          padding: '14px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '14px',
          fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <Save size={18} /> {initial ? 'Save Changes' : 'Create Budget'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Budgets List Tab
// ─────────────────────────────────────────────────────────────────────────────
const BudgetsListTab: React.FC = () => {
  const { budgets, categories, refresh } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | undefined>();

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === 'expense' || c.type === 'both'),
    [categories]
  );

  const handleAdd = useCallback(async (data: Omit<Budget, 'id' | 'spent'>) => {
    if (editBudget) {
      await db.updateBudget(editBudget.id, data);
    } else {
      await db.addBudget(data);
    }
    refresh();
  }, [editBudget, refresh]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Delete this budget?')) {
      await db.deleteBudget(id);
      refresh();
    }
  }, [refresh]);

  if (budgets.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px 24px', minHeight: '360px', gap: '12px' }}>
        <div style={{ fontSize: '4.5rem' }}>⚖️</div>
        <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>No Budgets Yet</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Create a budget limits tracker to control and audit your spending.</div>
        <button onClick={() => setShowForm(true)} style={{ marginTop: '8px', padding: '10px 24px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add Budget
        </button>
        {showForm && <BudgetForm categories={expenseCategories} onSave={handleAdd} onClose={() => setShowForm(false)} />}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '110px' }}>
      {budgets.map(b => {
        const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
        const color = ringColor(pct);
        const cat = categories.find(c => c.id === b.category);
        return (
          <div key={b.id} style={{
            background: 'var(--color-card)', border: '1.5px solid var(--color-border)',
            borderRadius: '18px', padding: '16px', boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${b.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                {cat?.icon ?? '💰'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{periodLabel(b.period)} · {cat?.name ?? b.category}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Spent: <strong style={{ color: 'var(--color-text)' }}>₹{b.spent.toLocaleString()}</strong> of ₹{b.limit.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              {/* Circular Progress Ring */}
              <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                <Ring pct={pct} size={64} stroke={6} color={color} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: color }}>
                  {Math.round(pct)}%
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={() => { setEditBudget(b); setShowForm(true); }} style={{ padding: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}><Edit3 size={13} /></button>
                <button onClick={() => handleDelete(b.id)} style={{ padding: '6px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={() => { setEditBudget(undefined); setShowForm(true); }} style={{
        padding: '14px', background: 'var(--color-surface)', border: '2px dashed var(--color-border)',
        borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.875rem',
      }}>
        <Plus size={18} /> Add Budget
      </button>

      {showForm && (
        <BudgetForm
          initial={editBudget}
          categories={expenseCategories}
          onSave={handleAdd}
          onClose={() => { setShowForm(false); setEditBudget(undefined); }}
        />
      )}

      {/* Floating Action Button */}
      {budgets.length > 0 && (
        <button
          className="fab"
          onClick={() => { setEditBudget(undefined); setShowForm(true); }}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '20px',
            zIndex: 50
          }}
          aria-label="Add Budget"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Budgets Page
// ─────────────────────────────────────────────────────────────────────────────
const Budgets: React.FC = () => {
  const [tab, setTab] = useState<'limits' | 'budgets'>('limits');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 0',
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={18} color="#2563EB" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>Budgets & Limits</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Control your spending, build better habits</p>
          </div>
        </div>
        {/* Tab pills */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
          {(['limits', 'budgets'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px', border: 'none', borderBottom: `3px solid ${tab === t ? '#2563EB' : 'transparent'}`,
              background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
              color: tab === t ? '#2563EB' : 'var(--color-text-secondary)',
              transition: 'color 0.15s, border-color 0.15s',
            }}>
              {t === 'limits' ? '🎯 Limits' : '📊 Budgets'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {tab === 'limits' ? <LimitsTab /> : <BudgetsListTab />}
      </div>
    </div>
  );
};

export default Budgets;

