// Database service – Supabase backed with local synchronized cache
import type { Transaction, Budget, Goal, Account, Category, AppSettings, LimitStatus, StreakData, RecurringTransaction, Debt } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from '../data/defaults';
import { v4 as uuidv4 } from '../utils/uuid';
import { getSupabase, isSupabaseConfigured } from './supabase';

const supabase = getSupabase();

// ─── Local storage keys for backup cache ──────────────────────────────────────
const KEYS = {
  transactions: 'finova_transactions',
  budgets: 'finova_budgets',
  goals: 'finova_goals',
  accounts: 'finova_accounts',
  categories: 'finova_categories',
  settings: 'finova_settings',
  streakData: 'finova_streak_data',
  recurring: 'finova_recurring',
  debts: 'finova_debts',
};

// ─── Active cache variables in memory ──────────────────────────────────────────
let _transactions: Transaction[] = [];
let _budgets: Budget[] = [];
let _goals: Goal[] = [];
let _accounts: Account[] = [];
let _categories: Category[] = [];
let _settings: AppSettings = DEFAULT_SETTINGS;
let _streakData: StreakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };
let _recurring: RecurringTransaction[] = [];
let _debts: Debt[] = [];

// ─── Write listener registration ──────────────────────────────────────────────
let _writeListener: (() => void) | null = null;

export function registerWriteListener(cb: () => void) {
  _writeListener = cb;
}

function notifyWrite() {
  if (_writeListener) _writeListener();
}

// ─── Backup Load/Save helpers ────────────────────────────────────────────────
function loadBackup<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function saveBackup<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// Initialize memory cache from backup copy immediately to avoid blank flashes
export function initLocalCache() {
  _transactions = loadBackup<Transaction[]>(KEYS.transactions, []);
  _budgets = loadBackup<Budget[]>(KEYS.budgets, []);
  _goals = loadBackup<Goal[]>(KEYS.goals, []);
  _accounts = loadBackup<Account[]>(KEYS.accounts, DEFAULT_ACCOUNTS.map(a => ({ ...a, isCustom: false })));
  _categories = loadBackup<Category[]>(KEYS.categories, DEFAULT_CATEGORIES.map(c => ({ ...c, isCustom: false })));
  _settings = loadBackup<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
  _streakData = loadBackup<StreakData>(KEYS.streakData, { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' });
  _recurring = loadBackup<RecurringTransaction[]>(KEYS.recurring, []);
  _debts = loadBackup<Debt[]>(KEYS.debts, []);
}

// Trigger initial load
initLocalCache();

// ─── Database Mappings ────────────────────────────────────────────────────────

function mapTxToDb(t: Transaction): any {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    category_id: t.category,
    category_name: _categories.find(c => c.id === t.category)?.name || t.category || '',
    subcategory: t.subcategory || null,
    account_id: t.account,
    to_account_id: t.toAccount || null,
    date: t.date,
    note: t.note || null,
    receipt_url: t.receiptUrl || null,
  };
}

function mapTxFromDb(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category_id,
    subcategory: row.subcategory || undefined,
    account: row.account_id,
    toAccount: row.to_account_id || undefined,
    date: row.date,
    note: row.note || undefined,
    receiptUrl: row.receipt_url || undefined,
    createdAt: row.created_at,
  };
}

function mapBudgetToDb(b: Budget): any {
  return {
    id: b.id,
    name: b.name,
    category_id: b.category === 'all' || !b.category ? null : b.category,
    limit_amount: b.limit,
    spent_amount: b.spent || 0,
    period: b.period,
    start_date: b.startDate,
    end_date: b.endDate || null,
    color: b.color || '#2563EB',
  };
}

function mapBudgetFromDb(row: any): Budget {
  return {
    id: row.id,
    name: row.name,
    category: row.category_id || 'all',
    limit: Number(row.limit_amount),
    spent: Number(row.spent_amount),
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    color: row.color,
  };
}

function mapGoalToDb(g: Goal): any {
  return {
    id: g.id,
    name: g.name,
    target_amount: g.targetAmount,
    current_amount: g.currentAmount,
    target_date: g.targetDate,
    notes: g.notes || null,
    icon: g.icon || '🎯',
    color: g.color || '#2563EB',
    status: g.status || 'active',
  };
}

