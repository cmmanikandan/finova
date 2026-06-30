import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Check, Flame, Plus, ChevronLeft, Trash2, Edit2, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';
import * as db from '../services/db';
import { formatCurrency, to24h, to12h } from '../utils/format';
import type { DailyTask, DailyTaskLog } from '../types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Suggested presets for rapid creation
const PRESETS = [
  { title: 'Breakfast', category: 'food', icon: '🍳', budgetLimit: 50, duration: 20 },
  { title: 'Daily Commute', category: 'travel', icon: '🚌', budgetLimit: 40, duration: 45 },
  { title: 'Morning Coffee', category: 'food', icon: '☕', budgetLimit: 30, duration: 15 },
  { title: 'Lunch Meal', category: 'food', icon: '🍛', budgetLimit: 80, duration: 30 },
  { title: 'Fuel Top-up', category: 'fuel', icon: '⛽', budgetLimit: 200, duration: 10 },
  { title: 'Gym Session', category: 'entertainment', icon: '🏋️', budgetLimit: 0, duration: 60 },
  { title: 'Evening Snacks', category: 'food', icon: '🍪', budgetLimit: 25, duration: 15 },
  { title: 'Dinner Outing', category: 'food', icon: '🍽️', budgetLimit: 150, duration: 40 },
  { title: 'Buy Stationery', category: 'stationery', icon: '✏️', budgetLimit: 50, duration: 15 },
  { title: 'Medicines', category: 'medical', icon: '💊', budgetLimit: 0, duration: 5 },
  { title: 'Drink Water', category: 'others', icon: '💧', budgetLimit: 0, duration: 5 },
  { title: 'Online Course', category: 'education', icon: '📚', budgetLimit: 0, duration: 90 },
];

