import React, { useState } from 'react';
import {
  User, DollarSign, HardDrive, Shield, Info, LogOut,
  ChevronRight, Download, Upload, Trash2, Palette, Bell, Grid, CreditCard, Plus, Heart,
  ArrowLeft, Pencil, Search, ArrowUpDown, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { signOut } from '../services/auth';
import * as db from '../services/db';
import { exportAllData, importAllData } from '../services/db';
import { CURRENCIES } from '../data/defaults';
import logoUrl from '../assets/logo.jpeg';
import { setPIN, clearPIN } from './PinLock';

type SettingsView = 'main' | 'profile' | 'currency' | 'backup' | 'security' | 'about' | 'categories' | 'accounts' | 'theme' | 'notifications';

const Settings: React.FC<{ onLogout: () => void }> = ({ onLogout: _onLogout }) => {
  const { user, settings } = useApp();
  const { subpage } = useParams<{ subpage: string }>();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const view = (subpage || 'main') as SettingsView;

  const handleLogout = async () => {
    await signOut();
    _onLogout();
  };

  const groups = [
    {
      title: 'Profile & Structure',
      items: [
        { id: 'profile',       icon: <User size={20} />,       label: 'My Profile',       sub: user?.name || 'View profile details', color: '#2563EB' },
        { id: 'categories',    icon: <Grid size={20} />,       label: 'Categories',       sub: 'Manage expense & income tags', color: '#EA580C' },
        { id: 'accounts',      icon: <CreditCard size={20} />, label: 'Accounts',         sub: 'Manage cash, bank & cards', color: '#16A34A' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'theme',         icon: <Palette size={20} />,    label: 'Theme selector',   sub: settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1), color: '#7C3AED' },
        { id: 'notifications', icon: <Bell size={20} />,       label: 'Notifications',    sub: 'Alerts & Reminders settings', color: '#EF4444' },
        { id: 'currency',      icon: <DollarSign size={20} />,  label: 'Currency',         sub: `${settings.currency} (${settings.currencySymbol})`, color: '#22C55E' },
      ]
    },
    {
      title: 'Security & Backup',
      items: [
        { id: 'security',      icon: <Shield size={20} />,      label: 'Security Lock',    sub: settings.pinEnabled ? 'PIN lock enabled' : 'No lock', color: '#0F766E' },
        { id: 'backup',        icon: <HardDrive size={20} />,   label: 'Backup & Restore', sub: 'Export or restore data', color: '#F59E0B' },
      ]
    },
    {
      title: 'Application',
      items: [
        { id: 'about',         icon: <Info size={20} />,        label: 'About FINOVA',     sub: 'Version 1.0.0', color: '#0891B2' },
      ]
    }
  ];

  if (view !== 'main') {
    return <SubView view={view} onBack={() => navigate('/settings')} />;
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div className="app-bar" style={{ display: 'flex', alignItems: 'center', boxShadow: 'none' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>Settings</h2>
      </div>

      {/* Main Settings Body */}
      <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {groups.map(g => (
          <div key={g.title}>
            <h3 style={{
              margin: '0 0 8px 4px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>{g.title}</h3>
            
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {g.items.map((item, i) => (
                <button
                  key={item.id}
                  id={`settings-${item.id}`}
                  onClick={() => navigate(`/settings/${item.id}`)}
                  style={{
                    width: '100%',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: i < g.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    background: `${item.color}15`,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>{item.icon}</div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.1 }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{item.sub}</div>
                  </div>
                  
                  <ChevronRight size={16} color="var(--color-border)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out Button */}
        <button
          id="logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '16px',
            border: '1.5px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.06)',
            color: '#EF4444',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 12px rgba(239,68,68,0.05)',
            marginTop: '8px',
          }}
        >
          <LogOut size={18} /> Sign Out
        </button>

        {/* Footer info */}
        <div style={{
          textAlign: 'center',
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            <span>Made with</span>
            <Heart size={12} fill="#EF4444" color="#EF4444" style={{ display: 'inline' }} />
            <span>in India</span>
          </div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Version 1.0.0</span>
        </div>
      </div>

      {/* Logout Dialog */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text)' }}>Sign Out?</h3>
            <p style={{ margin: '0 0 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Your data will remain safely stored on this device.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button id="confirm-logout-btn" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #EF4444, #DC2626)' }} onClick={handleLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BackHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="app-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'none' }}>
    <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ArrowLeft size={22} />
    </button>
    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>{title}</h2>
  </div>
);

interface CategoriesViewProps {
  onBack: () => void;
  categories: any[];
  refresh: () => void;
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ onBack, categories, refresh }) => {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('🍕');
  const [color, setColor] = useState('#EA580C');

  // Search & Sorting
  const [search, setSearch] = useState('');
  const [sortByAlpha, setSortByAlpha] = useState(false);

  // Hidden categories local state
  const [hiddenCats, setHiddenCats] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_categories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleHideCategory = (id: string) => {
    const next = hiddenCats.includes(id)
      ? hiddenCats.filter(x => x !== id)
      : [...hiddenCats, id];
    setHiddenCats(next);
    localStorage.setItem('finova_hidden_categories', JSON.stringify(next));
    refresh();
  };

  const handleSave = () => {
    if (!name.trim()) return;

    // Duplicate Prevention
    const isDuplicate = categories.some(
      (c: any) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== editId
    );
    if (isDuplicate) {
      alert('A category with this name already exists. Please choose a unique name.');
      return;
    }

    if (formMode === 'add') {
      db.addCategory({ name: name.trim(), type, icon, color });
    } else if (formMode === 'edit' && editId) {
      const allCats = db.getCategories();
      const idx = allCats.findIndex((c: any) => c.id === editId);
      if (idx !== -1) {
        allCats[idx] = { ...allCats[idx], name: name.trim(), type, icon, color };
        localStorage.setItem('finova_categories', JSON.stringify(allCats));
      }
    }

    setName('');
    setFormMode('list');
    setEditId(null);
    refresh();
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setName(c.name);
    setType(c.type === 'both' ? 'expense' : c.type);
    setIcon(c.icon);
    setColor(c.color);
    setFormMode('edit');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this category? All associated transactions will remain.')) {
      db.deleteCategory(id);
      refresh();
    }
  };

  const startAdd = () => {
    setName('');
    setType('expense');
    setIcon('🍕');
    setColor('#EA580C');
    setFormMode('add');
  };

  const processedCats = React.useMemo(() => {
    let result = [...categories];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    if (sortByAlpha) {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [categories, search, sortByAlpha]);

  // If in Form View, render dedicated edit page overlay
  if (formMode === 'add' || formMode === 'edit') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => setFormMode('list')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {formMode === 'edit' ? 'Edit Category' : 'New Category'}
          </h2>
          <button className="btn-primary" style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', boxShadow: 'none' }} onClick={handleSave}>
            Save
          </button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Category Name</label>
              <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Subscriptions" />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      flex: 1,
                      height: '44px',
                      borderRadius: '22px',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      border: '1.5px solid var(--color-border)',
                      background: type === t ? 'var(--color-primary)' : 'var(--color-card)',
                      color: type === t ? '#fff' : 'var(--color-text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'expense' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto', padding: '8px', background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                {['🍕', '✈️', '🛍️', '📚', '🏥', '⚡', '🎮', '⛽', '🏠', '🍱', '✏️', '🚌', '💰', '💼', '📈', '💻', '📦', '🔑', '🎨', '👔', '🍿', '🛍️', '🛒', '🚲', '🚕', '💅', '🏋️', '🐶', '🎁', '🔌'].map(emoji => (
                  <button key={emoji} onClick={() => setIcon(emoji)} style={{ fontSize: '1.5rem', width: '40px', height: '40px', background: icon === emoji ? 'rgba(37,99,235,0.12)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Theme Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#EA580C', '#4F46E5', '#DB2777', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0F766E', '#1D4ED8', '#475569'].map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: color === c ? '3px solid var(--color-text)' : 'none', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer save button */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormMode('list')}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Category</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Categories" onBack={onBack} />
      
      <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search & Sort Row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search categories…"
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
            />
          </div>
          <button
            onClick={() => setSortByAlpha(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
              background: sortByAlpha ? 'rgba(37,99,235,0.1)' : 'var(--color-card)',
              border: '1.5px solid var(--color-border)', borderRadius: '12px', cursor: 'pointer',
              color: sortByAlpha ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0
            }}
          >
            <ArrowUpDown size={18} />
          </button>
        </div>

        {/* Categories List Cards */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {processedCats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
              No categories found
            </div>
          ) : (
            processedCats.map((c, idx) => {
              const isHidden = hiddenCats.includes(c.id);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: idx < processedCats.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: isHidden ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0 }}>
                      {c.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {c.name} {isHidden && <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>(Hidden)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.625rem', color: c.type === 'income' ? '#22C55E' : '#EF4444', background: c.type === 'income' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {c.type === 'both' ? 'Both' : c.type}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {c.isCustom ? 'Custom' : 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Hiding Toggle for all (including System) */}
                    <button
                      onClick={() => toggleHideCategory(c.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }}
                      title={isHidden ? 'Show Category' : 'Hide Category'}
                    >
                      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    {c.isCustom && (
                      <>
                        <button onClick={() => startEdit(c)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '6px' }}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB to Add Custom Category */}
      <button className="fab" onClick={startAdd} aria-label="Add Category" style={{ bottom: '96px' }}>
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

interface AccountsViewProps {
  onBack: () => void;
  accounts: any[];
  refresh: () => void;
}

const AccountsView: React.FC<AccountsViewProps> = ({ onBack, accounts, refresh }) => {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<'cash' | 'bank' | 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'custom'>('bank');
  const [icon, setIcon] = useState('🏦');
  const [color, setColor] = useState('#2563EB');

  // Search
  const [search, setSearch] = useState('');

  // Hidden accounts local state
  const [hiddenAccs, setHiddenAccs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleHideAccount = (id: string) => {
    const next = hiddenAccs.includes(id)
      ? hiddenAccs.filter(x => x !== id)
      : [...hiddenAccs, id];
    setHiddenAccs(next);
    localStorage.setItem('finova_hidden_accounts', JSON.stringify(next));
    refresh();
  };

  const handleSave = () => {
    if (!name.trim()) return;

    // Duplicate Prevention
    const isDuplicate = accounts.some(
      (a: any) => a.name.toLowerCase() === name.trim().toLowerCase() && a.id !== editId
    );
    if (isDuplicate) {
      alert('An account with this name already exists. Please choose a unique name.');
      return;
    }

    if (formMode === 'add') {
      db.addAccount({
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        icon,
        color
      });
    } else if (formMode === 'edit' && editId) {
      const allAccs = db.getAccounts();
      const idx = allAccs.findIndex((a: any) => a.id === editId);
      if (idx !== -1) {
        allAccs[idx] = {
          ...allAccs[idx],
          name: name.trim(),
          type,
          balance: parseFloat(balance) || 0,
          icon,
          color
        };
        localStorage.setItem('finova_accounts', JSON.stringify(allAccs));
      }
    }

    setName('');
    setBalance('');
    setFormMode('list');
    setEditId(null);
    refresh();
  };

  const startEdit = (a: any) => {
    setEditId(a.id);
    setName(a.name);
    setBalance(String(a.balance));
    setType(a.type);
    setIcon(a.icon);
    setColor(a.color);
    setFormMode('edit');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this account? Associated transactions will remain.')) {
      db.deleteAccount(id);
      refresh();
    }
  };

  const startAdd = () => {
    setName('');
    setBalance('');
    setType('bank');
    setIcon('🏦');
    setColor('#2563EB');
    setFormMode('add');
  };

  const processedAccs = React.useMemo(() => {
    let result = [...accounts];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }
    return result;
  }, [accounts, search]);

  // If in Form View, render dedicated edit page overlay
  if (formMode === 'add' || formMode === 'edit') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
        {/* App Bar */}
        <div className="app-bar">
          <button onClick={() => setFormMode('list')} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {formMode === 'edit' ? 'Edit Account' : 'New Account'}
          </h2>
          <button className="btn-primary" style={{ height: '36px', padding: '0 16px', borderRadius: '18px', fontSize: '0.8125rem', boxShadow: 'none' }} onClick={handleSave}>
            Save
          </button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Account Name</label>
              <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDFC Bank" />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Current Balance (₹)</label>
              <input type="number" className="input-field" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Account Type</label>
              <div style={{ position: 'relative' }}>
                <select className="input-field" value={type} onChange={e => setType(e.target.value as any)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="upi">UPI Wallet</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="custom">Other / Custom</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px', background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                {['💵', '🏦', '💳', '📱', '💼', '🐖', '🪙', '🔑', '💰', '📉'].map(emoji => (
                  <button key={emoji} onClick={() => setIcon(emoji)} style={{ fontSize: '1.5rem', width: '40px', height: '40px', background: icon === emoji ? 'rgba(37,99,235,0.12)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Theme Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#2563EB', '#16A34A', '#DC2626', '#EA580C', '#7C3AED', '#0891B2', '#475569'].map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: color === c ? '3px solid var(--color-text)' : 'none', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer save button */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormMode('list')}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Accounts" onBack={onBack} />
      
      <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search Row */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search accounts…"
            className="input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
          />
        </div>

        {/* Accounts List Cards */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {processedAccs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
              No accounts found
            </div>
          ) : (
            processedAccs.map((a, idx) => {
              const isHidden = hiddenAccs.includes(a.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: idx < processedAccs.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: isHidden ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0 }}>
                      {a.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {a.name} {isHidden && <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>(Hidden)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          ₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {a.isCustom ? 'Custom' : 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleHideAccount(a.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }}
                      title={isHidden ? 'Show Account' : 'Hide Account'}
                    >
                      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    {a.isCustom ? (
                      <>
                        <button onClick={() => startEdit(a)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '6px' }}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(a)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }} title="Edit Balance">
                        <Pencil size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB to Add Custom Account */}
      <button className="fab" onClick={startAdd} aria-label="Add Account" style={{ bottom: '96px' }}>
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface NotificationsViewProps {
  onBack: () => void;
  settings: any;
  saveSettings: (s: any) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack, settings, saveSettings }) => {
  const [budgetAlerts, setBudgetAlerts] = useState(settings.budgetAlertsEnabled);
  const [dailyReminder, setDailyReminder] = useState(settings.dailyReminderEnabled);

  const toggleBudget = () => {
    const val = !budgetAlerts;
    setBudgetAlerts(val);
    saveSettings({ ...settings, budgetAlertsEnabled: val });
  };

  const toggleDaily = async () => {
    const val = !dailyReminder;
    if (val) {
      const { requestNotificationPermission } = await import('../services/notifications');
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert('Notification permission was blocked. Please enable it in browser settings.');
        return;
      }
    }
    setDailyReminder(val);
    saveSettings({ ...settings, dailyReminderEnabled: val });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Notifications" onBack={onBack} />
      <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>Budget Limit Alerts</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Notify when category spends reach 80% and 100%</div>
            </div>
            <input type="checkbox" checked={budgetAlerts} onChange={toggleBudget} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>Daily Summary & Reminders</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Remind to log transactions and goal progress</div>
            </div>
            <input type="checkbox" checked={dailyReminder} onChange={toggleDaily} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SecurityViewProps {
  onBack: () => void;
  settings: any;
  saveSettings: (s: any) => void;
}

const SecurityView: React.FC<SecurityViewProps> = ({ onBack, settings, saveSettings }) => {
  const [pinEnabled, setPinEnabled] = useState(settings.pinEnabled);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [step, setStep] = useState<'toggle' | 'setup_pin' | 'confirm_pin'>('toggle');

  const handleToggle = () => {
    if (pinEnabled) {
      clearPIN();
      setPinEnabled(false);
      saveSettings({ ...settings, pinEnabled: false });
      alert('PIN Lock disabled successfully.');
    } else {
      setStep('setup_pin');
    }
  };

  const handleSetup = () => {
    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      alert('PIN must be 4 digits.');
      return;
    }
    setStep('confirm_pin');
  };

  const handleConfirm = () => {
    if (pinConfirm !== pinInput) {
      alert('PINs do not match. Restarting setup.');
      setStep('setup_pin');
      setPinInput('');
      setPinConfirm('');
      return;
    }
    setPIN(pinConfirm);
    setPinEnabled(true);
    saveSettings({ ...settings, pinEnabled: true });
    setStep('toggle');
    setPinInput('');
    setPinConfirm('');
    alert('PIN Lock enabled successfully!');
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="App Security" onBack={onBack} />
      <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {step === 'toggle' && (
          <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>PIN Lock Screen</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Ask for a 4-digit PIN when launching FINOVA</div>
            </div>
            <button className={pinEnabled ? 'btn-ghost' : 'btn-primary'} style={{ padding: '8px 16px', fontSize: '0.8125rem' }} onClick={handleToggle}>
              {pinEnabled ? 'Disable PIN' : 'Enable PIN'}
            </button>
          </div>
        )}

        {step === 'setup_pin' && (
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Set 4-Digit PIN</h4>
            <input type="password" maxLength={4} className="input-field" placeholder="Enter new PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('toggle')}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSetup}>Next</button>
            </div>
          </div>
        )}

        {step === 'confirm_pin' && (
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Confirm PIN</h4>
            <input type="password" maxLength={4} className="input-field" placeholder="Confirm PIN" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('setup_pin')}>Back</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>Enable PIN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SubView: React.FC<{ view: SettingsView; onBack: () => void }> = ({ view, onBack }) => {
  const { user, settings, saveSettings, refresh, categories, accounts } = useApp();

  if (view === 'currency') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Currency" onBack={onBack} />
        <div style={{ padding: '20px 16px 120px' }}>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {CURRENCIES.map((c, i) => (
              <button key={c.code} onClick={() => saveSettings({ ...settings, currency: c.code, currencySymbol: c.symbol })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', border: 'none', background: settings.currency === c.code ? 'rgba(37,99,235,0.05)' : 'transparent',
                  cursor: 'pointer', borderBottom: i < CURRENCIES.length - 1 ? '1px solid var(--color-border)' : 'none',
                  textAlign: 'left',
                }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', width: '2.5rem', color: 'var(--color-primary)' }}>{c.symbol}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{c.code}</div>
                </div>
                {settings.currency === c.code && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'backup') {
    const handleExport = () => {
      const data = exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `finova-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target?.result as string);
            importAllData(data);
            refresh();
            alert('Data restored successfully!');
          } catch {
            alert('Invalid backup file.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };

    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Backup & Restore" onBack={onBack} />
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <img src={logoUrl} alt="FINOVA" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'contain' }} />
            <p style={{ margin: '12px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.4 }}>Keep your data safe by exporting regular backups.</p>
          </div>

          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {[
              { id: 'export-backup', icon: <Download size={20} />, label: 'Export Backup', sub: 'Save data as JSON file', color: '#22C55E', action: handleExport },
              { id: 'import-backup', icon: <Upload size={20} />,   label: 'Restore Backup', sub: 'Import from JSON file', color: '#2563EB', action: handleImport },
            ].map((item, i) => (
              <button key={item.id} id={item.id} onClick={item.action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: i === 0 ? '1px solid var(--color-border)' : 'none', textAlign: 'left' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.875rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '16px', border: '1.5px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Trash2 size={20} color="#EF4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '4px', fontSize: '0.875rem' }}>Clear All Data</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 600, lineHeight: 1.4 }}>
                  This will permanently delete all transactions, budgets, and goals. Export a backup first!
                </div>
                <button id="clear-data-btn" onClick={() => {
                  if (window.confirm('Are you absolutely sure? This cannot be undone.')) {
                    ['finova_transactions','finova_budgets','finova_goals','finova_accounts','finova_categories'].forEach(k => localStorage.removeItem(k));
                    refresh();
                    alert('All data cleared.');
                  }
                }} style={{
                  padding: '8px 16px', borderRadius: '12px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem',
                }}>
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'about') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="About FINOVA" onBack={onBack} />
        <div style={{ padding: '30px 16px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <img src={logoUrl} alt="FINOVA" style={{ width: '96px', height: '96px', borderRadius: '24px', objectFit: 'contain', boxShadow: 'var(--shadow-elevated)' }} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>FINOVA</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9375rem' }}>Track Money. Build Better Habits.</p>
          </div>

          <div className="card" style={{ width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['Version', '1.0.0'],
              ['Platform', 'Progressive Web App'],
              ['Data Storage', 'Local & Secure'],
              ['Pricing', 'Free Forever'],
              ['Ads', 'None. Ever.'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6, fontWeight: 600 }}>
            FINOVA is a personal finance management app built to help you track money and build better financial habits. Your data never leaves your device.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Profile" onBack={onBack} />
        <div style={{ padding: '30px 16px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-border)' }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '2rem' }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
            }
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-text)' }}>{user?.name}</div>
            <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600, fontSize: '0.875rem' }}>{user?.email}</div>
          </div>
          <div className="card" style={{ width: '100%', padding: '16px' }}>
            {[['Name', user?.name || ''], ['Email', user?.email || ''], ['Auth', 'Google Account']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>{k}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.875rem' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'categories') {
    return <CategoriesView onBack={onBack} categories={categories} refresh={refresh} />;
  }

  if (view === 'accounts') {
    return <AccountsView onBack={onBack} accounts={accounts} refresh={refresh} />;
  }

  if (view === 'theme') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Theme Selector" onBack={onBack} />
        <div style={{ padding: '20px 16px 120px' }}>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {(['light', 'dark', 'system'] as const).map((t, i) => (
              <button key={t} onClick={() => saveSettings({ ...settings, theme: t })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', border: 'none', background: settings.theme === t ? 'rgba(37,99,235,0.05)' : 'transparent',
                  cursor: 'pointer', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                  textAlign: 'left',
                }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize' }}>{t} Mode</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {t === 'light' && 'Always light layout'}
                    {t === 'dark' && 'Always sleek dark theme'}
                    {t === 'system' && 'Match device system preferences'}
                  </div>
                </div>
                {settings.theme === t && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'notifications') {
    return <NotificationsView onBack={onBack} settings={settings} saveSettings={saveSettings} />;
  }

  if (view === 'security') {
    return <SecurityView onBack={onBack} settings={settings} saveSettings={saveSettings} />;
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Settings Subview" onBack={onBack} />
      <div style={{ padding: '30px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Subview not found</p>
      </div>
    </div>
  );
};

export default Settings;