function mapGoalFromDb(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    targetDate: row.target_date,
    notes: row.notes || undefined,
    icon: row.icon,
    color: row.color,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapAccountToDb(a: Account): any {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance || 0,
    icon: a.icon || '💳',
    color: a.color || '#2563EB',
    is_custom: a.isCustom ?? true,
  };
}

function mapAccountFromDb(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    icon: row.icon,
    color: row.color,
    isCustom: row.is_custom,
  };
}

function mapCategoryToDb(c: Category): any {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    is_custom: c.isCustom ?? true,
  };
}

function mapCategoryFromDb(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isCustom: row.is_custom,
  };
}

function mapSettingsToDb(s: AppSettings): any {
  return {
    currency: s.currency,
    currency_symbol: s.currencySymbol,
    theme: s.theme,
    pin_enabled: s.pinEnabled,
    pin_hash: s.pinHash || null,
    daily_reminder_enabled: s.dailyReminderEnabled,
    daily_reminder_time: s.dailyReminderTime || '21:00',
    budget_alerts_enabled: s.budgetAlertsEnabled,
    language: s.language,
    daily_limit_enabled: s.dailyLimitEnabled,
    daily_limit: s.dailyLimit,
    weekly_limit_enabled: s.weeklyLimitEnabled,
    weekly_limit: s.weeklyLimit,
    savings_goal_percent: s.savingsGoalPercent,
  };
}

function mapSettingsFromDb(row: any): AppSettings {
  return {
    currency: row.currency,
    currencySymbol: row.currency_symbol,
    theme: row.theme,
    pinEnabled: row.pin_enabled,
    pinHash: row.pin_hash || undefined,
    dailyReminderEnabled: row.daily_reminder_enabled,
    budgetAlertsEnabled: row.budget_alerts_enabled,
    language: row.language,
    dailyLimitEnabled: row.daily_limit_enabled,
    dailyLimit: Number(row.daily_limit),
    weeklyLimitEnabled: row.weekly_limit_enabled,
    weeklyLimit: Number(row.weekly_limit),
    savingsGoalPercent: Number(row.savings_goal_percent),
    dailyReminderTime: row.daily_reminder_time || '21:00',
  };
}

function mapStreakToDb(s: StreakData): any {
  return {
    current_streak: s.currentStreak,
    best_streak: s.bestStreak,
    last_spent_date: s.lastStreakUpdatedDate || null,
    last_failed_day: s.lastFailedDay || null,
    last_milestone_claimed: s.lastMilestoneClaimed || null,
    last_notification_shown_date: s.lastNotificationShownDate || null,
  };
}

function mapStreakFromDb(row: any): StreakData {
  return {
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastStreakUpdatedDate: row.last_spent_date || '',
    lastSuccessfulDay: row.last_spent_date || undefined,
    lastFailedDay: row.last_failed_day || undefined,
    lastMilestoneClaimed: row.last_milestone_claimed || undefined,
    lastNotificationShownDate: row.last_notification_shown_date || undefined,
  };
}

function mapRecurringToDb(r: RecurringTransaction): any {
  return {
    id: r.id,
    type: r.type,
    amount: r.amount,
    category_id: r.category,
    account_id: r.account,
    frequency: r.frequency,
    start_date: r.startDate,
    next_due_date: r.nextDueDate,
    last_processed_date: r.lastProcessedDate || null,
    note: r.note || null,
    active: r.active,
  };
}

function mapRecurringFromDb(row: any): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category_id,
    account: row.account_id,
    frequency: row.frequency,
    startDate: row.start_date,
    nextDueDate: row.next_due_date,
    lastProcessedDate: row.last_processed_date || undefined,
    note: row.note || undefined,
    active: row.active,
  };
}

function mapDebtToDb(d: Debt): any {
  return {
    id: d.id,
    contact_name: d.contactName,
    contact_emoji: d.contactEmoji || '👤',
    amount: d.amount,
    direction: d.direction,
    due_date: d.dueDate || null,
    note: d.note || null,
    status: d.status || 'pending',
    settled_at: d.settledAt || null,
  };
}

function mapDebtFromDb(row: any): Debt {
  return {
    id: row.id,
    contactName: row.contact_name,
    contactEmoji: row.contact_emoji,
    amount: Number(row.amount),
    direction: row.direction,
    dueDate: row.due_date || undefined,
    note: row.note || undefined,
    status: row.status,
    createdAt: row.created_at,
    settledAt: row.settled_at || undefined,
  };
}

// ─── Sync provisioning on new user ──────────────────────────────────────────

