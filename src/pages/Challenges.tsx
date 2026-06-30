import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Trophy, Target, Plus, 
  CheckCircle2, AlertCircle, 
  ArrowLeft, Flame, Award, ChevronRight, 
  Zap, Clock, Star
} from 'lucide-react';
import * as db from '../services/db';
import type { Challenge, Category, StreakData } from '../types';
import { fireConfetti } from '../utils/confetti';

interface ChallengeTemplate {
  name: string;
  type: string;
  targetCategory?: string;
  limitAmount: number;
  durationDays: number;
  icon: string;
  description: string;
  xpReward: number;
  estSavings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const TEMPLATES: ChallengeTemplate[] = [
  {
    name: 'No-Spend Weekend',
    type: 'no-spend',
    limitAmount: 0,
    durationDays: 2,
    icon: '🚫',
    description: 'Avoid all discretionary spending on Saturday and Sunday.',
    xpReward: 120,
    estSavings: 1500,
    difficulty: 'Easy'
  },
  {
    name: '30-Day Coffee Free',
    type: 'category-limit',
    targetCategory: 'food',
    limitAmount: 0,
    durationDays: 30,
    icon: '☕',
    description: 'Save big by cutting out commercial coffee and drinks.',
    xpReward: 500,
    estSavings: 4500,
    difficulty: 'Medium'
  },
  {
    name: 'Frugal Week',
    type: 'no-spend',
    limitAmount: 1000,
    durationDays: 7,
    icon: '🎯',
    description: 'Limit your total weekly spending to under ₹1,000.',
    xpReward: 250,
    estSavings: 3000,
    difficulty: 'Easy'
  }
];

const Challenges: React.FC = () => {
  const navigate = useNavigate();
  const { subpage } = useParams<{ subpage: string }>();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const viewMode = (subpage || 'dashboard') as 'dashboard' | 'create' | 'details' | 'achievements' | 'history';
  const setViewMode = (mode: 'dashboard' | 'create' | 'details' | 'achievements' | 'history') => {
    if (mode === 'dashboard') navigate('/challenges');
    else navigate(`/challenges/${mode}`);
  };
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' });

  // Custom Challenge Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('no-spend');
  const [targetCategory, setTargetCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('0');
  const [durationDays, setDurationDays] = useState('7');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');

  const [loading, setLoading] = useState(false);
  const [auditMessage, setAuditMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  useEffect(() => {
    loadData();
    return db.registerWriteListener(loadData);
  }, []);

  const loadData = () => {
    setChallenges(db.getChallenges());
    setCategories(db.getCategories());
    setStreakData(db.getStreakData());
  };

  // XP Calculation
  const totalXp = useMemo(() => {
    const completedCount = challenges.filter(c => c.status === 'completed').length;
    const activeCount = challenges.filter(c => c.status === 'active').length;
    return (completedCount * 150) + (activeCount * 50) + 75; // baseline 75 XP
  }, [challenges]);



  const computedTotalSaved = useMemo(() => {
    let saved = 0;
    challenges.forEach(c => {
      const dailyEstimate = c.limitAmount === 0 ? 500 : Math.max(200, 1000 - c.limitAmount);
      if (c.status === 'completed') {
        saved += dailyEstimate * c.durationDays;
      } else if (c.status === 'active') {
        saved += dailyEstimate * c.checkedDays.length;
      }
    });
    return saved;
  }, [challenges]);

  const handleSelectTemplate = (tpl: ChallengeTemplate) => {
    setName(tpl.name);
    setType(tpl.type);
    setTargetCategory(tpl.targetCategory || '');
    setLimitAmount(tpl.limitAmount.toString());
    setDurationDays(tpl.durationDays.toString());
    setDifficulty(tpl.difficulty);
    setViewMode('create');
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
      
      // Clear Form Fields
      setName('');
      setTargetCategory('');
      setLimitAmount('0');
      setDurationDays('7');
      setViewMode('dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to start challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to cancel this challenge?')) {
      await db.deleteChallenge(id);
      loadData();
      setViewMode('dashboard');
    }
  };

  const handleAudit = (challenge: Challenge) => {
    const transactions = db.getTransactions();
    const startDate = new Date(challenge.startDate);
    const duration = challenge.durationDays;
    const today = new Date();
    
    let isFailed = false;
    let failDateStr = '';
    let failAmount = 0;
    const checked: number[] = [];

    for (let dayOffset = 0; dayOffset < duration; dayOffset++) {
      const checkDay = new Date(startDate);
      checkDay.setDate(startDate.getDate() + dayOffset);
      
      if (checkDay.getTime() > today.getTime()) {
        break;
      }

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
      db.updateChallenge(challenge.id, { status: 'failed', checkedDays: checked });
      setAuditMessage({
        id: challenge.id,
        success: false,
        text: `Oh no! Spent ₹${failAmount.toLocaleString()} on ${failDateStr}, exceeding daily limit of ₹${challenge.limitAmount}.`
      });
      if (selectedChallenge?.id === challenge.id) {
        setSelectedChallenge(prev => prev ? { ...prev, status: 'failed', checkedDays: checked } : null);
      }
    } else {
      const endDate = new Date(challenge.endDate);
      const isCompleted = today.getTime() >= endDate.getTime();
      const nextStatus = isCompleted ? 'completed' : 'active';

      db.updateChallenge(challenge.id, { status: nextStatus, checkedDays: checked });
      
      if (isCompleted) {
        fireConfetti();
      }

      setAuditMessage({
        id: challenge.id,
        success: true,
        text: isCompleted 
          ? `🎉 Congratulations! Challenge "${challenge.name}" completed successfully!`
          : `👍 Success! Audited check-in passed (${checked.length}/${duration} days checked)`
      });
      
      if (selectedChallenge?.id === challenge.id) {
        setSelectedChallenge(prev => prev ? { ...prev, status: nextStatus, checkedDays: checked } : null);
      }
    }
    loadData();
  };

  const getDaysCompleted = (challenge: Challenge) => {
    if (challenge.status === 'completed') return challenge.durationDays;
    return challenge.checkedDays.length;
  };

  const renderProgressRing = (completed: number, total: number) => {
    const radius = 54;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const percentage = Math.min(100, Math.round((completed / total) * 100));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: radius * 2, height: radius * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            stroke="var(--color-border)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#2563EB"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>{percentage}%</span>
          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Days</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Sticky App Bar */}
      <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => {
          if (viewMode === 'dashboard') navigate('/home');
          else setViewMode('dashboard');
        }} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
          {viewMode === 'dashboard' ? 'Challenges' : viewMode === 'create' ? 'New Challenge' : viewMode === 'details' ? 'Challenge Progress' : viewMode === 'achievements' ? 'Badges & XP' : 'Savings History'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(37,99,235,0.08)', padding: '4px 10px', borderRadius: '12px', gap: '4px' }}>
          <Star size={14} className="text-blue-500 fill-blue-500" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{totalXp} XP</span>
        </div>
      </div>

      {/* ─── Dashboard View ─── */}
      {viewMode === 'dashboard' && (
        <div style={{ paddingBottom: '120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Hero Performance Card */}
          <div className="card bg-premium-gradient" style={{ margin: '16px 16px 0', padding: '20px', borderRadius: '24px', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Trophy size={18} className="text-amber-400" />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Challenge Stats</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '16px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8, display: 'block' }}>Saving Streak</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Flame size={18} className="text-orange-400 fill-orange-400" /> {streakData.currentStreak} Days
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8, display: 'block' }}>Money Saved</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', display: 'block' }}>₹{computedTotalSaved.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '0 16px' }}>
            <button onClick={() => setViewMode('achievements')} className="card clickable" style={{ padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>
              <Award size={18} className="text-blue-500" /> Badges
            </button>
            <button onClick={() => setViewMode('history')} className="card clickable" style={{ padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>
              <Clock size={18} className="text-emerald-500" /> History Logs
            </button>
          </div>

          {/* Audit Notification Banner */}
          {auditMessage && (
            <div className="card" style={{ margin: '0 16px', background: auditMessage.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${auditMessage.success ? '#10B981' : '#EF4444'}`, padding: '12px 16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {auditMessage.success ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                <span style={{ fontSize: '0.78rem', color: auditMessage.success ? '#10B981' : '#EF4444', fontWeight: 700 }}>{auditMessage.text}</span>
              </div>
              <button onClick={() => setAuditMessage(null)} style={{ border: 'none', background: 'none', fontWeight: 800, color: 'var(--color-text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {/* Active Challenges list */}
          <div style={{ margin: '0 16px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Active Challenges</h3>
            {challenges.filter(c => c.status === 'active').length === 0 ? (
              <div className="card text-center" style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37,99,235,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Target size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 800 }}>No Active Challenges</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>Start a challenge to lock down your expenses and earn XP rewards!</p>
                </div>
                <button onClick={() => setViewMode('create')} className="btn-primary" style={{ padding: '8px 20px', borderRadius: '18px', fontSize: '0.78rem', border: 'none', cursor: 'pointer' }}>
                  Create Custom
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {challenges.filter(c => c.status === 'active').map(c => {
                  const completed = getDaysCompleted(c);
                  const pct = Math.round((completed / c.durationDays) * 100);
                  return (
                    <div 
                      key={c.id} 
                      className="card clickable" 
                      onClick={() => { setSelectedChallenge(c); setViewMode('details'); }}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '20px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.25rem' }}>{c.type === 'no-spend' ? '🚫' : '☕'}</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800 }}>{c.name}</h4>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Check-in: {completed}/{c.durationDays} Days</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </div>
                      
                      <div style={{ width: '100%', height: '5px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preset templates selection */}
          <div style={{ margin: '0 16px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Preset Challenges</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TEMPLATES.map((tpl, idx) => {
                const isActive = challenges.some(c => c.name === tpl.name && c.status === 'active');
                return (
                  <div key={idx} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '1.75rem', background: 'var(--color-bg)', width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {tpl.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{tpl.name}</h4>
                          <span style={{ fontSize: '0.65rem', background: 'var(--color-border)', color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{tpl.durationDays}d</span>
                        </div>
                        <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>{tpl.description}</p>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.625rem', background: 'rgba(16,185,129,0.06)', color: '#10B981', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Save ~₹{tpl.estSavings}</span>
                          <span style={{ fontSize: '0.625rem', background: 'rgba(37,99,235,0.06)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>+{tpl.xpReward} XP</span>
                          <span style={{ fontSize: '0.625rem', background: 'rgba(245,158,11,0.06)', color: '#F59E0B', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{tpl.difficulty}</span>
                        </div>

                        <button 
                          onClick={() => isActive ? setViewMode('dashboard') : handleSelectTemplate(tpl)}
                          className={isActive ? 'btn-ghost' : 'btn-primary'}
                          style={{ width: '100%', height: '36px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: isActive ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', fontWeight: 800 }}
                        >
                          {isActive ? 'Continue' : 'Start Challenge'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      )}

      {/* ─── Create Custom Challenge View ─── */}
      {viewMode === 'create' && (
        <form onSubmit={handleCreateChallenge} style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Challenge Specifications</h3>
            
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Challenge Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Starbucks Fast" 
                className="input-field" 
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--color-border)', padding: '4px', borderRadius: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setType('no-spend')}
                  style={{
                    background: type === 'no-spend' ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    color: type === 'no-spend' ? 'white' : 'var(--color-text-muted)',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Total Spend Limit
                </button>
                <button 
                  type="button"
                  onClick={() => setType('category-limit')}
                  style={{
                    background: type === 'category-limit' ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    color: type === 'category-limit' ? 'white' : 'var(--color-text-muted)',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Category Limit
                </button>
              </div>
            </div>

            {type === 'category-limit' && (
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Target Category</label>
                <select 
                  className="input-field" 
                  value={targetCategory} 
                  onChange={e => setTargetCategory(e.target.value)}
                  required
                  style={{ height: '44px' }}
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Max Daily Limit (₹)</label>
                <input 
                  type="number" 
                  value={limitAmount} 
                  onChange={e => setLimitAmount(e.target.value)} 
                  className="input-field" 
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Duration (Days)</label>
                <select 
                  className="input-field" 
                  value={durationDays} 
                  onChange={e => setDurationDays(e.target.value)}
                  style={{ height: '44px' }}
                >
                  <option value="2">2 Days (Weekend)</option>
                  <option value="3">3 Days (Sprint)</option>
                  <option value="7">7 Days (1 Week)</option>
                  <option value="14">14 Days (2 Weeks)</option>
                  <option value="30">30 Days (1 Month)</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Difficulty</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${difficulty === d ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: difficulty === d ? 'rgba(37,99,235,0.06)' : 'transparent',
                      color: difficulty === d ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => setViewMode('dashboard')} className="btn-ghost" style={{ flex: 1, height: '46px', borderRadius: '16px' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '16px' }}>
              {loading ? 'Starting...' : 'Start Challenge 🚀'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Challenge Progress Details View ─── */}
      {viewMode === 'details' && selectedChallenge && (
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '2.5rem' }}>{selectedChallenge.type === 'no-spend' ? '🚫' : '☕'}</span>
              <h3 style={{ margin: '6px 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>{selectedChallenge.name}</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Daily limit constraint: <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>₹{selectedChallenge.limitAmount.toLocaleString()}</span>. Keep transactions below this amount to pass daily audits.
              </p>
              <div style={{ marginTop: '12px' }}>
                {selectedChallenge.status === 'completed' && <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.08)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>✓ Completed 🎉</span>}
                {selectedChallenge.status === 'failed' && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.08)', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>✗ Failed</span>}
                {selectedChallenge.status === 'active' && <span style={{ fontSize: '0.65rem', background: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Active</span>}
              </div>
            </div>
            
            {renderProgressRing(getDaysCompleted(selectedChallenge), selectedChallenge.durationDays)}
          </div>

          {/* Daily Calendar Trackers */}
          <div className="card" style={{ padding: '18px', borderRadius: '24px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Audits</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {Array.from({ length: selectedChallenge.durationDays }).map((_, idx) => {
                const isChecked = selectedChallenge.checkedDays.includes(idx) || selectedChallenge.status === 'completed';
                const isCurrentFailed = selectedChallenge.status === 'failed' && idx === getDaysCompleted(selectedChallenge);
                
                return (
                  <div 
                    key={idx}
                    style={{
                      background: isChecked ? 'rgba(16,185,129,0.05)' : isCurrentFailed ? 'rgba(239,68,68,0.05)' : 'var(--color-bg)',
                      border: `1px solid ${isChecked ? '#10B981' : isCurrentFailed ? '#EF4444' : 'var(--color-border)'}`,
                      color: isChecked ? '#10B981' : isCurrentFailed ? '#EF4444' : 'var(--color-text-muted)',
                      borderRadius: '12px',
                      padding: '8px 0',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: 800,
                    }}
                  >
                    D{idx + 1}
                    <div style={{ marginTop: '2px', fontSize: '0.75rem' }}>
                      {isChecked ? '✓' : isCurrentFailed ? '✗' : '•'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedChallenge.status === 'active' && (
              <button 
                onClick={() => handleAudit(selectedChallenge)}
                className="btn-primary"
                style={{ width: '100%', borderRadius: '16px', height: '48px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={18} /> Audit Today's Transactions
              </button>
            )}
            
            <button 
              onClick={() => handleDelete(selectedChallenge.id)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'none',
                border: '1.5px solid rgba(239,68,68,0.2)',
                color: '#EF4444',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Cancel Challenge
            </button>
          </div>
        </div>
      )}

      {/* ─── Achievements Badges & XP View ─── */}
      {viewMode === 'achievements' && (
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card text-center" style={{ padding: '24px', borderRadius: '24px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unlocked Badges</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)', margin: '4px 0' }}>
              {challenges.filter(c => c.status === 'completed').length} / 4
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Completed challenges unlock new achievements and showcase your saving milestones.</p>
          </div>

          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Savings Badges</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { title: 'Frugal Cadet', desc: 'Complete 1 Sprint', icon: <Star size={24} />, unlocked: challenges.filter(c => c.status === 'completed').length >= 1 },
                { title: 'Savings Specialist', desc: 'Complete 3 Sprints', icon: <Award size={24} />, unlocked: challenges.filter(c => c.status === 'completed').length >= 3 },
                { title: 'Wealth Architect', desc: 'Complete 5 Sprints', icon: <Zap size={24} />, unlocked: challenges.filter(c => c.status === 'completed').length >= 5 },
                { title: 'Zen Master', desc: 'Complete 10 Sprints', icon: <Trophy size={24} />, unlocked: challenges.filter(c => c.status === 'completed').length >= 10 },
              ].map((b, idx) => (
                <div 
                  key={idx} 
                  className="card text-center animate-fade-in" 
                  style={{ 
                    padding: '20px 16px', 
                    borderRadius: '20px', 
                    opacity: b.unlocked ? 1 : 0.5,
                    border: b.unlocked ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)' 
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: b.unlocked ? 'rgba(37,99,235,0.08)' : 'var(--color-border)', 
                    color: b.unlocked ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 12px' 
                  }}>
                    {b.icon}
                  </div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.8125rem', fontWeight: 800 }}>{b.title}</h4>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>{b.desc}</span>
                  <span style={{ fontSize: '0.625rem', color: b.unlocked ? '#10B981' : 'var(--color-text-muted)', fontWeight: 700, display: 'block', marginTop: '6px' }}>
                    {b.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── History View ─── */}
      {viewMode === 'history' && (
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '16px', borderRadius: '20px' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Completed</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', display: 'block', marginTop: '2px' }}>{challenges.filter(c => c.status === 'completed').length}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Failed</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', display: 'block', marginTop: '2px' }}>{challenges.filter(c => c.status === 'failed').length}</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Logs</h3>
            {challenges.filter(c => c.status !== 'active').length === 0 ? (
              <div className="card text-center" style={{ padding: '32px 16px', color: 'var(--color-text-muted)', borderRadius: '20px' }}>
                <Clock size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.78rem' }}>No finished challenges logged yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {challenges.filter(c => c.status !== 'active').map(c => {
                  const completed = c.status === 'completed';
                  return (
                    <div key={c.id} className="card flex-between" style={{ padding: '14px 18px', borderRadius: '20px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 800 }}>{c.name}</h4>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{c.durationDays} days • {c.type === 'no-spend' ? 'No Spend' : 'Category limit'}</span>
                      </div>
                      <div>
                        {completed ? (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.08)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Completed</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.08)', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Failed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) only on Dashboard */}
      {viewMode === 'dashboard' && (
        <button 
          onClick={() => setViewMode('create')}
          className="fab"
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '20px',
            zIndex: 50
          }}
          aria-label="Create Custom Challenge"
        >
          <Plus size={28} />
        </button>
      )}

    </div>
  );
};

export default Challenges;
