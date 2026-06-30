import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Share2, Clipboard, Users, 
  ArrowLeft, FileText, Camera, 
  Search, BarChart2, Trash2
} from 'lucide-react';
import * as db from '../services/db';
import type { SplitBillItem, Member } from '../types';
import { getAuth } from 'firebase/auth';
import { app } from '../services/firebase';

const RECENT_CONTACTS = [
  { name: 'Manikandan', upi: 'mani@paytm', avatar: '👨‍💻' },
  { name: 'Prabhu', upi: 'prabhu@ybl', avatar: '👨' },
  { name: 'Alex', upi: 'alex@okaxis', avatar: '🧑' },
  { name: 'Sophia', upi: 'sophia@okicici', avatar: '👧' }
];

const SplitBill: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'dashboard' | 'create' | 'history' | 'analytics'>('dashboard');
  const [splits, setSplits] = useState<SplitBillItem[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<SplitBillItem | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Creation Form State
  const [billName, setBillName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('food');
  const [method, setMethod] = useState<'equal' | 'custom' | 'percentage' | 'shares'>('equal');
  const [selectedContacts, setSelectedContacts] = useState<Member[]>([
    { id: 'you', name: 'You', avatar: '👤', share: 0, status: 'settled' }
  ]);
  const [searchContact, setSearchContact] = useState('');
  const [upiId, setUpiId] = useState(() => db.getSettings().upiId || '');
  const [receiverName, setReceiverName] = useState('');

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [upiUrl, setUpiUrl] = useState('');

  useEffect(() => {
    // Set receiver name from current logged-in user name
    const auth = getAuth(app);
    if (auth.currentUser) {
      setReceiverName(auth.currentUser.displayName || 'Me');
    }
    loadData();
    db.registerWriteListener(loadData);
  }, []);

  // Lock body scrolling when QR modal is open to prevent white space issues
  useEffect(() => {
    if (selectedSplit) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedSplit]);

  const loadData = () => {
    // Only loads user-owned splits from Supabase (no mock data fallback!)
    setSplits(db.getSplitBills());
    const settings = db.getSettings();
    if (settings.upiId) {
      setUpiId(settings.upiId);
    }
  };

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

  const analyticsData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
      return {
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthNames[d.getMonth()],
        amount: 0
      };
    });

    splits.forEach(s => {
      if (!s.date) return;
      const parts = s.date.split('-');
      if (parts.length < 2) return;
      const key = `${parts[0]}-${parts[1]}`; // YYYY-MM
      
      const match = last3Months.find(m => m.monthKey === key);
      if (match) {
        match.amount += s.amount;
      }
    });

    const maxAmount = Math.max(...last3Months.map(m => m.amount), 100);

    const contactMap: Record<string, { name: string; avatar: string; amount: number }> = {};
    splits.forEach(s => {
      s.members.forEach(m => {
        if (m.id === 'you') return;
        if (!contactMap[m.name]) {
          contactMap[m.name] = { name: m.name, avatar: m.avatar || '👤', amount: 0 };
        }
        contactMap[m.name].amount += m.share;
      });
    });

    const topContacts = Object.values(contactMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      monthlyData: last3Months.map(m => ({
        ...m,
        height: Math.max(10, Math.round((m.amount / maxAmount) * 120))
      })),
      topContacts
    };
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

    await db.addSplitBill(payload);
    loadData();
    
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
    setSelectedMember(member);
  };

  const markAsSettled = async (splitId: string, memberId: string) => {
    const split = splits.find(s => s.id === splitId);
    if (!split) return;
    const nextMembers = split.members.map(m => m.id === memberId ? { ...m, status: 'settled' as const } : m);
    const allSettled = nextMembers.every(m => m.status === 'settled');
    const nextStatus = (allSettled ? 'completed' : 'pending') as 'pending' | 'completed';
    
    await db.updateSplitBill(splitId, { members: nextMembers, status: nextStatus });
    loadData();
  };

  const handleDeleteSplit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this split bill?')) {
      try {
        await db.deleteSplitBill(id);
        loadData();
      } catch (err) {
        console.error('Failed to delete split bill:', err);
      }
    }
  };

  const handleCopyLink = () => {
    if (!upiUrl) return;
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (channel: 'whatsapp' | 'telegram') => {
    if (!upiUrl || !selectedSplit || !selectedMember) return;
    const msg = `Hey ${selectedMember.name}! Here is the UPI payment request for your share of "${selectedSplit.name}": ₹${selectedMember.share.toFixed(2)}. Click to pay: ${upiUrl}`;
    const url = channel === 'whatsapp' 
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
      : `https://t.me/share/url?url=${encodeURIComponent(upiUrl)}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%', paddingBottom: '120px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Sticky App Bar */}
      <div className="app-bar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => {
          if (viewMode === 'dashboard') navigate('/home');
          else setViewMode('dashboard');
        }} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
          {viewMode === 'dashboard' ? 'Split Bills' : viewMode === 'create' ? 'Create Split' : viewMode === 'history' ? 'Split History' : 'Analytics'}
        </h2>
        {viewMode === 'dashboard' ? (
          <button 
            onClick={() => setViewMode('create')} 
            style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            title="Create Split Bill"
          >
            <Plus size={22} />
          </button>
        ) : (
          <div style={{ width: '32px' }} />
        )}
      </div>

      {/* ─── Dashboard View ─── */}
      {viewMode === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Overview Hero Card */}
          <div className="card bg-premium-gradient" style={{ margin: '16px 16px 0', padding: '20px', borderRadius: '24px', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.12, transform: 'rotate(15deg)' }}>
              <Users size={140} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={20} className="text-blue-400" />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Split Overview</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>You Receive</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>₹{balances.toReceive.toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>Pending Requests</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>{balances.pendingRequests} Bills</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Navigation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '0 16px' }}>
            <button onClick={() => setViewMode('history')} className="card clickable" style={{ padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>
              <FileText size={18} className="text-emerald-500" /> Split History
            </button>
            <button onClick={() => setViewMode('analytics')} className="card clickable" style={{ padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>
              <BarChart2 size={18} className="text-blue-500" /> Share Analytics
            </button>
          </div>

          {/* Active Split Bills List */}
          <div style={{ margin: '0 16px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Active Splits</h3>
            
            {splits.filter(s => s.status === 'pending').length === 0 ? (
              <div className="card text-center" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderRadius: '24px' }}>
                <span style={{ fontSize: '3.5rem' }}>🛒</span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>No Split Bills Yet</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>Split bills with friends and family to easily track shared expenses.</p>
                </div>
                <button 
                  onClick={() => setViewMode('create')}
                  className="btn-primary"
                  style={{ height: '42px', borderRadius: '21px', padding: '0 24px', fontSize: '0.8125rem', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                >
                  Create Split Bill
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {splits.filter(s => s.status === 'pending').map(s => (
                  <div key={s.id} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{s.name}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Date: {s.date} • Total: ₹{s.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Pending</span>
                        <button 
                          onClick={(e) => handleDeleteSplit(s.id, e)} 
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          title="Delete Split"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {s.members.filter(m => m.id !== 'you').map(m => (
                          <div key={m.id} className="flex-between" style={{ fontSize: '0.8rem', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.25rem' }}>{m.avatar}</span>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{m.name}</div>
                                <div style={{ fontSize: '0.65rem', color: m.status === 'settled' ? '#10B981' : 'var(--color-text-muted)', fontWeight: 600 }}>
                                  {m.status === 'settled' ? 'Paid' : 'Pending payment'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <span style={{ color: m.status === 'settled' ? '#10B981' : 'var(--color-text)', fontWeight: 800 }}>
                                ₹{m.share.toFixed(2)}
                              </span>
                              {m.status !== 'settled' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={() => generatePaymentRequest(s, m)}
                                    style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Request
                                  </button>
                                  <button 
                                    onClick={() => markAsSettled(s.id, m.id)}
                                    style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#10B981', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Settle
                                  </button>
                                </div>
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
      )}

      {/* ─── Create Split Bill Form View ─── */}
      {viewMode === 'create' && (
        <form onSubmit={handleCreateSplit} style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Step 1: Bill Specifications</h3>
              <button 
                type="button" 
                onClick={triggerOCR} 
                className="flex-center" 
                style={{ border: 'none', background: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
              >
                <Camera size={14} style={{ marginRight: '4px' }} /> {scanning ? 'Scanning...' : 'Scan Receipt'}
              </button>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Bill Name</label>
              <input type="text" value={billName} onChange={e => setBillName(e.target.value)} placeholder="e.g. Lunch with team" className="input-field" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Total Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input-field" required min="1" />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Category</label>
                <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ height: '44px' }}>
                  <option value="food">🍔 Food & Dining</option>
                  <option value="travel">🚗 Travel & Taxi</option>
                  <option value="groceries">🛒 Groceries</option>
                  <option value="bills">⚡ Bills & Utilities</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Bill Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required style={{ height: '44px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Description / Notes</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Starbucks drinks" className="input-field" style={{ height: '44px' }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Step 2: Add Friends & Splits</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--color-border)', padding: '4px', borderRadius: '12px', marginBottom: '8px' }}>
              {(['equal', 'custom', 'percentage', 'shares'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    background: method === m ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    color: method === m ? 'white' : 'var(--color-text-muted)',
                    borderRadius: '8px',
                    padding: '8px 2px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Friends Search / Selection Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="text"
                  value={searchContact}
                  onChange={e => setSearchContact(e.target.value)}
                  placeholder="Search contact templates..." 
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                />
              </div>

              {searchContact.trim() !== '' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--color-bg)', borderRadius: '12px', padding: '8px', border: '1px solid var(--color-border)' }}>
                  {RECENT_CONTACTS.filter(c => c.name.toLowerCase().includes(searchContact.toLowerCase())).map((c, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => addFriend(c.name, c.upi, c.avatar)}
                      className="flex-between clickable" 
                      style={{ padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{c.avatar}</span>
                        <span>{c.name}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 800 }}>+ Add</span>
                    </div>
                  ))}
                  
                  {!RECENT_CONTACTS.some(c => c.name.toLowerCase() === searchContact.toLowerCase().trim()) && (
                    <div 
                      onClick={() => addFriend(searchContact.trim(), '', '👤')}
                      className="flex-between clickable" 
                      style={{ padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', marginTop: '4px' }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>👤</span>
                        <span>Add custom: "{searchContact.trim()}"</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', background: 'var(--color-primary)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontWeight: 800 }}>+ Create</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preset Chips */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {RECENT_CONTACTS.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addFriend(c.name, c.upi, c.avatar)}
                    style={{ flexShrink: 0, background: 'rgba(37,99,235,0.05)', border: 'none', padding: '8px 14px', borderRadius: '14px', cursor: 'pointer', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <span>{c.avatar}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Member list breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              {calculatedMembers.map((m) => (
                <div key={m.id} className="flex-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{m.avatar}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {method === 'equal' && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>₹{m.share.toFixed(2)}</span>
                    )}

                    {method === 'custom' && (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', fontWeight: 700 }}>₹</span>
                        <input
                          type="number"
                          value={m.share || ''}
                          onChange={e => handleUpdateShare(m.id, Number(e.target.value) || 0)}
                          className="input-field"
                          style={{ width: '80px', paddingLeft: '18px', height: '32px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800 }}
                        />
                      </div>
                    )}

                    {method === 'percentage' && (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', right: '8px', fontSize: '0.75rem', fontWeight: 700 }}>%</span>
                        <input
                          type="number"
                          value={m.percentage || ''}
                          onChange={e => handleUpdatePercentage(m.id, Number(e.target.value) || 0)}
                          className="input-field"
                          style={{ width: '80px', paddingRight: '18px', height: '32px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800 }}
                        />
                      </div>
                    )}

                    {method === 'shares' && (
                      <input
                        type="number"
                        value={m.sharesCount || 1}
                        onChange={e => handleUpdateSharesCount(m.id, Number(e.target.value) || 1)}
                        className="input-field"
                        style={{ width: '60px', height: '32px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800 }}
                      />
                    )}

                    {m.id !== 'you' && (
                      <button type="button" onClick={() => removeFriend(m.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Step 3: Preview & Receiver Settings</h3>

            <div style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.12)', padding: '16px', borderRadius: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>You Pay</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  ₹{(calculatedMembers.find(m => m.id === 'you')?.share || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>Others Pay (Total to receive)</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  ₹{calculatedMembers.filter(m => m.id !== 'you').reduce((sum, m) => sum + m.share, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Your UPI ID</label>
                <input 
                  type="text" 
                  value={upiId} 
                  onChange={e => { 
                    setUpiId(e.target.value); 
                    db.saveSettings({ ...db.getSettings(), upiId: e.target.value }).catch(err => console.error('Failed to save UPI settings:', err)); 
                  }} 
                  placeholder="e.g. mobile@paytm" 
                  className="input-field"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-muted)' }}>Display Name</label>
                <input 
                  type="text" 
                  value={receiverName} 
                  onChange={e => setReceiverName(e.target.value)} 
                  placeholder="Receiver Name" 
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => setViewMode('dashboard')} className="btn-ghost" style={{ flex: 1, height: '46px', borderRadius: '16px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '16px' }}>Generate Split 🚀</button>
          </div>
        </form>
      )}

      {/* ─── Split History View ─── */}
      {viewMode === 'history' && (
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {splits.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px 16px', color: 'var(--color-text-muted)', borderRadius: '24px' }}>
              <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.78rem' }}>No bills in history log.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {splits.map(s => (
                <div key={s.id} className="card flex-between" style={{ padding: '16px 20px', borderRadius: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800 }}>{s.name}</h4>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Date: {s.date} • Total: ₹{s.amount}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {s.status === 'completed' ? (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.08)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Settled</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Pending</span>
                    )}
                    <button 
                      onClick={(e) => handleDeleteSplit(s.id, e)} 
                      style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Delete Split"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Share Analytics View ─── */}
      {viewMode === 'analytics' && (
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '22px', borderRadius: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Shared Amount</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Total volume of split bills generated in the last 3 months.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '160px', paddingTop: '10px', maxWidth: '320px', margin: '0 auto' }}>
              {analyticsData.monthlyData.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text)' }}>₹{Math.round(m.amount).toLocaleString()}</span>
                  <div style={{ width: '36px', height: `${m.height}px`, background: 'linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-primary) 100%)', borderRadius: '8px 8px 0 0', transition: 'height 0.4s ease-out' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '22px', borderRadius: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Shared Contacts</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Your friends with the highest split transaction volume.</p>
            
            {analyticsData.topContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                No contact share data available yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {analyticsData.topContacts.map((c, idx) => (
                  <div key={idx} className="flex-between" style={{ paddingBottom: idx < analyticsData.topContacts.length - 1 ? '12px' : '0', borderBottom: idx < analyticsData.topContacts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.25rem' }}>{c.avatar}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Premium Modal Redesign: QR & Share Details overlay ─── */}
      {selectedSplit && selectedMember && qrUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.22s ease-out',
        }}>
          <div 
            className="card animate-scale-up" 
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              borderRadius: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card)',
            }}
          >
            {/* Header */}
            <div className="flex-between">
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Request Settlement</h4>
              <button 
                onClick={() => { setSelectedSplit(null); setSelectedMember(null); }} 
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* QR block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '24px', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <img src={qrUrl} alt="UPI QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
              </div>

              {/* Bill/Member Stats */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                  ₹{selectedMember.share.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '4px' }}>
                  {selectedSplit.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                  Payee: {selectedSplit.receiverName} ({selectedSplit.upiId})
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '4px' }}>
                <button 
                  onClick={handleCopyLink}
                  className="btn-ghost flex-center"
                  style={{ borderRadius: '14px', height: '44px', gap: '8px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  <Clipboard size={16} /> {copied ? 'Link Copied!' : 'Copy Payment Link'}
                </button>
                <button 
                  onClick={() => handleShare('whatsapp')}
                  className="flex-center"
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: '14px', height: '44px', gap: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', width: '100%' }}
                >
                  <Share2 size={16} /> Share via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on Dashboard */}
      {viewMode === 'dashboard' && (
        <button 
          onClick={() => setViewMode('create')}
          className="fab"
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '20px',
            zIndex: 50
          }}
          aria-label="Create Split Bill"
        >
          <Plus size={28} />
        </button>
      )}

    </div>
  );
};

export default SplitBill;
