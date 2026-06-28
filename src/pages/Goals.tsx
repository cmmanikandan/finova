import React, { useState } from 'react';
import { Plus, ChevronRight, CheckCircle, Archive, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as db from '../services/db';
import type { Goal } from '../types';
import { formatCurrency, percentage } from '../utils/format';
import { GOAL_TEMPLATES } from '../data/defaults';

// SVG Progress Ring Component
const ProgressRing: React.FC<{ percentage: number; color: string; size?: number }> = ({ percentage, color, size = 120 }) => {
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
      <svg height={size} width={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--color-border)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{Math.round(percentage)}%</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>saved</span>
      </div>
    </div>
  );
};

const Goals: React.FC = () => {
  const { goals, refresh } = useApp();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Resolve viewMode from URL
  let viewMode: 'list' | 'create' | 'details' | 'deposit' | 'withdraw' = 'list';
  if (pathname === '/goals/new') {
    viewMode = 'create';
  } else if (id) {
    if (pathname.endsWith('/deposit')) {
      viewMode = 'deposit';
    } else if (pathname.endsWith('/withdraw')) {
      viewMode = 'withdraw';
    } else {
      viewMode = 'details';
    }
  }

  const selectedGoal = id ? goals.find(g => g.id === id) || null : null;

  // Form inputs
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#2563EB');
  const [notes, setNotes] = useState('');
  
  // Transaction Amount State
  const [amountInput, setAmountInput] = useState('');

  const activeGoals    = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const archivedGoals  = goals.filter(g => g.status === 'archived');

  const handleCreate = () => {
    if (!name || !target || parseFloat(target) <= 0) return;
    db.addGoal({
      name, targetAmount: parseFloat(target), currentAmount: parseFloat(current) || 0,
      targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString(),
      icon, color, status: 'active', notes,
    });
    refresh();
    navigate('/goals');
  };

  const handleDeposit = () => {
    if (!selectedGoal || !amountInput || parseFloat(amountInput) <= 0) return;
    const value = parseFloat(amountInput);
    const nextAmount = Math.min(selectedGoal.currentAmount + value, selectedGoal.targetAmount);
    const nextStatus: 'active' | 'completed' | 'archived' = nextAmount >= selectedGoal.targetAmount ? 'completed' : 'active';
    
    db.updateGoal(selectedGoal.id, {
      currentAmount: nextAmount,
      status: nextStatus
    });

    setAmountInput('');
    refresh();
    navigate(`/goals/${selectedGoal.id}`);
  };

  const handleWithdraw = () => {
    if (!selectedGoal || !amountInput || parseFloat(amountInput) <= 0) return;
    const value = parseFloat(amountInput);
    const nextAmount = Math.max(selectedGoal.currentAmount - value, 0);
    const nextStatus: 'active' | 'completed' | 'archived' = nextAmount >= selectedGoal.targetAmount ? 'completed' : 'active';
    
    db.updateGoal(selectedGoal.id, {
      currentAmount: nextAmount,
      status: nextStatus
    });

    setAmountInput('');
    refresh();
    navigate(`/goals/${selectedGoal.id}`);
  };

  const handleArchiveToggle = () => {
    if (!selectedGoal) return;
    const nextStatus = selectedGoal.status === 'archived' ? 'active' : 'archived';
    db.updateGoal(selectedGoal.id, { status: nextStatus });
    refresh();
    navigate('/goals');
  };

  const handleDelete = () => {
    if (!selectedGoal) return;
    if (window.confirm('Delete this goal permanently?')) {
      db.deleteGoal(selectedGoal.id);
      refresh();
      navigate('/goals');
    }
  };

  // ─── 1. Subpage: Create Goal ───
  if (viewMode === 'create') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>New Goal</h2>
          <button className="btn-primary" style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', boxShadow: 'none' }} onClick={handleCreate}>
            Save
          </button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Scrolling Templates */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Savings Templates</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '4px' }}>
              {GOAL_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => { setName(t.name); setIcon(t.icon); setColor(t.color); setTarget('50000'); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '16px',
                    border: `1.5px solid ${name === t.name ? t.color : 'var(--color-border)'}`,
                    background: name === t.name ? `${t.color}15` : 'var(--color-card)',
                    color: name === t.name ? t.color : 'var(--color-text-muted)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Goal Name</label>
              <input type="text" className="input-field" placeholder="e.g. New iPhone" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Target (₹)</label>
                <input type="number" className="input-field" placeholder="Target amount" value={target} onChange={e => setTarget(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Already Saved (₹)</label>
                <input type="number" className="input-field" placeholder="Optional" value={current} onChange={e => setCurrent(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Target Date</label>
              <input type="date" className="input-field" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Goal Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px', background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                {['🎯', '🚗', '🏠', '✈️', '🎓', '💻', '💍', '💼', '🐖', '🪙', '🎄', '🎁', '📱'].map(emoji => (
                  <button key={emoji} onClick={() => setIcon(emoji)} style={{ fontSize: '1.5rem', width: '40px', height: '40px', background: icon === emoji ? 'rgba(37,99,235,0.12)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Theme Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#2563EB', '#16A34A', '#DC2626', '#EA580C', '#7C3AED', '#0891B2', '#475569'].map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: color === c ? '3px solid var(--color-text)' : 'none', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Notes (optional)</label>
              <input type="text" className="input-field" placeholder="Description of your goal" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer save */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => navigate('/goals')}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleCreate}>Save Goal</button>
        </div>
      </div>
    );
  }

  // ─── 2. Subpage: Goal Details ───
  if (viewMode === 'details' && selectedGoal) {
    const pct = percentage(selectedGoal.currentAmount, selectedGoal.targetAmount);
    const daysLeft = Math.ceil((new Date(selectedGoal.targetDate).getTime() - Date.now()) / 86400000);
    const isCompleted = selectedGoal.status === 'completed';

    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Goal Details</h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleArchiveToggle} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '8px' }}>
              <Archive size={20} />
            </button>
            <button onClick={handleDelete} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '8px' }}>
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable details */}
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Progress Ring Card */}
          <div className="card" style={{ padding: '24px', textAlign: 'center', gap: '16px' }}>
            {isCompleted && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: '12px', color: '#22C55E', animation: 'countUp 0.4s ease both' }}>
                <Award size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal Completed</span>
              </div>
            )}
            <ProgressRing percentage={pct} color={selectedGoal.color} size={150} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{selectedGoal.icon} {selectedGoal.name}</h3>
              {selectedGoal.notes && <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{selectedGoal.notes}</p>}
            </div>
          </div>

          {/* Details Row */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Target Amount</span>
              <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{formatCurrency(selectedGoal.targetAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Current Savings</span>
              <span style={{ fontWeight: 800, color: selectedGoal.color }}>{formatCurrency(selectedGoal.currentAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Target Date</span>
              <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{new Date(selectedGoal.targetDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Timeline</span>
              <span style={{ fontWeight: 800, color: daysLeft > 0 ? 'var(--color-text)' : '#EF4444' }}>
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Overdue'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer quick money actions */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/goals/${selectedGoal.id}/withdraw`)}>
            <ArrowDownLeft size={16} /> Withdraw
          </button>
          <button className="btn-primary" style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${selectedGoal.color}, ${selectedGoal.color}cc)`, boxShadow: `0 4px 16px ${selectedGoal.color}35` }} onClick={() => navigate(`/goals/${selectedGoal.id}/deposit`)}>
            <ArrowUpRight size={16} /> Add Money
          </button>
        </div>
      </div>
    );
  }

  // ─── 3. Subpage: Add Money ───
  if (viewMode === 'deposit' && selectedGoal) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => navigate(`/goals/${selectedGoal.id}`)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Add Savings</h2>
          <div style={{ width: '22px' }} />
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '16px', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{selectedGoal.icon}</div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>{selectedGoal.name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)} remaining to complete
              </p>
            </div>
            
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Amount to Deposit (₹)</label>
              <input type="number" className="input-field" placeholder="₹ 0" value={amountInput} onChange={e => setAmountInput(e.target.value)} style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 800 }} />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => navigate(`/goals/${selectedGoal.id}`)}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, background: `linear-gradient(135deg, ${selectedGoal.color}, ${selectedGoal.color}cc)` }} onClick={handleDeposit}>
            Deposit Amount
          </button>
        </div>
      </div>
    );
  }

  // ─── 4. Subpage: Withdraw Money ───
  if (viewMode === 'withdraw' && selectedGoal) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => navigate(`/goals/${selectedGoal.id}`)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Withdraw Savings</h2>
          <div style={{ width: '22px' }} />
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '16px', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{selectedGoal.icon}</div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>{selectedGoal.name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {formatCurrency(selectedGoal.currentAmount)} currently saved
              </p>
            </div>
            
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Amount to Withdraw (₹)</label>
              <input type="number" className="input-field" placeholder="₹ 0" value={amountInput} onChange={e => setAmountInput(e.target.value)} style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 800 }} />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => navigate(`/goals/${selectedGoal.id}`)}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: 'none' }} onClick={handleWithdraw}>
            Withdraw Amount
          </button>
        </div>
      </div>
    );
  }

  // ─── 5. Main: Goals List ───
  const GoalCard = ({ g }: { g: Goal }) => {
    const pct = percentage(g.currentAmount, g.targetAmount);
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000);
    const isCompleted = g.status === 'completed';

    return (
      <div className="list-row" style={{ padding: '16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', flexDirection: 'column', alignItems: 'stretch', gap: '10px' }} onClick={() => navigate(`/goals/${g.id}`)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px', fontSize: '1.25rem',
              background: `${g.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{g.icon}</div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.9375rem' }}>{g.name}</div>
              {isCompleted ? (
                <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700 }}>Finished 🎉</div>
              ) : g.status === 'archived' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Archived</div>
              ) : daysLeft > 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{daysLeft} days remaining</div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 700 }}>Overdue!</div>
              )}
            </div>
          </div>
          {isCompleted ? (
            <CheckCircle size={20} color="#22C55E" />
          ) : g.status === 'archived' ? (
            <Archive size={20} color="var(--color-text-muted)" />
          ) : (
            <ChevronRight size={18} color="var(--color-border)" />
          )}
        </div>

        <div className="progress-bar" style={{ height: '6px', margin: 0 }}>
          <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: g.color }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
          <span style={{ fontWeight: 800, color: g.color }}>{formatCurrency(g.currentAmount)} saved</span>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Target: {formatCurrency(g.targetAmount)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Sticky top bar */}
      <div className="app-bar">
        <h2>Goals</h2>
      </div>

      {/* Main Content scrollable area */}
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Suggested templates (horizontal chips) */}
        <div style={{ padding: '16px 0 16px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Goals</h3>
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '4px'
          }}>
            {GOAL_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  db.addGoal({
                    name: t.name,
                    targetAmount: 30000,
                    currentAmount: 0,
                    targetDate: new Date(Date.now() + 120 * 86400000).toISOString(),
                    icon: t.icon,
                    color: t.color,
                    status: 'active'
                  });
                  refresh();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>({formatCurrency(30000)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Goals list */}
        {activeGoals.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <span style={{ fontSize: '3rem' }}>🎯</span>
            <p style={{ margin: '12px 0 4px', fontWeight: 800, color: 'var(--color-text)', fontSize: '1.0625rem' }}>No active goals</p>
            <p style={{ margin: '0 0 20px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Start saving toward something you love</p>
            <button className="btn-primary" onClick={() => navigate('/goals/new')}>
              <Plus size={18} /> Create Goal
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Goals</h3>
            <div className="list-group">
              {activeGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed 🎉</h3>
            <div className="list-group">
              {completedGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}

        {/* Archived Goals */}
        {archivedGoals.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Archived 📦</h3>
            <div className="list-group">
              {archivedGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}
      </div>

      {/* FAB to Add Goal */}
      <button id="add-goal-fab" className="fab" onClick={() => navigate('/goals/new')} aria-label="Add Goal">
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default Goals;
