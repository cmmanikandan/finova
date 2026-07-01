import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, X, Filter, ChevronDown, ArrowLeft, Edit2, ArrowUpDown, Download, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as db from '../services/db';
import * as exportSvc from '../services/export';
import { formatCurrency, formatTime, groupTransactionsByDate } from '../utils/format';
import type { TransactionType } from '../types';
import { useScrollFAB } from '../hooks/useScrollFAB';

const DATE_FILTERS = ['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date'];

const getCleanNote = (note?: string) => {
  if (!note) return '';
  return note.replace(/\[SplitBillMeta:.*?\]/, '').trim();
};

function matchDate(txnDate: string, filter: string, startDate?: string, endDate?: string): boolean {
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
  if (filter === 'Custom Date') {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    }
  }
  return true;
}

const SwipeableTransactionItem: React.FC<{
  t: any;
  cat: any;
  isIncome: boolean;
  onDelete: (id: string) => void;
  onClick: () => void;
  onEdit: (id: string) => void;
}> = ({ t, cat, isIncome, onDelete, onClick, onEdit }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - touchStart;
    if (diff < -120) setSwipeOffset(-120);
    else if (diff > 120) setSwipeOffset(120);
    else setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset < -50) {
      setSwipeOffset(-100);
    } else if (swipeOffset > 50) {
      setSwipeOffset(100);
    } else {
      setSwipeOffset(0);
    }
  };

  const hasSplit = t.note?.includes('[SplitBillMeta:');
  const isSettlement = t.type === 'settlement';
  const isSplitBillEntry = t.type === 'split_bill_entry';
  const cleanNote = (isSettlement || isSplitBillEntry) ? t.note : getCleanNote(t.note);

  return (
    <div style={{ position: 'relative', background: 'var(--color-bg)', overflow: 'hidden', minHeight: '64px' }}>
      {/* Left swipe reveal (Edit Action) */}
      {!isSettlement && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px',
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1
        }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(t.id); setSwipeOffset(0); }} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', fontWeight: 800 }}>
            <Edit2 size={16} /> Edit
          </button>
        </div>
      )}

      {/* Right swipe reveal (Delete Action) */}
      {!isSettlement && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1
        }}>
          <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); setSwipeOffset(0); }} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', fontWeight: 800 }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}

      {/* Main Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isSettlement) return;
          if (swipeOffset === 0) onClick();
          else setSwipeOffset(0);
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '16px',
          background: 'var(--color-card)',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 2,
          cursor: isSettlement ? 'default' : 'pointer'
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
          background: isSettlement ? 'rgba(16,185,129,0.15)' : isSplitBillEntry ? 'rgba(139,92,246,0.15)' : isIncome ? 'rgba(34,197,94,0.15)' : t.type === 'transfer' ? 'rgba(37,99,235,0.15)' : `${cat?.color || '#EF4444'}20`,
          color: isSettlement ? '#10B981' : isSplitBillEntry ? '#8B5CF6' : isIncome ? '#22C55E' : t.type === 'transfer' ? '#2563EB' : cat?.color || '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)'
        }}>{isSettlement ? '🤝' : isSplitBillEntry ? '👥' : cat?.icon || '📦'}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {isSettlement ? 'Settlement' : isSplitBillEntry ? t.billName : cat?.name || t.category}
            </span>
            {t.subcategory && (
              <span style={{
                fontSize: '0.6875rem',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                color: 'var(--color-primary)',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 700
              }}>
                {t.subcategory}
              </span>
            )}
            {hasSplit && (
              <span style={{
                fontSize: '0.65rem',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                color: '#8B5CF6',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 700
              }}>
                Split Bill
              </span>
            )}
            {isSettlement && (
              <span style={{
                fontSize: '0.65rem',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
                color: '#10B981',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 700
              }}>
                Repayment
              </span>
            )}
            {isSplitBillEntry && t.friendCount > 0 && (
              <span style={{
                fontSize: '0.65rem',
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.15)',
                color: '#8B5CF6',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 700
              }}>
                {t.friendCount} {t.friendCount === 1 ? 'Friend' : 'Friends'}
              </span>
            )}
            {isSplitBillEntry && (
              <span style={{
                fontSize: '0.65rem',
                background: t.billStatus === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${t.billStatus === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                color: t.billStatus === 'completed' ? '#10B981' : '#F59E0B',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 700
              }}>
                {t.billStatus === 'completed' ? 'Settled' : 'Pending'}
              </span>
            )}
          </div>
          {cleanNote && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanNote}</div>}
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>{formatTime(t.date)}</div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{
            fontSize: '1rem', fontWeight: 900,
            color: isSettlement || isIncome ? '#16A34A' : isSplitBillEntry ? '#8B5CF6' : t.type === 'transfer' ? '#2563EB' : '#DC2626',
          }}>
            {isSettlement || isIncome ? '+' : isSplitBillEntry ? '' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
          </div>
          {isSplitBillEntry && (
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>My Share</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Transactions: React.FC = () => {
  const { categories, accounts, transactions, refresh } = useApp();
  const navigate = useNavigate();
  const { fabVisible, handleScroll } = useScrollFAB();
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<'all' | TransactionType | 'split_bill' | 'settlements'>('all');
  const [dateFilter, setDateFilter]     = useState('All');
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Sorting State
  const [sortBy, setSortBy]             = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Advanced Filters State (renders as a full-screen sub-view)
  const [searchParams, setSearchParams] = useSearchParams();
  const showFiltersPage = searchParams.get('filter') === 'true';
  const setShowFiltersPage = (val: boolean) => {
    if (val) {
      setSearchParams({ filter: 'true' });
    } else {
      searchParams.delete('filter');
      setSearchParams(searchParams);
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount]   = useState('all');
  const [minAmount, setMinAmount]               = useState('');
  const [maxAmount, setMaxAmount]               = useState('');
  const [startDate, setStartDate]               = useState('');
  const [endDate, setEndDate]                   = useState('');

  // Toast notification state (shown when returning from add/edit screens)
  const [toastMsg, setToastMsg]                 = useState<string | null>(null);
  // Undo Delete Snackbar State
  const [deletedBackup, setDeletedBackup]       = useState<any | null>(null);
  const [snackbarMessage, setSnackbarMessage]   = useState<string | null>(null);

  // Show toast when navigating back from AddTransaction with success message
  useEffect(() => {
    const msg = sessionStorage.getItem('finova_toast');
    if (msg) {
      sessionStorage.removeItem('finova_toast');
      setToastMsg(msg);
      const t = setTimeout(() => setToastMsg(null), 2800);
      return () => clearTimeout(t);
    }
  }, []);

  const allTxns = transactions;

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    return db.getMonthlyStats(now.getFullYear(), now.getMonth());
  }, [transactions]);

  const isFilterActive = useMemo(() => {
    return selectedCategory !== 'all' ||
           selectedAccount !== 'all' ||
           minAmount !== '' ||
           maxAmount !== '' ||
           dateFilter === 'Custom Date';
  }, [selectedCategory, selectedAccount, minAmount, maxAmount, dateFilter]);

  const filtered = useMemo(() => {
    if (typeFilter === 'settlements') {
      const repayments = db.getSplitBills().flatMap(s => 
        s.members.filter(m => m.id !== 'you' && m.status === 'settled').map(m => ({
          id: `${s.id}-${m.id}`,
          type: 'settlement' as any,
          amount: m.share,
          category: 'settlement',
          account: m.paymentAccount || 'cash',
          date: m.settledAt || s.date,
          note: `Repayment from ${m.name} for "${s.name}"`,
          createdAt: m.settledAt || s.date,
          friendName: m.name,
          billName: s.name,
          avatar: m.avatar,
        }))
      );
      return repayments.filter(t => {
        if (!matchDate(t.date, dateFilter, startDate, endDate)) return false;
        if (selectedAccount !== 'all' && t.account !== selectedAccount) return false;
        if (minAmount && t.amount < parseFloat(minAmount)) return false;
        if (maxAmount && t.amount > parseFloat(maxAmount)) return false;

        if (search) {
          const q = search.toLowerCase();
          return t.friendName.toLowerCase().includes(q) || t.billName.toLowerCase().includes(q) || String(t.amount).includes(q);
        }
        return true;
      });
    }

    if (typeFilter === 'split_bill') {
      // Build virtual items directly from all split bills (works for old & new)
      const allSplits = db.getSplitBills();
      const splitItems = allSplits.map(s => {
        const myMember = s.members.find(m => m.id === 'you');
        const myShare = myMember ? myMember.share : s.amount / s.members.length;
        const friendCount = s.members.filter(m => m.id !== 'you').length;
        return {
          id: `split-${s.id}`,
          type: 'split_bill_entry' as any,
          amount: myShare,
          category: s.category,
          account: s.accountId || 'cash',
          date: s.date,
          note: s.description || '',
          createdAt: s.date,
          billName: s.name,
          billStatus: s.status,
          friendCount,
          totalAmount: s.amount,
          splitId: s.id,
        };
      });
      return splitItems.filter(t => {
        if (!matchDate(t.date, dateFilter, startDate, endDate)) return false;
        if (selectedAccount !== 'all' && t.account !== selectedAccount) return false;
        if (minAmount && t.amount < parseFloat(minAmount)) return false;
        if (maxAmount && t.amount > parseFloat(maxAmount)) return false;
        if (search) {
          const q = search.toLowerCase();
          return t.billName.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) || String(t.amount).includes(q);
        }
        return true;
      });
    }

    return allTxns.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      if (!matchDate(t.date, dateFilter, startDate, endDate)) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (selectedAccount !== 'all' && t.account !== selectedAccount) return false;
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;

      if (search) {
        const cat = categories.find(c => c.id === t.category);
        const q = search.toLowerCase();
        const displayNote = getCleanNote(t.note);
        return (cat?.name || '').toLowerCase().includes(q) || displayNote.toLowerCase().includes(q) || String(t.amount).includes(q);
      }
      return true;
    });
  }, [allTxns, typeFilter, dateFilter, startDate, endDate, selectedCategory, selectedAccount, minAmount, maxAmount, search, categories]);

  const sortedAndFiltered = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'date_desc') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'date_asc') {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === 'amount_desc') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'amount_asc') {
      list.sort((a, b) => a.amount - b.amount);
    }
    return list;
  }, [filtered, sortBy]);

  const grouped = groupTransactionsByDate(sortedAndFiltered);

  const handleDeleteTrigger = (id: string) => {
    const target = allTxns.find(t => t.id === id);
    if (target) {
      setDeletedBackup(target);
    }
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      db.deleteTransaction(deleteId);
      setDeleteId(null);
      refresh();
      setSnackbarMessage('Transaction deleted');
      setTimeout(() => {
        setSnackbarMessage(null);
      }, 5000);
    }
  };

  const handleUndoDelete = () => {
    if (deletedBackup) {
      db.addTransaction({
        type: deletedBackup.type,
        amount: deletedBackup.amount,
        category: deletedBackup.category,
        subcategory: deletedBackup.subcategory,
        account: deletedBackup.account,
        toAccount: deletedBackup.toAccount,
        date: deletedBackup.date,
        note: deletedBackup.note,
        receiptUrl: deletedBackup.receiptUrl
      });
      setDeletedBackup(null);
      setSnackbarMessage(null);
      refresh();
    }
  };



  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedAccount('all');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setDateFilter('All');
  };

  const getCat = (id: string) => categories.find(c => c.id === id);

  // If Filters sub-view is requested, render it as a full-screen overlay page instead of a bottom sheet
  if (showFiltersPage) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar" style={{ display: 'flex', alignItems: 'center', height: '64px', padding: '0 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setShowFiltersPage(false)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ margin: '0 0 0 12px', fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Filter Transactions</h2>
          <button className="btn-ghost" style={{ marginLeft: 'auto', height: '36px', borderRadius: '18px', padding: '0 16px', fontSize: '0.8125rem', border: '1.5px solid var(--color-border)' }} onClick={clearAllFilters}>
            Clear
          </button>
        </div>

        {/* Filters Body */}
        <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '18px' }}>
            
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem', 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={selectedAccount} 
                  onChange={e => setSelectedAccount(e.target.value)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem', 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Range</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Min Amount (₹)" 
                  value={minAmount} 
                  onChange={e => setMinAmount(e.target.value)} 
                  style={{ 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                />
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Max Amount (₹)" 
                  value={maxAmount} 
                  onChange={e => setMaxAmount(e.target.value)} 
                  style={{ 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Filter Mode</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="input-field" 
                  value={dateFilter} 
                  onChange={e => setDateFilter(e.target.value)} 
                  style={{ 
                    appearance: 'none', 
                    paddingRight: '2.5rem', 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    height: '52px',
                    paddingTop: '0',
                    paddingBottom: '0'
                  }}
                >
                  {DATE_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {dateFilter === 'Custom Date' && (
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Dates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    style={{ 
                      borderRadius: '12px', 
                      border: '1.5px solid var(--color-border)', 
                      background: 'var(--color-bg)',
                      height: '52px',
                      paddingTop: '0',
                      paddingBottom: '0'
                    }}
                  />
                  <input 
                    type="date" 
                    className="input-field" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    style={{ 
                      borderRadius: '12px', 
                      border: '1.5px solid var(--color-border)', 
                      background: 'var(--color-bg)',
                      height: '52px',
                      paddingTop: '0',
                      paddingBottom: '0'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons (sticky footer) */}
        <div style={{ padding: '16px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
          <button className="btn-ghost" style={{ flex: 1, borderRadius: '16px' }} onClick={() => { clearAllFilters(); setShowFiltersPage(false); }}>Reset</button>
          <button className="btn-primary" style={{ flex: 1, borderRadius: '16px' }} onClick={() => setShowFiltersPage(false)}>Apply Filters</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top bar (Sticky) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Title & Sort & Export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>Transactions</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Export Button */}
            <div style={{ position: 'relative' }}>
              <button
                id="export-btn"
                onClick={() => setShowExportMenu(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: '10px', padding: '6px 10px',
                  cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 700
                }}
              >
                <Download size={14} /> Export
              </button>
              {showExportMenu && (
                <div
                  style={{
                    position: 'absolute', right: 0, top: '110%', zIndex: 100,
                    background: 'var(--color-card)', border: '1px solid var(--color-border)',
                    borderRadius: '12px', padding: '6px', minWidth: '150px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column', gap: '2px'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {[
                    { label: '📊 Export CSV', action: () => exportSvc.exportCSV(sortedAndFiltered) },
                    { label: '📗 Export Excel', action: () => exportSvc.exportExcel(sortedAndFiltered) },
                    { label: '📄 Export PDF', action: () => exportSvc.exportPDF(sortedAndFiltered) },
                    { label: '🗂 Export JSON', action: () => exportSvc.exportJSON(sortedAndFiltered) },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { item.action(); setShowExportMenu(false); }}
                      style={{
                        border: 'none', background: 'transparent', padding: '8px 12px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
                        color: 'var(--color-text)', textAlign: 'left', borderRadius: '8px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Sort */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ArrowUpDown size={14} style={{ color: 'var(--color-text-muted)', marginRight: '4px' }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '12px'
                }}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Amount: High-Low</option>
                <option value="amount_asc">Amount: Low-High</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 0, color: 'var(--color-primary)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Search & Advanced Filters Trigger */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              id="txn-search"
              type="text"
              placeholder="Search transactions…"
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.75rem', paddingRight: search ? '2.5rem' : '1rem' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            )}
          </div>
          <button id="filter-options-btn" onClick={() => setShowFiltersPage(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px',
            background: isFilterActive ? 'rgba(37,99,235,0.1)' : 'var(--color-card)',
            border: '1.5px solid var(--color-border)', borderRadius: '12px', cursor: 'pointer',
            color: isFilterActive ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: 'all 0.2s', flexShrink: 0
          }}>
            <Filter size={20} />
          </button>
        </div>

        {/* Horizontal scroll chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '4px'
        }}>
          {(['all', 'expense', 'income', 'transfer', 'split_bill', 'settlements'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`chip ${typeFilter === t ? 'chip-active' : 'chip-inactive'}`}
            >
              {t === 'all' 
                ? 'All Transactions' 
                : t === 'split_bill' 
                ? 'Split Bills' 
                : t === 'settlements' 
                ? 'Settlements' 
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div onScroll={handleScroll} className="pb-nav-safe" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {/* Month Summary Gradient Banner */}
        {sortedAndFiltered.length > 0 && (
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              borderRadius: '20px',
              padding: '16px 20px',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative glows */}
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.15)', filter: 'blur(30px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '-20px', bottom: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', filter: 'blur(30px)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Month's Cashflow Summary</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                  {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, opacity: 0.6, marginBottom: '2px' }}>Inflow</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#4ADE80' }}>+{formatCurrency(currentMonthStats.income)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, opacity: 0.6, marginBottom: '2px' }}>Outflow</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#F87171' }}>-{formatCurrency(currentMonthStats.expense)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, opacity: 0.6, marginBottom: '2px' }}>Net</span>
                  <span style={{
                    fontSize: '0.9375rem',
                    fontWeight: 900,
                    color: currentMonthStats.savings >= 0 ? '#38BDF8' : '#F87171'
                  }}>
                    {currentMonthStats.savings >= 0 ? '+' : ''}{formatCurrency(currentMonthStats.savings)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {sortedAndFiltered.length === 0 ? (
          <div className="empty-state-container">
            <span style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))', marginBottom: '16px', display: 'block' }}>📭</span>
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)', fontSize: '1.125rem' }}>
                {allTxns.length === 0 ? 'No Transactions Yet' : 'No Results Found'}
              </p>
              <p style={{ margin: '6px 0 16px 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.5, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                {allTxns.length === 0
                  ? 'Start tracking your income and expenses to see them here.'
                  : 'Try adjusting your search or clearing filters.'}
              </p>
            </div>
            {allTxns.length === 0 && (
              <button
                onClick={() => navigate('/transactions/new', { state: { defaultType: 'expense' } })}
                className="btn-primary"
                style={{
                  padding: '0 28px', height: '48px', borderRadius: '24px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                <Plus size={16} /> Add First Transaction
              </button>
            )}
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateLabel, txns]) => (
            <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', padding: '0 16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{dateLabel}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '2px 8px', borderRadius: '8px' }}>
                  {txns.length} txn{txns.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                {txns.map((t, idx) => {
                  const cat = getCat(t.category);
                  const isIncome = t.type === 'income';
                  return (
                    <div key={t.id} style={{ borderBottom: idx === txns.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                      <SwipeableTransactionItem
                        t={t}
                        cat={cat}
                        isIncome={isIncome}
                        onEdit={(id) => navigate(`/transactions/${id}/edit`)}
                        onDelete={handleDeleteTrigger}
                        onClick={() => t.type === 'split_bill_entry' ? navigate('/split-bill') : navigate(`/transactions/${t.id}`)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        id="fab-add-txn"
        className="fab"
        onClick={() => navigate('/transactions/new', { state: { defaultType: 'expense' } })}
        aria-label="Add transaction"
        style={{
          opacity: fabVisible ? 1 : 0,
          transform: fabVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.85)',
          transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: fabVisible ? 'auto' : 'none',
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Success Toast (Transaction saved / updated) */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '360px',
          background: '#0F4C2A',
          color: '#fff',
          borderRadius: '14px',
          padding: '13px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          zIndex: 9999,
          animation: 'slideUpFadeIn 0.28s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0, color: '#4ADE80' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toastMsg.replace(/^[^a-zA-Z\s]+/, '').trim()}
          </span>
        </div>
      )}

      {/* Undo Delete Snackbar */}
      {snackbarMessage && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '448px',
          background: '#1E293B',
          color: '#fff',
          borderRadius: '14px',
          padding: '13px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
          zIndex: 9999,
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{snackbarMessage}</span>
          {deletedBackup && snackbarMessage.includes('deleted') && (
            <button
              onClick={handleUndoDelete}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              UNDO
            </button>
          )}
        </div>
      )}

      {/* Full-page Deletion Confirmation Modal Overlay */}
      {deleteId && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setDeleteId(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', gap: '16px', borderRadius: '24px', padding: '24px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Transaction?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>This transaction will be permanently removed. The account balance and budgets will be automatically adjusted.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ flex: 1, height: '44px', borderRadius: '22px', background: '#EF4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

