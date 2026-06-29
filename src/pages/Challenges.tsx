import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, Plus, Coffee, Ban, 
  CheckCircle2, AlertCircle, Sparkles, 
  ArrowLeft, Flame, Award, ChevronRight, 
  Zap, Clock, Star
} from 'lucide-react';
import * as db from '../services/db';
import type { Challenge, Category, StreakData } from '../types';
import { useScrollFAB } from '../hooks/useScrollFAB';

interface ChallengeTemplate {
  name: string;
  type: string;
  targetCategory?: string;
  limitAmount: number;
  durationDays: number;
  icon: React.ReactNode;
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
    icon: <Ban className="text-red-500" size={24} />,
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
    icon: <Coffee className="text-amber-500" size={24} />,
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
    icon: <Target className="text-blue-500" size={24} />,
    description: 'Limit your total weekly spending to under ₹1,000.',
    xpReward: 250,
    estSavings: 3000,
    difficulty: 'Easy'
  }
];

const AI_TIPS = [
  "💡 Tip: Prepare home-cooked meals today to save an average of ₹350 on dining.",
  "💡 Tip: Cancel unused auto-renewing subscriptions this morning to trim hidden costs.",
  "💡 Tip: Delay discretionary shopping for 48 hours. Most impulse urges fade by then.",
  "💡 Tip: Use public transit or carpool today. You will slash fuel costs by nearly 60%!",
  "💡 Tip: Make coffee at home instead of buying a cafe latte. Instantly saves ₹180."
];

