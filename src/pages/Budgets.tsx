import React, { useState } from 'react';
import { Plus, X, ChevronDown, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import type { Budget } from '../types';
import { formatCurrency, percentage } from '../utils/format';

const COLORS = ['#2563EB','#22C55E','#EF4444','#F59E0B','#7C3AED','#0891B2','#EA580C','#DB2777','#059669'];

const Budgets: React.FC = () => {
  const { budgets, categories, refresh } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    db.deleteBudget(id);
    setDeleteId(null);
    refresh();
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);

  const getCat = (id: string) => categories.find(c => c.id === id);

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Budgets</h2>
          <button id="add-budget-btn" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => { setEditBudget(null); setShowForm(true); }}>
            <Plus size={16} /> New Budget
          </button>
        </div>

        {/* Summary bar */}
        {budgets.length > 0 && (
          <div style={{ marginTop: '1rem', background: '#F8FAFC', borderRadius: '14px', padding: '0.875rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}>
                Total: {formatCurrency(totalSpent)} of {formatCurrency(totalBudgeted)}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: totalSpent > totalBudgeted ? '#EF4444' : '#22C55E' }}>
                {Math.round(percentage(totalSpent, totalBudgeted))}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-fill" style={{
                width: `${Math.min(percentage(totalSpent, totalBudgeted), 100)}%`,
                background: totalSpent > totalBudgeted ? '#EF4444' : '#2563EB',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Budget list */}
      <div style={{ padding: '1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {budgets.length === 0 ? (
          <div className="empty-state">
            <img src="/icon-96x96.png" alt="FINOVA" style={{ width: '72px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 700, color: '#94A3B8', fontSize: '1rem' }}>No budgets yet</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#CBD5E1' }}>Set limits for your spending categories</p>
            <button className="btn-primary" style={{ padding: '0.625rem 1.5rem' }} onClick={() => { setEditBudget(null); setShowForm(true); }}>
              <Plus size={16} /> Create First Budget
            </button>
          </div>
        ) : (
          budgets.map(b => {
            const pct       = percentage(b.spent, b.limit);
            const remaining = b.limit - b.spent;
            const over      = pct >= 100;
            const warn      = pct >= 80 && !over;
            const cat       = getCat(b.category);
            const barColor  = over ? '#EF4444' : warn ? '#F59E0B' : b.color;

            return (
              <div key={b.id} className="card" style={{ padding: '1.125rem', borderLeft: `4px solid ${barColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${barColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>{b.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'capitalize' }}>{b.period} · {cat?.name || b.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button onClick={() => { setEditBudget(b); setShowForm(true); }}
                      style={{ border: 'none', background: '#F8FAFC', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(b.id)}
                      style={{ border: 'none', background: '#FEF2F2', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="progress-bar" style={{ marginBottom: '0.5rem', height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 700, color: barColor }}>{formatCurrency(b.spent)}</span>
                    <span style={{ color: '#94A3B8' }}> / {formatCurrency(b.limit)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {over && <AlertTriangle size={14} color="#EF4444" />}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: over ? '#EF4444' : warn ? '#F59E0B' : '#22C55E' }}>
                      {over ? `Over by ${formatCurrency(b.spent - b.limit)}` : `${formatCurrency(remaining)} left`}
                    </span>
                  </div>
                </div>

                {(over || warn) && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '10px',
                    background: over ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    color: over ? '#DC2626' : '#D97706', fontSize: '0.8125rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <AlertTriangle size={14} />
                    {over ? 'Budget exceeded! Consider reviewing your spending.' : `Warning: ${Math.round(pct)}% of budget used.`}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Form */}
      {showForm && (
        <BudgetForm
          budget={editBudget}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <h3 style={{ margin: '0 0 0.5rem', color: '#0F172A' }}>Delete Budget?</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748B' }}>This will remove the budget and all its tracking data.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg,#EF4444,#DC2626)' }} onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Budget Form ─────────────────────────────────────────────────────────────
interface BudgetFormProps {
  budget: Budget | null;
  onClose: () => void;
  onSaved: () => void;
}

const BudgetForm: React.FC<BudgetFormProps> = ({ budget, onClose, onSaved }) => {
  const { categories } = useApp();
  const [name,     setName]     = useState(budget?.name     || '');
  const [category, setCategory] = useState(budget?.category || '');
  const [limit,    setLimit]    = useState(budget ? String(budget.limit) : '');
  const [period,   setPeriod]   = useState<'monthly'|'weekly'|'custom'>(budget?.period || 'monthly');
  const [color,    setColor]    = useState(budget?.color || '#2563EB');

  const handleSave = () => {
    if (!name || !limit || parseFloat(limit) <= 0) return;
    if (budget) {
      db.updateBudget(budget.id, { name, category, limit: parseFloat(limit), period, color });
    } else {
      db.addBudget({
        name, category: category || 'others',
        limit: parseFloat(limit), period, color,
        startDate: new Date().toISOString(),
      });
    }
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, color: '#0F172A' }}>{budget ? 'Edit Budget' : 'Create Budget'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Budget Name</label>
            <input id="budget-name" type="text" className="input-field" placeholder="e.g. Monthly Food Budget" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Category</label>
            <div style={{ position: 'relative' }}>
              <select id="budget-cat" className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                <option value="">All Categories</option>
                {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Budget Limit</label>
            <input id="budget-limit" type="number" className="input-field" placeholder="₹ 0" value={limit} onChange={e => setLimit(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Period</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['monthly','weekly','custom'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`chip ${period === p ? 'chip-active' : 'chip-inactive'}`} style={{ flex: 1, justifyContent: 'center' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.5rem' }}>Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: c,
                  border: color === c ? '3px solid #0F172A' : '3px solid transparent',
                  cursor: 'pointer', transition: 'transform 0.15s', transform: color === c ? 'scale(1.2)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button id="save-budget-btn" onClick={handleSave} className="btn-primary" style={{ flex: 2, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
            {budget ? 'Save Changes' : 'Create Budget'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Budgets;