async function autoProvisionAccounts(uid: string) {
  _accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, isCustom: false }));
  saveBackup(KEYS.accounts, _accounts);
  if (isSupabaseConfigured && supabase) {
    const rows = _accounts.map(a => ({ ...mapAccountToDb(a), user_id: uid }));
    await supabase.from('accounts').insert(rows);
  }
}

async function autoProvisionCategories(uid: string) {
  _categories = DEFAULT_CATEGORIES.map(c => ({ ...c, isCustom: false }));
  saveBackup(KEYS.categories, _categories);
  if (isSupabaseConfigured && supabase) {
    const rows = _categories.map(c => ({ ...mapCategoryToDb(c), user_id: uid }));
    await supabase.from('categories').insert(rows);
  }
}

async function autoProvisionSettings(uid: string) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('settings').insert({ ...mapSettingsToDb(_settings), user_id: uid });
  }
}

async function autoProvisionStreak(uid: string) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('streaks').insert({ ...mapStreakToDb(_streakData), user_id: uid });
  }
}

// ─── PULL ALL FROM SUPABASE (Single Source of Truth Load) ────────────────────

export async function pullAllFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;
  if (!sessionUser) return;
  const uid = sessionUser.id;

  // Ensure user profile exists to satisfy foreign key constraints
  try {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', uid).maybeSingle();
    if (!profile) {
      const name = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User';
      const email = sessionUser.email || '';
      const photo_url = sessionUser.user_metadata?.avatar_url || null;
      await supabase.from('profiles').insert({ id: uid, name, email, photo_url });
    }
  } catch (e) {
    console.error('Failed to ensure profiles record:', e);
  }

  const [txnsRes, budgetsRes, goalsRes, accountsRes, catsRes, settingsRes, streaksRes, recRes, debtsRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', uid),
    supabase.from('budgets').select('*').eq('user_id', uid),
    supabase.from('goals').select('*').eq('user_id', uid),
    supabase.from('accounts').select('*').eq('user_id', uid),
    supabase.from('categories').select('*').or(`user_id.is.null,user_id.eq.${uid}`),
    supabase.from('settings').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('streaks').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('recurring_transactions').select('*').eq('user_id', uid),
    supabase.from('debts').select('*').eq('user_id', uid),
  ]);

  if (txnsRes.data) {
    _transactions = txnsRes.data.map(mapTxFromDb).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    saveBackup(KEYS.transactions, _transactions);
  }
  if (budgetsRes.data) {
    _budgets = budgetsRes.data.map(mapBudgetFromDb);
    saveBackup(KEYS.budgets, _budgets);
  }
  if (goalsRes.data) {
    _goals = goalsRes.data.map(mapGoalFromDb);
    saveBackup(KEYS.goals, _goals);
  }

  if (accountsRes.data && accountsRes.data.length > 0) {
    _accounts = accountsRes.data.map(mapAccountFromDb);
    saveBackup(KEYS.accounts, _accounts);
  } else {
    await autoProvisionAccounts(uid);
  }

  if (catsRes.data && catsRes.data.length > 0) {
    _categories = catsRes.data.map(mapCategoryFromDb);
    saveBackup(KEYS.categories, _categories);
  } else {
    await autoProvisionCategories(uid);
  }

  if (settingsRes.data) {
    _settings = mapSettingsFromDb(settingsRes.data);
    saveBackup(KEYS.settings, _settings);
  } else {
    await autoProvisionSettings(uid);
  }

  if (streaksRes.data) {
    _streakData = mapStreakFromDb(streaksRes.data);
    saveBackup(KEYS.streakData, _streakData);
  } else {
    await autoProvisionStreak(uid);
  }

  if (recRes.data) {
    _recurring = recRes.data.map(mapRecurringFromDb);
    saveBackup(KEYS.recurring, _recurring);
  }
  if (debtsRes.data) {
    _debts = debtsRes.data.map(mapDebtFromDb);
    saveBackup(KEYS.debts, _debts);
  }
}

// ─── Read Operations (Synchronous from Cache) ────────────────────────────────

export function getTransactions(): Transaction[] {
  return _transactions;
}

export function getAccounts(): Account[] {
  return _accounts;
}

export function getCategories(): Category[] {
  return _categories;
}

export function getBudgets(): Budget[] {
  return _budgets;
}

export function getGoals(): Goal[] {
  return _goals;
}

export function getSettings(): AppSettings {
  return _settings;
}

