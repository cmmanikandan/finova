import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, Plus, Trash2, Coffee, Ban, 
  CheckCircle2, AlertCircle, Sparkles, ChevronLeft, HelpCircle 
} from 'lucide-react';
import * as db from '../services/db';
import type { Challenge, Category } from '../types';

interface ChallengeTemplate {
  name: string;
  type: string;
  targetCategory?: string;
  limitAmount: number;
  durationDays: number;
  icon: React.ReactNode;
  description: string;
}

const TEMPLATES: ChallengeTemplate[] = [
  {
    name: 'No-Spend Weekend',
    type: 'no-spend',
    limitAmount: 0,
    durationDays: 2,
    icon: <Ban className="text-red-500" size={24} />,
    description: 'Avoid all discretionary spending on Saturday and Sunday.'
  },
  {
    name: '30-Day Coffee Free',
    type: 'category-limit',
    targetCategory: 'food',
    limitAmount: 0,
    durationDays: 30,
    icon: <Coffee className="text-amber-600" size={24} />,
    description: 'Save big by cutting out commercial coffee and drinks.'
  },
  {
    name: 'Frugal Week',
    type: 'no-spend',
    limitAmount: 1000,
    durationDays: 7,
    icon: <Target className="text-blue-500" size={24} />,
    description: 'Limit your total weekly spending to under ₹1,000.'
  }
];

