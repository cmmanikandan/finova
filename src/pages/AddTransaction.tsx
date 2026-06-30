import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Camera, Image as ImageIcon, X,
  ChevronDown, Check, Receipt, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import * as db from '../services/db';
import type { TransactionType } from '../types';
import { format } from 'date-fns';

const TYPES: { id: TransactionType; label: string; color: string; bg: string }[] = [
  { id: 'expense',  label: 'Expense',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'income',   label: 'Income',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  { id: 'transfer', label: 'Transfer', color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
];

const AddTransaction: React.FC = () => {
  const { id: editId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { accounts, categories, settings, refresh } = useApp();

  // Filter out hidden accounts from select choices (except if currently selected)
  const [account,     setAccount]     = useState('cash');
  const [toAccount,   setToAccount]   = useState('');

  const visibleAccounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      const hiddenIds = raw ? JSON.parse(raw) : [];
      return accounts.filter(a => !hiddenIds.includes(a.id) || a.id === account || a.id === toAccount);
    } catch {
      return accounts;
    }
  }, [accounts, account, toAccount]);

  // Set default visible account on load if not set
  useEffect(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      const hiddenIds = raw ? JSON.parse(raw) : [];
      const visible = accounts.filter(a => !hiddenIds.includes(a.id));
      if (visible.length > 0 && account === 'cash' && !visible.some(v => v.id === 'cash')) {
        setAccount(visible[0].id);
      }
    } catch {}
  }, [accounts]);

  const defaultType = location.state?.defaultType || 'expense';

  // ── State ──────────────────────────────────────────────────────────────────
  const [type,        setType]        = useState<TransactionType>(defaultType);
  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date,        setDate]        = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note,        setNote]        = useState('');
  const [receipt,     setReceipt]     = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [amtFocused,  setAmtFocused]  = useState(false);
  const [showCatGrid, setShowCatGrid] = useState(false);
  const [warnDismissed, setWarnDismissed] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // Populate edit mode
  useEffect(() => {
    if (!editId) return;
    const txn = db.getTransactions().find(t => t.id === editId);
    if (!txn) return;
    setType(txn.type);
    setAmount(String(txn.amount));
    setCategory(txn.category);
    setSubcategory(txn.subcategory || '');
    setAccount(txn.account);
    setToAccount(txn.toAccount || '');
    setDate(format(new Date(txn.date), "yyyy-MM-dd'T'HH:mm"));
    setNote(txn.note || '');
    setReceipt(txn.receiptUrl || null);
  }, [editId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const activeType  = TYPES.find(t => t.id === type)!;
  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');
  const selectedCat  = categories.find(c => c.id === category);

  const formattedAmount = amount
    ? Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Daily limit check
  const dailyStatus = db.getDailyLimitStatus();
  const newAmount = parseFloat(amount) || 0;
  const projectedSpend = dailyStatus.spent + newAmount;
  const willExceedLimit = settings.dailyLimitEnabled && settings.dailyLimit > 0 && type === 'expense' && !editId && projectedSpend > settings.dailyLimit;
  const showLimitWarning = willExceedLimit && !warnDismissed && newAmount > 0;

  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playNote(1046.50, now, 0.35);
      playNote(1318.51, now + 0.06, 0.45);
    } catch { /* Audio block ignore */ }
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      amountRef.current?.focus();
      return;
    }
    if (type !== 'transfer' && !category) {
      setShowCatGrid(true);
      return;
    }
    setSaving(true);
    try {
      const transferCat = categories.find(c => c.id === 'transfer' || c.id.startsWith('transfer_'));
      const transferCatId = transferCat?.id || 'transfer';

      if (editId) {
        await db.updateTransaction(editId, {
          type,
          amount: parseFloat(amount),
          category: type === 'transfer' ? transferCatId : category,
          subcategory: subcategory || undefined,
          account,
          toAccount: type === 'transfer' ? toAccount : undefined,
          date: new Date(date).toISOString(),
          note: note || undefined,
          receiptUrl: receipt || undefined,
        });
      } else {
        await db.addTransaction({
          type,
          amount: parseFloat(amount),
          category: type === 'transfer' ? transferCatId : category,
          subcategory: subcategory || undefined,
          account,
          toAccount: type === 'transfer' ? toAccount : undefined,
          date: new Date(date).toISOString(),
          note: note || undefined,
          receiptUrl: receipt || undefined,
        });
      }
      
      // Trigger haptic & sound feedback
      try {
        if (navigator.vibrate) {
          navigator.vibrate(60);
        }
      } catch {}
      playSuccessSound();

      refresh();
      // Store toast message for Transactions page to pick up after navigation
      sessionStorage.setItem('finova_toast', editId ? '✏️ Transaction updated!' : '✅ Transaction saved!');
      navigate(-1);
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      alert(`Failed to save transaction: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReceipt(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: 'var(--color-bg)',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden',
    }}>

      {/* ── App Bar ── */}
      <div className="app-bar">
        <button
          id="add-txn-back"
          onClick={() => navigate(-1)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}
        >
          <ArrowLeft size={22} />
        </button>

        <h2>
          {editId ? 'Edit Transaction' : 'Add Transaction'}
        </h2>

        <button
          id="add-txn-save-top"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '12px',
            background: activeType.color,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: '24px',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* ── Type Segmented Control (sticky) ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--color-card)',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{
            display: 'flex', background: '#F1F5F9',
            borderRadius: '14px', padding: '4px', gap: '4px',
          }}>
            {TYPES.map(t => (
              <button
                key={t.id}
                id={`type-${t.id}`}
                onClick={() => { setType(t.id); setCategory(''); }}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: '10px',
                  fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: type === t.id ? '#fff' : 'transparent',
                  color: type === t.id ? t.color : '#94A3B8',
                  boxShadow: type === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Daily Limit Warning Banner ── */}
        {showLimitWarning && (
          <div style={{
            margin: '16px 16px 0',
            background: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400E' }}>
                ⚠️ This will exceed your daily limit
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '2px' }}>
                Today: {settings.currencySymbol}{dailyStatus.spent.toLocaleString()} spent of {settings.currencySymbol}{settings.dailyLimit.toLocaleString()} limit. Adding {settings.currencySymbol}{newAmount.toLocaleString()} = {settings.currencySymbol}{projectedSpend.toLocaleString()} total ({Math.round((projectedSpend / settings.dailyLimit) * 100)}%)
              </div>
            </div>
            <button onClick={() => setWarnDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', flexShrink: 0, padding: '0' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Amount Card ── */}
        <div style={{
          margin: '16px 16px 0',
          background: activeType.color,
          borderRadius: '24px',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-32px', left: '-16px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />

          <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
            {type === 'expense' ? 'Amount Spent' : type === 'income' ? 'Amount Received' : 'Transfer Amount'}
          </p>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'text' }}
            onClick={() => amountRef.current?.focus()}
          >
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>₹</span>
            <input
              ref={amountRef}
              id="add-txn-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onFocus={() => setAmtFocused(true)}
              onBlur={() => setAmtFocused(false)}
              placeholder="0.00"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '2.75rem', fontWeight: 800, color: '#fff',
                outline: 'none', width: '100%', caretColor: 'rgba(255,255,255,0.8)',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          {!amtFocused && amount && (
            <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>
              ₹{formattedAmount}
            </p>
          )}
        </div>

        {/* ── Form Fields ── */}
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Category */}
          {type !== 'transfer' && (
            <FieldCard label="Category" required error={showCatGrid && !category}>
              <button
                id="add-txn-category"
                onClick={() => setShowCatGrid(v => !v)}
                style={{
                  width: '100%', minHeight: '56px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '0 16px',
                  border: `1.5px solid ${showCatGrid && !category ? '#EF4444' : 'var(--color-border)'}`,
                  borderRadius: '16px', background: 'var(--color-card)',
                  cursor: 'pointer', gap: '12px',
                }}
              >
                {selectedCat ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: `${selectedCat.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                    }}>{selectedCat.icon}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9375rem' }}>{selectedCat.name}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.9375rem' }}>
                    {showCatGrid && !category ? '⚠️ Select a category' : 'Select category…'}
                  </span>
                )}
                <ChevronDown size={18} color="#94A3B8" style={{ flexShrink: 0, transform: showCatGrid ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Category grid */}
              {showCatGrid && (
                <div style={{
                  marginTop: '8px',
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
                  maxHeight: '220px', overflowY: 'auto',
                  background: 'var(--color-card)', borderRadius: '16px',
                  border: '1px solid var(--color-border)', padding: '12px',
                }}>
                  {filteredCats.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCategory(c.id); setShowCatGrid(false); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: '4px', padding: '10px 4px', border: 'none', borderRadius: '12px',
                        background: category === c.id ? `${c.color}18` : 'var(--color-bg)',
                        cursor: 'pointer', transition: 'all 0.15s',
                        outline: category === c.id ? `2px solid ${c.color}` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.375rem' }}>{c.icon}</span>
                      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#64748B', textAlign: 'center', lineHeight: 1.2 }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </FieldCard>
          )}

          {/* Subcategory */}
          {type !== 'transfer' && category && (
            <FieldCard label="Subcategory (optional)">
              <input
                id="add-txn-subcategory"
                type="text"
                className="input-field"
                placeholder="e.g. Starbucks, Amazon, School Fee…"
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                style={{ minHeight: '56px' }}
              />
            </FieldCard>
          )}

          {/* Account */}
          <FieldCard label={type === 'transfer' ? 'From Account' : 'Account'}>
            <div style={{ position: 'relative' }}>
              <select
                id="add-txn-account"
                className="input-field"
                value={account}
                onChange={e => setAccount(e.target.value)}
                style={{ appearance: 'none', paddingRight: '2.5rem', minHeight: '56px' }}
              >
                {visibleAccounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          </FieldCard>

          {/* To Account (transfer) */}
          {type === 'transfer' && (
            <FieldCard label="To Account">
              <div style={{ position: 'relative' }}>
                <select
                  id="add-txn-to-account"
                  className="input-field"
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value)}
                  style={{ appearance: 'none', paddingRight: '2.5rem', minHeight: '56px' }}
                >
                  <option value="">Select account…</option>
                  {visibleAccounts.filter(a => a.id !== account).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </FieldCard>
          )}

          {/* Date & Time */}
          <FieldCard label="Date & Time">
            <input
              id="add-txn-date"
              type="datetime-local"
              className="input-field"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ minHeight: '56px' }}
            />
          </FieldCard>

          {/* Note */}
          <FieldCard label="Note (optional)">
            <input
              id="add-txn-note"
              type="text"
              className="input-field"
              placeholder="What was this for?"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ minHeight: '56px' }}
            />
          </FieldCard>

          {/* Receipt Upload */}
          <FieldCard label="Receipt">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptFile}
              style={{ display: 'none' }}
              id="receipt-file-input"
            />

            {receipt ? (
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <img src={receipt} alt="Receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => setReceipt(null)}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Receipt size={14} color="#64748B" />
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Receipt attached</span>
                  <span style={{ fontSize: '0.8125rem', color: '#2563EB', fontWeight: 600, marginLeft: 'auto', cursor: 'pointer' }}
                    onClick={() => fileRef.current?.click()}>Change</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Camera */}
                <button
                  id="receipt-camera"
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.capture = 'environment';
                      fileRef.current.click();
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '8px', padding: '20px', border: '1.5px dashed var(--color-border)',
                    borderRadius: '16px', background: 'var(--color-card)', cursor: 'pointer',
                    transition: 'border-color 0.15s', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={22} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>Camera</span>
                  <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Take photo</span>
                </button>

                {/* Gallery */}
                <button
                  id="receipt-gallery"
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.removeAttribute('capture');
                      fileRef.current.click();
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '8px', padding: '20px', border: '1.5px dashed var(--color-border)',
                    borderRadius: '16px', background: 'var(--color-card)', cursor: 'pointer',
                    transition: 'border-color 0.15s', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={22} color="#7C3AED" />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>Gallery</span>
                  <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Choose image</span>
                </button>
              </div>
            )}
          </FieldCard>
        </div>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div style={{
        background: 'var(--color-card)',
        borderTop: '1px solid var(--color-border)',
        padding: `16px 16px calc(16px + env(safe-area-inset-bottom))`,
        display: 'flex', gap: '12px',
        zIndex: 10,
      }}>
        <button
          id="add-txn-cancel"
          className="btn-ghost"
          onClick={() => navigate(-1)}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          id="add-txn-save"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2,
            background: `linear-gradient(135deg, ${activeType.color}, ${activeType.color}cc)`,
            color: '#fff',
            boxShadow: `0 4px 16px ${activeType.color}40`,
          }}
        >
          {saving ? (
            <>
              <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Saving…
            </>
          ) : (
            <>
              <Check size={18} />
              {editId ? 'Update' : `Save`}
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        [data-theme="dark"] .input-field { background: var(--color-bg); }
      `}</style>
    </div>
  );
};

// ── Field Card wrapper ──────────────────────────────────────────────────────
const FieldCard: React.FC<{
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{
      fontSize: '0.8125rem', fontWeight: 600,
      color: error ? '#EF4444' : '#64748B',
      letterSpacing: '0.01em',
    }}>
      {label}{required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
    </label>
    {children}
  </div>
);

export default AddTransaction;
