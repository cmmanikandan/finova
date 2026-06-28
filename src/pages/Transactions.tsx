import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as db from '../services/db';
import { formatCurrency, formatTime, groupTransactionsByDate } from '../utils/format';
import TransactionForm from '../components/TransactionForm';
import type { TransactionType } from '../types';

const DATE_FILTERS = ['All', 'Today', 'Yesterday', 'This Week', 'This Month'];

function matchDate(txnDate: string, filter: string): boolean {
  const d = new Date(txnDate);
  const now = new Date();
  if (filter === 'Today') return d.toDateString() === now.toDateString();
  if (filter === 'Yesterday') {
    const y = new Date(now); y.setDate(now.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  if (filter === 'This Week') {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === 'This Month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

const Transactions: React.FC = () => {
  const { categories, refresh } = useApp();
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [dateFilter, setDateFilter] = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const allTxns = db.getTransactions();

  const filtered = useMemo(() => {
    return allTxns.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!matchDate(t.date, dateFilter)) return false;
      if (search) {
        const cat = categories.find(c => c.id === t.category);
        const q = search.toLowerCase();
        return (cat?.name || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) || String(t.amount).includes(q);
      }
      return true;
    });
  }, [allTxns, typeFilter, dateFilter, search, categories]);

  const grouped = groupTransactionsByDate(filtered);

  const handleDelete = (id: string) => {
    db.deleteTransaction(id);
    setDeleteId(null);
    refresh();
  };

  const getCat = (id: string) => categories.find(c => c.id === id);

  return (
    <div className="page-enter">
      {/* Top bar */}
      <div style={{ padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ margin: '0 0 0.875rem', fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Transactions</h2>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.875rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            id="txn-search"
            type="text"
            placeholder="Search transactions…"
            className="input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', paddingRight: search ? '2.5rem' : '1rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['all', 'expense', 'income', 'transfer'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`chip ${typeFilter === t ? 'chip-active' : 'chip-inactive'}`}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {DATE_FILTERS.map(f => (
            <button key={f} onClick={() => setDateFilter(f)} className={`chip ${dateFilter === f ? 'chip-active' : 'chip-inactive'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0.75rem 1.25rem 6rem' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <img src="/icon-96x96.png" alt="FINOVA" style={{ width: '64px', height: '64px', opacity: 0.35 }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#94A3B8' }}>No transactions found</p>
            <button className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateLabel, txns]) => (
            <div key={dateLabel} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dateLabel}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {txns.length} txn{txns.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {txns.map((t, i) => {
                  const cat = getCat(t.category);
                  const isIncome = t.type === 'income';
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.875rem 1rem',
                      borderBottom: i < txns.length - 1 ? '1px solid #F8FAFC' : 'none',
                    }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
                        background: isIncome ? 'rgba(34,197,94,0.1)' : t.type === 'transfer' ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                      }}>{cat?.icon || '📦'}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{cat?.name || t.category}</div>
                        {t.note && <div style={{ fontSize: '0.75rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note}</div>}
                        <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{formatTime(t.date)}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '0.9375rem', fontWeight: 700,
                          color: isIncome ? '#16A34A' : t.type === 'transfer' ? '#2563EB' : '#DC2626',
                        }}>
                          {isIncome ? '+' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
                        </div>
                        <button onClick={() => setDeleteId(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: '0', marginTop: '2px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button id="txn-fab-add" className="fab" onClick={() => setShowForm(true)} aria-label="Add transaction">
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <h3 style={{ margin: '0 0 0.5rem', color: '#0F172A' }}>Delete Transaction?</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748B', fontSize: '0.9375rem' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #EF4444, #DC2626)' }} onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
