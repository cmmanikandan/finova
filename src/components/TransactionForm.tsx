import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import type { TransactionType } from '../types';
import { format } from 'date-fns';

interface TransactionFormProps {
  onClose: () => void;
  onSaved: () => void;
  defaultType?: TransactionType;
}

const TYPE_TABS: { id: TransactionType; label: string; color: string }[] = [
  { id: 'expense',  label: 'Expense',  color: '#EF4444' },
  { id: 'income',   label: 'Income',   color: '#22C55E' },
  { id: 'transfer', label: 'Transfer', color: '#2563EB' },
];

const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSaved, defaultType = 'expense' }) => {
  const { accounts, categories, refresh } = useApp();
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState(accounts[0]?.id || 'cash');
  const [toAccount, setToAccount] = useState('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');
  const activeColor = TYPE_TABS.find(t => t.id === type)?.color || '#2563EB';

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (type !== 'transfer' && !category) return;
    setSaving(true);
    try {
      db.addTransaction({
        type,
        amount: parseFloat(amount),
        category: type === 'transfer' ? 'transfer' : category,
        account,
        toAccount: type === 'transfer' ? toAccount : undefined,
        date: new Date(date).toISOString(),
        note: note || undefined,
      });
      refresh();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet">
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Add Transaction</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', borderRadius: '14px', padding: '4px', marginBottom: '1.25rem' }}>
          {TYPE_TABS.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              flex: 1, padding: '0.625rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif',
              background: type === t.id ? '#fff' : 'transparent',
              color: type === t.id ? t.color : '#94A3B8',
              boxShadow: type === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{
          background: '#F8FAFC', borderRadius: '16px', padding: '1rem', marginBottom: '1rem',
          textAlign: 'center', border: `2px solid ${amount ? activeColor + '30' : '#E2E8F0'}`,
          transition: 'border-color 0.2s',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem', fontWeight: 500 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span style={{ fontSize: '1.5rem', color: '#64748B', fontWeight: 600 }}>₹</span>
            <input
              id="txn-amount"
              type="number"
              className="amount-input"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ color: activeColor, width: '180px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Category */}
          {type !== 'transfer' && (
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Category</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="txn-category"
                  className="input-field"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ appearance: 'none', paddingRight: '2.5rem' }}
                >
                  <option value="">Select category…</option>
                  {filteredCats.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* Account */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>
              {type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <div style={{ position: 'relative' }}>
              <select id="txn-account" className="input-field" value={account} onChange={e => setAccount(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* To account for transfer */}
          {type === 'transfer' && (
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>To Account</label>
              <div style={{ position: 'relative' }}>
                <select id="txn-to-account" className="input-field" value={toAccount} onChange={e => setToAccount(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                  <option value="">Select…</option>
                  {accounts.filter(a => a.id !== account).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Date & Time</label>
            <input id="txn-date" type="datetime-local" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.375rem' }}>Note (optional)</label>
            <input id="txn-note" type="text" className="input-field" placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button
            id="save-txn-btn"
            onClick={handleSave}
            disabled={saving || !amount}
            className="btn-primary"
            style={{ flex: 2, background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)` }}
          >
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