const Challenges: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('no-spend');
  const [targetCategory, setTargetCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('0');
  const [durationDays, setDurationDays] = useState('7');

  // Audit alerts/messages
  const [auditMessage, setAuditMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  useEffect(() => {
    loadData();
    // Register listener to reload if db changes
    db.registerWriteListener(loadData);
  }, []);

  const loadData = () => {
    setChallenges(db.getChallenges());
    setCategories(db.getCategories());
  };

  const handleSelectTemplate = (tpl: ChallengeTemplate) => {
    setName(tpl.name);
    setType(tpl.type);
    setTargetCategory(tpl.targetCategory || '');
    setLimitAmount(tpl.limitAmount.toString());
    setDurationDays(tpl.durationDays.toString());
    setShowAddForm(true);
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await db.addChallenge({
        name: name.trim(),
        type,
        targetCategory: targetCategory || undefined,
        limitAmount: Number(limitAmount) || 0,
        durationDays: Number(durationDays) || 7,
      });
      loadData();
      setName('');
      setTargetCategory('');
      setLimitAmount('0');
      setDurationDays('7');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to start challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this challenge?')) {
      await db.deleteChallenge(id);
      loadData();
    }
  };

  const handleAudit = (challenge: Challenge) => {
    const transactions = db.getTransactions();
    const startDate = new Date(challenge.startDate);
    const duration = challenge.durationDays;
    const today = new Date();
    
    // Find all days relative to start date
    let isFailed = false;
    let failDateStr = '';
    let failAmount = 0;
    const checked: number[] = [];

    // Check each day from start_date to today
    for (let dayOffset = 0; dayOffset < duration; dayOffset++) {
      const checkDay = new Date(startDate);
      checkDay.setDate(startDate.getDate() + dayOffset);
      
      // If we are evaluating a day in the future, stop auditing there
      if (checkDay.getTime() > today.getTime()) {
        break;
      }

      // Calculate total spending on checkDay
      const checkDayStr = checkDay.toISOString().split('T')[0];
      const dayTransactions = transactions.filter(t => {
        const tDateStr = new Date(t.date).toISOString().split('T')[0];
        if (tDateStr !== checkDayStr) return false;
        if (t.type !== 'expense') return false;
        if (challenge.targetCategory && t.category !== challenge.targetCategory) return false;
        return true;
      });

      const totalSpent = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      if (totalSpent > challenge.limitAmount) {
        isFailed = true;
        failDateStr = checkDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        failAmount = totalSpent;
        break;
      } else {
        checked.push(dayOffset);
      }
    }

    if (isFailed) {
      // Challenge Failed
      db.updateChallenge(challenge.id, { status: 'failed', checkedDays: checked });
      setAuditMessage({
        id: challenge.id,
        success: false,
        text: `Oh no! You spent ₹${failAmount.toLocaleString()} on ${failDateStr}, which exceeds your limit of ₹${challenge.limitAmount}. Challenge failed!`
      });
    } else {
      // Check if completely finished
      const endDate = new Date(challenge.endDate);
      const isCompleted = today.getTime() >= endDate.getTime();
      const nextStatus = isCompleted ? 'completed' : 'active';

      db.updateChallenge(challenge.id, { status: nextStatus, checkedDays: checked });
      setAuditMessage({
        id: challenge.id,
        success: true,
        text: isCompleted 
          ? `🎉 Congratulations! You successfully completed the "${challenge.name}" challenge!`
          : `👍 Safe! No violations found so far. Keep saving! (${checked.length}/${duration} days verified)`
      });
    }
    loadData();
  };

  const getDaysCompleted = (challenge: Challenge) => {
    if (challenge.status === 'completed') return challenge.durationDays;
    return challenge.checkedDays.length;
  };

  return (
    <div className="page-container pb-24">
      <header className="app-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="header-title">No-Spend Challenges</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="page-content" style={{ padding: '16px' }}>
        {/* Streak summary badge */}
        <div className="card glass-card text-center" style={{ padding: '20px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <Trophy size={100} />
          </div>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--accent)', marginBottom: '8px' }}>
            <Trophy size={28} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Frugal Achievements</h2>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Build habits by completing savings sprints. Check in daily to audit transactions.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                {challenges.filter(c => c.status === 'completed').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22C55E' }}>
                {challenges.filter(c => c.status === 'active').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active</div>
            </div>
          </div>
        </div>

        {/* Audit feedback message */}
        {auditMessage && (
          <div 
            className="card animate-fade-in" 
            style={{ 
              background: auditMessage.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${auditMessage.success ? '#22C55E' : '#EF4444'}`,
              color: auditMessage.success ? '#22C55E' : '#EF4444',
              padding: '14px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            {auditMessage.success ? <Sparkles size={20} style={{ flexShrink: 0 }} /> : <AlertCircle size={20} style={{ flexShrink: 0 }} />}
            <div style={{ flex: 1, fontSize: '0.85rem' }}>
              {auditMessage.text}
            </div>
            <button 
              onClick={() => setAuditMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. QUICK TEMPLATES */}
        <div style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 650 }}>Choose a Challenge</h3>
            {!showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)} 
                className="flex-center" 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '6px 12px', color: 'var(--accent)', gap: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={14} /> Custom
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TEMPLATES.map((tpl, i) => (
              <div 
                key={i} 
                className="card list-item-card flex-between clickable" 
                onClick={() => handleSelectTemplate(tpl)}
                style={{ padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                    {tpl.icon}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 600 }}>{tpl.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tpl.description}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.durationDays}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CUSTOM CHALLENGE CREATION FORM */}
        {showAddForm && (
          <div className="card glass-card animate-slide-in" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--accent)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700 }}>New Custom Challenge</h3>
            <form onSubmit={handleCreateChallenge}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Challenge Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Snack Free Week" 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Challenge Type</label>
                <select 
                  className="form-input" 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                >
                  <option value="no-spend">Total Spend Limit (Budget)</option>
                  <option value="category-limit">Specific Category Limit</option>
                </select>
              </div>

              {type === 'category-limit' && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Target Category</label>
                  <select 
                    className="form-input" 
                    value={targetCategory} 
                    onChange={e => setTargetCategory(e.target.value)}
                    required
                  >
                    <option value="">Select a category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Max Limit (₹/Day)</label>
                  <input 
                    type="number" 
                    value={limitAmount} 
                    onChange={e => setLimitAmount(e.target.value)} 
                    className="form-input" 
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Duration (Days)</label>
                  <select 
                    className="form-input" 
                    value={durationDays} 
                    onChange={e => setDurationDays(e.target.value)}
                  >
                    <option value="2">2 Days (Weekend)</option>
                    <option value="3">3 Days (Short Sprint)</option>
                    <option value="7">7 Days (1 Week)</option>
                    <option value="14">14 Days (2 Weeks)</option>
                    <option value="30">30 Days (1 Month)</option>
                  </select>
                </div>
              </div>

              <div className="flex-between" style={{ gap: '10px' }}>
                <button 
                  type="button" 
                  className="flex-center" 
                  onClick={() => setShowAddForm(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-center" 
                  style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: '12px', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  {loading ? 'Starting...' : 'Start Challenge 🚀'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. ACTIVE CHALLENGES */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 650 }}>Your Challenges</h3>
          {challenges.length === 0 ? (
            <div className="card text-center" style={{ padding: '30px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
              <HelpCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No active challenges. Choose one above to start saving!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {challenges.map(c => {
                const isCompleted = c.status === 'completed';
                const isFailed = c.status === 'failed';
                const daysCompleted = getDaysCompleted(c);
                const percent = Math.min(100, Math.round((daysCompleted / c.durationDays) * 100));
                
                return (
                  <div 
                    key={c.id} 
                    className="card glass-card animate-fade-in" 
                    style={{ 
                      padding: '16px', 
                      position: 'relative',
                      border: isCompleted 
                        ? '1px solid rgba(34,197,94,0.3)' 
                        : isFailed 
                          ? '1px solid rgba(239,68,68,0.3)' 
                          : '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    {/* Delete button */}
                    <button 
                      onClick={() => handleDelete(c.id)}
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.6 }}
                      aria-label="Delete challenge"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, paddingRight: '24px' }}>{c.name}</h4>
                      {isCompleted && <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Completed</span>}
                      {isFailed && <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Failed</span>}
                      {!isCompleted && !isFailed && <span style={{ fontSize: '0.7rem', background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Active</span>}
                    </div>

                    <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Rule: {c.type === 'no-spend' ? 'Total spend' : 'Category spend'} limit of <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{c.limitAmount}</span> per day.
                    </p>

                    {/* Progress bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        <span>Progress</span>
                        <span>{daysCompleted} / {c.durationDays} Days ({percent}%)</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            background: isCompleted ? '#22C55E' : isFailed ? '#EF4444' : 'var(--accent)', 
                            height: '100%', 
                            width: `${percent}%`,
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Checks calendar grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '14px' }}>
                      {Array.from({ length: c.durationDays }).map((_, idx) => {
                        const isChecked = c.checkedDays.includes(idx) || isCompleted;
                        return (
                          <div 
                            key={idx}
                            style={{
                              background: isChecked 
                                ? 'rgba(34,197,94,0.1)' 
                                : isFailed && idx >= daysCompleted 
                                  ? 'rgba(239,68,68,0.05)' 
                                  : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${
                                isChecked 
                                  ? '#22C55E' 
                                  : isFailed && idx === daysCompleted 
                                    ? '#EF4444' 
                                    : 'rgba(255,255,255,0.05)'
                              }`,
                              color: isChecked ? '#22C55E' : isFailed && idx === daysCompleted ? '#EF4444' : 'var(--text-secondary)',
                              borderRadius: '8px',
                              padding: '8px 0',
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              fontWeight: 600
                            }}
                          >
                            D{idx + 1}
                            <div style={{ marginTop: '2px', fontSize: '0.65rem' }}>
                              {isChecked ? '✓' : isFailed && idx === daysCompleted ? '✗' : '•'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action button */}
                    {!isCompleted && !isFailed && (
                      <button 
                        onClick={() => handleAudit(c)}
                        className="flex-center btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.8rem', borderRadius: '10px', gap: '6px' }}
                      >
                        <CheckCircle2 size={16} /> Audit Today's Expense
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
