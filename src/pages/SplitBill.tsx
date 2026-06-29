import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Share2, Clipboard, Users, 
  ArrowLeft, FileText, Camera, 
  Search, BarChart2
} from 'lucide-react';
import { useScrollFAB } from '../hooks/useScrollFAB';
import * as db from '../services/db';

interface Member {
  id: string;
  name: string;
  avatar: string;
  upi?: string;
  email?: string;
  share: number;
  percentage?: number;
  sharesCount?: number;
  status: 'pending' | 'paid' | 'settled';
}

interface SplitBillItem {
  id: string;
  name: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  method: 'equal' | 'custom' | 'percentage' | 'shares';
  members: Member[];
  upiId: string;
  receiverName: string;
  status: 'pending' | 'completed';
}

const DEFAULT_SPLITS: SplitBillItem[] = [
  {
    id: 'split-1',
    name: 'Weekend Trip',
    amount: 3000,
    description: 'Cab and lunch expenses',
    date: '2026-06-25',
    category: 'travel',
    method: 'equal',
    members: [
      { id: 'm-1', name: 'You', avatar: '👤', share: 1000, status: 'settled' },
      { id: 'm-2', name: 'Manikandan', avatar: '👨‍💻', upi: 'mani@paytm', share: 1000, status: 'paid' },
      { id: 'm-3', name: 'Friend 1', avatar: '🧑', upi: 'friend1@okicici', share: 1000, status: 'pending' }
    ],
    upiId: 'mobile@paytm',
    receiverName: 'Manikandan Prabhu',
    status: 'pending'
  },
  {
    id: 'split-2',
    name: 'Dinner Party',
    amount: 1800,
    description: 'Barbecue dinner',
    date: '2026-06-20',
    category: 'food',
    method: 'custom',
    members: [
      { id: 'm-1', name: 'You', avatar: '👤', share: 600, status: 'settled' },
      { id: 'm-2', name: 'Friend 1', avatar: '🧑', upi: 'friend1@okicici', share: 600, status: 'settled' },
      { id: 'm-3', name: 'Friend 2', avatar: '👧', upi: 'friend2@okhdfc', share: 600, status: 'settled' }
    ],
    upiId: 'mobile@paytm',
    receiverName: 'Manikandan Prabhu',
    status: 'completed'
  }
];

const RECENT_CONTACTS = [
  { name: 'Manikandan', upi: 'mani@paytm', avatar: '👨‍💻' },
  { name: 'Friend 1', upi: 'friend1@okicici', avatar: '🧑' },
  { name: 'Friend 2', upi: 'friend2@okhdfc', avatar: '👧' },
  { name: 'Prabhu', upi: 'prabhu@ybl', avatar: '👨' }
];

