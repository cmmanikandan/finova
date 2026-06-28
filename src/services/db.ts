// Database service – LocalStorage backed (Supabase ready)
import type { Transaction, Budget, Goal, Account, Category, AppSettings, LimitStatus, StreakData, RecurringTransaction } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from '../data/defaults';
import { v4 as uuidv4 } from '../utils/uuid';
import { syncToSupabase } from './supabaseSync';

const KEYS = {
  transactions: 'finova_transactions',
  budgets: 'finova_budgets',
  goals: 'finova_goals',
  accounts: 'finova_accounts',
  categories: 'finova_categories',
  settings: 'finova_settings',
  streakData: 'finova_streak_data',
  recurring: 'finova_recurring',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function getTransactions(): Transaction[] {
  return load<Transaction[]>(KEYS.transactions, []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const txns = load<Transaction[]>(KEYS.transactions, []);
  const t: Transaction = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  txns.push(t);
  save(KEYS.transactions, txns);

  // Update account balance
  const accounts = getAccounts();
  const acc = accounts.find(a => a.id === data.account);
  if (acc) {
    if (data.type === 'income') acc.balance += data.amount;
    else if (data.type === 'expense') acc.balance -= data.amount;
    else if (data.type === 'transfer') {
      acc.balance -= data.amount;
      const toAcc = accounts.find(a => a.id === data.toAccount);
      if (toAcc) toAcc.balance += data.amount;
    }
    save(KEYS.accounts, accounts);
  }

  // Update budget spent
  if (data.type === 'expense') {
    updateBudgetSpent(data.category, data.amount, data.date);
  }

  // Supabase sync
  syncToSupabase('transactions', t as unknown as Record<string, unknown>);

  return t;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  const txns = load<Transaction[]>(KEYS.transactions, []);
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) return;

  const old = txns[idx];

  // Reverse old transaction's balance impact
  const accounts = getAccounts();
  const oldAcc = accounts.find(a => a.id === old.account);
  if (oldAcc) {
    if (old.type === 'income')   oldAcc.balance -= old.amount;
    else if (old.type === 'expense') oldAcc.balance += old.amount;
    else if (old.type === 'transfer') {
      oldAcc.balance += old.amount;
      const oldTo = accounts.find(a => a.id === old.toAccount);
      if (oldTo) oldTo.balance -= old.amount;
    }
  }

  // Reverse old budget spent
  if (old.type === 'expense') {
    reverseBudgetSpent(old.category, old.amount, old.date);
  }

  // Apply updated transaction
  const updated: Transaction = { ...old, ...data };
  txns[idx] = updated;
  save(KEYS.transactions, txns);

  // Apply new balance impact
  const newAcc = accounts.find(a => a.id === updated.account);
  if (newAcc) {
    if (updated.type === 'income')   newAcc.balance += updated.amount;
    else if (updated.type === 'expense') newAcc.balance -= updated.amount;
    else if (updated.type === 'transfer') {
      newAcc.balance -= updated.amount;
      const newTo = accounts.find(a => a.id === updated.toAccount);
      if (newTo) newTo.balance += updated.amount;
    }
  }
  save(KEYS.accounts, accounts);

  // Apply new budget spent
  if (updated.type === 'expense') {
    updateBudgetSpent(updated.category, updated.amount, updated.date);
  }
}

export function deleteTransaction(id: string): void {
  const txns = load<Transaction[]>(KEYS.transactions, []);
  const txn = txns.find(t => t.id === id);
  if (!txn) return;

  // Reverse balance impact
  const accounts = getAccounts();
  const acc = accounts.find(a => a.id === txn.account);
  if (acc) {
    if (txn.type === 'income')   acc.balance -= txn.amount;
    else if (txn.type === 'expense') acc.balance += txn.amount;
    else if (txn.type === 'transfer') {
      acc.balance += txn.amount;
      const toAcc = accounts.find(a => a.id === txn.toAccount);
      if (toAcc) toAcc.balance -= txn.amount;
    }
    save(KEYS.accounts, accounts);
  }

  // Reverse budget spent
  if (txn.type === 'expense') {
    reverseBudgetSpent(txn.category, txn.amount, txn.date);
  }

  save(KEYS.transactions, txns.filter(t => t.id !== id));

  // Supabase sync
  syncToSupabase('transactions', { id } as unknown as Record<string, unknown>, 'delete');
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export function getAccounts(): Account[] {
  return load<Account[]>(KEYS.accounts, DEFAULT_ACCOUNTS.map(a => ({ ...a })));
}

export function saveAccounts(accounts: Account[]): void {
  save(KEYS.accounts, accounts);
}

export function addAccount(data: Omit<Account, 'id'>): Account {
  const accounts = getAccounts();
  const acc: Account = { ...data, id: uuidv4(), isCustom: true };
  accounts.push(acc);
  save(KEYS.accounts, accounts);
  return acc;
}

export function deleteAccount(id: string): void {
  const accounts = getAccounts();
  save(KEYS.accounts, accounts.filter(a => a.id !== id));
}

// ─── Categories ───────────────────────────────────────────────────────────────
export function getCategories(): Category[] {
  return load<Category[]>(KEYS.categories, DEFAULT_CATEGORIES.map(c => ({ ...c })));
}

export function addCategory(data: Omit<Category, 'id'>): Category {
  const cats = getCategories();
  const cat: Category = { ...data, id: uuidv4(), isCustom: true };
  cats.push(cat);
  save(KEYS.categories, cats);
  return cat;
}

export function deleteCategory(id: string): void {
  const cats = getCategories();
  save(KEYS.categories, cats.filter(c => c.id !== id));
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
export function getBudgets(): Budget[] {
  return load<Budget[]>(KEYS.budgets, []);
}

export function addBudget(data: Omit<Budget, 'id' | 'spent'>): Budget {
  const budgets = getBudgets();
  const b: Budget = { ...data, id: uuidv4(), spent: 0 };
  budgets.push(b);
  save(KEYS.budgets, budgets);
  return b;
}

export function updateBudget(id: string, data: Partial<Budget>): void {
  const budgets = getBudgets();
  const idx = budgets.findIndex(b => b.id === id);
  if (idx !== -1) {
    budgets[idx] = { ...budgets[idx], ...data };
    save(KEYS.budgets, budgets);
  }
}

export function deleteBudget(id: string): void {
  save(KEYS.budgets, getBudgets().filter(b => b.id !== id));
}

function updateBudgetSpent(category: string, amount: number, date: string): void {
  const budgets = getBudgets();
  const txDate = new Date(date);
  let changed = false;
  budgets.forEach(b => {
    if (b.category !== category && b.category !== 'all') return;
    if (b.period === 'monthly') {
      const start = new Date(b.startDate);
      if (txDate.getMonth() === start.getMonth() && txDate.getFullYear() === start.getFullYear()) {
        b.spent += amount;
        changed = true;
      }
    } else {
      b.spent += amount;
      changed = true;
    }
  });
  if (changed) save(KEYS.budgets, budgets);
}

function reverseBudgetSpent(category: string, amount: number, date: string): void {
  const budgets = getBudgets();
  const txDate = new Date(date);
  let changed = false;
  budgets.forEach(b => {
    if (b.category !== category && b.category !== 'all') return;
    if (b.period === 'monthly') {
      const start = new Date(b.startDate);
      if (txDate.getMonth() === start.getMonth() && txDate.getFullYear() === start.getFullYear()) {
        b.spent = Math.max(0, b.spent - amount);
        changed = true;
      }
    } else {
      b.spent = Math.max(0, b.spent - amount);
      changed = true;
    }
  });
  if (changed) save(KEYS.budgets, budgets);
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export function getGoals(): Goal[] {
  return load<Goal[]>(KEYS.goals, []);
}

export function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Goal {
  const goals = getGoals();
  const g: Goal = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  goals.push(g);
  save(KEYS.goals, goals);
  return g;
}

export function updateGoal(id: string, data: Partial<Goal>): void {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx !== -1) {
    goals[idx] = { ...goals[idx], ...data };
    save(KEYS.goals, goals);
  }
}

export function deleteGoal(id: string): void {
  save(KEYS.goals, getGoals().filter(g => g.id !== id));
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function getSettings(): AppSettings {
  const stored = load<Partial<AppSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: AppSettings): void {
  save(KEYS.settings, settings);
}

// ─── Computed helpers ─────────────────────────────────────────────────────────
export function getMonthlyStats(year: number, month: number) {
  const txns = getTransactions().filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, savings: income - expense, transactions: txns };
}

export function getTotalBalance(): number {
  return getAccounts().reduce((s, a) => s + a.balance, 0);
}

// ─── Daily / Weekly expense helpers ───────────────────────────────────────────
export function getDailyExpenses(dateISO: string): number {
  const d = new Date(dateISO);
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  return getTransactions()
    .filter(t => {
      if (t.type !== 'expense') return false;
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m && td.getDate() === day;
    })
    .reduce((s, t) => s + t.amount, 0);
}

export function getWeeklyExpenses(): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  return getTransactions()
    .filter(t => t.type === 'expense' && new Date(t.date) >= weekAgo)
    .reduce((s, t) => s + t.amount, 0);
}

export function getDailyLimitStatus(): LimitStatus {
  const settings = getSettings();
  const spent = getDailyExpenses(new Date().toISOString());
  const limit = settings.dailyLimit || 0;
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  return {
    spent,
    limit,
    pct: Math.min(pct, 999),
    over: pct > 100,
    warn: pct >= 80 && pct <= 100,
    remaining: Math.max(0, limit - spent),
  };
}

export function getWeeklyLimitStatus(): LimitStatus {
  const settings = getSettings();
  const spent = getWeeklyExpenses();
  const limit = settings.weeklyLimit || 0;
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  return {
    spent,
    limit,
    pct: Math.min(pct, 999),
    over: pct > 100,
    warn: pct >= 80 && pct <= 100,
    remaining: Math.max(0, limit - spent),
  };
}

// ─── Savings rate ─────────────────────────────────────────────────────────────
export function getSavingsRate(year: number, month: number): number {
  const { income, savings } = getMonthlyStats(year, month);
  if (income === 0) return 0;
  return Math.round((savings / income) * 100);
}

// ─── Budget Streak ────────────────────────────────────────────────────────────
// Reconciles and returns the real-time daily spending streak status.
// Evaluates consecutive days from settings limit.
export function getStreakData(): StreakData {
  const settings = getSettings();
  if (!settings.dailyLimitEnabled || settings.dailyLimit <= 0) {
    return { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };
  }

  const defaultStreak: StreakData = {
    currentStreak: 0,
    bestStreak: 0,
    lastStreakUpdatedDate: '',
    lastSuccessfulDay: '',
    lastFailedDay: '',
    lastMilestoneClaimed: 0,
    lastNotificationShownDate: '',
  };
  const data = load<StreakData>(KEYS.streakData, defaultStreak);

  // Helper to format date YYYY-MM-DD in local time
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayStr = formatLocalDate(now);

  // Calculate yesterday's date
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  // Determine reconciliation start point
  let lastUpdated = data.lastStreakUpdatedDate;
  if (!lastUpdated) {
    // If first time, start from yesterday
    lastUpdated = yesterdayStr;
    data.lastStreakUpdatedDate = yesterdayStr;
  }

  // If lastUpdated is in the past (before yesterday), catch up day-by-day
  if (lastUpdated < yesterdayStr) {
    const cursor = new Date(lastUpdated + 'T00:00:00'); // parse as local start of day
    cursor.setDate(cursor.getDate() + 1); // start from day after last updated
    
    // Safety check to prevent infinite loop or huge loops: limit to 365 days
    const limitDate = new Date(now);
    limitDate.setDate(now.getDate() - 365);
    if (cursor < limitDate) {
      cursor.setTime(limitDate.getTime());
    }

    while (formatLocalDate(cursor) <= yesterdayStr) {
      const curStr = formatLocalDate(cursor);
      const spent = getDailyExpenses(cursor.toISOString());

      if (spent <= settings.dailyLimit) {
        data.currentStreak += 1;
        data.lastSuccessfulDay = curStr;
      } else {
        data.currentStreak = 0;
        data.lastFailedDay = curStr;
      }
      data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
      
      data.lastStreakUpdatedDate = curStr;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Now check today's current live state
  const todaySpent = getDailyExpenses(now.toISOString());
  let currentStreakForToday = data.currentStreak;
  let lastSuccessfulDayForToday = data.lastSuccessfulDay;
  let lastFailedDayForToday = data.lastFailedDay;

  if (todaySpent <= settings.dailyLimit) {
    currentStreakForToday = data.currentStreak + 1;
    lastSuccessfulDayForToday = todayStr;
  } else {
    currentStreakForToday = 0;
    lastFailedDayForToday = todayStr;
  }

  // Update best streak
  const bestStreakWithToday = Math.max(data.bestStreak, currentStreakForToday);

  // Compile final status
  const finalStatus: StreakData = {
    currentStreak: currentStreakForToday,
    bestStreak: bestStreakWithToday,
    lastStreakUpdatedDate: todayStr,
    lastSuccessfulDay: lastSuccessfulDayForToday,
    lastFailedDay: lastFailedDayForToday,
    lastMilestoneClaimed: data.lastMilestoneClaimed || 0,
    lastNotificationShownDate: data.lastNotificationShownDate || '',
  };

  // Persist state
  // We only persist the "stable" reconciled history (up to yesterday) so today's dynamic edits don't corrupt the history
  // But if today they exceed the limit, we immediately record it as failed in the saved state!
  if (todaySpent > settings.dailyLimit) {
    data.currentStreak = 0;
    data.lastFailedDay = todayStr;
    data.lastStreakUpdatedDate = todayStr;
    data.bestStreak = Math.max(data.bestStreak, 0);
    save(KEYS.streakData, data);
    
    // Sync to Supabase
    syncToSupabase('streakData' as any, data as any);
  } else {
    // If we were failed today, but now we deleted the transaction and are back under limit:
    if (data.lastStreakUpdatedDate === todayStr && data.lastFailedDay === todayStr) {
      data.currentStreak = Math.max(0, currentStreakForToday - 1); // restore to yesterday's value
      data.lastStreakUpdatedDate = yesterdayStr;
      data.lastFailedDay = data.lastFailedDay === todayStr ? '' : data.lastFailedDay;
      save(KEYS.streakData, data);
      syncToSupabase('streakData' as any, data as any);
    } else {
      // Just save the reconciled yesterday progress
      save(KEYS.streakData, data);
      syncToSupabase('streakData' as any, data as any);
    }
  }

  return finalStatus;
}

// Function to save/update milestone claims or notification shown dates directly
export function saveStreakData(streak: Partial<StreakData>): void {
  const stored = load<StreakData>(KEYS.streakData, {
    currentStreak: 0,
    bestStreak: 0,
    lastStreakUpdatedDate: '',
  });
  
  const merged = { ...stored, ...streak };
  save(KEYS.streakData, merged);
  syncToSupabase('streakData' as any, merged as any);
}

// ─── 7-day spending heatmap (for mini bar chart) ──────────────────────────────
export function get7DaySpending(): { date: string; amount: number; label: string }[] {
  const result: { date: string; amount: number; label: string }[] = [];
  const today = new Date();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({
      date: d.toISOString(),
      amount: getDailyExpenses(d.toISOString()),
      label: i === 0 ? 'Today' : DAYS[d.getDay()],
    });
  }
  return result;
}

// ─── Recurring Transactions ──────────────────────────────────────────────────
export function getRecurringTransactions(): RecurringTransaction[] {
  return load<RecurringTransaction[]>(KEYS.recurring, []);
}

export function addRecurringTransaction(rt: Omit<RecurringTransaction, 'id'>): RecurringTransaction {
  const list = getRecurringTransactions();
  const item: RecurringTransaction = { ...rt, id: uuidv4() };
  list.push(item);
  save(KEYS.recurring, list);
  syncToSupabase('recurring' as any, item as any);
  return item;
}

export function updateRecurringTransaction(rt: RecurringTransaction): void {
  const list = getRecurringTransactions();
  const idx = list.findIndex(item => item.id === rt.id);
  if (idx !== -1) {
    list[idx] = rt;
    save(KEYS.recurring, list);
    syncToSupabase('recurring' as any, rt as any);
  }
}

export function deleteRecurringTransaction(id: string): void {
  let list = getRecurringTransactions();
  list = list.filter(item => item.id !== id);
  save(KEYS.recurring, list);
}

export function processRecurringTransactions(): boolean {
  const allRecurring = getRecurringTransactions();
  if (allRecurring.length === 0) return false;

  const now = new Date();
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(now);
  let changed = false;

  for (const rt of allRecurring) {
    if (!rt.active) continue;

    let nextDue = new Date(rt.nextDueDate + 'T00:00:00');
    let updatedNextDue = new Date(nextDue);
    let lastProcessed = rt.lastProcessedDate;
    let itemMutated = false;

    while (formatLocalDate(updatedNextDue) <= todayStr) {
      const curStr = formatLocalDate(updatedNextDue);
      
      const txn: Omit<Transaction, 'id' | 'createdAt'> = {
        type: rt.type,
        amount: rt.amount,
        category: rt.category,
        account: rt.account,
        date: new Date(curStr + 'T12:00:00').toISOString(),
        note: rt.note ? `${rt.note} (Auto-recurring)` : 'Auto-recurring bill',
      };
      
      addTransaction(txn);
      lastProcessed = curStr;
      itemMutated = true;
      changed = true;

      // Increment next due date
      if (rt.frequency === 'daily') {
        updatedNextDue.setDate(updatedNextDue.getDate() + 1);
      } else if (rt.frequency === 'weekly') {
        updatedNextDue.setDate(updatedNextDue.getDate() + 7);
      } else if (rt.frequency === 'monthly') {
        updatedNextDue.setMonth(updatedNextDue.getMonth() + 1);
      } else if (rt.frequency === 'yearly') {
        updatedNextDue.setFullYear(updatedNextDue.getFullYear() + 1);
      }
    }

    if (itemMutated) {
      rt.nextDueDate = formatLocalDate(updatedNextDue);
      rt.lastProcessedDate = lastProcessed;
    }
  }

  if (changed) {
    save(KEYS.recurring, allRecurring);
  }
  return changed;
}

// ─── Backup / restore ─────────────────────────────────────────────────────────
export function exportAllData(): object {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: load(KEYS.transactions, []),
    budgets: load(KEYS.budgets, []),
    goals: load(KEYS.goals, []),
    accounts: load(KEYS.accounts, []),
    categories: load(KEYS.categories, []),
    settings: load(KEYS.settings, {}),
    streakData: load(KEYS.streakData, {}),
    recurring: load(KEYS.recurring, []),
  };
}

export function importAllData(data: any): void {
  if (data.transactions) save(KEYS.transactions, data.transactions);
  if (data.budgets)      save(KEYS.budgets, data.budgets);
  if (data.goals)        save(KEYS.goals, data.goals);
  if (data.accounts)     save(KEYS.accounts, data.accounts);
  if (data.categories)   save(KEYS.categories, data.categories);
  if (data.settings)     save(KEYS.settings, data.settings);
  if (data.streakData)   save(KEYS.streakData, data.streakData);
  if (data.recurring)    save(KEYS.recurring, data.recurring);
}