export function getRecurringTransactions(): RecurringTransaction[] {
  return _recurring;
}

export function getDebts(): Debt[] {
  return _debts;
}

// ─── Write Operations (Supabase API first -> cache update -> notify) ─────────

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const t: Transaction = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapTxToDb(t), user_id: uid };
      const { error } = await supabase.from('transactions').insert(row);
      if (error) throw error;
    }
  }

  _transactions.push(t);
  _transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveBackup(KEYS.transactions, _transactions);

  const acc = _accounts.find(a => a.id === data.account);
  if (acc) {
    if (data.type === 'income') acc.balance += data.amount;
    else if (data.type === 'expense') acc.balance -= data.amount;
    else if (data.type === 'transfer') {
      acc.balance -= data.amount;
      const toAcc = _accounts.find(a => a.id === data.toAccount);
      if (toAcc) {
        toAcc.balance += data.amount;
        if (isSupabaseConfigured && supabase) {
          await supabase.from('accounts').update(mapAccountToDb(toAcc)).eq('id', toAcc.id);
        }
      }
    }
    saveBackup(KEYS.accounts, _accounts);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('accounts').update(mapAccountToDb(acc)).eq('id', acc.id);
    }
  }

  if (data.type === 'expense') {
    await updateBudgetSpent(data.category, data.amount, data.date);
  }

  notifyWrite();
  return t;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  const idx = _transactions.findIndex(t => t.id === id);
  if (idx === -1) return;
  const old = _transactions[idx];

  // Reverse old transaction balance impact
  const oldAcc = _accounts.find(a => a.id === old.account);
  if (oldAcc) {
    if (old.type === 'income') oldAcc.balance -= old.amount;
    else if (old.type === 'expense') oldAcc.balance += old.amount;
    else if (old.type === 'transfer') {
      oldAcc.balance += old.amount;
      const oldTo = _accounts.find(a => a.id === old.toAccount);
      if (oldTo) oldTo.balance -= old.amount;
    }
  }

  if (old.type === 'expense') {
    await reverseBudgetSpent(old.category, old.amount, old.date);
  }

  const updated: Transaction = { ...old, ...data };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('transactions').update(mapTxToDb(updated)).eq('id', id);
    if (error) throw error;
  }

  _transactions[idx] = updated;
  saveBackup(KEYS.transactions, _transactions);

  // Apply new transaction balance impact
  const newAcc = _accounts.find(a => a.id === updated.account);
  if (newAcc) {
    if (updated.type === 'income') newAcc.balance += updated.amount;
    else if (updated.type === 'expense') newAcc.balance -= updated.amount;
    else if (updated.type === 'transfer') {
      newAcc.balance -= updated.amount;
      const newTo = _accounts.find(a => a.id === updated.toAccount);
      if (newTo) {
        newTo.balance += updated.amount;
        if (isSupabaseConfigured && supabase) {
          await supabase.from('accounts').update(mapAccountToDb(newTo)).eq('id', newTo.id);
        }
      }
    }
    saveBackup(KEYS.accounts, _accounts);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('accounts').update(mapAccountToDb(newAcc)).eq('id', newAcc.id);
    }
  }

  if (updated.type === 'expense') {
    await updateBudgetSpent(updated.category, updated.amount, updated.date);
  }

  notifyWrite();
}

export async function deleteTransaction(id: string): Promise<void> {
  const txn = _transactions.find(t => t.id === id);
  if (!txn) return;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  _transactions = _transactions.filter(t => t.id !== id);
  saveBackup(KEYS.transactions, _transactions);

  const acc = _accounts.find(a => a.id === txn.account);
  if (acc) {
    if (txn.type === 'income') acc.balance -= txn.amount;
    else if (txn.type === 'expense') acc.balance += txn.amount;
    else if (txn.type === 'transfer') {
      acc.balance += txn.amount;
      const toAcc = _accounts.find(a => a.id === txn.toAccount);
      if (toAcc) {
        toAcc.balance -= txn.amount;
        if (isSupabaseConfigured && supabase) {
          await supabase.from('accounts').update(mapAccountToDb(toAcc)).eq('id', toAcc.id);
        }
      }
    }
    saveBackup(KEYS.accounts, _accounts);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('accounts').update(mapAccountToDb(acc)).eq('id', acc.id);
    }
  }

  if (txn.type === 'expense') {
    await reverseBudgetSpent(txn.category, txn.amount, txn.date);
  }

  notifyWrite();
}

