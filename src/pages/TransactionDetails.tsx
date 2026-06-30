import React, { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Calendar, CreditCard, Tag, FileText, Receipt, ArrowRight, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import * as db from '../services/db';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

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
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Amount Box (Full bleed) */}
          <div style={{
            background: 'var(--color-card)',
            padding: '24px 16px',
            borderBottom: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '18px',
              background: isIncome ? 'rgba(34,197,94,0.1)' : txn.type === 'transfer' ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem',
              margin: '0 auto 12px',
            }}>{cat?.icon || (isIncome ? '💰' : '💸')}</div>

            <h2 style={{
              margin: 0, fontSize: '2.25rem', fontWeight: 800,
              color: isIncome ? '#22C55E' : txn.type === 'transfer' ? '#2563EB' : '#EF4444',
            }}>
              {isIncome ? '+' : txn.type === 'transfer' ? '' : '-'}{formatCurrency(txn.amount)}
            </h2>

            <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {txn.type}
            </p>
          </div>

          {/* Details (Flat list group) */}
          <div className="list-group" style={{ marginTop: '16px' }}>
            <DetailRow icon={<Calendar size={18} />} label="Date & Time">
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{formatDate(txn.date)} · {formatTime(txn.date)}</span>
            </DetailRow>

            <DetailRow icon={<CreditCard size={18} />} label={txn.type === 'transfer' ? 'From Account' : 'Account'}>
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{acc?.icon} {acc?.name}</span>
            </DetailRow>

            {txn.type === 'transfer' && toAcc && (
              <DetailRow icon={<ArrowRight size={18} />} label="To Account">
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{toAcc?.icon} {toAcc?.name}</span>
              </DetailRow>
            )}

            {txn.type !== 'transfer' && (
              <DetailRow icon={<Tag size={18} />} label="Category">
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{cat?.icon} {cat?.name}</span>
              </DetailRow>
            )}

            {txn.subcategory && (
              <DetailRow icon={<Tag size={18} />} label="Subcategory">
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{txn.subcategory}</span>
              </DetailRow>
            )}

            {txn.note && (
              <DetailRow icon={<FileText size={18} />} label="Note">
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{txn.note}</span>
              </DetailRow>
            )}
          </div>

          {/* Receipt Image */}
          {txn.receiptUrl && (
            <div style={{ padding: '24px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                <Receipt size={18} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attached Receipt</span>
              </div>
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
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

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, children }) => (
  <div className="list-row" style={{ cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px' }}>
    <div style={{ color: 'var(--color-text-muted)', flexShrink: 0, width: '20px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', marginTop: '2px' }}>{children}</div>
    </div>
  </div>
);

export default TransactionDetails;

