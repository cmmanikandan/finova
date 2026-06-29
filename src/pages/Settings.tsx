import React, { useState, useEffect, useMemo } from 'react';
import {
  User, DollarSign, HardDrive, Shield, Info, LogOut,
  ChevronRight, Download, Upload, Trash2, Palette, Bell, Grid, CreditCard, Plus, Heart,
  ArrowLeft, Pencil, Search, ArrowUpDown, Eye, EyeOff, ChevronDown, RefreshCw, Clock
} from 'lucide-react';
import type { RecurringTransaction } from '../types';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { signOut } from '../services/auth';
import * as db from '../services/db';
import { exportAllData, importAllData } from '../services/db';
import { CURRENCIES } from '../data/defaults';
import logoUrl from '../assets/logo.jpeg';
import { setPIN, clearPIN, simpleHash } from './PinLock';
import { BrandTitle } from '../components/BrandTitle';


type SettingsView = 'main' | 'profile' | 'currency' | 'backup' | 'security' | 'about' | 'categories' | 'accounts' | 'theme' | 'notifications' | 'recurring';

interface SettingsProps {
  onLogout: () => void;
  deferredPrompt?: any;
  isInstalled?: boolean;
  onInstallPWA?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onLogout: _onLogout, deferredPrompt, isInstalled, onInstallPWA }) => {
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
        { id: 'recurring',     icon: <RefreshCw size={20} />,  label: 'Recurring Bills',   sub: 'Manage automated repeats & schedules', color: '#8B5CF6' },
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
        ...(deferredPrompt && !isInstalled ? [{ id: 'install', icon: <Download size={20} />, label: 'Install App', sub: 'Install FINOVA on your home screen', color: '#10B981' }] : []),
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
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        {/* Profile Card */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div
            className="card-elevated"
            onClick={() => navigate('/settings/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              background: 'var(--color-card)',
              transition: 'background-color 0.15s',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border)', flexShrink: 0 }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '1.125rem',
                }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-text)' }}>{user?.name || 'User'}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{user?.email}</p>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" style={{ marginRight: '-4px' }} />
          </div>
        </div>
        {groups.map(g => (
          <div key={g.title}>
            <p className="section-header">{g.title}</p>
            <div className="list-group">
              {g.items.map((item) => (
                <button
                  key={item.id}
                  id={`settings-${item.id}`}
                  onClick={() => {
                    if (item.id === 'install') {
                      onInstallPWA?.();
                    } else {
                      navigate(`/settings/${item.id}`);
                    }
                  }}
                  className="list-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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
                    
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)', lineHeight: 1.2 }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{item.sub}</div>
                    </div>
                  </div>
                  
                  <ChevronRight size={16} color="var(--color-border)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out — danger list row */}
        <div style={{ marginTop: '8px' }}>
          <div className="list-group">
            <button
              id="logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
              className="list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LogOut size={18} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#EF4444' }}>Sign Out</span>
              </div>
              <ChevronRight size={16} color="rgba(239,68,68,0.4)" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
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
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', gap: '16px', borderRadius: '24px', padding: '24px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Sign Out?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>Your data will remain safely stored on this device.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700 }} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button id="confirm-logout-btn" style={{ flex: 1, height: '44px', borderRadius: '22px', background: '#EF4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={handleLogout}>Sign Out</button>
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

  const handleSave = async () => {
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
      await db.addCategory({ name: name.trim(), type, icon, color });
    } else if (formMode === 'edit' && editId) {
      // Update category: delete and re-insert with same ID to update in Supabase
      const allCats = db.getCategories();
      const existing = allCats.find((c: any) => c.id === editId);
      if (existing) {
        // Delete the old one and add the updated version
        await db.deleteCategory(editId);
        await db.addCategory({ name: name.trim(), type, icon, color });
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

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteTrigger = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await db.deleteCategory(deleteId);
      setDeleteId(null);
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
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
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
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
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

        {/* Footer save button */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormMode('list')}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Category</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Categories" onBack={onBack} />
      
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        {/* Search & Sort Row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '16px 16px 12px' }}>
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

        {/* Categories List Cards (Flat list group) */}
        <div className="list-group">
          {processedCats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
              No categories found
            </div>
          ) : (
            processedCats.map((c) => {
              const isHidden = hiddenCats.includes(c.id);
              return (
                <div key={c.id} className="list-row" style={{ opacity: isHidden ? 0.5 : 1, cursor: 'default' }}>
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

                    <button onClick={() => startEdit(c)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeleteTrigger(c.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '6px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB to Add Custom Category */}
      <button className="fab" onClick={startAdd} aria-label="Add Category" style={{ bottom: '24px' }}>
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setDeleteId(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', gap: '16px', borderRadius: '24px', padding: '24px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>Delete Category?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {categories.find(c => c.id === deleteId)?.isCustom
                ? 'Are you sure you want to delete this custom category? Associated transactions will remain.'
                : 'System categories cannot be deleted. You can hide them using the eye icon instead.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700 }} onClick={() => setDeleteId(null)}>Cancel</button>
              {categories.find(c => c.id === deleteId)?.isCustom && (
                <button style={{ flex: 1, height: '44px', borderRadius: '22px', background: '#EF4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={confirmDelete}>Delete</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ACCOUNT_PRESETS = [
  // Banks
  { name: 'SBI Bank', type: 'bank', icon: '🏦', color: '#1F4096' },
  { name: 'HDFC Bank', type: 'bank', icon: '🏦', color: '#1C3F94' },
  { name: 'ICICI Bank', type: 'bank', icon: '🏦', color: '#E06B26' },
  { name: 'Axis Bank', type: 'bank', icon: '🏦', color: '#97184A' },
  { name: 'Kotak Bank', type: 'bank', icon: '🏦', color: '#E61A22' },
  // Credit Cards
  { name: 'Visa Card', type: 'credit_card', icon: '💳', color: '#1A1F71' },
  { name: 'Mastercard', type: 'credit_card', icon: '💳', color: '#EB001B' },
  { name: 'RuPay Card', type: 'credit_card', icon: '💳', color: '#0957A5' },
  { name: 'OneCard', type: 'credit_card', icon: '💳', color: '#1E293B' },
  // UPI
  { name: 'PhonePe UPI', type: 'upi', icon: '📱', color: '#5F259F' },
  { name: 'Google Pay', type: 'upi', icon: '📱', color: '#1A73E8' },
  { name: 'Paytm Wallet', type: 'upi', icon: '📱', color: '#00B9F5' },
  { name: 'BHIM UPI', type: 'upi', icon: '📱', color: '#F15A24' },
];

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

  const handleSave = async () => {
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
      await db.addAccount({
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
        // Save to Supabase (never localStorage for financial data)
        await db.saveAccounts(allAccs);
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

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteTrigger = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      const acc = accounts.find(a => a.id === deleteId);
      if (acc && !acc.isCustom) {
        // System account - hide instead of delete
        toggleHideAccount(deleteId);
        setDeleteId(null);
      } else {
        // Custom account - delete
        await db.deleteAccount(deleteId);
        setDeleteId(null);
        refresh();
      }
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
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
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
        <div style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Quick Presets Selection */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Quick Preset</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '4px' }}>
              {ACCOUNT_PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setName(p.name);
                    setType(p.type as any);
                    setIcon(p.icon);
                    setColor(p.color);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '16px',
                    border: `1.5px solid ${name === p.name ? p.color : 'var(--color-border)'}`,
                    background: name === p.name ? `${p.color}15` : 'var(--color-card)',
                    color: name === p.name ? p.color : 'var(--color-text-muted)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

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

        {/* Footer save button */}
        <div style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormMode('list')}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Accounts" onBack={onBack} />
      
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        {/* Search Row */}
        <div style={{ position: 'relative', width: '100%', padding: '16px 16px 12px' }}>
          <Search size={16} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search accounts…"
            className="input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
          />
        </div>

        {/* Accounts List Cards (Flat list group) */}
        <div className="list-group">
          {processedAccs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
              No accounts found
            </div>
          ) : (
            processedAccs.map((a) => {
              const isHidden = hiddenAccs.includes(a.id);
              return (
                <div key={a.id} className="list-row" style={{ opacity: isHidden ? 0.5 : 1, cursor: 'default' }}>
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
                        <button onClick={() => handleDeleteTrigger(a.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '6px' }}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(a)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }} title="Edit Balance">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDeleteTrigger(a.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '6px' }} title="Hide Account">
                          <EyeOff size={15} />
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

      {/* FAB to Add Custom Account */}
      <button className="fab" onClick={startAdd} aria-label="Add Account" style={{ bottom: '24px' }}>
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Delete / Hide Confirmation Dialog */}
      {deleteId && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setDeleteId(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', gap: '16px', borderRadius: '24px', padding: '24px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {accounts.find(a => a.id === deleteId)?.isCustom ? 'Delete Account?' : 'Hide Account?'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {accounts.find(a => a.id === deleteId)?.isCustom
                ? 'Are you sure you want to delete this custom account? Associated transactions will remain.'
                : 'System accounts cannot be deleted. We will hide this account from your active lists instead.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button className="btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 700 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ flex: 1, height: '44px', borderRadius: '22px', background: '#EF4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={confirmDelete}>
                {accounts.find(a => a.id === deleteId)?.isCustom ? 'Delete' : 'Hide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NotificationsViewProps {
  onBack: () => void;
  settings: any;
  saveSettings: (s: any) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack, settings, saveSettings }) => {
  const [budgetAlerts, setBudgetAlerts] = useState(settings.budgetAlertsEnabled);
  const [dailyReminder, setDailyReminder] = useState(settings.dailyReminderEnabled);
  const [reminderTime, setReminderTime] = useState(settings.dailyReminderTime || '21:00');

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
    saveSettings({ ...settings, dailyReminderEnabled: val, dailyReminderTime: reminderTime });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value;
    setReminderTime(timeVal);
    saveSettings({ ...settings, dailyReminderTime: timeVal });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="Notifications" onBack={onBack} />
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        <div className="list-group" style={{ marginTop: '16px' }}>
          <div className="list-row" style={{ cursor: 'default' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>Budget Limit Alerts</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Notify when category spends reach 80% and 100%</div>
            </div>
            <label className="m3-switch">
              <input type="checkbox" checked={budgetAlerts} onChange={toggleBudget} />
              <span className="m3-slider" />
            </label>
          </div>

          <div className="list-row" style={{ cursor: 'default' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>Daily Summary & Reminders</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Remind to log transactions and goal progress</div>
            </div>
            <label className="m3-switch">
              <input type="checkbox" checked={dailyReminder} onChange={toggleDaily} />
              <span className="m3-slider" />
            </label>
          </div>

          {dailyReminder && (
            <div className="list-row" style={{ cursor: 'default', background: 'var(--color-bg)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.875rem' }}>Reminder Time</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Choose what time you'd like to get notified</div>
              </div>
              <input
                type="time"
                value={reminderTime}
                onChange={handleTimeChange}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  background: 'var(--color-card)',
                  fontFamily: "'Sora', sans-serif"
                }}
              />
            </div>
          )}
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
      saveSettings({ ...settings, pinEnabled: false, pinHash: undefined });
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
    const hash = simpleHash(pinConfirm);
    setPIN(pinConfirm);
    setPinEnabled(true);
    saveSettings({ ...settings, pinEnabled: true, pinHash: hash });
    setStep('toggle');
    setPinInput('');
    setPinConfirm('');
    alert('PIN Lock enabled successfully!');
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <BackHeader title="App Security" onBack={onBack} />
      <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
        {step === 'toggle' && (
          <div className="list-group" style={{ marginTop: '16px' }}>
            <div className="list-row" style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.9375rem' }}>PIN Lock Screen</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>Ask for a 4-digit PIN when launching FINOVA</div>
              </div>
              <button className={pinEnabled ? 'btn-ghost' : 'btn-primary'} style={{ padding: '8px 16px', fontSize: '0.8125rem' }} onClick={handleToggle}>
                {pinEnabled ? 'Disable PIN' : 'Enable PIN'}
              </button>
            </div>
          </div>
        )}

        {step === 'setup_pin' && (
          <div style={{ padding: '32px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Set 4-Digit PIN</h4>
            <input type="password" maxLength={4} className="input-field" placeholder="Enter new PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('toggle')}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSetup}>Next</button>
            </div>
          </div>
        )}

        {step === 'confirm_pin' && (
          <div style={{ padding: '32px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Confirm PIN</h4>
            <input type="password" maxLength={4} className="input-field" placeholder="Confirm PIN" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('setup_pin')}>Back</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>Enable PIN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RecurringViewProps {
  onBack: () => void;
  refresh: () => void;
}

const RecurringView: React.FC<RecurringViewProps> = ({ onBack, refresh }) => {
  const { categories, accounts } = useApp();
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);

  const recurringList: RecurringTransaction[] = useMemo(() => db.getRecurringTransactions(), [formMode]);

  const visibleAccounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('finova_hidden_accounts');
      const hiddenIds = raw ? JSON.parse(raw) : [];
      return accounts.filter(a => !hiddenIds.includes(a.id) || a.id === account);
    } catch {
      return accounts;
    }
  }, [accounts, account]);

  // Set default category and account when entering form
  useEffect(() => {
    if (formMode === 'add') {
      const activeCats = categories.filter(c => c.type === type || c.type === 'both');
      if (activeCats.length > 0) setCategory(activeCats[0].id);
      if (visibleAccounts.length > 0) setAccount(visibleAccounts[0].id);
    }
  }, [formMode, type, categories, visibleAccounts]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!category) {
      alert('Please select a category.');
      return;
    }
    if (!account) {
      alert('Please select an account.');
      return;
    }

    const payload = {
      type,
      amount: amt,
      category,
      account,
      frequency,
      startDate,
      nextDueDate: startDate, // Set initially to start date
      note: note.trim(),
      active,
    };

    if (formMode === 'add') {
      await db.addRecurringTransaction(payload);
    } else if (formMode === 'edit' && editId) {
      const original = recurringList.find((r: RecurringTransaction) => r.id === editId);
      if (original) {
        await db.updateRecurringTransaction({
          ...original,
          ...payload,
          id: editId,
          // Keep nextDueDate unchanged unless startDate has changed
          nextDueDate: original.startDate === startDate ? original.nextDueDate : startDate,
        });
      }
    }

    // Reset
    setAmount('');
    setNote('');
    setFormMode('list');
    setEditId(null);
    refresh();
  };

  const startEdit = (rt: RecurringTransaction) => {
    setEditId(rt.id);
    setAmount(String(rt.amount));
    setType(rt.type);
    setCategory(rt.category);
    setAccount(rt.account);
    setFrequency(rt.frequency);
    setStartDate(rt.startDate);
    setNote(rt.note || '');
    setActive(rt.active);
    setFormMode('edit');
  };

  const startAdd = () => {
    setAmount('');
    setType('expense');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setActive(true);
    setFormMode('add');
  };

  const toggleActive = async (rt: RecurringTransaction) => {
    await db.updateRecurringTransaction({
      ...rt,
      active: !rt.active,
    });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
      await db.deleteRecurringTransaction(id);
      refresh();
    }
  };

  if (formMode === 'add' || formMode === 'edit') {
    const activeCats = categories.filter(c => c.type === type || c.type === 'both');
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--color-bg)' }}>
        <BackHeader title={formMode === 'add' ? 'Add Recurring' : 'Edit Recurring'} onBack={() => setFormMode('list')} />
        <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ gap: '16px' }}>
            {/* Amount input */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Amount</label>
              <input type="number" placeholder="0.00" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: '1.25rem', fontWeight: 800 }} />
            </div>

            {/* Type selector */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setType('expense')} style={{ padding: '10px', borderRadius: '12px', border: '1.5px solid', borderColor: type === 'expense' ? 'var(--color-primary)' : 'var(--color-border)', background: type === 'expense' ? 'rgba(37,99,235,0.06)' : 'transparent', color: type === 'expense' ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>Expense</button>
                <button onClick={() => setType('income')} style={{ padding: '10px', borderRadius: '12px', border: '1.5px solid', borderColor: type === 'income' ? 'var(--color-primary)' : 'var(--color-border)', background: type === 'income' ? 'rgba(37,99,235,0.06)' : 'transparent', color: type === 'income' ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>Income</button>
              </div>
            </div>

            {/* Frequency selection */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Repeat Cycle</label>
              <div style={{ position: 'relative' }}>
                <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value as any)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                  <option value="daily">Every Day</option>
                  <option value="weekly">Every Week</option>
                  <option value="monthly">Every Month</option>
                  <option value="yearly">Every Year</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>

            {/* Category dropdown */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Category</label>
              <div style={{ position: 'relative' }}>
                <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                  {activeCats.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Account dropdown */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Paying Account</label>
              <div style={{ position: 'relative' }}>
                <select className="input-field" value={account} onChange={e => setAccount(e.target.value)} style={{ appearance: 'none', paddingRight: '2.5rem' }}>
                  {visibleAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Description / Note</label>
              <input type="text" placeholder="Rent, Internet bills, pocket money…" className="input-field" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)' }}>Active Status</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Temporarily disable calculations if checked off</div>
              </div>
              <button
                onClick={() => setActive(!active)}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: active ? 'var(--color-primary)' : 'var(--color-border)',
                  position: 'relative', transition: 'background-color 0.2s', padding: 0
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '3px', left: active ? '23px' : '3px',
                  transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }} />
              </button>
            </div>

          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormMode('list')}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Bill</button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--color-bg)' }}>
      <BackHeader title="Recurring Bills" onBack={onBack} />
      
      <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {recurringList.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: 'var(--color-card)', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔄</div>
            <div style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>No recurring bills configured</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.45 }}>
              Create automatic transactions for repeating subscriptions, rent, salaries, or pocket money.
            </div>
            <button onClick={startAdd} className="btn-primary" style={{ marginTop: '20px', display: 'inline-flex', alignSelf: 'center', padding: '10px 20px', fontSize: '0.8125rem' }}>
              Create First Scheduled Bill
            </button>
          </div>
        ) : (
          recurringList.map((rt: RecurringTransaction) => {
            const cat = categories.find(c => c.id === rt.category);
            const acc = accounts.find(a => a.id === rt.account);
            
            return (
              <div key={rt.id} className="card" style={{
                padding: '16px', border: '1.5px solid var(--color-border)', borderRadius: '18px',
                opacity: rt.active ? 1 : 0.6, gap: '14px', position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: `${cat?.color || '#2563EB'}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem'
                    }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                        {rt.note || cat?.name || 'Auto Expense'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 800, color: rt.type === 'expense' ? '#DC2626' : '#16A34A',
                          background: rt.type === 'expense' ? '#FEF2F2' : '#F0FDF4', padding: '1px 6px', borderRadius: '4px'
                        }}>
                          {rt.type.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          • {rt.frequency.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.0625rem', color: rt.type === 'expense' ? '#DC2626' : '#16A34A' }}>
                      {rt.type === 'expense' ? '-' : '+'}₹{rt.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
                      Via: {acc?.name || 'Unknown'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--color-bg)', padding: '10px 14px', borderRadius: '12px',
                  fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
                    <Clock size={12} />
                    <span>Next Due: <strong>{rt.nextDueDate}</strong></span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Toggle Active status */}
                    <button
                      onClick={() => toggleActive(rt)}
                      style={{
                        padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)',
                        background: rt.active ? 'rgba(34,197,94,0.1)' : 'transparent',
                        color: rt.active ? '#16A34A' : 'var(--color-text-muted)',
                        fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      {rt.active ? 'Active' : 'Paused'}
                    </button>
                    
                    <button onClick={() => startEdit(rt)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.6875rem', fontWeight: 700 }}>
                      Edit
                    </button>
                    
                    <button onClick={() => handleDelete(rt.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', fontSize: '0.6875rem', fontWeight: 700 }}>
                      Delete
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}

      </div>

      {/* FAB to Add Custom Recurring Bill */}
      <button className="fab" onClick={startAdd} aria-label="Add Recurring" style={{ bottom: '24px' }}>
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const SubView: React.FC<{ view: SettingsView; onBack: () => void }> = ({ view, onBack }) => {
  const { user, settings, saveSettings, refresh, categories, accounts } = useApp();

  if (view === 'currency') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Currency" onBack={onBack} />
        <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
          <div className="list-group" style={{ marginTop: '16px' }}>
            {CURRENCIES.map((c) => (
              <button key={c.code} onClick={() => saveSettings({ ...settings, currency: c.code, currencySymbol: c.symbol })}
                className="list-row"
                style={{
                  background: settings.currency === c.code ? 'rgba(37,99,235,0.05)' : 'transparent',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(c as any).flag || '🌐'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'rgba(37,99,235,0.08)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>{c.symbol}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{c.code}</div>
                  </div>
                </div>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${settings.currency === c.code ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {settings.currency === c.code && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                  )}
                </div>
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
        <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
            <img src={logoUrl} alt="FINOVA" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'contain', margin: '0 auto' }} />
            <p style={{ margin: '12px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.4 }}>Keep your data safe by exporting regular backups.</p>
          </div>

          <div className="list-group" style={{ marginTop: '16px' }}>
            {[
              { id: 'export-backup', icon: <Download size={20} />, label: 'Export Backup', sub: 'Save data as JSON file', color: '#22C55E', action: handleExport },
              { id: 'import-backup', icon: <Upload size={20} />,   label: 'Restore Backup', sub: 'Import from JSON file', color: '#2563EB', action: handleImport },
            ].map((item) => (
              <button key={item.id} id={item.id} onClick={item.action} className="list-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.875rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.sub}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ padding: '20px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)', marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Trash2 size={20} color="#EF4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '4px', fontSize: '0.875rem' }}>Clear All Data</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 600, lineHeight: 1.4 }}>
                  This will permanently delete all transactions, budgets, and goals. Export a backup first!
                </div>
                <button id="clear-data-btn" onClick={async () => {
                  if (window.confirm('Are you absolutely sure? This cannot be undone.')) {
                    await db.clearAllData();
                    refresh();
                    alert('All data cleared successfully.');
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
        <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', textAlign: 'center', padding: '32px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <img src={logoUrl} alt="FINOVA" style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'contain' }} />
            <BrandTitle size="medium" showTagline={true} taglineColor="#1E293B" />
          </div>

          <div className="list-group" style={{ width: '100%', marginTop: '20px' }}>
            {[
              ['Version', '1.0.0'],
              ['Platform', 'Progressive Web App'],
              ['Data Storage', 'Local & Secure'],
              ['Pricing', 'Free Forever'],
              ['Ads', 'None. Ever.'],
            ].map(([k, v]) => (
              <div key={k} className="list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '24px 16px' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6, fontWeight: 600 }}>
              FINOVA is a personal finance management app built to help you track money and build better financial habits. Your data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Profile" onBack={onBack} />
        <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', textAlign: 'center', padding: '32px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-border)' }}>
              {user?.photoURL
                ? <img src={user.photoURL} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.75rem' }}>
                    {user?.name?.charAt(0) || 'U'}
                  </div>
              }
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-text)' }}>{user?.name}</div>
              <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600, fontSize: '0.8125rem' }}>{user?.email}</div>
            </div>
          </div>

          <div className="list-group" style={{ width: '100%', marginTop: '20px' }}>
            {[['Name', user?.name || ''], ['Email', user?.email || ''], ['Auth', 'Google Account']].map(([k, v]) => (
              <div key={k} className="list-row" style={{ cursor: 'default' }}>
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

  if (view === 'recurring') {
    return <RecurringView onBack={onBack} refresh={refresh} />;
  }

  if (view === 'theme') {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <BackHeader title="Theme Selector" onBack={onBack} />
        <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column' }}>
          <div className="list-group" style={{ marginTop: '16px' }}>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button key={t} onClick={() => saveSettings({ ...settings, theme: t })}
                className="list-row"
                style={{
                  background: settings.theme === t ? 'rgba(37,99,235,0.05)' : 'transparent',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Palette size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize' }}>{t} Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {t === 'light' && 'Always light layout'}
                      {t === 'dark' && 'Always sleek dark theme'}
                      {t === 'system' && 'Match device system preferences'}
                    </div>
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