const SplitBill: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'dashboard' | 'create' | 'history' | 'analytics'>('dashboard');
  const [splits, setSplits] = useState<SplitBillItem[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<SplitBillItem | null>(null);

  // Creation State
  const [billName, setBillName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const date = new Date().toISOString().split('T')[0];
  const [category, setCategory] = useState('food');
  const [method, setMethod] = useState<'equal' | 'custom' | 'percentage' | 'shares'>('equal');
  const [selectedContacts, setSelectedContacts] = useState<Member[]>([
    { id: 'you', name: 'You', avatar: '👤', share: 0, status: 'settled' }
  ]);
  const [searchContact, setSearchContact] = useState('');
  const [upiId, setUpiId] = useState(() => localStorage.getItem('finova_saved_upi') || '');
  const [receiverName, setReceiverName] = useState('Manikandan Prabhu');

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [upiUrl, setUpiUrl] = useState('');

  const { fabVisible, handleScroll } = useScrollFAB();

  useEffect(() => {
    // Load from db cache (populated from Supabase)
    const loaded = db.getSplitBills();
    if (loaded.length > 0) {
      setSplits(loaded);
    } else {
      // Show default example splits for first-time users (not saved to db)
      setSplits(DEFAULT_SPLITS);
    }

    // Re-read when db writes occur (e.g., after Supabase pull)
    const unsub = () => setSplits([...db.getSplitBills()]);
    db.registerWriteListener(unsub);
    return () => db.registerWriteListener(() => {});
  }, []);



  // OCR Receipt Scanner Mock
  const triggerOCR = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setBillName('Starbucks Coffee');
      setAmount('780');
      setDescription('Coffee with development team');
      setCategory('food');
    }, 1500);
  };

  // Balances calculation
  const balances = useMemo(() => {
    let toReceive = 0;
    let toPay = 0;
    let pendingRequests = 0;

    splits.forEach(s => {
      s.members.forEach(m => {
        if (m.id !== 'you') {
          if (m.status === 'pending') {
            toReceive += m.share;
            pendingRequests++;
          }
        }
      });
    });

    return { toReceive, toPay, pendingRequests };
  }, [splits]);

  // Handle live calculation based on method
  const totalAmountNum = Number(amount) || 0;
  
  const calculatedMembers = useMemo(() => {
    const count = selectedContacts.length;
    if (count === 0) return [];
    
    if (method === 'equal') {
      const share = Number((totalAmountNum / count).toFixed(2));
      return selectedContacts.map(c => ({ ...c, share }));
    }
    
    return selectedContacts;
  }, [selectedContacts, method, totalAmountNum]);

  // Adjust custom share values
  const handleUpdateShare = (id: string, value: number) => {
    setSelectedContacts(prev => prev.map(m => m.id === id ? { ...m, share: value } : m));
  };

  const handleUpdatePercentage = (id: string, pct: number) => {
    const val = Number(((pct / 100) * totalAmountNum).toFixed(2));
    setSelectedContacts(prev => prev.map(m => m.id === id ? { ...m, percentage: pct, share: val } : m));
  };

  const handleUpdateSharesCount = (id: string, sh: number) => {
    const totalSharesCount = selectedContacts.reduce((sum, m) => sum + (m.id === id ? sh : (m.sharesCount || 1)), 0);
    setSelectedContacts(prev => {
      return prev.map(m => {
        const count = m.id === id ? sh : (m.sharesCount || 1);
        const val = totalSharesCount > 0 ? Number(((count / totalSharesCount) * totalAmountNum).toFixed(2)) : 0;
        return { ...m, sharesCount: count, share: val };
      });
    });
  };

  const addFriend = (name: string, upi: string, avatar: string) => {
    if (selectedContacts.some(c => c.name === name)) return;
    setSelectedContacts(prev => [...prev, {
      id: `m-${Date.now()}`,
      name,
      avatar,
      upi,
      share: 0,
      status: 'pending'
    }]);
    setSearchContact('');
  };

  const removeFriend = (id: string) => {
    if (id === 'you') return;
    setSelectedContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleCreateSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName.trim() || totalAmountNum <= 0) return;

    const payload = {
      name: billName.trim(),
      amount: totalAmountNum,
      description,
      date,
      category,
      method,
      members: calculatedMembers,
      upiId,
      receiverName,
      status: 'pending' as const,
    };

    const saved = await db.addSplitBill(payload);
    setSplits(prev => [saved, ...prev.filter(s => !DEFAULT_SPLITS.some(d => d.id === s.id))]);
    
    // Clear state
    setBillName('');
    setAmount('');
    setDescription('');
    setSelectedContacts([{ id: 'you', name: 'You', avatar: '👤', share: 0, status: 'settled' }]);
    setViewMode('dashboard');
  };

  const generatePaymentRequest = (item: SplitBillItem, member: Member) => {
    if (!item.upiId.trim()) {
      alert('Please enter your UPI ID in receiver settings first!');
      return;
    }
    const cleanNote = item.description || 'Split Bill';
    const payUrl = `upi://pay?pa=${item.upiId.trim()}&pn=${encodeURIComponent(item.receiverName)}&am=${member.share.toFixed(2)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
    const codeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payUrl)}`;
    
    setUpiUrl(payUrl);
    setQrUrl(codeUrl);
    setSelectedSplit(item);
  };

  const markAsSettled = async (splitId: string, memberId: string) => {
    const split = splits.find(s => s.id === splitId);
    if (!split) return;
    const nextMembers = split.members.map(m => m.id === memberId ? { ...m, status: 'settled' as const } : m);
    const allSettled = nextMembers.every(m => m.status === 'settled');
    const nextStatus = (allSettled ? 'completed' : 'pending') as 'pending' | 'completed';
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, members: nextMembers, status: nextStatus } : s));
    // Skip Supabase write for default example splits
    if (!DEFAULT_SPLITS.some(d => d.id === splitId)) {
      await db.updateSplitBill(splitId, { members: nextMembers, status: nextStatus });
    }
  };

  const handleCopyLink = () => {
    if (!upiUrl) return;
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (channel: 'whatsapp' | 'telegram') => {
    if (!upiUrl) return;
    const msg = `Hey! Here is the payment link for your share of "${selectedSplit?.name || 'Split Bill'}": ₹${(totalAmountNum / 3).toFixed(2)}. Pay here: ${upiUrl}`;
    const url = channel === 'whatsapp' 
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
      : `https://t.me/share/url?url=${encodeURIComponent(upiUrl)}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (viewMode === 'dashboard') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <div className="app-bar">
          <button onClick={() => navigate('/home')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Split Bills</h2>
          <div style={{ width: 40 }} />
        </div>

        <div onScroll={handleScroll} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          {/* Top Hero Card */}
          <div className="card bg-premium-gradient" style={{ padding: '24px', borderRadius: '24px', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(37,99,235,0.25)' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.12, transform: 'rotate(15deg)' }}>
              <Users size={140} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={20} className="text-blue-400" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Split Overview</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>You Receive</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399' }}>₹{balances.toReceive.toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Pending Requests</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B' }}>{balances.pendingRequests} Bills</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              onClick={() => setViewMode('history')}
              className="premium-glass-card flex-center"
              style={{ padding: '16px', border: '1px solid var(--color-border)', cursor: 'pointer', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <FileText size={18} className="text-emerald-500" /> Split History
            </button>
            <button 
              onClick={() => setViewMode('analytics')}
              className="premium-glass-card flex-center"
              style={{ padding: '16px', border: '1px solid var(--color-border)', cursor: 'pointer', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <BarChart2 size={18} className="text-blue-500" /> Share Analytics
            </button>
          </div>

          {/* Active Splits */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Active Splits</h3>
            
            {splits.filter(s => s.status === 'pending').length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Users size={32} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>All Settled!</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>Create a new split to share dining, taxi, or grocery costs.</p>
                </div>
                <button 
                  onClick={() => setViewMode('create')}
                  className="btn-primary"
                  style={{ height: '40px', borderRadius: '20px', padding: '0 24px', fontSize: '0.8rem' }}
                >
                  Create Split
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {splits.filter(s => s.status === 'pending').map(s => (
                  <div key={s.id} className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="flex-between">
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{s.name}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Amount: ₹{s.amount.toLocaleString()}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Pending Settlement</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {s.members.filter(m => m.id !== 'you').map(m => (
                          <div key={m.id} className="flex-between" style={{ fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>{m.avatar}</span>
                              <span style={{ fontWeight: 600 }}>{m.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: m.status === 'settled' ? '#10B981' : 'var(--color-text-muted)', fontWeight: 700 }}>
                                ₹{m.share.toLocaleString()} {m.status === 'settled' ? '(Paid)' : ''}
                              </span>
                              {m.status !== 'settled' && (
                                <>
                                  <button 
                                    onClick={() => generatePaymentRequest(s, m)}
                                    style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Request
                                  </button>
                                  <button 
                                    onClick={() => markAsSettled(s.id, m.id)}
                                    style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#10B981', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Settle
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QR Code / Share Details Modal overlay */}
        {selectedSplit && qrUrl && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
            <div className="premium-glass-card animate-slide-in" style={{ width: '100%', padding: '24px', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="flex-between">
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Request Settlement</h4>
                <button onClick={() => setSelectedSplit(null)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                  <img src={qrUrl} alt="UPI QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Scan QR or Share link to pay</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-primary)', marginTop: '4px' }}>₹{(selectedSplit.amount / 3).toFixed(2)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                  <button 
                    onClick={handleCopyLink}
                    className="flex-center"
                    style={{ background: 'var(--color-border)', border: 'none', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', gap: '6px' }}
                  >
                    <Clipboard size={16} /> {copied ? 'Copied!' : 'Copy UPI Link'}
                  </button>
                  <button 
                    onClick={() => handleShare('whatsapp')}
                    className="flex-center"
                    style={{ background: '#25D366', border: 'none', borderRadius: '12px', padding: '12px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', gap: '6px' }}
                  >
                    <Share2 size={16} /> WhatsApp Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll FAB */}
        <button 
          onClick={() => setViewMode('create')}
          className="premium-fab"
          style={{
            transform: fabVisible ? 'scale(1) translateY(0)' : 'scale(0) translateY(40px)',
            opacity: fabVisible ? 1 : 0,
            pointerEvents: fabVisible ? 'auto' : 'none'
          }}
          aria-label="Create Split Bill"
        >
          <Plus size={28} />
        </button>
      </div>
    );
  }

  if (viewMode === 'create') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Create Split</h2>
          <button 
            type="button" 
            onClick={triggerOCR} 
            className="flex-center" 
            style={{ border: 'none', background: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
          >
            <Camera size={14} style={{ marginRight: '4px' }} /> {scanning ? 'Scanning...' : 'Scan (OCR)'}
          </button>
        </div>

        <form onSubmit={handleCreateSplit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
            
            {/* Bill Details */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Bill Details</h3>
              
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Bill Name</label>
                <input 
                  type="text" 
                  value={billName} 
                  onChange={e => setBillName(e.target.value)} 
                  placeholder="e.g. Starbucks, Weekend Cab" 
                  className="form-input" 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Amount (₹)</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="form-input" 
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Category</label>
                  <select 
                    className="form-input" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="food">🍔 Food & Dining</option>
                    <option value="travel">🚗 Travel & Taxi</option>
                    <option value="groceries">🛒 Groceries</option>
                    <option value="bills">⚡ Bills & Utilities</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Description / Notes</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Cab costs and snacks" 
                  className="form-input" 
                />
              </div>
            </div>

            {/* Split Method Segment Selector */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Split Method</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--color-border)', padding: '4px', borderRadius: '12px' }}>
                {(['equal', 'custom', 'percentage', 'shares'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      background: method === m ? 'var(--color-primary)' : 'none',
                      border: 'none',
                      color: method === m ? 'white' : 'var(--color-text-muted)',
                      borderRadius: '8px',
                      padding: '8px 2px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Friends Section */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Add Friends</h3>
              
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="text"
                  value={searchContact}
                  onChange={e => setSearchContact(e.target.value)}
                  placeholder="Search contacts..." 
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>

              {searchContact.trim() !== '' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-border)', borderRadius: '12px', padding: '8px' }}>
                  {RECENT_CONTACTS.filter(c => c.name.toLowerCase().includes(searchContact.toLowerCase())).map((c, i) => (
                    <div 
                      key={i} 
                      onClick={() => addFriend(c.name, c.upi, c.avatar)}
                      className="flex-between clickable" 
                      style={{ padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{c.avatar}</span>
                        <span>{c.name}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)' }}>+ Add</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {RECENT_CONTACTS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addFriend(c.name, c.upi, c.avatar)}
                    className="flex-center"
                    style={{ flexShrink: 0, background: 'rgba(37,99,235,0.06)', border: 'none', padding: '8px 12px', borderRadius: '16px', cursor: 'pointer', gap: '6px', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <span>{c.avatar}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Member Cards list */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Shares Breakdown</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {calculatedMembers.map((m) => (
                  <div key={m.id} className="flex-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>{m.avatar}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Equal method displays static amount */}
                      {method === 'equal' && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{m.share.toFixed(2)}</span>
                      )}

                      {/* Custom method allows amount inputs */}
                      {method === 'custom' && (
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem' }}>₹</span>
                          <input
                            type="number"
                            value={m.share || ''}
                            onChange={e => handleUpdateShare(m.id, Number(e.target.value) || 0)}
                            className="form-input"
                            style={{ width: '80px', paddingLeft: '16px', height: '32px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700 }}
                          />
                        </div>
                      )}

                      {/* Percentage method allows percent input */}
                      {method === 'percentage' && (
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem' }}>%</span>
                          <input
                            type="number"
                            value={m.percentage || ''}
                            onChange={e => handleUpdatePercentage(m.id, Number(e.target.value) || 0)}
                            className="form-input"
                            style={{ width: '80px', paddingRight: '16px', height: '32px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700 }}
                          />
                        </div>
                      )}

                      {/* Shares count input */}
                      {method === 'shares' && (
                        <input
                          type="number"
                          value={m.sharesCount || 1}
                          onChange={e => handleUpdateSharesCount(m.id, Number(e.target.value) || 1)}
                          className="form-input"
                          style={{ width: '60px', height: '32px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      )}

                      {m.id !== 'you' && (
                        <button 
                          type="button" 
                          onClick={() => removeFriend(m.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receiver Payment Settings */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0 }}>Payment Receiver</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Your UPI ID</label>
                  <input 
                    type="text" 
                    value={upiId} 
                    onChange={e => { setUpiId(e.target.value); localStorage.setItem('finova_saved_upi', e.target.value); }} 
                    placeholder="e.g. mobile@paytm" 
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Display Name</label>
                  <input 
                    type="text" 
                    value={receiverName} 
                    onChange={e => setReceiverName(e.target.value)} 
                    placeholder="Name" 
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', position: 'sticky', bottom: 0 }}>
            <button 
              type="button" 
              onClick={() => setViewMode('dashboard')}
              style={{ background: 'var(--color-border)', border: 'none', borderRadius: '16px', padding: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{ borderRadius: '16px', boxShadow: '0 4px 16px rgba(37,99,235,0.2)' }}
            >
              Create Split 🚀
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (viewMode === 'history') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Split History</h2>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {splits.map(s => (
              <div key={s.id} className="premium-card flex-between" style={{ padding: '16px 20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 700 }}>{s.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Date: {s.date} • Amount: ₹{s.amount}</span>
                </div>
                <div>
                  {s.status === 'completed' ? (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Settled</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'analytics') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        <div className="app-bar">
          <button onClick={() => setViewMode('dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2>Analytics</h2>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
          {/* Charts Card */}
          <div className="premium-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monthly Shared Amount</h3>
            
            {/* SVG Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '150px', paddingTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '24px', height: '50px', background: 'var(--color-primary)', borderRadius: '6px 6px 0 0' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Apr</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '24px', height: '90px', background: 'var(--color-primary)', borderRadius: '6px 6px 0 0' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>May</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '24px', height: '120px', background: 'var(--color-primary)', borderRadius: '6px 6px 0 0' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Jun</span>
              </div>
            </div>
          </div>

          {/* Friend Leaderboard */}
          <div className="premium-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Most Shared Friend</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-between">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span>👨‍💻</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Manikandan</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹4,000</span>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span>🧑</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Friend 1</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹1,600</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SplitBill;