// ─── Accounts CRUD ───────────────────────────────────────────────────────────

export async function addAccount(data: Omit<Account, 'id'>): Promise<Account> {
  const acc: Account = { ...data, id: uuidv4(), isCustom: true };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapAccountToDb(acc), user_id: uid };
      const { error } = await supabase.from('accounts').insert(row);
      if (error) throw error;
    }
  }

  _accounts.push(acc);
  saveBackup(KEYS.accounts, _accounts);
  notifyWrite();
  return acc;
}

export async function deleteAccount(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }

  _accounts = _accounts.filter(a => a.id !== id);
  saveBackup(KEYS.accounts, _accounts);
  notifyWrite();
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      for (const a of accounts) {
        await supabase.from('accounts').upsert({ ...mapAccountToDb(a), user_id: uid });
      }
    }
  }
  _accounts = accounts;
  saveBackup(KEYS.accounts, _accounts);
  notifyWrite();
}

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export async function addCategory(data: Omit<Category, 'id'>): Promise<Category> {
  const cat: Category = { ...data, id: uuidv4(), isCustom: true };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapCategoryToDb(cat), user_id: uid };
      const { error } = await supabase.from('categories').insert(row);
      if (error) throw error;
    }
  }

  _categories.push(cat);
  saveBackup(KEYS.categories, _categories);
  notifyWrite();
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  _categories = _categories.filter(c => c.id !== id);
  saveBackup(KEYS.categories, _categories);
  notifyWrite();
}

// ─── Budgets CRUD ────────────────────────────────────────────────────────────

export async function addBudget(data: Omit<Budget, 'id' | 'spent'>): Promise<Budget> {
  const b: Budget = { ...data, id: uuidv4(), spent: 0 };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapBudgetToDb(b), user_id: uid };
      const { error } = await supabase.from('budgets').insert(row);
      if (error) throw error;
    }
  }

  _budgets.push(b);
  saveBackup(KEYS.budgets, _budgets);
  notifyWrite();
  return b;
}

export async function updateBudget(id: string, data: Partial<Budget>): Promise<void> {
  const idx = _budgets.findIndex(b => b.id === id);
  if (idx === -1) return;
  const updated = { ..._budgets[idx], ...data };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('budgets').update(mapBudgetToDb(updated)).eq('id', id);
    if (error) throw error;
  }

  _budgets[idx] = updated;
  saveBackup(KEYS.budgets, _budgets);
  notifyWrite();
}

export async function deleteBudget(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
  }

  _budgets = _budgets.filter(b => b.id !== id);
  saveBackup(KEYS.budgets, _budgets);
  notifyWrite();
}

async function updateBudgetSpent(category: string, amount: number, dateStr: string) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  let changed = false;

  for (const b of _budgets) {
    const isCatMatch = b.category === 'all' || b.category === category;
    if (!isCatMatch) continue;

    let dateMatch = false;
    const bStart = new Date(b.startDate);
    if (b.period === 'monthly') {
      dateMatch = bStart.getFullYear() === year && bStart.getMonth() === month;
    } else if (b.period === 'weekly') {
      const diff = date.getTime() - bStart.getTime();
      dateMatch = diff >= 0 && diff <= 7 * 86400000;
    } else if (b.period === 'daily') {
      dateMatch = date.toDateString() === bStart.toDateString();
    } else if (b.period === 'custom') {
      const bEnd = b.endDate ? new Date(b.endDate) : null;
      dateMatch = date >= bStart && (!bEnd || date <= bEnd);
    }

    if (dateMatch) {
      b.spent += amount;
      changed = true;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('budgets').update(mapBudgetToDb(b)).eq('id', b.id);
      }
    }
  }

  if (changed) {
    saveBackup(KEYS.budgets, _budgets);
  }
}

async function reverseBudgetSpent(category: string, amount: number, dateStr: string) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  let changed = false;

  for (const b of _budgets) {
    const isCatMatch = b.category === 'all' || b.category === category;
    if (!isCatMatch) continue;

    let dateMatch = false;
    const bStart = new Date(b.startDate);
    if (b.period === 'monthly') {
      dateMatch = bStart.getFullYear() === year && bStart.getMonth() === month;
    } else if (b.period === 'weekly') {
      const diff = date.getTime() - bStart.getTime();
      dateMatch = diff >= 0 && diff <= 7 * 86400000;
    } else if (b.period === 'daily') {
      dateMatch = date.toDateString() === bStart.toDateString();
    } else if (b.period === 'custom') {
      const bEnd = b.endDate ? new Date(b.endDate) : null;
      dateMatch = date >= bStart && (!bEnd || date <= bEnd);
    }

    if (dateMatch) {
      b.spent = Math.max(0, b.spent - amount);
      changed = true;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('budgets').update(mapBudgetToDb(b)).eq('id', b.id);
      }
    }
  }

  if (changed) {
    saveBackup(KEYS.budgets, _budgets);
  }
}

