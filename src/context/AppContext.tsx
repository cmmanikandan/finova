import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Transaction, Budget, Goal, Account, Category, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaults';
import { onAuthStateChanged } from '../services/auth';
import * as db from '../services/db';
import { getSupabase } from '../services/supabase';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export type NavTab = 'home' | 'transactions' | 'budgets' | 'reports' | 'goals' | 'settings';

interface AppContextType {
  user: User | null;
  loading: boolean;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  accounts: Account[];
  categories: Category[];
  settings: AppSettings;
  refresh: () => void;
  saveSettings: (s: AppSettings) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  loading: true,
  transactions: [],
  budgets: [],
  goals: [],
  accounts: [],
  categories: [],
  settings: { ...DEFAULT_SETTINGS },
  refresh: () => {},
  saveSettings: () => {},
  activeTab: 'home',
  setActiveTab: () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Start with DEFAULT_SETTINGS — never read from localStorage
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });

  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Ref to debounce rapid realtime events
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setTransactions(db.getTransactions());
    setBudgets(db.getBudgets());
    setGoals(db.getGoals());
    setAccounts(db.getAccounts());
    setCategories(db.getCategories());
    const s = db.getSettings();
    setSettings(s);
    applyTheme(s.theme);
  }, []);

  // Register database write listener to update React UI state on CRUD actions
  useEffect(() => {
    db.registerWriteListener(refresh);
  }, [refresh]);

  // Auth observer and initial sync load
  // CRITICAL: onAuthStateChanged no longer reads from localStorage.
  // The loading spinner is shown until Supabase responds with real data.
  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          // Clear in-memory state for the new user (no localStorage reads)
          db.setUserIdForCache(u.uid);
          // Pull ALL financial data from Supabase — this is the ONLY data source
          await db.pullAllFromSupabase();
          // Process any overdue recurring bills
          await db.processRecurringTransactions();
          // Update React UI state from freshly-fetched Supabase data
          refresh();
        } catch (e) {
          console.error('Failed to sync Supabase data on login:', e);
          // Even on error, call refresh() so the app renders (with empty data, not stale cache)
          refresh();
        } finally {
          setLoading(false);
        }
      } else {
        // User logged out — clear all in-memory state
        db.setUserIdForCache(null);
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setAccounts([]);
        setCategories([]);
        setSettings({ ...DEFAULT_SETTINGS });
        setLoading(false);
      }
    });
    return unsub;
  }, [refresh]);

  // Supabase Realtime Synchronization Subscription
  // Debounced: rapid successive events (e.g. balance + transaction insert) are
  // collapsed into a single pullAllFromSupabase() call to prevent race conditions.
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`user-db-changes-${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          // Debounce: wait 300ms after the last event before re-fetching
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
          }
          realtimeDebounceRef.current = setTimeout(async () => {
            try {
              await db.pullAllFromSupabase();
              refresh();
            } catch (e) {
              console.error('Failed to sync realtime updates:', e);
            }
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const saveSettings = useCallback(async (s: AppSettings) => {
    try {
      await db.saveSettings(s);
    } catch (e) {
      console.error('Failed to save settings to Supabase:', e);
    }
    setSettings(s);
    applyTheme(s.theme);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        transactions,
        budgets,
        goals,
        accounts,
        categories,
        settings,
        refresh,
        saveSettings,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
