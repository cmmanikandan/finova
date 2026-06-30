import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, CheckCircle2, Trash2, Clock, TrendingUp,
  TrendingDown, X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import * as db from '../services/db';
import type { Debt } from '../types';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

const CONTACT_EMOJIS = ['👤','👨','👩','👦','👧','🧑','👴','👵','🧔','💁','🙋','🤵','👷','🎓','💼','🤝'];

const DebtTracker: React.FC = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>(() => db.getDebts());
  const { action } = useParams<{ action: string }>();
  const showForm = action === 'new';
  const setShowForm = (show: boolean) => {
    if (show) navigate('/debts/new');
    else navigate('/debts');
  };
  const [tab, setTab] = useState<'pending' | 'settled'>('pending');

  // Form state
  const [contactName, setContactName]   = useState('');
  const [contactEmoji, setContactEmoji] = useState('👤');
  const [amount, setAmount]             = useState('');
  const [direction, setDirection]       = useState<'lent' | 'borrowed'>('lent');
  const [dueDate, setDueDate]           = useState('');
  const [note, setNote]                 = useState('');
  const [saving, setSaving]             = useState(false);
  const [deleteId, setDeleteId]         = useState<string | null>(null);

  const refresh = () => setDebts(db.getDebts());

  const summary = useMemo(() => db.getPendingDebtsSummary(), [debts]);

  const pending  = debts.filter(d => d.status === 'pending').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const settled  = debts.filter(d => d.status === 'settled').sort((a, b) => new Date(b.settledAt || b.createdAt).getTime() - new Date(a.settledAt || a.createdAt).getTime());

  const displayed = tab === 'pending' ? pending : settled;

  const handleSave = async () => {
    if (!contactName.trim() || !amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    await db.addDebt({
      contactName: contactName.trim(),
      contactEmoji,
      amount: parseFloat(amount),
      direction,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    });
    refresh();
    setShowForm(false);
    setContactName(''); setContactEmoji('👤'); setAmount(''); setDirection('lent'); setDueDate(''); setNote('');
    setSaving(false);
  };

  const handleSettle = async (id: string) => {
    await db.settleDebt(id);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await db.deleteDebt(id);
    setDeleteId(null);
    refresh();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* App Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', padding: '0 8px 0 4px',
        background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)',
        flexShrink: 0, paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: '12px', cursor: 'pointer', color: 'var(--color-text)' }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>Debt Tracker</h1>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Track money lent & borrowed</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '12px', padding: '8px 14px',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', marginRight: '8px'
          }}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '140px' }}>
        {/* Summary Cards */}
        <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
            borderRadius: '18px', padding: '16px', color: '#fff',
            boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, marginBottom: '8px' }}>
              <TrendingUp size={14} />
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>To Receive</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{formatCurrency(summary.totalLent)}</div>
            <div style={{ fontSize: '0.6875rem', opacity: 0.8, marginTop: '2px' }}>Others owe you</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
            borderRadius: '18px', padding: '16px', color: '#fff',
            boxShadow: '0 4px 16px rgba(239,68,68,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, marginBottom: '8px' }}>
              <TrendingDown size={14} />
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>To Pay</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{formatCurrency(summary.totalBorrowed)}</div>
            <div style={{ fontSize: '0.6875rem', opacity: 0.8, marginTop: '2px' }}>You owe others</div>
          </div>
        </div>

        {/* Net balance */}
        {(summary.totalLent > 0 || summary.totalBorrowed > 0) && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              background: 'var(--color-card)', borderRadius: '14px', padding: '12px 16px',
              border: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Net Position</span>
              <span style={{
                fontSize: '1rem', fontWeight: 900,
                color: summary.netOwed >= 0 ? '#16A34A' : '#DC2626'
              }}>
                {summary.netOwed >= 0 ? '+' : ''}{formatCurrency(summary.netOwed)}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 16px 0' }}>
          {(['pending', 'settled'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 700,
                fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                background: tab === t ? 'var(--color-primary)' : 'var(--color-card)',
                color: tab === t ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {t === 'pending' ? `Pending (${pending.length})` : `Settled (${settled.length})`}
            </button>
          ))}
        </div>

        {/* Debt List */}
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: '12px' }}>
              <div style={{ fontSize: '3.5rem' }}>{tab === 'pending' ? '🤝' : '✅'}</div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)' }}>
                {tab === 'pending' ? 'No Pending Debts' : 'No Settled Debts'}
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {tab === 'pending' ? 'Add a debt to start tracking who owes you or who you owe.' : 'Settled debts will appear here.'}
              </p>
              {tab === 'pending' && (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    marginTop: '4px', padding: '10px 24px', borderRadius: '20px',
                    background: 'var(--color-primary)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Plus size={16} /> Add Debt
                </button>
              )}
            </div>
          ) : (
            displayed.map(debt => {
              const overdue = tab === 'pending' && isOverdue(debt.dueDate);
              return (
                <div
                  key={debt.id}
                  style={{
                    background: 'var(--color-card)', borderRadius: '16px', padding: '14px 16px',
                    border: `1.5px solid ${overdue ? '#FECACA' : 'var(--color-border)'}`,
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                      background: debt.direction === 'lent' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                    }}>
                      {debt.contactEmoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>{debt.contactName}</span>
                        <span style={{
                          fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.5px',
                          background: debt.direction === 'lent' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: debt.direction === 'lent' ? '#16A34A' : '#DC2626',
                        }}>
                          {debt.direction === 'lent' ? 'They Owe Me' : 'I Owe Them'}
                        </span>
                      </div>
                      {debt.note && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debt.note}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        {debt.dueDate && (
                          <span style={{ fontSize: '0.6875rem', color: overdue ? '#DC2626' : 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />{overdue ? '⚠ Overdue · ' : ''}Due {format(new Date(debt.dueDate), 'dd MMM yyyy')}
                          </span>
                        )}
                        {tab === 'settled' && debt.settledAt && (
                          <span style={{ fontSize: '0.6875rem', color: '#16A34A', fontWeight: 600 }}>
                            ✓ Settled {format(new Date(debt.settledAt), 'dd MMM')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '1rem', fontWeight: 900,
                        color: debt.direction === 'lent' ? '#16A34A' : '#DC2626'
                      }}>
                        {debt.direction === 'lent' ? '+' : '-'}{formatCurrency(debt.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {tab === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                      <button
                        onClick={() => handleSettle(debt.id)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px', fontWeight: 700,
                          fontSize: '0.75rem', cursor: 'pointer', border: 'none',
                          background: 'rgba(34,197,94,0.1)', color: '#16A34A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                      >
                        <CheckCircle2 size={14} /> Mark Settled
                      </button>
                      <button
                        onClick={() => setDeleteId(debt.id)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {tab === 'settled' && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => setDeleteId(debt.id)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Debt Form Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'flex-end', backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: '480px', margin: '0 auto',
              background: 'var(--color-card)', borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Add Debt Entry</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'var(--color-bg)', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Direction toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['lent', 'borrowed'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8125rem',
                    cursor: 'pointer', border: `2px solid ${direction === d ? (d === 'lent' ? '#22C55E' : '#EF4444') : 'var(--color-border)'}`,
                    background: direction === d ? (d === 'lent' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'var(--color-bg)',
                    color: direction === d ? (d === 'lent' ? '#16A34A' : '#DC2626') : 'var(--color-text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {d === 'lent' ? '↑ I Lent' : '↓ I Borrowed'}
                </button>
              ))}
            </div>

            {/* Emoji picker */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Avatar</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CONTACT_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setContactEmoji(e)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px', fontSize: '1.25rem',
                      border: `2px solid ${contactEmoji === e ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: contactEmoji === e ? 'rgba(37,99,235,0.08)' : 'var(--color-bg)',
                      cursor: 'pointer',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact name */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Name *</label>
              <input
                className="input-field"
                type="text"
                placeholder="e.g. Rahul, Mom, Office..."
                value={contactName}
                onChange={e => setContactName(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount *</label>
              <input
                className="input-field"
                type="number"
                placeholder="₹ 0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Due date */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date (optional)</label>
              <input
                className="input-field"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note (optional)</label>
              <input
                className="input-field"
                type="text"
                placeholder="e.g. Lunch split, rent..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!contactName.trim() || !amount || parseFloat(amount) <= 0 || saving}
              style={{
                padding: '14px', borderRadius: '14px', fontWeight: 800, fontSize: '0.9375rem',
                cursor: 'pointer', border: 'none',
                background: !contactName.trim() || !amount ? 'var(--color-border)' : 'var(--color-primary)',
                color: !contactName.trim() || !amount ? 'var(--color-text-muted)' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setDeleteId(null)}>
          <div style={{ background: 'var(--color-card)', borderRadius: '20px', padding: '24px 20px', width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '14px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Debt Entry?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>This debt entry will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', fontWeight: 700, cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#EF4444', border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff' }}>Delete</button>
          </div>
        </div>
      </div>
      )}

      {/* Floating Action Button */}
      <button
        className="fab"
        onClick={() => setShowForm(true)}
        style={{
          position: 'fixed',
          bottom: '96px',
          right: '20px',
          zIndex: 50
        }}
        aria-label="Add Debt"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default DebtTracker;

