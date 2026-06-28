import React, { useState } from 'react';
import { Plus, ChevronDown, Edit2, Trash2, AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as db from '../services/db';
import type { Budget } from '../types';
import { formatCurrency, percentage } from '../utils/format';

const COLORS = ['#2563EB','#22C55E','#EF4444','#F59E0B','#7C3AED','#0891B2','#EA580C','#DB2777','#059669'];

const Budgets: React.FC = () => {
  const { budgets, categories, refresh } = useApp();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    db.deleteBudget(id);
    setDeleteId(null);
    refresh();
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);

  const getCat = (id: string) => categories.find(c => c.id === id);

  const isFormView = pathname === '/budgets/new' || !!id;
  const editBudget = id ? budgets.find(b => b.id === id) || null : null;

  // Render dedicated full-screen creation page
  if (isFormView) {
    return (
      <BudgetForm
        budget={editBudget}
        onClose={() => navigate('/budgets')}
        onSaved={() => { navigate('/budgets'); refresh(); }}
      />
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top App Bar */}
      <div className="app-bar">
        <h2>Budgets</h2>
        <button id="add-budget-btn" className="btn-primary" style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', boxShadow: 'none' }} onClick={() => navigate('/budgets/new')}>
          <Plus size={16} /> New Budget
        </button>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        {/* Summary card (Flat) */}
        {budgets.length > 0 && (
          <div style={{ padding: '16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Total: {formatCurrency(totalSpent)} of {formatCurrency(totalBudgeted)}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: totalSpent > totalBudgeted ? '#EF4444' : '#22C55E' }}>
                {Math.round(percentage(totalSpent, totalBudgeted))}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: '8px', margin: 0 }}>
              <div className="progress-fill" style={{
                width: `${Math.min(percentage(totalSpent, totalBudgeted), 100)}%`,
                background: totalSpent > totalBudgeted ? '#EF4444' : '#2563EB',
              }} />
            </div>
          </div>
        )}

        {budgets.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '16px' }}>
            <div className="empty-state" style={{ padding: 0 }}>
              <span style={{ fontSize: '3rem' }}>⚖️</span>
              <p style={{ margin: '12px 0 4px', fontWeight: 800, color: 'var(--color-text)', fontSize: '1.0625rem' }}>No budgets yet</p>
              <p style={{ margin: '0 0 20px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Set spending limits for category controls</p>
              <button className="btn-primary" onClick={() => navigate('/budgets/new')}>
                <Plus size={18} /> Create Budget
              </button>
            </div>
          </div>
        ) : (
          <div className="list-group">
            {budgets.map(b => {
              const pct       = percentage(b.spent, b.limit);
              const remaining = b.limit - b.spent;
              const over      = pct >= 100;
              const warn      = pct >= 80 && !over;
              const cat       = getCat(b.category);
              const barColor  = over ? '#EF4444' : warn ? '#F59E0B' : b.color;

              return (
                <div key={b.id} style={{ padding: '16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', borderLeft: `6px solid ${barColor}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${barColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        {cat?.icon || '📦'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.9375rem' }}>{b.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>{b.period} · {cat?.name || b.category}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => navigate(`/budgets/${b.id}`)}
                        style={{ border: 'none', background: 'var(--color-bg)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteId(b.id)}
                        style={{ border: 'none', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="progress-bar" style={{ height: '8px', margin: 0 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{formatCurrency(b.spent)}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}> / {formatCurrency(b.limit)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {over && <AlertTriangle size={14} color="#EF4444" />}
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: over ? '#EF4444' : warn ? '#F59E0B' : '#22C55E' }}>
                        {over ? `Over by ${formatCurrency(b.spent - b.limit)}` : `${formatCurrency(remaining)} left`}
                      </span>
                    </div>
                  </div>

                  {(over || warn) && (
                    <div style={{
                      padding: '8px 12px', borderRadius: '10px',
                      background: over ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                      color: over ? '#DC2626' : '#D97706', fontSize: '0.75rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <AlertTriangle size={14} />
                      {over ? 'Budget limit exceeded! Consider tracking your expense tags.' : `Warning: You have spent ${Math.round(pct)}% of this budget.`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal Card Overlay (no bottom sheets) */}
      {deleteId && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', padding: '16px' }} onClick={() => setDeleteId(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', margin: 'auto', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Budget?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>This budget will be permanently removed. The transaction records will remain unaffected.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px' }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, height: '44px', borderRadius: '22px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: 'none' }} onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Budget Form sub-page ───────────────────────────────────────────────────
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
    if (!name.trim() || !limit || parseFloat(limit) <= 0) return;
    if (budget) {
      db.updateBudget(budget.id, { name: name.trim(), category, limit: parseFloat(limit), period, color });
    } else {
      db.addBudget({
        name: name.trim(), category: category || 'others',
        limit: parseFloat(limit), period, color,
        startDate: new Date().toISOString(),
      });
    }
    onSaved();
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      {/* App Bar */}
      <div className="app-bar">
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
          {budget ? 'Edit Budget' : 'New Budget'}
        </h2>
        <button className="btn-primary" style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', boxShadow: 'none' }} onClick={handleSave}>
          Save
        </button>
      </div>

      {/* Form Fields container */}
      <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Budget Name</label>
            <input id="budget-name" type="text" className="input-field" placeholder="e.g. Monthly Food Budget" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Category</label>
            <div style={{ position: 'relative' }}>
              <select id="budget-cat" className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                <option value="">All Categories</option>
                {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Budget Limit (₹)</label>
            <input id="budget-limit" type="number" className="input-field" placeholder="₹ 0" value={limit} onChange={e => setLimit(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Period</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['monthly','weekly','custom'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '22px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: '1.5px solid var(--color-border)',
                    background: period === p ? 'var(--color-primary)' : 'var(--color-card)',
                    color: period === p ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Budget Color Theme</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: c,
                  border: color === c ? '3px solid var(--color-text)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'transform 0.15s', transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  outline: 'none'
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer action buttons */}
      <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
        <button id="save-budget-btn" onClick={handleSave} className="btn-primary" style={{ flex: 2, background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 4px 16px ${color}35` }}>
          <Check size={18} /> {budget ? 'Save Changes' : 'Create Budget'}
        </button>
      </div>
    </div>
  );
};

export default Budgets;