// ─── Goals CRUD ──────────────────────────────────────────────────────────────

export async function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
  const g: Goal = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapGoalToDb(g), user_id: uid };
      const { error } = await supabase.from('goals').insert(row);
      if (error) throw error;
    }
  }

  _goals.push(g);
  saveBackup(KEYS.goals, _goals);
  notifyWrite();
  return g;
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<void> {
  const idx = _goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  const updated = { ..._goals[idx], ...data };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('goals').update(mapGoalToDb(updated)).eq('id', id);
    if (error) throw error;
  }

  _goals[idx] = updated;
  saveBackup(KEYS.goals, _goals);
  notifyWrite();
}

export async function deleteGoal(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  }

  _goals = _goals.filter(g => g.id !== id);
  saveBackup(KEYS.goals, _goals);
  notifyWrite();
}

// ─── Settings CRUD ───────────────────────────────────────────────────────────

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const { error } = await supabase.from('settings').upsert({ ...mapSettingsToDb(settings), user_id: uid });
      if (error) throw error;
    }
  }
  _settings = settings;
  saveBackup(KEYS.settings, _settings);
  notifyWrite();
}

// ─── Streaks CRUD ────────────────────────────────────────────────────────────

export async function saveStreakData(streak: Partial<StreakData>): Promise<void> {
  const merged = { ..._streakData, ...streak };
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      await supabase.from('streaks').upsert({ ...mapStreakToDb(merged), user_id: uid });
    }
  }
  _streakData = merged;
  saveBackup(KEYS.streakData, _streakData);
  notifyWrite();
}

// ─── Recurring Transactions CRUD ─────────────────────────────────────────────

export async function addRecurringTransaction(rt: Omit<RecurringTransaction, 'id'>): Promise<RecurringTransaction> {
  const item: RecurringTransaction = { ...rt, id: uuidv4() };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const { error } = await supabase.from('recurring_transactions').insert({ ...mapRecurringToDb(item), user_id: uid });
      if (error) throw error;
    }
  }

  _recurring.push(item);
  saveBackup(KEYS.recurring, _recurring);
  notifyWrite();
  return item;
}

export async function updateRecurringTransaction(rt: RecurringTransaction): Promise<void> {
  const idx = _recurring.findIndex(item => item.id === rt.id);
  if (idx !== -1) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('recurring_transactions').update(mapRecurringToDb(rt)).eq('id', rt.id);
      if (error) throw error;
    }
    _recurring[idx] = rt;
    saveBackup(KEYS.recurring, _recurring);
    notifyWrite();
  }
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
  }
  _recurring = _recurring.filter(item => item.id !== id);
  saveBackup(KEYS.recurring, _recurring);
  notifyWrite();
}

export async function processRecurringTransactions(): Promise<boolean> {
  if (_recurring.length === 0) return false;

  const now = new Date();
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(now);
  let changed = false;

  for (const rt of _recurring) {
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
      
      await addTransaction(txn);
      lastProcessed = curStr;
      itemMutated = true;
      changed = true;

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
      if (isSupabaseConfigured && supabase) {
        await supabase.from('recurring_transactions').update(mapRecurringToDb(rt)).eq('id', rt.id);
      }
    }
  }

  if (changed) {
    saveBackup(KEYS.recurring, _recurring);
    notifyWrite();
  }
  return changed;
}

// ─── Debts CRUD ──────────────────────────────────────────────────────────────

export async function addDebt(data: Omit<Debt, 'id' | 'createdAt' | 'status'>): Promise<Debt> {
  const d: Debt = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      const row = { ...mapDebtToDb(d), user_id: uid };
      const { error } = await supabase.from('debts').insert(row);
      if (error) throw error;
    }
  }

  _debts.push(d);
  saveBackup(KEYS.debts, _debts);
  notifyWrite();
  return d;
}

