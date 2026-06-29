import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, QrCode, Share2, Clipboard, Users, Info } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  share: number;
}

const SplitBill: React.FC = () => {
  const navigate = useNavigate();
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [splitType, setSplitType] = useState<'equal' | 'unequal'>('equal');
  
  // UPI details
  const [upiId, setUpiId] = useState<string>(() => localStorage.getItem('finova_saved_upi') || '');
  const [receiverName, setReceiverName] = useState<string>(() => {
    const cachedUser = localStorage.getItem('finova_user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser).name || 'User';
      } catch { return 'Finova User'; }
    }
    return 'Finova User';
  });

  const [people, setPeople] = useState<Person[]>([
    { id: '1', name: 'You', share: 0 },
    { id: '2', name: 'Friend 1', share: 0 }
  ]);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [upiUrl, setUpiUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Recalculate shares when total amount, split type, or number of people changes
  useEffect(() => {
    const total = Number(totalAmount) || 0;
    if (splitType === 'equal') {
      const equalShare = Number((total / people.length).toFixed(2));
      setPeople(prev => prev.map(p => ({ ...p, share: equalShare })));
    }
  }, [totalAmount, splitType, people.length]);

  // Handle saving UPI ID to local storage
  const handleSaveUpi = (val: string) => {
    setUpiId(val);
    localStorage.setItem('finova_saved_upi', val);
  };

  const addPerson = () => {
    const nextId = (people.length + 1).toString();
    setPeople(prev => [...prev, { id: nextId, name: `Friend ${nextId}`, share: 0 }]);
  };

  const removePerson = (id: string) => {
    if (people.length <= 2) {
      alert('You need at least 2 people to split a bill!');
      return;
    }
    setPeople(prev => prev.filter(p => p.id !== id));
    if (selectedPerson?.id === id) {
      setSelectedPerson(null);
    }
  };

  const updatePersonName = (id: string, name: string) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const updatePersonShare = (id: string, share: number) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, share } : p));
  };

  const getSumOfShares = () => {
    return people.reduce((sum, p) => sum + p.share, 0);
  };

  const getRemainingAmount = () => {
    const total = Number(totalAmount) || 0;
    return Number((total - getSumOfShares()).toFixed(2));
  };

  const generatePaymentDetails = (person: Person) => {
    if (!upiId.trim()) {
      alert('Please enter your UPI ID first to generate a QR Code!');
      return;
    }
    
    // Create standard UPI Pay URL
    // Scheme: upi://pay?pa={UPI_ID}&pn={NAME}&am={AMOUNT}&cu=INR&tn={NOTE}
    const formattedAmt = person.share.toFixed(2);
    const cleanNote = description.trim() ? description.trim() : 'Split Bill';
    const cleanUpi = upiId.trim();
    const cleanName = receiverName.trim();

    const payUrl = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&am=${formattedAmt}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
    
    // Generate QR code URL using standard free API
    const codeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payUrl)}`;
    
    setUpiUrl(payUrl);
    setQrUrl(codeUrl);
    setSelectedPerson(person);
    setCopied(false);
  };

  const handleCopyLink = () => {
    if (!upiUrl) return;
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = (person: Person) => {
    if (!upiUrl) return;
    const msg = `Hey ${person.name}! Here is the payment link for my share of "${description || 'Split Bill'}": ₹${person.share.toLocaleString()}.\n\nPay here: ${upiUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const totalNum = Number(totalAmount) || 0;
  const remaining = getRemainingAmount();

  return (
    <div className="page-container pb-24">
      <header className="app-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="header-title">Split Bill</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="page-content" style={{ padding: '16px' }}>
        {/* Bill Entry Card */}
        <div className="card glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--accent)', marginBottom: '16px' }}>
            <Users size={24} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Enter Bill Details</h2>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Total Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-primary)' }}>₹</span>
              <input 
                type="number" 
                value={totalAmount === '0' ? '' : totalAmount} 
                onChange={e => setTotalAmount(e.target.value)} 
                placeholder="0.00" 
                className="form-input" 
                style={{ paddingLeft: '28px', fontSize: '1.25rem', fontWeight: 700 }}
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Description / Bill Name</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="e.g. Dinner, Rent, Groceries" 
              className="form-input" 
            />
          </div>

          {/* Tab Selector for Split Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
            <button 
              onClick={() => setSplitType('equal')}
              style={{
                background: splitType === 'equal' ? 'var(--accent)' : 'none',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Split Equally
            </button>
            <button 
              onClick={() => setSplitType('unequal')}
              style={{
                background: splitType === 'unequal' ? 'var(--accent)' : 'none',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Split Unequally
            </button>
          </div>
        </div>

        {/* UPI configuration card */}
        <div className="card glass-card" style={{ padding: '16px', marginBottom: '20px', border: !upiId ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            <Info size={16} className={!upiId ? 'text-amber-500' : 'text-blue-400'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Receiver Payment Settings</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Your UPI ID</label>
              <input 
                type="text" 
                value={upiId} 
                onChange={e => handleSaveUpi(e.target.value)} 
                placeholder="e.g. mobile@paytm" 
                className="form-input" 
                style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Your Display Name</label>
              <input 
                type="text" 
                value={receiverName} 
                onChange={e => setReceiverName(e.target.value)} 
                placeholder="Name" 
                className="form-input" 
                style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              />
            </div>
          </div>
        </div>

        {/* Split unequal warning */}
        {splitType === 'unequal' && (
          <div 
            className="flex-between" 
            style={{ 
              background: remaining === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${remaining === 0 ? '#22C55E' : '#F59E0B'}`,
              color: remaining === 0 ? '#22C55E' : '#F59E0B',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '16px'
            }}
          >
            <span>Remaining pool:</span>
            <span>{remaining === 0 ? '✓ Balanced' : `₹${remaining.toLocaleString()} remaining`}</span>
          </div>
        )}

        {/* Participants section */}
        <div style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 650 }}>Split Breakdown</h3>
            <button 
              onClick={addPerson}
              className="flex-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '6px 12px', color: 'var(--accent)', gap: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={14} /> Add Friend
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {people.map((person, index) => (
              <div 
                key={person.id}
                className="card list-item-card"
                style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex-between" style={{ gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: '1rem' }}>👤</span>
                    {person.name === 'You' ? (
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>You</span>
                    ) : (
                      <input 
                        type="text" 
                        value={person.name} 
                        onChange={e => updatePersonName(person.id, e.target.value)}
                        className="form-input"
                        style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}
                      />
                    )}
                  </div>
                  
                  <div className="flex-center" style={{ gap: '8px' }}>
                    {/* Share input / slider value display */}
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>₹</span>
                      <input 
                        type="number" 
                        value={person.share === 0 ? '' : person.share}
                        onChange={e => updatePersonShare(person.id, Number(e.target.value) || 0)}
                        disabled={splitType === 'equal'}
                        className="form-input"
                        placeholder="0.00"
                        style={{ width: '80px', padding: '4px 8px 4px 18px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}
                      />
                    </div>

                    {/* Generate QR link (only for other friends, not yourself) */}
                    {person.name !== 'You' && person.share > 0 && (
                      <button 
                        onClick={() => generatePaymentDetails(person)}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '6px', color: 'white', cursor: 'pointer' }}
                        aria-label="Generate QR"
                      >
                        <QrCode size={16} />
                      </button>
                    )}

                    {/* Delete button (except for index 0 (you) and index 1 (need at least 2 people)) */}
                    {person.name !== 'You' && index > 1 && (
                      <button 
                        onClick={() => removePerson(person.id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        aria-label="Remove person"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Range Slider for unequal splits */}
                {splitType === 'unequal' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="range"
                      min="0"
                      max={totalNum || 100}
                      value={person.share}
                      onChange={e => updatePersonShare(person.id, Number(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* QR Payment Bottom Sheet Modal */}
        {selectedPerson && qrUrl && (
          <div className="card glass-card animate-slide-in" style={{ padding: '20px', border: '1px solid var(--accent)', marginTop: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Request Share: {selectedPerson.name}</h3>
              <button 
                onClick={() => setSelectedPerson(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {/* QR Image Frame with soft glow */}
              <div 
                style={{ 
                  background: 'white', 
                  padding: '12px', 
                  borderRadius: '16px', 
                  boxShadow: '0 0 20px rgba(37,99,235,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <img 
                  src={qrUrl} 
                  alt="UPI QR Code" 
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>₹{selectedPerson.share.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Scan using any UPI App (GPay, PhonePe, Paytm)</div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                <button 
                  onClick={handleCopyLink}
                  className="flex-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '12px', color: 'white', cursor: 'pointer', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <Clipboard size={16} /> {copied ? 'Copied!' : 'Copy UPI'}
                </button>
                <button 
                  onClick={() => handleWhatsAppShare(selectedPerson)}
                  className="flex-center"
                  style={{ background: '#25D366', border: 'none', borderRadius: '12px', padding: '12px', color: 'white', cursor: 'pointer', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <Share2 size={16} /> Share Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitBill;
