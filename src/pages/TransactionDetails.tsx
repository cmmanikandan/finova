import React, { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Receipt, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import * as db from '../services/db';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

const parseSplitMeta = (note?: string) => {
  if (!note) return null;
  const match = note.match(/\[SplitBillMeta:(.*?)\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const getCleanNote = (note?: string) => {
  if (!note) return '';
  return note.replace(/\[SplitBillMeta:.*?\]/, '').trim();
};

const TransactionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, accounts, refresh } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const txn = db.getTransactions().find(t => t.id === id);

  if (!txn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '56px', padding: '0 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ margin: '0 0 0 12px', fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Details</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Transaction not found
        </div>
      </div>
    );
  }

  const cat = categories.find(c => c.id === txn.category);
  const acc = accounts.find(a => a.id === txn.account);
  const toAcc = txn.toAccount ? accounts.find(a => a.id === txn.toAccount) : null;
  const isIncome = txn.type === 'income';
  const splitMeta = parseSplitMeta(txn.note);
  const splitBill = splitMeta ? db.getSplitBills().find(s => s.id === splitMeta.id) : null;

  const handleDelete = () => {
    db.deleteTransaction(txn.id);
    refresh();
    navigate('/transactions');
  };

  const handleDuplicate = () => {
    db.addTransaction({
      type: txn.type,
      amount: txn.amount,
      category: txn.category,
      subcategory: txn.subcategory,
      account: txn.account,
      toAccount: txn.toAccount,
      date: new Date().toISOString(),
      note: `${txn.note || ''} (Copy)`.trim(),
      receiptUrl: txn.receiptUrl
    });
    refresh();
    navigate('/transactions');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      {/* App Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', padding: '0 8px 0 4px',
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '44px', height: '44px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: 'none', background: 'transparent',
            borderRadius: '12px', cursor: 'pointer', color: 'var(--color-text)',
          }}
        >
          <ArrowLeft size={22} />
        </button>

        <h1 style={{
          margin: 0, fontSize: '1.0625rem', fontWeight: 800,
          color: 'var(--color-text)', letterSpacing: '-0.2px',
        }}>
          Transaction Details
        </h1>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleDuplicate}
            title="Duplicate Transaction"
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'transparent',
              borderRadius: '12px', cursor: 'pointer', color: 'var(--color-text-muted)',
            }}
          >
            <Copy size={18} />
          </button>
          <button
            onClick={() => navigate(`/transactions/${txn.id}/edit`)}
            title="Edit Transaction"
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'transparent',
              borderRadius: '12px', cursor: 'pointer', color: 'var(--color-text-muted)',
            }}
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Transaction"
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'transparent',
              borderRadius: '12px', cursor: 'pointer', color: '#EF4444',
            }}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Receipt Card Wrapper */}
          <div className="card" style={{
            background: 'var(--color-card)',
            borderRadius: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-elevated)',
            padding: '24px 20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header / Amount Block */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: isIncome ? 'rgba(34,197,94,0.12)' : txn.type === 'transfer' ? 'rgba(37,99,235,0.12)' : 'rgba(239,68,68,0.12)',
                color: isIncome ? '#22C55E' : txn.type === 'transfer' ? '#2563EB' : '#EF4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                margin: '0 auto 12px',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)'
              }}>{cat?.icon || (isIncome ? '💰' : '💸')}</div>

              <h2 style={{
                margin: 0, fontSize: '2.5rem', fontWeight: 900,
                color: isIncome ? '#22C55E' : txn.type === 'transfer' ? '#2563EB' : '#EF4444',
                fontFamily: 'var(--font-sans)',
              }}>
                {isIncome ? '+' : txn.type === 'transfer' ? '' : '-'}{formatCurrency(txn.amount)}
              </h2>

              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {txn.type}
              </p>
            </div>

            {/* Dotted Tear Line Divider */}
            <div style={{
              height: '1px',
              borderTop: '2px dashed var(--color-border)',
              margin: '0 -20px 24px -20px',
              position: 'relative'
            }}>
              {/* Punch-out side notches to look like ticket/receipt */}
              <div style={{ position: 'absolute', left: '-10px', top: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }} />
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-bg)', borderLeft: '1px solid var(--color-border)' }} />
            </div>

            {/* Info Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>DATE & TIME</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatDate(txn.date)} · {formatTime(txn.date)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{txn.type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT'}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{acc?.icon} {acc?.name}</span>
              </div>

              {txn.type === 'transfer' && toAcc && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>TO ACCOUNT</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{toAcc?.icon} {toAcc?.name}</span>
                </div>
              )}

              {txn.type !== 'transfer' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>CATEGORY</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)' }}>{cat?.icon} {cat?.name}</span>
                </div>
              )}

              {txn.subcategory && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>SUBCATEGORY</span>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    background: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.15)',
                    color: 'var(--color-primary)',
                    padding: '2px 10px',
                    borderRadius: '99px'
                  }}>{txn.subcategory}</span>
                </div>
              )}

              {getCleanNote(txn.note) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--color-bg)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOTE</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.45 }}>{getCleanNote(txn.note)}</span>
                </div>
              )}

              {/* Split Bill Metadata Card */}
              {splitMeta && (
                <div style={{
                  marginTop: '20px',
                  background: 'rgba(139, 92, 246, 0.03)',
                  border: '1.5px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '20px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '1.2rem' }}>👥</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Split Bill Details</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>TOTAL BILL</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{splitMeta.total}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>MY SHARE</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{splitMeta.myShare}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>FRIENDS SHARE</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{splitMeta.friendsShare}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>RECOVERED</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10B981' }}>
                        ₹{splitBill ? splitBill.members.filter(m => m.id !== 'you' && m.status === 'settled').reduce((sum, m) => sum + m.share, 0) : splitMeta.recovered}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>PENDING</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F59E0B' }}>
                        ₹{splitMeta.friendsShare - (splitBill ? splitBill.members.filter(m => m.id !== 'you' && m.status === 'settled').reduce((sum, m) => sum + m.share, 0) : splitMeta.recovered)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>SETTLEMENT STATUS</span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        background: (splitBill ? splitBill.status : 'pending') === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        color: (splitBill ? splitBill.status : 'pending') === 'completed' ? '#10B981' : '#F59E0B',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        textTransform: 'uppercase'
                      }}>
                        {splitBill ? splitBill.status : 'pending'}
                      </span>
                    </div>

                    {splitBill && splitBill.members.length > 1 && (
                      <div style={{ marginTop: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Friend Settlements</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {splitBill.members.filter(m => m.id !== 'you').map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 0' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span>{m.avatar}</span>
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{m.name}</span>
                                  <span style={{ fontSize: '0.65rem', color: m.status === 'settled' ? '#10B981' : '#F59E0B', display: 'block', fontWeight: 600 }}>
                                    {m.status === 'settled' ? `Settled to ${accounts.find(a => a.id === m.paymentAccount)?.name || 'Account'}` : 'Pending'}
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontWeight: 800, color: m.status === 'settled' ? '#10B981' : 'var(--color-text)' }}>₹{m.share.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attached Receipt section */}
          {txn.receiptUrl && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                <Receipt size={18} color="var(--color-primary)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attached Receipt</span>
              </div>
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg)', boxShadow: 'var(--shadow-card)' }}>
                <img src={txn.receiptUrl} alt="Receipt" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '320px' }} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Card Overlay */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', gap: '16px', borderRadius: '24px', padding: '24px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Transaction?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>This transaction will be permanently removed. The account balance and budgets will be automatically adjusted.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button style={{ flex: 1, height: '44px', borderRadius: '22px', background: '#EF4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default TransactionDetails;