const Challenges: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'create' | 'details' | 'achievements' | 'history'>('dashboard');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' });

  // Create Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('no-spend');
  const [targetCategory, setTargetCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('0');
  const [durationDays, setDurationDays] = useState('7');
  const [enableReminder, setEnableReminder] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [auditMessage, setAuditMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  const { fabVisible, handleScroll } = useScrollFAB();

  useEffect(() => {
    loadData();
    db.registerWriteListener(loadData);
  }, []);

  const loadData = () => {
    setChallenges(db.getChallenges());
    setCategories(db.getCategories());
    setStreakData(db.getStreakData());
  };

  // XP calculation
  const totalXp = useMemo(() => {
    const completedCount = challenges.filter(c => c.status === 'completed').length;
    const activeCount = challenges.filter(c => c.status === 'active').length;
    return (completedCount * 150) + (activeCount * 50) + 75; // 75 baseline
  }, [challenges]);

  // Achievement level
  const userLevel = useMemo(() => {
    if (totalXp < 250) return { title: 'Frugal Cadet', next: 250 };
    if (totalXp < 750) return { title: 'Savings Specialist', next: 750 };
    if (totalXp < 1500) return { title: 'Wealth Architect', next: 1500 };
    return { title: 'Financial Zen Master', next: 9999 };
  }, [totalXp]);

  // Computed total saved amount
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

  // AI success rate calculation
  const aiSuccessPrediction = useMemo(() => {
    const limit = Number(limitAmount) || 0;
    if (limit === 0) return 65; // No-spend is harder
    if (limit > 1500) return 92;
    if (limit > 800) return 80;
    return 73;
  }, [limitAmount]);

  const handleSelectTemplate = (tpl: ChallengeTemplate) => {
    setName(tpl.name);
    setType(tpl.type);
    setTargetCategory(tpl.targetCategory || '');
    setLimitAmount(tpl.limitAmount.toString());
    setDurationDays(tpl.durationDays.toString());
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
    if (confirm('Are you sure you want to delete this challenge?')) {
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
        text: `Oh no! Spent ₹${failAmount.toLocaleString()} on ${failDateStr}, exceeding the limit of ₹${challenge.limitAmount}.`
      });
      if (selectedChallenge?.id === challenge.id) {
        setSelectedChallenge(prev => prev ? { ...prev, status: 'failed', checkedDays: checked } : null);
      }
    } else {
      const endDate = new Date(challenge.endDate);
      const isCompleted = today.getTime() >= endDate.getTime();
      const nextStatus = isCompleted ? 'completed' : 'active';

      db.updateChallenge(challenge.id, { status: nextStatus, checkedDays: checked });
      setAuditMessage({
        id: challenge.id,
        success: true,
        text: isCompleted 
          ? `🎉 Double win! You successfully completed "${challenge.name}"!`
          : `👍 Balanced! Daily audit passed. (${checked.length}/${duration} days check)`
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
    const radius = 64;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const percentage = Math.min(100, Math.round((completed / total) * 100));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: radius * 2, height: radius * 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            stroke="url(#blue-cyan-grad)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="blue-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{percentage}%</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Days</span>
        </div>
      </div>
    );
  };

  if (viewMode === 'dashboard') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <div className="app-bar">
          <button onClick={() => navigate('/home')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Challenges</h2>
          <div style={{ width: 40 }} />
        </div>

        <div onScroll={handleScroll} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          {/* Top Hero Gradient Card */}
          <div className="card bg-premium-gradient" style={{ padding: '24px', borderRadius: '24px', color: '#fff', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px rgba(37,99,235,0.25)' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.12, transform: 'rotate(15deg)' }}>
              <Trophy size={140} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Trophy size={20} className="text-emerald-400" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Financial Challenges</span>
            </div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 800 }}>Sprint to Save</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Current Streak</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Flame size={20} className="text-orange-400" /> {streakData.currentStreak} Days
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Total Savings Created</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{computedTotalSaved.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{userLevel.title}</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{totalXp} XP Points</div>
              </div>
              <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (totalXp / userLevel.next) * 100)}%`, height: '100%', background: '#34D399' }} />
              </div>
            </div>
          </div>

          {/* Quick Sub-Modules Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              onClick={() => setViewMode('achievements')}
              className="premium-glass-card flex-center"
              style={{ padding: '16px', border: '1px solid var(--color-border)', cursor: 'pointer', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <Award size={18} className="text-blue-500" /> Badges & XP
            </button>
            <button 
              onClick={() => setViewMode('history')}
              className="premium-glass-card flex-center"
              style={{ padding: '16px', border: '1px solid var(--color-border)', cursor: 'pointer', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <Clock size={18} className="text-emerald-500" /> Save History
            </button>
          </div>

          {/* Audit Alert Message */}
          {auditMessage && (
            <div className="card animate-fade-in flex-between" style={{ background: auditMessage.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${auditMessage.success ? '#10B981' : '#EF4444'}`, padding: '12px 16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {auditMessage.success ? <Sparkles size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                <span style={{ fontSize: '0.8rem', color: auditMessage.success ? '#10B981' : '#EF4444', fontWeight: 600 }}>{auditMessage.text}</span>
              </div>
              <button onClick={() => setAuditMessage(null)} style={{ border: 'none', background: 'none', fontWeight: 'bold', color: 'var(--color-text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {/* Active Challenges List */}
          {challenges.filter(c => c.status === 'active').length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Active Challenges</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {challenges.filter(c => c.status === 'active').map(c => {
                  const completed = getDaysCompleted(c);
                  const pct = Math.round((completed / c.durationDays) * 100);
                  return (
                    <div 
                      key={c.id} 
                      className="premium-card clickable"
                      onClick={() => { setSelectedChallenge(c); setViewMode('details'); }}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <div className="flex-between">
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{c.name}</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Progress: {completed}/{c.durationDays} Days</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </div>
                      
                      <div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state illustration if no active challenges */}
          {challenges.filter(c => c.status === 'active').length === 0 && (
            <div className="premium-card text-center" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <Target size={32} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>No Active Challenges</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>Start your first challenge today to build healthy saving habits and earn XP.</p>
              </div>
              <button 
                onClick={() => setViewMode('create')}
                className="btn-primary"
                style={{ height: '40px', borderRadius: '20px', padding: '0 24px', fontSize: '0.8rem' }}
              >
                Create Challenge
              </button>
            </div>
          )}

          {/* Choose a Challenge templates */}
          <div>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Choose a Challenge</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {TEMPLATES.map((tpl, i) => (
                <div 
                  key={i} 
                  className="premium-card clickable"
                  onClick={() => handleSelectTemplate(tpl)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--color-border)', padding: '12px', borderRadius: '16px' }}>
                      {tpl.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex-between">
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 700 }}>{tpl.name}</h4>
                        <span style={{ fontSize: '0.7rem', background: 'var(--color-border)', color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{tpl.durationDays}d</span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tpl.description}</p>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.08)', color: '#10B981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Save ~₹{tpl.estSavings}</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>+{tpl.xpReward} XP</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{tpl.difficulty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Action FAB */}
        <button 
          onClick={() => setViewMode('create')}
          className="premium-fab"
          style={{
            transform: fabVisible ? 'scale(1) translateY(0)' : 'scale(0) translateY(40px)',
            opacity: fabVisible ? 1 : 0,
            pointerEvents: fabVisible ? 'auto' : 'none'
          }}
          aria-label="Create Custom Challenge"
        >
          <Plus size={28} />
        </button>
      </div>
    );
  }

  if (viewMode === 'create') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>New Challenge</h2>
          <div style={{ width: 40 }} />
        </div>

        <form onSubmit={handleCreateChallenge} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
            
            {/* Basic Details */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Basic Details</h3>
              
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Challenge Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Snack Free Week" 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Challenge Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--color-border)', padding: '4px', borderRadius: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setType('no-spend')}
                    style={{
                      background: type === 'no-spend' ? 'var(--color-primary)' : 'none',
                      border: 'none',
                      color: type === 'no-spend' ? 'white' : 'var(--color-text-muted)',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    No-Spend Budget
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('category-limit')}
                    style={{
                      background: type === 'category-limit' ? 'var(--color-primary)' : 'none',
                      border: 'none',
                      color: type === 'category-limit' ? 'white' : 'var(--color-text-muted)',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Category Limit
                  </button>
                </div>
              </div>

              {type === 'category-limit' && (
                <div className="form-group animate-slide-in">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Target Category</label>
                  <select 
                    className="form-input" 
                    value={targetCategory} 
                    onChange={e => setTargetCategory(e.target.value)}
                    required
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Target & Duration */}
            <div className="premium-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Max Daily Limit (₹)</label>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Duration (Days)</label>
                <select 
                  className="form-input" 
                  value={durationDays} 
                  onChange={e => setDurationDays(e.target.value)}
                >
                  <option value="2">2 Days (Weekend)</option>
                  <option value="3">3 Days (Sprint)</option>
                  <option value="7">7 Days (1 Week)</option>
                  <option value="14">14 Days (2 Weeks)</option>
                  <option value="30">30 Days (1 Month)</option>
                </select>
              </div>
            </div>

            {/* AI Success Prediction & Settings */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} className="text-blue-500" />
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>AI Success Prediction</h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{aiSuccessPrediction}%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flex: 1 }}>
                  Based on your historical spending logs, you have a solid probability of completing this challenge successfully.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 705 }}>Enable Daily Reminder</span>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Reminds you to check in every evening</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={enableReminder} 
                  onChange={e => setEnableReminder(e.target.checked)} 
                  style={{ width: 18, height: 18 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 705 }}>Private Challenge</span>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Hide challenge achievements from friends</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={isPrivate} 
                  onChange={e => setIsPrivate(e.target.checked)} 
                  style={{ width: 18, height: 18 }}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', position: 'sticky', bottom: 0, zIndex: 10 }}>
            <button 
              type="button" 
              onClick={() => setViewMode('dashboard')}
              style={{ background: 'var(--color-border)', border: 'none', borderRadius: '16px', padding: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
              style={{ borderRadius: '16px', boxShadow: '0 4px 16px rgba(37,99,235,0.2)' }}
            >
              {loading ? 'Starting...' : 'Start Challenge 🚀'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (viewMode === 'details' && selectedChallenge) {
    const completed = getDaysCompleted(selectedChallenge);
    const totalDays = selectedChallenge.durationDays;
    const isCompleted = selectedChallenge.status === 'completed';
    const isFailed = selectedChallenge.status === 'failed';
    const active = selectedChallenge.status === 'active';
    
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Details</h2>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          <div className="premium-card flex-between" style={{ padding: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>{selectedChallenge.name}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Rule: {selectedChallenge.type === 'no-spend' ? 'Total spend' : 'Category spend'} limit of <span style={{ fontWeight: 705, color: 'var(--color-text)' }}>₹{selectedChallenge.limitAmount}</span> per day.
              </p>
              <div>
                {isCompleted && <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Completed Successfully</span>}
                {isFailed && <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Failed</span>}
                {active && <span style={{ fontSize: '0.7rem', background: 'rgba(37,99,235,0.1)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Active</span>}
              </div>
            </div>
            
            {renderProgressRing(completed, totalDays)}
          </div>

          <div className="premium-card">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Check-in Calendar</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {Array.from({ length: totalDays }).map((_, idx) => {
                const isChecked = selectedChallenge.checkedDays.includes(idx) || isCompleted;
                const isCurrentFailed = isFailed && idx === completed;
                
                return (
                  <div 
                    key={idx}
                    style={{
                      background: isChecked 
                        ? 'rgba(16,185,129,0.08)' 
                        : isCurrentFailed 
                          ? 'rgba(239,68,68,0.08)' 
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${
                        isChecked 
                          ? '#10B981' 
                          : isCurrentFailed 
                            ? '#EF4444' 
                            : 'var(--color-border)'
                      }`,
                      color: isChecked ? '#10B981' : isCurrentFailed ? '#EF4444' : 'var(--color-text-muted)',
                      borderRadius: '12px',
                      padding: '10px 0',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  >
                    D{idx + 1}
                    <div style={{ marginTop: '2px', fontSize: '0.8rem', fontWeight: 800 }}>
                      {isChecked ? '✓' : isCurrentFailed ? '✗' : '•'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)', padding: '16px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', color: 'var(--color-primary)' }}>
              <Sparkles size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>AI Success Suggestion</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {AI_TIPS[Math.floor((completed * 3) % AI_TIPS.length)]}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {active && (
              <button 
                onClick={() => handleAudit(selectedChallenge)}
                className="btn-primary"
                style={{ width: '100%', borderRadius: '16px', gap: '6px' }}
              >
                <CheckCircle2 size={18} /> Audit Today's Expense
              </button>
            )}
            
            <button 
              onClick={() => handleDelete(selectedChallenge.id)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'none',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444',
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancel Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'achievements') {
    const completedCount = challenges.filter(c => c.status === 'completed').length;
    
    const badges = [
      { id: 'bronze', title: 'Frugal Cadet', desc: 'Complete 1 Savings Sprint', icon: <Star size={24} />, unlocked: completedCount >= 1 },
      { id: 'silver', title: 'Savings Specialist', desc: 'Complete 3 Savings Sprints', icon: <Award size={24} />, unlocked: completedCount >= 3 },
      { id: 'gold', title: 'Wealth Architect', desc: 'Complete 5 Savings Sprints', icon: <Zap size={24} />, unlocked: completedCount >= 5 },
      { id: 'diamond', title: 'Zen Master', desc: 'Complete 10 Savings Sprints', icon: <Trophy size={24} />, unlocked: completedCount >= 10 },
    ];

    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Badges & XP</h2>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          <div className="premium-card text-center" style={{ padding: '24px', background: 'var(--color-card)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>XP Level</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)', margin: '4px 0' }}>{totalXp}</div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Complete more challenges to unlock Gold and Diamond levels.</p>
          </div>

          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Frugal Achievements</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {badges.map(b => (
                <div 
                  key={b.id} 
                  className="premium-card text-center" 
                  style={{ 
                    padding: '20px', 
                    opacity: b.unlocked ? 1 : 0.45,
                    border: b.unlocked ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
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
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 850 }}>{b.title}</h4>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'block' }}>{b.desc}</span>
                  {b.unlocked ? (
                    <span style={{ fontSize: '0.6rem', color: '#10B981', fontWeight: 700, display: 'block', marginTop: '6px' }}>✓ Unlocked</span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 700, display: 'block', marginTop: '6px' }}>🔒 Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'history') {
    const completedList = challenges.filter(c => c.status === 'completed');
    const failedList = challenges.filter(c => c.status === 'failed');

    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Challenges History</h2>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          <div className="premium-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', paddingRight: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Completed</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981' }}>{completedList.length}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Failed</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>{failedList.length}</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Logs</h3>
            
            {challenges.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px', color: 'var(--color-text-muted)' }}>
                <Clock size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.8rem' }}>No challenges logged yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {challenges.map(c => {
                  const done = c.status === 'completed';
                  return (
                    <div key={c.id} className="premium-card flex-between" style={{ padding: '14px 18px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 700 }}>{c.name}</h4>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Duration: {c.durationDays} days</span>
                      </div>
                      <div>
                        {done ? (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Completed</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Failed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Challenges;
