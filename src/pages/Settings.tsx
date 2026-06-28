import React, { useState } from 'react';
import {
  User, DollarSign, HardDrive, Shield, Info, LogOut,
  ChevronRight, Download, Upload, Trash2, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { signOut } from '../services/auth';
import { exportAllData, importAllData } from '../services/db';
import { CURRENCIES } from '../data/defaults';
import logoUrl from '../assets/logo.jpeg';

type SettingsView = 'main' | 'profile' | 'currency' | 'backup' | 'security' | 'about';

const Settings: React.FC<{ onLogout: () => void }> = ({ onLogout: _onLogout }) => {
  const { user, settings } = useApp();
  const [view, setView] = useState<SettingsView>('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await signOut();
    _onLogout();
  };

  const MENU = [
    { id: 'profile',  icon: <User size={20} />,       label: 'Profile',          sub: user?.name || '', color: '#2563EB' },
    { id: 'currency', icon: <DollarSign size={20} />,  label: 'Currency',         sub: `${settings.currency} (${settings.currencySymbol})`, color: '#22C55E' },
    { id: 'backup',   icon: <HardDrive size={20} />,   label: 'Backup & Restore', sub: 'Export or restore data', color: '#F59E0B' },
    { id: 'security', icon: <Shield size={20} />,      label: 'Security',         sub: settings.pinEnabled ? 'PIN enabled' : 'No lock', color: '#7C3AED' },
    { id: 'about',    icon: <Info size={20} />,        label: 'About',            sub: 'FINOVA v1.0', color: '#0891B2' },
  ];

  if (view !== 'main') {
    return <SubView view={view} onBack={() => setView('main')} onLogout={handleLogout} />;
  }

  return (
    <div className="page-enter">
      <div style={{ padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Settings</h2>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '6rem' }}>
        {/* Profile card */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
          onClick={() => setView('profile')}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2.5px solid #E2E8F0' }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{user?.email}</div>
          </div>
          <ChevronRight size={18} color="#CBD5E1" />
        </div>

        {/* Menu items */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {MENU.map((item, i) => (
            <button key={item.id} id={`settings-${item.id}`} onClick={() => setView(item.id as SettingsView)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '1rem', border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: i < MENU.length - 1 ? '1px solid #F8FAFC' : 'none',
                textAlign: 'left',
              }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
                background: `${item.color}15`, color: item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0F172A' }}>{item.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{item.sub}</div>
              </div>
              <ChevronRight size={16} color="#CBD5E1" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button id="logout-btn" onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%', padding: '1rem', borderRadius: '16px',
            border: '1.5px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)',
            color: '#EF4444', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            fontFamily: 'Inter, sans-serif',
          }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <h3 style={{ margin: '0 0 0.5rem', color: '#0F172A' }}>Sign Out?</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748B', fontSize: '0.9375rem' }}>Your data will remain saved on this device.</p>
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

const SubView: React.FC<{ view: SettingsView; onBack: () => void; onLogout: () => void }> = ({ view, onBack }) => {
  const { user, settings, saveSettings, refresh } = useApp();

  const BackHeader = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
      <button onClick={onBack} style={{ border: 'none', background: '#F8FAFC', borderRadius: '12px', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        <X size={18} />
      </button>
      <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>{title}</h2>
    </div>
  );

  if (view === 'currency') {
    return (
      <div className="page-enter">
        <BackHeader title="Currency" />
        <div style={{ padding: '1.25rem', paddingBottom: '6rem' }}>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {CURRENCIES.map((c, i) => (
              <button key={c.code} onClick={() => saveSettings({ ...settings, currency: c.code, currencySymbol: c.symbol })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', border: 'none', background: settings.currency === c.code ? 'rgba(37,99,235,0.04)' : 'transparent',
                  cursor: 'pointer', borderBottom: i < CURRENCIES.length - 1 ? '1px solid #F8FAFC' : 'none',
                  textAlign: 'left',
                }}>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', width: '2.5rem', color: '#2563EB' }}>{c.symbol}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{c.code}</div>
                </div>
                {settings.currency === c.code && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />}
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
      <div className="page-enter">
        <BackHeader title="Backup & Restore" />
        <div style={{ padding: '1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <img src={logoUrl} alt="FINOVA" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'contain' }} />
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#64748B' }}>Keep your data safe by exporting regular backups.</p>
          </div>

          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {[
              { id: 'export-backup', icon: <Download size={20} />, label: 'Export Backup', sub: 'Save data as JSON file', color: '#22C55E', action: handleExport },
              { id: 'import-backup', icon: <Upload size={20} />,   label: 'Restore Backup',sub: 'Import from JSON file', color: '#2563EB', action: handleImport },
            ].map((item, i) => (
              <button key={item.id} id={item.id} onClick={item.action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: i === 0 ? '1px solid #F8FAFC' : 'none', textAlign: 'left' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '1rem', border: '1.5px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Trash2 size={20} color="#EF4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#EF4444', marginBottom: '0.25rem' }}>Clear All Data</div>
                <div style={{ fontSize: '0.8125rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                  This will permanently delete all transactions, budgets, and goals. Export a backup first!
                </div>
                <button id="clear-data-btn" onClick={() => {
                  if (window.confirm('Are you absolutely sure? This cannot be undone.')) {
                    ['finova_transactions','finova_budgets','finova_goals','finova_accounts','finova_categories'].forEach(k => localStorage.removeItem(k));
                    refresh();
                    alert('All data cleared.');
                  }
                }} style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
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
      <div className="page-enter">
        <BackHeader title="About FINOVA" />
        <div style={{ padding: '2rem 1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <img src={logoUrl} alt="FINOVA" style={{ width: '96px', height: '96px', borderRadius: '24px', objectFit: 'contain', boxShadow: '0 8px 24px rgba(37,99,235,0.15)' }} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>FINOVA</h2>
            <p style={{ margin: '0.375rem 0 0', color: '#2563EB', fontWeight: 600 }}>Track Money. Build Better Habits.</p>
          </div>

          <div className="card" style={{ width: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['Version', '1.0.0'],
              ['Platform', 'Progressive Web App'],
              ['Data Storage', 'Local & Secure'],
              ['Pricing', 'Free Forever'],
              ['Ads', 'None. Ever.'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9375rem', color: '#64748B' }}>{k}</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
            FINOVA is a personal finance management app built to help you track money and build better financial habits. Your data never leaves your device.
          </p>
        </div>
      </div>
    );
  }

  // Profile view
  return (
    <div className="page-enter">
      <BackHeader title="Profile" />
      <div style={{ padding: '2rem 1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #E2E8F0' }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '2rem' }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
          }
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0F172A' }}>{user?.name}</div>
          <div style={{ color: '#64748B', marginTop: '0.25rem' }}>{user?.email}</div>
        </div>
        <div className="card" style={{ width: '100%', padding: '1.25rem' }}>
          {[['Name', user?.name || ''], ['Email', user?.email || ''], ['Auth', 'Google Account']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: '#64748B', fontSize: '0.9375rem' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9375rem' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
