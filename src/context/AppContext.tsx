import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type {
  User, Transaction, Budget, Goal, Account, Category, AppSettings,
  DailyTask, DailyTaskLog, PlannerSchedule, PlannerReminder, XPHistory, UserLevel, UserBadge, StreakData
} from '../types';
import { DEFAULT_SETTINGS } from '../data/defaults';
import { onAuthStateChanged } from '../services/auth';
import * as db from '../services/db';
import { getSupabase } from '../services/supabase';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  try {
    localStorage.setItem('finova_theme', theme);
  } catch {}
}

export type NavTab = 'home' | 'transactions' | 'budgets' | 'planner' | 'reports' | 'goals' | 'settings';

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
  dailyTasks: DailyTask[];
  dailyTaskLogs: DailyTaskLog[];
  plannerSchedules: PlannerSchedule[];
  plannerReminders: PlannerReminder[];
  xpHistory: XPHistory[];
  userLevel: UserLevel;
  userBadges: UserBadge[];
  streakData: StreakData;
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
  dailyTasks: [],
  dailyTaskLogs: [],
  plannerSchedules: [],
  plannerReminders: [],
  xpHistory: [],
  userLevel: { currentLevel: 1, currentXP: 0 },
  userBadges: [],
  streakData: { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' },
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
  // Initialize settings from localStorage for instant theme on refresh (before Supabase loads)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('finova_settings');
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings;
        // Apply the saved theme immediately to avoid flash
        applyTheme(parsed.theme);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  });

  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Daily Planner fields
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [dailyTaskLogs, setDailyTaskLogs] = useState<DailyTaskLog[]>([]);
  const [plannerSchedules, setPlannerSchedules] = useState<PlannerSchedule[]>([]);
  const [plannerReminders, setPlannerReminders] = useState<PlannerReminder[]>([]);
  const [xpHistory, setXpHistory] = useState<XPHistory[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>({ currentLevel: 1, currentXP: 0 });
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' });

  // Ref to debounce rapid realtime events
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track previous user to avoid redundant cache resets and pulls on token refresh
  const prevUserIdRef = useRef<string | null>(null);

  // Apply theme on initial mount (also handled in useState initializer above)
  useEffect(() => {
    applyTheme(settings.theme);
  }, []);

  const refresh = useCallback(() => {
    setTransactions([...db.getTransactions()]);
    setBudgets([...db.getBudgets()]);
    setGoals([...db.getGoals()]);
    setAccounts([...db.getAccounts()]);
    setCategories([...db.getCategories()]);

    setDailyTasks([...db.getDailyTasks()]);
    const todayStr = new Date().toISOString().split('T')[0];
    setDailyTaskLogs([...db.getDailyTaskLogs(todayStr)]);
    setPlannerSchedules([...db.getPlannerSchedule()]);
    setPlannerReminders([...db.getPlannerReminders()]);
    setXpHistory([...db.getXPHistory()]);
    setUserLevel({ ...db.getUserLevel() });
    setUserBadges([...db.getUserBadges()]);
    setStreakData({ ...db.getStreakData() });

    const supabaseSettings = db.getSettings();

    // localStorage is the user's last EXPLICIT choice — it always wins over Supabase.
    // If they differ (e.g. Supabase has stale 'dark' from a failed save), keep localStorage.
    let merged = { ...supabaseSettings };
    try {
      const stored = localStorage.getItem('finova_settings');
      if (stored) {
        const local = JSON.parse(stored) as AppSettings;
        // Override theme (and any other locally-preferred fields) with localStorage value
        merged = { ...supabaseSettings, theme: local.theme };
      }
    } catch {}

    setSettings({ ...merged });
    applyTheme(merged.theme);
    // Persist the winning merged settings back to localStorage
    try { localStorage.setItem('finova_settings', JSON.stringify(merged)); } catch {}
  }, []);

  // Register database write listener to update React UI state on CRUD actions
  useEffect(() => {
    return db.registerWriteListener(refresh);
  }, [refresh]);

  // Auth observer and initial sync load
  // CRITICAL: onAuthStateChanged no longer reads from localStorage.
  // The loading spinner is shown until Supabase responds with real data.
  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        if (prevUserIdRef.current === u.uid) {
          refresh();
          setLoading(false);
          return;
        }
        prevUserIdRef.current = u.uid;
        try {
          // Clear in-memory state for the new user
          db.setUserIdForCache(u.uid);
          // Pull ALL financial data from Supabase
          await db.pullAllFromSupabase();

          // THEME SYNC: If localStorage has a different theme than what Supabase returned,
          // localStorage wins (it reflects the user's last explicit choice).
          // Push it to Supabase so both are in sync going forward.
          try {
            const stored = localStorage.getItem('finova_settings');
            if (stored) {
              const local = JSON.parse(stored) as AppSettings;
              const fromSupabase = db.getSettings();
              if (local.theme !== fromSupabase.theme) {
                // Push the user's last chosen theme to Supabase
                await db.saveSettings({ ...fromSupabase, theme: local.theme });
              }
            }
          } catch (e) {
            console.error('Theme sync local→Supabase failed:', e);
          }

          // Process any overdue recurring bills
          await db.processRecurringTransactions();
          // Audit streaks on launch
          await db.auditStreaksLaunch();
          // Update React UI state from freshly-fetched Supabase data
          refresh();

          // Trigger PWA notifications after sync is successful!
          import('../services/notifications').then(({ checkBudgetAlerts, checkGoalReminders, checkSplitBillReminders }) => {
            checkBudgetAlerts();
            checkGoalReminders();
            checkSplitBillReminders();
          }).catch(err => console.error('Failed to run notifications check:', err));
        } catch (e) {
          console.error('Failed to sync Supabase data on login:', e);
          refresh();
        } finally {
          setLoading(false);
        }
      } else {
        prevUserIdRef.current = null;
        // User logged out — clear all in-memory state
        db.setUserIdForCache(null);
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setAccounts([]);
        setCategories([]);
        setSettings({ ...DEFAULT_SETTINGS });
        setDailyTasks([]);
        setDailyTaskLogs([]);
        setPlannerSchedules([]);
        setPlannerReminders([]);
        setXpHistory([]);
        setUserLevel({ currentLevel: 1, currentXP: 0 });
        setUserBadges([]);
        setStreakData({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' });
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
    // Always persist to localStorage immediately as a reliable local fallback.
    // This ensures theme and other settings survive page refreshes even if Supabase is unavailable.
    try {
      localStorage.setItem('finova_settings', JSON.stringify(s));
    } catch {}
    // Update React state and apply theme immediately (optimistic UI)
    setSettings(s);
    applyTheme(s.theme);
    // Attempt to persist to Supabase (best-effort, non-blocking for UX)
    try {
      await db.saveSettings(s);
    } catch (e: any) {
      console.error('Failed to save settings to Supabase (saved to localStorage as fallback):', e);
    }
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
        dailyTasks,
        dailyTaskLogs,
        plannerSchedules,
        plannerReminders,
        xpHistory,
        userLevel,
        userBadges,
        streakData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