export async function settleDebt(id: string): Promise<void> {
  const idx = _debts.findIndex(d => d.id === id);
  if (idx === -1) return;
  const updated: Debt = {
    ..._debts[idx],
    status: 'settled',
    settledAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('debts').update(mapDebtToDb(updated)).eq('id', id);
    if (error) throw error;
  }

  _debts[idx] = updated;
  saveBackup(KEYS.debts, _debts);
  notifyWrite();
}

export async function deleteDebt(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) throw error;
  }

  _debts = _debts.filter(d => d.id !== id);
  saveBackup(KEYS.debts, _debts);
  notifyWrite();
}

export function getPendingDebtsSummary(): { totalLent: number; totalBorrowed: number; netOwed: number } {
  const pending = _debts.filter(d => d.status === 'pending');
  const totalLent = pending.filter(d => d.direction === 'lent').reduce((s, d) => s + d.amount, 0);
  const totalBorrowed = pending.filter(d => d.direction === 'borrowed').reduce((s, d) => s + d.amount, 0);
  return { totalLent, totalBorrowed, netOwed: totalLent - totalBorrowed };
}

// ─── Computed Statistics helpers (synchronous from live cache) ───────────────

export function getMonthlyStats(year: number, month: number) {
  const txns = _transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, savings: income - expense, transactions: txns };
}

export function getTotalBalance(): number {
  let hiddenIds: string[] = [];
  try {
    const raw = localStorage.getItem('finova_hidden_accounts');
    hiddenIds = raw ? JSON.parse(raw) : [];
  } catch {
    hiddenIds = [];
  }
  return _accounts
    .filter(a => !hiddenIds.includes(a.id))
    .reduce((s, a) => s + a.balance, 0);
}

export function getDailyExpenses(dateISO: string): number {
  const d = new Date(dateISO);
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  return _transactions
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
  return _transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= weekAgo)
    .reduce((s, t) => s + t.amount, 0);
}

export function getDailyLimitStatus(): LimitStatus {
  const spent = getDailyExpenses(new Date().toISOString());
  const limit = _settings.dailyLimit || 0;
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
  const spent = getWeeklyExpenses();
  const limit = _settings.weeklyLimit || 0;
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

export function getSavingsRate(year: number, month: number): number {
  const { income, savings } = getMonthlyStats(year, month);
  if (income === 0) return 0;
  return Math.round((savings / income) * 100);
}

export function getStreakData(): StreakData {
  if (!_settings.dailyLimitEnabled || _settings.dailyLimit <= 0) {
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
  const data = _streakData || defaultStreak;

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayStr = formatLocalDate(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  let lastUpdated = data.lastStreakUpdatedDate;
  if (!lastUpdated) {
    lastUpdated = yesterdayStr;
    data.lastStreakUpdatedDate = yesterdayStr;
  }

  if (lastUpdated < yesterdayStr) {
    const cursor = new Date(lastUpdated + 'T00:00:00');
    cursor.setDate(cursor.getDate() + 1);
    
    const limitDate = new Date(now);
    limitDate.setDate(now.getDate() - 365);
    if (cursor < limitDate) {
      cursor.setTime(limitDate.getTime());
    }

    while (formatLocalDate(cursor) <= yesterdayStr) {
      const curStr = formatLocalDate(cursor);
      const spent = getDailyExpenses(cursor.toISOString());

      if (spent <= _settings.dailyLimit) {
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

  const todaySpent = getDailyExpenses(now.toISOString());
  let currentStreakForToday = data.currentStreak;
  let lastSuccessfulDayForToday = data.lastSuccessfulDay;
  let lastFailedDayForToday = data.lastFailedDay;

  if (todaySpent <= _settings.dailyLimit) {
    currentStreakForToday = data.currentStreak + 1;
    lastSuccessfulDayForToday = todayStr;
  } else {
    currentStreakForToday = 0;
    lastFailedDayForToday = todayStr;
  }

  const bestStreakWithToday = Math.max(data.bestStreak, currentStreakForToday);

  const finalStatus: StreakData = {
    currentStreak: currentStreakForToday,
    bestStreak: bestStreakWithToday,
    lastStreakUpdatedDate: todayStr,
    lastSuccessfulDay: lastSuccessfulDayForToday,
    lastFailedDay: lastFailedDayForToday,
    lastMilestoneClaimed: data.lastMilestoneClaimed || 0,
    lastNotificationShownDate: data.lastNotificationShownDate || '',
  };

  if (todaySpent > _settings.dailyLimit) {
    data.currentStreak = 0;
    data.lastFailedDay = todayStr;
    data.lastStreakUpdatedDate = todayStr;
    data.bestStreak = Math.max(data.bestStreak, 0);
    _streakData = data;
    saveBackup(KEYS.streakData, data);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: sess }) => {
        const uid = sess?.session?.user?.id;
        if (uid) supabase.from('streaks').upsert({ ...mapStreakToDb(data), user_id: uid });
      });
    }
  } else {
    if (data.lastStreakUpdatedDate === todayStr && data.lastFailedDay === todayStr) {
      data.currentStreak = Math.max(0, currentStreakForToday - 1);
      data.lastStreakUpdatedDate = yesterdayStr;
      data.lastFailedDay = '';
      _streakData = data;
      saveBackup(KEYS.streakData, data);
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: sess }) => {
          const uid = sess?.session?.user?.id;
          if (uid) supabase.from('streaks').upsert({ ...mapStreakToDb(data), user_id: uid });
        });
      }
    } else {
      _streakData = data;
      saveBackup(KEYS.streakData, data);
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: sess }) => {
          const uid = sess?.session?.user?.id;
          if (uid) supabase.from('streaks').upsert({ ...mapStreakToDb(data), user_id: uid });
        });
      }
    }
  }

  return finalStatus;
}

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

