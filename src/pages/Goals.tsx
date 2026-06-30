import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, ChevronRight, CheckCircle, Archive, Trash2, 
  ArrowLeft, TrendingUp, Edit2, Download, Upload 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as db from '../services/db';
import type { Goal } from '../types';
import { formatCurrency, percentage } from '../utils/format';
import { GOAL_TEMPLATES } from '../data/defaults';
import { fireConfetti } from '../utils/confetti';

// ─── SVG Progress Ring Component ──────────────────────────────────────────────
const ProgressRing: React.FC<{ percentage: number; color: string; size?: number }> = ({ percentage, color, size = 96 }) => {
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg height={size} width={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--color-border)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          style={{ opacity: 0.5 }}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.4s ease-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>{Math.round(percentage)}%</span>
        <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved</span>
      </div>
    </div>
  );
};

// ─── Savings Overview Card ───────────────────────────────────────────────────
const SavingsOverviewCard: React.FC = () => {
  const { settings, transactions } = useApp();
  const now = new Date();
  const { income, expense, savings } = useMemo(
    () => db.getMonthlyStats(now.getFullYear(), now.getMonth()),
    [transactions]
  );
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const cs = settings.currencySymbol;

  const rateColor = savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : savingsRate < 0 ? '#EF4444' : '#2563EB';

  return (
    <div style={{
      margin: '16px',
      background: 'var(--color-card)',
      borderRadius: '24px',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* Top Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#fff',
      }}>
        <TrendingUp size={20} style={{ opacity: 0.9 }} />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.3px' }}>Savings Performance</div>
          <div style={{ fontSize: '0.6875rem', opacity: 0.8, marginTop: '2px', fontWeight: 600 }}>
            {now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
        {/* Animated Progress Ring */}
        <ProgressRing percentage={savingsRate} color={rateColor} size={96} />

        {/* Stats Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Income</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#10B981' }}>{cs}{income.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenses</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#EF4444' }}>{cs}{expense.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: savings >= 0 ? '#2563EB' : '#EF4444' }}>
              {savings >= 0 ? '' : '-'}{cs}{Math.abs(savings).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Goals: React.FC = () => {
  const { goals, refresh } = useApp();
  const { pathname } = useLocation();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Resolve views
  let viewMode: 'list' | 'create' | 'edit' | 'details' | 'deposit' | 'withdraw' = 'list';
  if (pathname === '/goals/new') {
    viewMode = 'create';
  } else if (id) {
    if (pathname.endsWith('/deposit')) {
      viewMode = 'deposit';
    } else if (pathname.endsWith('/withdraw')) {
      viewMode = 'withdraw';
    } else if (pathname.endsWith('/edit')) {
      viewMode = 'edit';
    } else {
      viewMode = 'details';
    }
  }

  const selectedGoal = id ? goals.find(g => g.id === id) || null : null;

  // Form Field States
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3); // default 3 months out
    return d.toISOString().split('T')[0];
  });
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#2563EB');
  const [notes, setNotes] = useState('');
  const [amountInput, setAmountInput] = useState('');

  // Handle template selection auto-fill
  useEffect(() => {
    if (location.state && (viewMode === 'create' || viewMode === 'edit')) {
      const s = location.state as any;
      if (s.name) setName(s.name);
      if (s.icon) setIcon(s.icon);
      if (s.color) setColor(s.color);
      if (s.target) setTarget(s.target);
      if (s.notes) setNotes(s.notes);
    }
  }, [location.state, viewMode]);

  // Load goal for edit mode
  useEffect(() => {
    if (viewMode === 'edit' && selectedGoal) {
      setName(selectedGoal.name);
      setTarget(String(selectedGoal.targetAmount));
      setCurrent(String(selectedGoal.currentAmount));
      setTargetDate(selectedGoal.targetDate.split('T')[0]);
      setIcon(selectedGoal.icon);
      setColor(selectedGoal.color);
      setNotes(selectedGoal.notes || '');
    }
  }, [viewMode, selectedGoal]);

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const archivedGoals = goals.filter(g => g.status === 'archived');

  const handleCreateOrUpdate = async () => {
    if (!name.trim() || !target || parseFloat(target) <= 0) return;
    
    if (viewMode === 'edit' && selectedGoal) {
      await db.updateGoal(selectedGoal.id, {
        name: name.trim(),
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        targetDate: new Date(targetDate).toISOString(),
        icon,
        color,
        notes: notes.trim() || undefined,
      });
    } else {
      await db.addGoal({
        name: name.trim(),
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        targetDate: new Date(targetDate).toISOString(),
        icon,
        color,
        status: 'active',
        notes: notes.trim() || undefined,
      });
    }
    refresh();
    navigate('/goals');
  };

  const handleDeposit = async () => {
    if (!selectedGoal || !amountInput || parseFloat(amountInput) <= 0) return;
    const value = parseFloat(amountInput);
    const nextAmount = Math.min(selectedGoal.currentAmount + value, selectedGoal.targetAmount);
    const completed = nextAmount >= selectedGoal.targetAmount;
    const nextStatus = completed ? 'completed' : 'active';

    await db.updateGoal(selectedGoal.id, {
      currentAmount: nextAmount,
      status: nextStatus,
    });

    if (completed) {
      fireConfetti();
    }

    setAmountInput('');
    refresh();
    navigate(`/goals/${selectedGoal.id}`);
  };

  const handleWithdraw = async () => {
    if (!selectedGoal || !amountInput || parseFloat(amountInput) <= 0) return;
    const value = parseFloat(amountInput);
    const nextAmount = Math.max(selectedGoal.currentAmount - value, 0);

    await db.updateGoal(selectedGoal.id, {
      currentAmount: nextAmount,
      status: 'active', // revert completed status if withdrawn below target
    });

    setAmountInput('');
    refresh();
    navigate(`/goals/${selectedGoal.id}`);
  };

  const handleArchiveToggle = async () => {
    if (!selectedGoal) return;
    const nextStatus = selectedGoal.status === 'archived' ? 'active' : 'archived';
    await db.updateGoal(selectedGoal.id, { status: nextStatus });
    refresh();
    navigate('/goals');
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    if (window.confirm('Delete this goal permanently?')) {
      await db.deleteGoal(selectedGoal.id);
      refresh();
      navigate('/goals');
    }
  };

  // ─── Subpage: Create / Edit Form ───
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Sticky App Bar */}
        <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
            {viewMode === 'edit' ? 'Edit Goal' : 'New Goal'}
          </h2>
          <div style={{ width: '22px' }} />
        </div>

        {/* Scrollable Form Content */}
        <div className="pb-nav-safe" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Scrolling Templates */}
          {viewMode === 'create' && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Templates</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {GOAL_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => {
                      setName(t.name);
                      setIcon(t.icon);
                      setColor(t.color);
                      setTarget('50000');
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '16px',
                      border: `1.5px solid ${name === t.name ? t.color : 'var(--color-border)'}`,
                      background: name === t.name ? `${t.color}12` : 'var(--color-card)',
                      color: name === t.name ? t.color : 'var(--color-text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal Name</label>
              <input type="text" className="input-field" placeholder="e.g. Dream Vacation" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Limit (₹)</label>
                <input type="number" className="input-field" placeholder="0.00" value={target} onChange={e => setTarget(e.target.value)} required min="1" />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 850, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved Amount (₹)</label>
                <input type="number" className="input-field" placeholder="Optional" value={current} onChange={e => setCurrent(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Date</label>
              <input type="date" className="input-field" value={targetDate} onChange={e => setTargetDate(e.target.value)} required />
            </div>

            {/* Icon Picker */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', background: 'var(--color-bg)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                {['🎯', '✈️', '🏠', '💻', '🚗', '🎓', '💍', '💰', '🏖️', '🏍️', '🎁', '📱'].map(emoji => (
                  <button key={emoji} type="button" onClick={() => setIcon(emoji)} style={{ fontSize: '1.5rem', width: '44px', height: '44px', background: icon === emoji ? 'rgba(37,99,235,0.12)' : 'transparent', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme Color</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '4px' }}>
                {['#2563EB', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#64748B'].map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: c, border: color === c ? '3px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'transform 0.1s' }} />
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes (optional)</label>
              <input type="text" className="input-field" placeholder="Description of your goal" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn-ghost" type="button" style={{ flex: 1, height: '48px', borderRadius: '16px' }} onClick={() => navigate('/goals')}>Cancel</button>
            <button className="btn-primary" type="button" style={{ flex: 2, height: '48px', borderRadius: '16px' }} onClick={handleCreateOrUpdate}>
              {viewMode === 'edit' ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Subpage: Goal Details ───
  if (viewMode === 'details' && selectedGoal) {
    const pct = percentage(selectedGoal.currentAmount, selectedGoal.targetAmount);
    const daysLeft = Math.ceil((new Date(selectedGoal.targetDate).getTime() - Date.now()) / 86400000);
    const isCompleted = selectedGoal.status === 'completed';

    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Sticky App Bar */}
        <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/goals')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Goal Details</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate(`/goals/${selectedGoal.id}/edit`)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Edit2 size={18} />
            </button>
            <button onClick={handleDelete} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Details Scroll Area */}
        <div className="pb-nav-safe" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
          <div className="card text-center" style={{ padding: '32px 24px', borderRadius: '24px', position: 'relative' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{selectedGoal.icon}</div>
            <h3 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-text)' }}>{selectedGoal.name}</h3>
            {selectedGoal.notes && <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{selectedGoal.notes}</p>}

            {/* Circular Progress Ring */}
            <div style={{ margin: '24px 0' }}>
              <ProgressRing percentage={pct} color={selectedGoal.color} size={120} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, color: selectedGoal.color }}>{formatCurrency(selectedGoal.currentAmount)} Saved</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Target: {formatCurrency(selectedGoal.targetAmount)}</span>
            </div>

            {/* Linear Progress Indicator */}
            <div className="progress-bar" style={{ height: '8px', margin: '0 0 16px 0', borderRadius: '4px' }}>
              <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: selectedGoal.color, borderRadius: '4px' }} />
            </div>

            {/* Deadline Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deadline</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{new Date(selectedGoal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Remaining</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: isCompleted ? '#10B981' : daysLeft > 0 ? 'var(--color-text)' : '#EF4444' }}>
                  {isCompleted ? 'Target Achieved! 🎉' : daysLeft > 0 ? `${daysLeft} days left` : 'Overdue!'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          {!isCompleted && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => navigate(`/goals/${selectedGoal.id}/withdraw`)} className="btn-ghost flex-center" style={{ flex: 1, borderRadius: '16px', gap: '8px' }}>
                <Upload size={16} /> Withdraw
              </button>
              <button onClick={() => navigate(`/goals/${selectedGoal.id}/deposit`)} className="btn-primary flex-center" style={{ flex: 2, borderRadius: '16px', gap: '8px', background: `linear-gradient(135deg, ${selectedGoal.color}, ${selectedGoal.color}dd)` }}>
                <Download size={16} /> Deposit
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="card flex-center" style={{ padding: '16px', background: 'rgba(16,185,129,0.06)', border: '1.5px dashed #10B981', color: '#10B981', fontWeight: 800, fontSize: '0.9375rem', gap: '8px', borderRadius: '16px' }}>
              <CheckCircle size={20} /> Target Completed Successfully!
            </div>
          )}

          <button className="btn-ghost" onClick={handleArchiveToggle} style={{ width: '100%', borderRadius: '16px' }}>
            {selectedGoal.status === 'archived' ? 'Unarchive Goal' : 'Archive Goal'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Subpage: Deposit Money ───
  if (viewMode === 'deposit' && selectedGoal) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate(`/goals/${selectedGoal.id}`)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Add Savings</h2>
          <div style={{ width: '22px' }} />
        </div>

        <div className="pb-nav-safe" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
          <div className="card text-center" style={{ padding: '24px', borderRadius: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{selectedGoal.icon}</div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>{selectedGoal.name}</h3>
            <p style={{ margin: '4px 0 20px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {formatCurrency(selectedGoal.currentAmount)} saved of {formatCurrency(selectedGoal.targetAmount)}
            </p>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount to Deposit (₹)</label>
              <input type="number" className="input-field" placeholder="₹ 0.00" value={amountInput} onChange={e => setAmountInput(e.target.value)} style={{ fontSize: '1.75rem', textAlign: 'center', fontWeight: 800, height: '60px' }} required min="1" autoFocus />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-ghost" style={{ flex: 1, borderRadius: '16px' }} onClick={() => navigate(`/goals/${selectedGoal.id}`)}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2, borderRadius: '16px', background: `linear-gradient(135deg, ${selectedGoal.color}, ${selectedGoal.color}dd)` }} onClick={handleDeposit}>
              Confirm Deposit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Subpage: Withdraw Money ───
  if (viewMode === 'withdraw' && selectedGoal) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate(`/goals/${selectedGoal.id}`)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Withdraw Savings</h2>
          <div style={{ width: '22px' }} />
        </div>

        <div className="pb-nav-safe" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
          <div className="card text-center" style={{ padding: '24px', borderRadius: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{selectedGoal.icon}</div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>{selectedGoal.name}</h3>
            <p style={{ margin: '4px 0 20px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {formatCurrency(selectedGoal.currentAmount)} currently saved
            </p>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount to Withdraw (₹)</label>
              <input type="number" className="input-field" placeholder="₹ 0.00" value={amountInput} onChange={e => setAmountInput(e.target.value)} style={{ fontSize: '1.75rem', textAlign: 'center', fontWeight: 800, height: '60px' }} required min="1" autoFocus />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-ghost" style={{ flex: 1, borderRadius: '16px' }} onClick={() => navigate(`/goals/${selectedGoal.id}`)}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2, borderRadius: '16px', background: 'linear-gradient(135deg, #EF4444, #DC2626)' }} onClick={handleWithdraw}>
              Confirm Withdraw
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main View: Goals List ───
  const GoalCard = ({ g }: { g: Goal }) => {
    const pct = percentage(g.currentAmount, g.targetAmount);
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000);
    const isCompleted = g.status === 'completed';

    return (
      <div 
        className="list-row clickable" 
        style={{
          padding: '16px',
          background: 'var(--color-card)',
          borderBottom: '1px solid var(--color-border)',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '12px',
        }}
        onClick={() => navigate(`/goals/${g.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              fontSize: '1.35rem',
              background: `${g.color}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>{g.icon}</div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.95rem' }}>{g.name}</div>
              {isCompleted ? (
                <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>Finished 🎉</div>
              ) : g.status === 'archived' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Archived</div>
              ) : daysLeft > 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{daysLeft} days remaining</div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 700 }}>Overdue!</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCompleted ? (
              <CheckCircle size={20} color="#10B981" />
            ) : g.status === 'archived' ? (
              <Archive size={20} color="var(--color-text-muted)" />
            ) : (
              <ChevronRight size={18} color="var(--color-border)" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{ height: '6px', margin: '2px 0 0 0', borderRadius: '3px' }}>
          <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: g.color, borderRadius: '3px' }} />
        </div>

        {/* Amount details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
          <span style={{ fontWeight: 800, color: g.color }}>{formatCurrency(g.currentAmount)} saved</span>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Target: {formatCurrency(g.targetAmount)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Sticky top app bar */}
      <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate('/home')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>Goals</h2>
        </div>
        <button
          className="btn-primary"
          style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'none' }}
          onClick={() => navigate('/goals/new')}
        >
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {/* Savings Info Cards & List */}
      <div className="pb-nav-safe" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {/* Savings Performance Overview */}
        <SavingsOverviewCard />

        {/* Horizontal scroll templates */}
        <div style={{ padding: '16px 0 16px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Goals</h3>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {GOAL_TEMPLATES.map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => navigate('/goals/new', { state: { name: t.name, icon: t.icon, color: t.color, target: '50000' } })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>({formatCurrency(50000)})</span>
              </button>
            ))}
            {/* Custom Goal option */}
            <button
              type="button"
              onClick={() => navigate('/goals/new')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '16px',
                border: '1.5px dashed var(--color-primary)',
                background: 'rgba(37,99,235,0.03)',
                color: 'var(--color-primary)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={14} /> Custom Goal
            </button>
          </div>
        </div>

        {/* Goals lists */}
        {activeGoals.length === 0 ? (
          <div className="empty-state-container">
            <span style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))', marginBottom: '16px', display: 'block' }}>🎯</span>
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)', fontSize: '1.125rem' }}>No Goals Yet</p>
              <p style={{ margin: '6px 0 16px 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.5, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                Start building your financial future today. Create your first savings goal.
              </p>
            </div>
            <button
              onClick={() => navigate('/goals/new')}
              className="btn-primary"
              style={{ padding: '0 28px', height: '48px', borderRadius: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <Plus size={16} /> Create Your First Goal
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Goals</h3>
            <div className="list-group">
              {activeGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed 🎉</h3>
            <div className="list-group">
              {completedGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}

        {/* Archived Goals */}
        {archivedGoals.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Archived 📦</h3>
            <div className="list-group">
              {archivedGoals.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className="fab"
        onClick={() => navigate('/goals/new')}
        style={{
          position: 'fixed',
          zIndex: 50
        }}
        aria-label="Add Goal"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Goals;

