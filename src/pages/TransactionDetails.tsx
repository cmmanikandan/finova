import React, { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Calendar, CreditCard, Tag, FileText, Receipt, ArrowRight } from 'lucide-react';
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
            onClick={() => navigate(`/transactions/${txn.id}/edit`)}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Amount Card */}
          <div style={{
            background: 'var(--color-card)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)',
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

          {/* Details Card */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', padding: '16px' }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', margin: 'auto', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Transaction?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>This transaction will be permanently removed. The account balance and budgets will be automatically adjusted.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px' }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, height: '44px', borderRadius: '22px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: 'none' }} onClick={handleDelete}>Delete</button>
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
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.875rem' }}>{children}</div>
    </div>
  </div>
);

export default TransactionDetails;