// ─── Backup All Data ─────────────────────────────────────────────────────────

export function exportAllData(): object {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: _transactions,
    budgets: _budgets,
    goals: _goals,
    accounts: _accounts,
    categories: _categories,
    settings: _settings,
    streakData: _streakData,
    recurring: _recurring,
    debts: _debts,
  };
}

export function importAllData(data: any): void {
  if (data.transactions) { _transactions = data.transactions; saveBackup(KEYS.transactions, _transactions); }
  if (data.budgets)      { _budgets = data.budgets; saveBackup(KEYS.budgets, _budgets); }
  if (data.goals)        { _goals = data.goals; saveBackup(KEYS.goals, _goals); }
  if (data.accounts)     { _accounts = data.accounts; saveBackup(KEYS.accounts, _accounts); }
  if (data.categories)   { _categories = data.categories; saveBackup(KEYS.categories, _categories); }
  if (data.settings)     { _settings = data.settings; saveBackup(KEYS.settings, _settings); }
  if (data.streakData)   { _streakData = data.streakData; saveBackup(KEYS.streakData, _streakData); }
  if (data.recurring)    { _recurring = data.recurring; saveBackup(KEYS.recurring, _recurring); }
  if (data.debts)        { _debts = data.debts; saveBackup(KEYS.debts, _debts); }
  notifyWrite();
}

export async function clearAllData(): Promise<void> {
  // 1. Clear local memory cache variables
  _transactions = [];
  _budgets = [];
  _goals = [];
  _recurring = [];
  _debts = [];
  
  // Re-initialize accounts and categories to default templates (non-custom)
  _accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, isCustom: false }));
  _categories = DEFAULT_CATEGORIES.map(c => ({ ...c, isCustom: false }));
  _settings = DEFAULT_SETTINGS;
  _streakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };

  // 2. Clear localStorage
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('finova_pin_hash');
  localStorage.removeItem('finova_hidden_accounts');

  // 3. Clear from Supabase if logged in
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (uid) {
      try {
        await Promise.all([
          supabase.from('transactions').delete().eq('user_id', uid),
          supabase.from('budgets').delete().eq('user_id', uid),
          supabase.from('goals').delete().eq('user_id', uid),
          supabase.from('recurring_transactions').delete().eq('user_id', uid),
          supabase.from('debts').delete().eq('user_id', uid),
          supabase.from('accounts').delete().eq('user_id', uid),
          supabase.from('categories').delete().eq('user_id', uid),
          supabase.from('settings').delete().eq('user_id', uid),
          supabase.from('streaks').delete().eq('user_id', uid),
        ]);
        // Re-provision settings, streaks, and default accounts/categories in database
        await Promise.all([
          supabase.from('settings').insert({ ...mapSettingsToDb(DEFAULT_SETTINGS), user_id: uid }),
          supabase.from('streaks').insert({ ...mapStreakToDb({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' }), user_id: uid }),
          autoProvisionAccounts(uid),
          autoProvisionCategories(uid)
        ]);
      } catch (err) {
        console.error('Failed to clear Supabase user data:', err);
      }
    }
  }

  notifyWrite();
}