const DailyPlanner: React.FC = () => {
  const navigate = useNavigate();
  const {
    dailyTasks,
    dailyTaskLogs,
    plannerSchedules,
    userBadges,
    streakData,
    categories,
    xpHistory,
    accounts,
    goals,
    refresh
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'today' | 'weekly' | 'analytics' | 'badges'>('today');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(new Date().getDay());
  
  // Sheet Form State
  const { action } = useParams<{ action: string }>();
  const isFormOpen = action === 'new' || action === 'edit';
  const setIsFormOpen = (open: boolean) => {
    if (open) {
      if (editingTask) navigate('/planner/edit');
      else navigate('/planner/new');
    } else {
      navigate('/planner');
    }
  };
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('custom');
  const [formIcon, setFormIcon] = useState('🎯');
  const [formBudgetLimit, setFormBudgetLimit] = useState('0');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formSchedule, setFormSchedule] = useState<DailyTask['repeatSchedule']>('daily');
  const [formReminder, setFormReminder] = useState('');
  const [formNotes, setFormNotes] = useState('');



  // Spending log and celebration states
  const [habitToLog, setHabitToLog] = useState<DailyTask | null>(null);
  const [habitSpendAmount, setHabitSpendAmount] = useState('');
  const [habitSpendAccount, setHabitSpendAccount] = useState('');
  const [celebrationSavings, setCelebrationSavings] = useState<{ title: string; limit: number; spent: number; saved: number } | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  // Set default goal when celebrationSavings is populated
  useEffect(() => {
    if (celebrationSavings && goals && goals.length > 0) {
      const activeGoals = goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        setSelectedGoalId(activeGoals[0].id);
      }
    }
  }, [celebrationSavings, goals]);


  const visibleAccounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      const hiddenIds = raw ? JSON.parse(raw) : [];
      return accounts.filter(a => !hiddenIds.includes(a.id) || a.id === habitSpendAccount);
    } catch {
      return accounts;
    }
  }, [accounts, habitSpendAccount]);

  // Auto set default account ID when habitToLog changes
  useEffect(() => {
    if (habitToLog && visibleAccounts && visibleAccounts.length > 0) {
      setHabitSpendAccount(visibleAccounts[0].id);
    }
  }, [habitToLog, visibleAccounts]);

  // Success / Error Alerts
  const [toastMsg, setToastMsg] = useState('');



  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };



  // Today's scheduled task collection
  const todayWeekday = new Date().getDay();
  const todaySchedule = useMemo(() => {
    return plannerSchedules.find(s => s.dayOfWeek === todayWeekday);
  }, [plannerSchedules, todayWeekday]);

  const todayTasks = useMemo(() => {
    if (!todaySchedule) return [];
    return dailyTasks.filter(t => todaySchedule.taskIds.includes(t.id));
  }, [dailyTasks, todaySchedule]);

  const todayLogsMap = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = dailyTaskLogs.filter(l => l.date === todayStr);
    const map: Record<string, DailyTaskLog> = {};
    logs.forEach(l => {
      map[l.taskId] = l;
    });
    return map;
  }, [dailyTaskLogs]);

  const completionPct = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    let completedCount = 0;
    todayTasks.forEach(t => {
      const log = todayLogsMap[t.id];
      if (log && log.status === 'completed') completedCount++;
    });
    return Math.round((completedCount / todayTasks.length) * 100);
  }, [todayTasks, todayLogsMap]);

  const totalTodaySavings = useMemo(() => {
    let savings = 0;
    todayTasks.forEach(task => {
      const log = todayLogsMap[task.id];
      if (log && log.status === 'completed' && task.budgetLimit > 0) {
        if (log.spentAmount < task.budgetLimit) {
          savings += (task.budgetLimit - log.spentAmount);
        }
      }
    });
    return savings;
  }, [todayTasks, todayLogsMap]);

  // Create form trigger
  const openCreateForm = (preset?: typeof PRESETS[0]) => {
    setEditingTask(null);
    setFormTitle(preset?.title || '');
    setFormCategory(preset?.category || 'custom');
    setFormIcon(preset?.icon || '🎯');
    setFormBudgetLimit(preset?.budgetLimit ? String(preset.budgetLimit) : '0');
    setFormPriority('medium');
    setFormSchedule('daily');
    setFormReminder('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (task: DailyTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormCategory(task.category);
    setFormIcon(task.icon);
    setFormBudgetLimit(String(task.budgetLimit));
    setFormPriority(task.priority);
    setFormSchedule(task.repeatSchedule);
    setFormReminder(to24h(task.reminderTime || ''));
    setFormNotes(task.notes || '');
    setIsFormOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload: Omit<DailyTask, 'id'> = {
      title: formTitle,
      category: formCategory,
      icon: formIcon,
      color: '#2563EB',
      budgetLimit: Number(formBudgetLimit) || 0,
      priority: formPriority,
      repeatSchedule: formSchedule,
      reminderTime: formReminder ? to12h(formReminder) : undefined,
      notes: formNotes || undefined,
      notificationsEnabled: true,
    };

    try {
      if (editingTask) {
        await db.updateDailyTask(editingTask.id, payload);
        triggerToast('Task updated successfully!');
      } else {
        const newTask = await db.addDailyTask(payload);
        
        // Add to weekday schedule auto if daily
        const currentSched = plannerSchedules.find(s => s.dayOfWeek === selectedDayOfWeek);
        const taskIds = currentSched ? [...currentSched.taskIds, newTask.id] : [newTask.id];
        await db.savePlannerSchedule(selectedDayOfWeek, taskIds);
        
        triggerToast('New task added successfully! +20 XP');
        await db.addXP(20, `Created task: ${formTitle}`);
      }
      setIsFormOpen(false);
      refresh();
    } catch (err) {
      console.error(err);
      triggerToast('Error saving task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await db.deleteDailyTask(id);
      triggerToast('Task deleted.');
      refresh();
    } catch (err) {
      triggerToast('Error deleting task');
    }
  };

  const handleCheckTask = async (taskId: string, currentStatus: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      if (currentStatus === 'completed') {
        await db.setTaskStatus(taskId, todayStr, 'pending');
        triggerToast('Task marked pending.');
        refresh();
      } else {
        const task = dailyTasks.find(t => t.id === taskId);
        if (task && task.budgetLimit > 0) {
          setHabitToLog(task);
          setHabitSpendAmount('');
        } else {
          await db.setTaskStatus(taskId, todayStr, 'completed', 0);
          triggerToast('Task completed!');
          refresh();
        }
      }
    } catch (err) {
      triggerToast('Error updating status');
    }
  };

  const handleSkipTask = async (taskId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await db.setTaskStatus(taskId, todayStr, 'skipped');
      triggerToast('Task skipped.');
      refresh();
    } catch (err) {
      triggerToast('Error updating status');
    }
  };

  // Weekly scheduler routines builder
  const weeklyDayTasks = useMemo(() => {
    const sched = plannerSchedules.find(s => s.dayOfWeek === selectedDayOfWeek);
    if (!sched) return [];
    return dailyTasks.filter(t => sched.taskIds.includes(t.id));
  }, [dailyTasks, plannerSchedules, selectedDayOfWeek]);

  const handleToggleWeekdayTask = async (taskId: string) => {
    const sched = plannerSchedules.find(s => s.dayOfWeek === selectedDayOfWeek);
    let taskIds = sched ? [...sched.taskIds] : [];
    if (taskIds.includes(taskId)) {
      taskIds = taskIds.filter(id => id !== taskId);
    } else {
      taskIds.push(taskId);
    }
    await db.savePlannerSchedule(selectedDayOfWeek, taskIds);
    refresh();
  };

  const handleCopySchedule = async (fromDay: number) => {
    try {
      await db.copyPlannerSchedule(fromDay, selectedDayOfWeek);
      triggerToast(`Schedule copied from ${WEEKDAYS[fromDay]}!`);
      refresh();
    } catch (err) {
      triggerToast('Error copying schedule');
    }
  };

  const aiInsights = useMemo(() => {
    return db.getAISuggestions();
  }, [dailyTaskLogs, dailyTasks, plannerSchedules]);

  const analytics = useMemo(() => {
    return db.getPlannerAnalytics();
  }, [dailyTaskLogs, dailyTasks, plannerSchedules, xpHistory]);

  const weeklySavings = useMemo(() => {
    const dates = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - idx);
      return d.toISOString().split('T')[0];
    }).reverse();

    return dates.map(dateStr => {
      const d = new Date(dateStr);
      const dayOfWeek = d.getDay();
      const schedule = plannerSchedules.find(s => s.dayOfWeek === dayOfWeek);
      const scheduledTaskIds = schedule ? schedule.taskIds : [];
      const logs = dailyTaskLogs.filter(l => l.date === dateStr && scheduledTaskIds.includes(l.taskId));
      
      let savings = 0;
      logs.forEach(log => {
        const task = dailyTasks.find(t => t.id === log.taskId);
        if (task && log.status === 'completed' && task.budgetLimit > 0) {
          if (log.spentAmount < task.budgetLimit) {
            savings += (task.budgetLimit - log.spentAmount);
          }
        }
      });

      return {
        name: d.toLocaleDateString(undefined, { weekday: 'short' }),
        savings
      };
    });
  }, [dailyTaskLogs, dailyTasks, plannerSchedules]);

  const routineForecast = useMemo(() => {
    const dates = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - idx);
      return d.toISOString().split('T')[0];
    });

    let totalSpent7Days = 0;
    let totalBudget7Days = 0;

    dates.forEach(dateStr => {
      const d = new Date(dateStr);
      const dayOfWeek = d.getDay();
      const schedule = plannerSchedules.find(s => s.dayOfWeek === dayOfWeek);
      const scheduledTaskIds = schedule ? schedule.taskIds : [];
      
      // Sum scheduled budget limits
      scheduledTaskIds.forEach(tid => {
        const task = dailyTasks.find(t => t.id === tid);
        if (task && task.budgetLimit > 0) {
          totalBudget7Days += task.budgetLimit;
        }
      });

      // Sum spent amount for logged tasks on this day
      const logs = dailyTaskLogs.filter(l => l.date === dateStr && scheduledTaskIds.includes(l.taskId));
      logs.forEach(log => {
        const task = dailyTasks.find(t => t.id === log.taskId);
        if (task && log.status === 'completed' && task.budgetLimit > 0) {
          totalSpent7Days += log.spentAmount;
        }
      });
    });

    const monthlyForecastSpent = Math.round(totalSpent7Days * 4.28);
    const monthlyForecastBudget = Math.round(totalBudget7Days * 4.28);
    const potentialMonthlySavings = Math.max(0, monthlyForecastBudget - monthlyForecastSpent);

    return {
      totalSpent7Days,
      monthlyForecastSpent,
      monthlyForecastBudget,
      potentialMonthlySavings
    };
  }, [dailyTaskLogs, dailyTasks, plannerSchedules]);

  const badgesList = [
    { name: 'Planner Pro', desc: 'Complete your first planner routine', icon: '🎯', goal: 1 },
    { name: 'Morning Warrior', desc: 'Log task before 9:00 AM', icon: '🌅', goal: 1 },
    { name: 'Budget Master', desc: 'Keep all tasks within budget limit', icon: '🛡️', goal: 1 },
    { name: '7 Day Streak', desc: 'Hold a 7 day completion streak', icon: '🔥', goal: 7 },
    { name: '30 Day Streak', desc: 'Hold a 30 day completion streak', icon: '👑', goal: 30 },
  ];

  if (isFormOpen) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--color-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Sticky Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--color-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingTop: 'calc(16px + env(safe-area-inset-top))',
        }}>
          <button
            onClick={() => setIsFormOpen(false)}
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
            {editingTask ? 'Modify Routine' : 'Add Routine Habit'}
          </h2>
        </div>

        {/* Scrollable Form Container */}
        <div className="pb-nav-safe" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px', margin: '0 auto' }}>
            {/* Title field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Habit Routine Title</label>
              <input
                type="text"
                placeholder="e.g. Morning Tea & Snacks"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Row Icon + Category select */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Emoji Icon</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formIcon}
                  onChange={e => setFormIcon(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    fontSize: '1rem',
                    textAlign: 'center',
                    fontWeight: 600
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Link spending Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <option value="custom">No category (General activity)</option>
                  {categories.filter(c => c.type === 'expense' || c.type === 'both').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget limit field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Optional budget limit (₹)</label>
              <input
                type="number"
                value={formBudgetLimit}
                onChange={e => setFormBudgetLimit(e.target.value)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Row Priority + Schedule select */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Routine Priority</label>
                <select
                  value={formPriority}
                  onChange={e => setFormPriority(e.target.value as any)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <option value="low">Low (General)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="high">High (Critical)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Repeats</label>
                <select
                  value={formSchedule}
                  onChange={e => setFormSchedule(e.target.value as any)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                  <option value="custom">Custom weekday</option>
                </select>
              </div>
            </div>

            {/* Reminder time input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Reminder Alert Time</label>
              <input
                type="time"
                value={formReminder}
                onChange={e => setFormReminder(e.target.value)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Notes field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Coaching Notes</label>
              <textarea
                rows={3}
                placeholder="e.g. Keep expenses under ₹40 to secure budget bonuses!"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  resize: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '0.9375rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-elevated)',
                marginTop: '10px'
              }}
            >
              Confirm and Save Routine
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--color-bg)' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        padding: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>Daily Planner</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Routines & Habit Tracker</p>
          </div>
        </div>
      </div>



      {/* Sub Tabs Selection Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '16px 16px 8px', gap: '8px' }}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'weekly', label: 'Weekly' },
          { id: 'analytics', label: 'Stats' },
          { id: 'badges', label: 'Badges' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            style={{
              padding: '8px 4px',
              borderRadius: '12px',
              border: 'none',
              background: activeSubTab === t.id ? 'var(--color-primary)' : 'var(--color-card)',
              color: activeSubTab === t.id ? '#fff' : 'var(--color-text-muted)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pb-nav-safe" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>

        {/* ─── TODAY TAB ─── */}
        {activeSubTab === 'today' && (
          <>
            {/* Today Header circular Gauge & Streaks */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
            }}>
              {/* Circular SVG Completion rate */}
              <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - completionPct / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-text)' }}>{completionPct}%</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Done</span>
                </div>
              </div>

              {/* XP progress bars and streaks */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={18} fill="#EA580C" stroke="none" className="pulse" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      {streakData.plannerCurrentStreak || 0} Day Streak
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    Best: {streakData.plannerBestStreak || 0}d
                  </span>
                </div>

                {totalTodaySavings > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-2px' }}>
                    <span style={{ fontSize: '1rem' }}>💰</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#10B981' }}>
                      ₹{totalTodaySavings.toLocaleString()} Saved Today
                    </span>
                  </div>
                )}


              </div>
            </div>

            {/* Quick Suggestions presets */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>Suggested Routine Habits</h3>
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => openCreateForm(preset)}
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '8px 12px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-subtle)',
                    }}
                  >
                    <span>{preset.icon}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>{preset.title}</span>
                    <Plus size={12} style={{ color: 'var(--color-primary)' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* AI Insights display widget */}
            {aiInsights.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(124, 58, 237, 0.04) 100%)',
                border: '1.5px dashed var(--color-primary-light)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>FINOVA AI Coach</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiInsights.map((insight, index) => (
                    <p key={index} style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4, fontWeight: 500 }}>
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Today's schedule listing */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>Today's Tasks Timeline</h3>
                <button
                  onClick={() => openCreateForm()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Custom Task
                </button>
              </div>

              {todayTasks.length === 0 ? (
                <div className="empty-state-container" style={{ minHeight: '300px' }}>
                  <Calendar size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>No tasks set for today</h4>
                  <p style={{ margin: '6px 0 16px 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.45, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Switch to "Weekly" tab to assign habits, or tap any preset above to add routines.
                  </p>
                  <button
                    onClick={() => openCreateForm()}
                    className="btn-primary"
                    style={{ padding: '0 24px', height: '44px', borderRadius: '20px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Add First Task
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '24px' }}>
                  {/* Timeline vertical connector line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '8px',
                    width: '2px',
                    background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-border) 100%)',
                    zIndex: 1
                  }} />

                  {todayTasks.map((task) => {
                    const log = todayLogsMap[task.id];
                    const isCompleted = log?.status === 'completed';
                    const isSkipped = log?.status === 'skipped';
                    const isMissed = log?.status === 'missed';
                    const spentAmount = log?.spentAmount || 0;

                    // Budget threshold indicators
                    const hasLimit = task.budgetLimit > 0;
                    const isNearLimit = hasLimit && spentAmount >= task.budgetLimit * 0.8 && spentAmount < task.budgetLimit;
                    const isOverLimit = hasLimit && spentAmount > task.budgetLimit;
                    const budgetColor = isOverLimit ? '#EF4444' : isNearLimit ? '#F97316' : '#22C55E';

                    return (
                      <div key={task.id} style={{ position: 'relative', marginBottom: '20px' }}>
                        {/* Timeline Bullet node */}
                        <div
                          onClick={() => handleCheckTask(task.id, log?.status || 'pending')}
                          style={{
                            position: 'absolute',
                            left: '-24px',
                            top: '12px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '3px solid',
                            borderColor: isCompleted ? '#22C55E' : isSkipped ? '#64748B' : isMissed ? '#EF4444' : 'var(--color-primary)',
                            background: isCompleted ? '#22C55E' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 2,
                            color: '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          {isCompleted && <Check size={10} strokeWidth={4} />}
                        </div>

                        {/* Glassmorphic Task Card */}
                        <div className="card-elevated" style={{
                          background: 'var(--color-card)',
                          borderRadius: '20px',
                          border: '1px solid var(--color-border)',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          opacity: isSkipped ? 0.7 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.5rem' }}>{task.icon}</span>
                              <div>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '0.875rem',
                                  fontWeight: 800,
                                  color: 'var(--color-text)',
                                  textDecoration: isCompleted ? 'line-through' : 'none'
                                }}>
                                  {task.title}
                                </h4>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                  {task.category && task.category !== 'custom' && (() => {
                                    const taskCat = categories.find(c => c.id === task.category);
                                    const catLabel = taskCat ? `${taskCat.icon} ${taskCat.name}` : task.category.replace(/_/g, ' ');
                                    return (
                                      <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '6px', background: 'var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'capitalize', fontWeight: 700 }}>
                                        {catLabel}
                                      </span>
                                    );
                                  })()}
                                  {task.reminderTime && (
                                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                      ⏰ {task.reminderTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Edit / Delete actions */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => openEditForm(task)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Budget Limit Tracker */}
                          {hasLimit && (
                            <div style={{
                              background: 'var(--color-border)',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', fontWeight: 700 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Budget tracking</span>
                                <span style={{ color: budgetColor }}>
                                  {formatCurrency(spentAmount)} / {formatCurrency(task.budgetLimit)}
                                </span>
                              </div>
                              <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  background: budgetColor,
                                  width: `${Math.min(100, (spentAmount / task.budgetLimit) * 100)}%`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              {isOverLimit && (
                                <span style={{ fontSize: '0.5625rem', color: '#EF4444', fontWeight: 800 }}>
                                  ⚠️ Limit Exceeded! Streak XP deduction active.
                                </span>
                              )}
                            </div>
                          )}

                          {/* Task Checkoff Options */}
                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                            <button
                              onClick={() => handleCheckTask(task.id, log?.status || 'pending')}
                              style={{
                                flexGrow: 1,
                                padding: '8px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isCompleted ? '#DCFCE7' : 'var(--color-primary)',
                                color: isCompleted ? '#16A34A' : '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Check size={14} /> {isCompleted ? 'Completed' : 'Checkoff'}
                            </button>

                            <button
                              onClick={() => handleSkipTask(task.id)}
                              disabled={isCompleted}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--color-border)',
                                background: isSkipped ? 'var(--color-border)' : 'var(--color-card)',
                                color: isSkipped ? 'var(--color-text-muted)' : 'var(--color-text)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── WEEKLY ROUTINES SCHEDULER TAB ─── */}
        {activeSubTab === 'weekly' && (
          <>
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '16px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>Select Weekday</h3>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
                {WEEKDAYS.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayOfWeek(idx)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: selectedDayOfWeek === idx ? 'var(--color-primary)' : 'var(--color-border)',
                      color: selectedDayOfWeek === idx ? '#fff' : 'var(--color-text)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {day.slice(0,3)}
                  </button>
                ))}
              </div>
            </div>

            {/* routine builder checklist */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 850 }}>
                  Assigned routines on {WEEKDAYS[selectedDayOfWeek]}
                </h4>
                <button
                  onClick={() => openCreateForm()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Plus size={12} /> New Task
                </button>
              </div>

              {dailyTasks.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Create tasks first to start designing routines.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dailyTasks.map(task => {
                    const isChecked = weeklyDayTasks.some(t => t.id === task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleWeekdayTask(task.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--color-border)',
                          borderRadius: '16px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                          border: isChecked ? '1.5px solid var(--color-primary-light)' : '1.5px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.25rem' }}>{task.icon}</span>
                          <div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>{task.title}</span>
                            {task.budgetLimit > 0 && (
                              <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                                Limit: {formatCurrency(task.budgetLimit)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Checkbox circle indicator */}
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: isChecked ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          background: isChecked ? 'var(--color-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.625rem'
                        }}>
                          {isChecked && '✓'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Routines copier panel */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Copy schedule from another day</span>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '8px', scrollbarWidth: 'none' }}>
                  {WEEKDAYS.map((day, idx) => {
                    if (idx === selectedDayOfWeek) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleCopySchedule(idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-card)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {day.slice(0,3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeSubTab === 'analytics' && (
          <>
            {/* Completion rates Bar Chart */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 800 }}>Weekly Completion Trends</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '140px', alignItems: 'flex-end', paddingTop: '10px' }}>
                {analytics.completionRates.map((day, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                    <div style={{ position: 'relative', width: '20px', height: '100px', background: 'var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        height: `${day.pct}%`,
                        background: 'var(--color-primary)',
                        borderRadius: '10px',
                        transition: 'height 0.5s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{day.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget status comparison card */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 800 }}>Today's Category Budget Usage</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {analytics.budgetUsage.map((item, idx) => {
                  const pct = Math.round((item.spent / item.limit) * 100) || 0;
                  const isOver = item.spent > item.limit;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--color-text)' }}>{item.name}</span>
                        <span style={{ color: isOver ? '#EF4444' : 'var(--color-text-muted)' }}>
                          {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: isOver ? '#EF4444' : 'var(--color-primary)',
                          width: `${Math.min(100, pct)}%`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Savings Trends card */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
            }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 800 }}>Weekly Savings Trends</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>How much money you saved by staying under routine budgets this week.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '140px', alignItems: 'flex-end', paddingTop: '10px' }}>
                {weeklySavings.map((day, idx) => {
                  const maxSavings = Math.max(...weeklySavings.map(s => s.savings), 100);
                  const pct = Math.min(100, Math.round((day.savings / maxSavings) * 100));
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, color: day.savings > 0 ? '#10B981' : 'var(--color-text-muted)' }}>
                        {day.savings > 0 ? `₹${day.savings}` : '₹0'}
                      </span>
                      <div style={{ position: 'relative', width: '20px', height: '80px', background: 'var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          width: '100%',
                          height: `${pct}%`,
                          background: '#10B981',
                          borderRadius: '10px',
                          transition: 'height 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{day.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Routine Forecast card */}
            <div className="card-elevated" style={{
              background: 'var(--color-card)',
              borderRadius: '24px',
              border: '1px solid var(--color-border)',
              padding: '20px',
            }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 800 }}>Routine Expense Forecast</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Projections for the next 30 days based on your weekly habit logs.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>7-Day Routine Spent</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{routineForecast.totalSpent7Days.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>30-Day Project Spent</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{routineForecast.monthlyForecastSpent.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(16,185,129,0.04)', border: '1.5px dashed rgba(16,185,129,0.2)', padding: '14px', borderRadius: '18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Potential Monthly Savings (Forecasted)</span>
                  <span style={{ fontSize: '1.375rem', fontWeight: 900, color: '#10B981' }}>₹{routineForecast.potentialMonthlySavings.toLocaleString()}</span>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    If you complete all routines within budget limits, you can bank these savings!
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── BADGES TAB ─── */}
        {activeSubTab === 'badges' && (
          <div className="card-elevated" style={{
            background: 'var(--color-card)',
            borderRadius: '24px',
            border: '1px solid var(--color-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>Achievement Milestones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {badgesList.map(badge => {
                const isUnlocked = userBadges.some(b => b.badgeName === badge.name);
                return (
                  <div
                    key={badge.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: isUnlocked ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-border)',
                      border: isUnlocked ? '1.5px solid #22C55E' : '1.5px solid transparent',
                      borderRadius: '18px',
                      padding: '12px 16px',
                      opacity: isUnlocked ? 1 : 0.65
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>{badge.icon}</span>
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text)' }}>{badge.name}</span>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{badge.desc}</p>
                    </div>
                    <div>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '8px',
                        background: isUnlocked ? '#22C55E' : 'rgba(0,0,0,0.1)',
                        color: isUnlocked ? '#fff' : 'var(--color-text-muted)'
                      }}>
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>



      {/* Floating Action Button */}
      <button
        className="fab"
        onClick={() => openCreateForm()}
        style={{
          position: 'fixed',
          bottom: '96px',
          right: '20px',
          zIndex: 50
        }}
        aria-label="Add Habit"
      >
        <Plus size={28} />
      </button>

      {/* Spent logging and celebration overlays */}
      {habitToLog && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setHabitToLog(null)}>
          <div className="bottom-sheet">
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Log Spend: {habitToLog.title}</h4>
              <button 
                onClick={() => setHabitToLog(null)} 
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.12)', padding: '14px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Routine Budget Limit</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{habitToLog.budgetLimit}</span>
              </div>
              <span style={{ fontSize: '1.75rem' }}>{habitToLog.icon}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Actual Amount Spent (₹)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 40" 
                  value={habitSpendAmount} 
                  onChange={e => setHabitSpendAmount(e.target.value)} 
                  className="input-field"
                  required
                  style={{ fontWeight: 800, fontSize: '1rem' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Pay From Account</label>
                <select
                  value={habitSpendAccount}
                  onChange={e => setHabitSpendAccount(e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 600 }}
                >
                  {visibleAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.icon} {acc.name} (Bal: ₹{acc.balance})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                onClick={async () => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  await db.setTaskStatus(habitToLog.id, todayStr, 'completed');
                  triggerToast('Completed! +10 XP');
                  setHabitToLog(null);
                  refresh();
                }}
                className="btn-ghost"
                style={{ flex: 1, height: '44px', borderRadius: '14px', fontSize: '0.8125rem' }}
              >
                Spent ₹0
              </button>
              <button 
                onClick={async () => {
                  const spentVal = Number(habitSpendAmount);
                  if (isNaN(spentVal) || spentVal < 0) {
                    alert('Please enter a valid amount!');
                    return;
                  }
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  // Resolve category ID: prefer the task's linked category if it's a valid category ID
                  const resolvedCat = categories.find(c => c.id === habitToLog.category);
                  const fallbackCat = categories.find(c => c.type === 'expense' || c.type === 'both');
                  const txnCategoryId = resolvedCat?.id || fallbackCat?.id || 'food';

                  await db.addTransaction({
                    type: 'expense',
                    amount: spentVal,
                    category: txnCategoryId,
                    account: habitSpendAccount || 'cash',
                    date: new Date().toISOString(),
                    note: `${habitToLog.title} Habit Log (Budget: ₹${habitToLog.budgetLimit})`
                  });

                  await db.setTaskStatus(habitToLog.id, todayStr, 'completed');

                  const saved = habitToLog.budgetLimit - spentVal;
                  if (saved > 0) {
                    setCelebrationSavings({
                      title: habitToLog.title,
                      limit: habitToLog.budgetLimit,
                      spent: spentVal,
                      saved
                    });
                  } else {
                    triggerToast('Habit completed & expense logged!');
                  }

                  setHabitToLog(null);
                  setHabitSpendAmount('');
                  refresh();
                }}
                className="btn-primary"
                style={{ flex: 2, height: '44px', borderRadius: '14px', fontWeight: 800 }}
              >
                Log & Complete 🎉
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {celebrationSavings && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCelebrationSavings(null)}>
          <div className="bottom-sheet" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '4rem', animation: 'bounce 1s infinite', display: 'block', margin: '0 auto 10px' }}>🎉</span>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>Excellent Savings!</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                Sticking to your budget is a superpower. You successfully completed your <strong>{celebrationSavings.title}</strong> routine under budget!
              </p>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1.5px dashed rgba(16,185,129,0.25)', padding: '16px', borderRadius: '20px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Routine Limit</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{celebrationSavings.limit}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Actual Spent</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>₹{celebrationSavings.spent}</span>
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(16,185,129,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Your Savings Today</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981' }}>+ ₹{celebrationSavings.saved}</span>
              </div>
            </div>

            {goals && goals.filter(g => g.status === 'active').length > 0 && (
              <div style={{
                background: 'rgba(37,99,235,0.04)',
                border: '1px solid rgba(37,99,235,0.15)',
                borderRadius: '20px',
                padding: '16px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left',
                marginBottom: '1.25rem'
              }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>
                  🎯 Transfer Savings to Financial Goal:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={e => setSelectedGoalId(e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 600, fontSize: '0.8125rem', height: '38px', padding: '0 8px' }}
                >
                  {goals.filter(g => g.status === 'active').map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name} (Saved: ₹{g.currentAmount} / ₹{g.targetAmount})
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const targetGoal = goals.find(g => g.id === selectedGoalId);
                    if (!targetGoal) return;
                    
                    try {
                      const newAmount = targetGoal.currentAmount + celebrationSavings.saved;
                      const nextStatus = newAmount >= targetGoal.targetAmount ? 'completed' as const : 'active' as const;
                      await db.updateGoal(targetGoal.id, { currentAmount: newAmount, status: nextStatus });
                      
                      await db.addTransaction({
                        type: 'expense',
                        amount: celebrationSavings.saved,
                        category: 'savings',
                        account: habitSpendAccount || 'cash',
                        date: new Date().toISOString(),
                        note: `Deposited habit savings to Goal: ${targetGoal.name}`
                      });

                      triggerToast(`Deposited ₹${celebrationSavings.saved} into "${targetGoal.name}"! 🎯`);
                      setCelebrationSavings(null);
                      refresh();
                    } catch (err) {
                      console.error('Failed to deposit savings to goal:', err);
                      triggerToast('Failed to save to Goal.');
                    }
                  }}
                  className="btn-primary"
                  style={{ height: '38px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  🚀 Transfer ₹{celebrationSavings.saved} to Goal
                </button>
              </div>
            )}

            <button
              onClick={() => setCelebrationSavings(null)}
              className="btn-ghost"
              style={{ width: '100%', height: '44px', borderRadius: '16px', fontWeight: 800, border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              Just Complete Routine 👍
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Global alert toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '20px',
          zIndex: 1000,
          fontSize: '0.75rem',
          fontWeight: 700,
          boxShadow: 'var(--shadow-elevated)'
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default DailyPlanner;

