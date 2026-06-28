import React, { useState } from 'react';
import { Plus, X, ChevronRight, CheckCircle, Archive, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import type { Goal } from '../types';
import { formatCurrency, percentage } from '../utils/format';
import { GOAL_TEMPLATES } from '../data/defaults';

const Goals: React.FC = () => {
  const { goals, refresh } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [addAmountGoal, setAddAmountGoal] = useState<Goal | null>(null);
  const [addAmt, setAddAmt] = useState('');

  const activeGoals    = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const archivedGoals  = goals.filter(g => g.status === 'archived');

  const handleAddAmount = () => {
    if (!addAmountGoal || !addAmt || parseFloat(addAmt) <= 0) return;
    const newAmt = Math.min(addAmountGoal.currentAmount + parseFloat(addAmt), addAmountGoal.targetAmount);
    db.updateGoal(addAmountGoal.id, {
      currentAmount: newAmt,
      status: newAmt >= addAmountGoal.targetAmount ? 'completed' : 'active',
    });
    setAddAmountGoal(null);
    setAddAmt('');
    refresh();
  };

  const handleArchive = (id: string) => {
    db.updateGoal(id, { status: 'archived' });
    setAddAmountGoal(null);
    refresh();
  };

  const handleUnarchive = (id: string) => {
    db.updateGoal(id, { status: 'active' });
    setAddAmountGoal(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      db.deleteGoal(id);
      setAddAmountGoal(null);
      refresh();
    }
  };

  const GoalCard = ({ g }: { g: Goal }) => {
    const pct = percentage(g.currentAmount, g.targetAmount);
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000);
    return (
      <div className="card tap-scale" style={{ padding: '1.125rem', cursor: 'pointer' }} onClick={() => setAddAmountGoal(g)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px', fontSize: '1.5rem',
              background: `${g.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{g.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>{g.name}</div>
              {g.status === 'archived' ? (
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Archived</div>
              ) : daysLeft > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{daysLeft} days left</div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>Overdue!</div>
              )}
            </div>
          </div>
          {g.status === 'completed' ? (
            <CheckCircle size={20} color="#22C55E" />
          ) : g.status === 'archived' ? (
            <Archive size={20} color="#94A3B8" />
          ) : (
            <ChevronRight size={18} color="#CBD5E1" />
          )}
        </div>

        <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
          <span style={{ fontWeight: 600, color: g.color }}>{formatCurrency(g.currentAmount)} saved</span>
          <span style={{ color: '#64748B' }}>Target: {formatCurrency(g.targetAmount)}</span>
        </div>

        <div style={{
          marginTop: '0.75rem',
          background: `${g.color}12`,
          borderRadius: '10px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: g.color,
          textAlign: 'center',
        }}>
          {Math.round(pct)}% complete · {formatCurrency(g.targetAmount - g.currentAmount)} to go
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter">
      <div style={{ padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Goals</h2>
        <button id="add-goal-btn" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      <div style={{ padding: '1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeGoals.length === 0 ? (
          <div className="empty-state">
            <img src="/icon-96x96.png" alt="FINOVA" style={{ width: '64px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#94A3B8' }}>No active goals</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#CBD5E1' }}>Start saving toward something you love</p>
            <button className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create Goal
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active · {activeGoals.length}
            </div>
            {activeGoals.map(g => <GoalCard key={g.id} g={g} />)}
          </>
        )}

        {completedGoals.length > 0 && (
          <>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
              Completed 🎉 · {completedGoals.length}
            </div>
            {completedGoals.map(g => <GoalCard key={g.id} g={g} />)}
          </>
        )}

        {archivedGoals.length > 0 && (
          <>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
              Archived 📦 · {archivedGoals.length}
            </div>
            {archivedGoals.map(g => <GoalCard key={g.id} g={g} />)}
          </>
        )}
      </div>

      {/* Add Goal Form */}
      {showForm && <GoalForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} />}

      {/* Add Amount to Goal */}
      {addAmountGoal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddAmountGoal(null)}>
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0F172A' }}>{addAmountGoal.icon} {addAmountGoal.name}</h3>
              <button onClick={() => setAddAmountGoal(null)} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.9375rem' }}>
              Add money toward this goal ({formatCurrency(addAmountGoal.targetAmount - addAmountGoal.currentAmount)} remaining)
            </p>
            <input
              id="goal-add-amount"
              type="number"
              className="input-field"
              placeholder="Amount to add (₹)"
              value={addAmt}
              onChange={e => setAddAmt(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            {/* Archive & Delete actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {addAmountGoal.status !== 'archived' ? (
                <button className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: '#E2E8F0', fontSize: '0.8125rem' }} onClick={() => handleArchive(addAmountGoal.id)}>
                  <Archive size={14} /> Archive
                </button>
              ) : (
                <button className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: '#E2E8F0', fontSize: '0.8125rem' }} onClick={() => handleUnarchive(addAmountGoal.id)}>
                  <Plus size={14} /> Restore
                </button>
              )}
              <button className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: '#FEE2E2', color: '#EF4444', fontSize: '0.8125rem' }} onClick={() => handleDelete(addAmountGoal.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setAddAmountGoal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleAddAmount}>Add Savings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalForm: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#2563EB');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name || !target) return;
    db.addGoal({
      name, targetAmount: parseFloat(target), currentAmount: parseFloat(current) || 0,
      targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString(),
      icon, color, status: 'active', notes,
    });
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#0F172A' }}>Create Goal</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Templates */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>Quick Templates</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {GOAL_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => { setName(t.name); setIcon(t.icon); setColor(t.color); }}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '99px', border: `1.5px solid ${name === t.name ? t.color : '#E2E8F0'}`, background: name === t.name ? `${t.color}15` : '#fff', cursor: 'pointer', fontSize: '0.8125rem', color: name === t.name ? t.color : '#64748B', fontWeight: 600, transition: 'all 0.15s' }}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Goal Name</label>
            <input id="goal-name" type="text" className="input-field" placeholder="e.g. New iPhone" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Target Amount</label>
              <input id="goal-target" type="number" className="input-field" placeholder="₹0" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Already Saved</label>
              <input id="goal-current" type="number" className="input-field" placeholder="₹0" value={current} onChange={e => setCurrent(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Target Date</label>
            <input id="goal-date" type="date" className="input-field" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Notes (optional)</label>
            <input id="goal-notes" type="text" className="input-field" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button id="save-goal-btn" onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>Save Goal</button>
        </div>
      </div>
    </div>
  );
};

export default Goals;
