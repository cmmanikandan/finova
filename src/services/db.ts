// Database service – Supabase is the ONLY source of truth.
// Financial data is NEVER stored in localStorage, sessionStorage, or any browser cache.
// In-memory state is populated exclusively from Supabase after a successful fetch.
import type {
  Transaction, Budget, Goal, Account, Category,
  AppSettings, LimitStatus, StreakData, RecurringTransaction,
  Debt, Challenge, SplitBillItem,
} from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from '../data/defaults';
import { v4 as uuidv4 } from '../utils/uuid';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { getAuth } from 'firebase/auth';
import { app } from './firebase';

const supabase = getSupabase();

// ─── In-memory Runtime State (populated from Supabase, never localStorage) ────
// These are reset to empty on every login and filled via pullAllFromSupabase().
let _transactions: Transaction[] = [];
let _budgets: Budget[] = [];
let _goals: Goal[] = [];
let _accounts: Account[] = [];
let _categories: Category[] = [];
let _settings: AppSettings = { ...DEFAULT_SETTINGS };
let _streakData: StreakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };
let _recurring: RecurringTransaction[] = [];
let _debts: Debt[] = [];
let _challenges: Challenge[] = [];
let _splitBills: SplitBillItem[] = [];


// Clear all in-memory state when user changes (never reads from localStorage)
export function setUserIdForCache(_uid: string | null) {
  _transactions = [];
  _budgets = [];
  _goals = [];
  _accounts = [];
  _categories = [];
  _settings = { ...DEFAULT_SETTINGS };
  _streakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };
  _recurring = [];
  _debts = [];
  _challenges = [];
  _splitBills = [];
}

// ─── Write listener registration ──────────────────────────────────────────────
let _writeListener: (() => void) | null = null;

export function registerWriteListener(cb: () => void) {
  _writeListener = cb;
}

function notifyWrite() {
  if (_writeListener) _writeListener();
}

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

function mapChallengeToDb(c: Challenge): any {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    target_category: c.targetCategory || null,
    limit_amount: c.limitAmount,
    duration_days: c.durationDays,
    start_date: c.startDate,
    end_date: c.endDate,
    status: c.status,
    checked_days: c.checkedDays,
  };
}

function mapChallengeFromDb(row: any): Challenge {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    targetCategory: row.target_category || undefined,
    limitAmount: Number(row.limit_amount),
    durationDays: row.duration_days,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    checkedDays: row.checked_days || [],
  };
}

function mapSplitBillToDb(s: SplitBillItem): any {
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    description: s.description || null,
    date: s.date,
    category: s.category,
    method: s.method,
    members: s.members,
    upi_id: s.upiId,
    receiver_name: s.receiverName,
    status: s.status,
  };
}

function mapSplitBillFromDb(row: any): SplitBillItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    description: row.description || '',
    date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
    category: row.category,
    method: row.method,
    members: row.members || [],
    upiId: row.upi_id || '',
    receiverName: row.receiver_name || '',
    status: row.status,
  };
}

// ─── Sync provisioning on new user ──────────────────────────────────────────
// Creates default accounts/categories/settings/streak in Supabase on first login.

async function autoProvisionAccounts(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const suffix = `_${uid}`;
  _accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, id: `${a.id}${suffix}`, isCustom: false }));
  const rows = _accounts.map(a => ({ ...mapAccountToDb(a), user_id: uid }));
  const { error } = await supabase.from('accounts').insert(rows);
  if (error) console.error('Failed to auto-provision accounts:', error);
}

async function autoProvisionCategories(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const suffix = `_${uid}`;
  _categories = DEFAULT_CATEGORIES.map(c => ({ ...c, id: `${c.id}${suffix}`, isCustom: false }));
  const rows = _categories.map(c => ({ ...mapCategoryToDb(c), user_id: uid }));
  const { error } = await supabase.from('categories').insert(rows);
  if (error) console.error('Failed to auto-provision categories:', error);
}

async function autoProvisionSettings(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('settings')
    .insert({ ...mapSettingsToDb(_settings), user_id: uid });
  if (error) console.error('Failed to auto-provision settings:', error);
}

async function autoProvisionStreak(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('streaks')
    .insert({ ...mapStreakToDb(_streakData), user_id: uid });
  if (error) console.error('Failed to auto-provision streaks:', error);
}

// ─── PULL ALL FROM SUPABASE (Single Source of Truth Load) ────────────────────
// This is the ONLY function that populates in-memory state.
// It is called on login and after every Realtime change event.

export async function pullAllFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;
  const uid = firebaseUser.uid;

  // Ensure user profile exists to satisfy foreign key constraints
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle();
    if (!profile) {
      const name =
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'User';
      const email = firebaseUser.email || '';
      const photo_url = firebaseUser.photoURL || null;
      await supabase.from('profiles').insert({ id: uid, name, email, photo_url });
    }
  } catch (e) {
    console.error('Failed to ensure profiles record:', e);
  }

  const [
    txnsRes, budgetsRes, goalsRes, accountsRes, catsRes,
    settingsRes, streaksRes, recRes, debtsRes, challengesRes, splitBillsRes,
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
    supabase.from('budgets').select('*').eq('user_id', uid),
    supabase.from('goals').select('*').eq('user_id', uid),
    supabase.from('accounts').select('*').eq('user_id', uid),
    supabase.from('categories').select('*').or(`user_id.is.null,user_id.eq.${uid}`),
    supabase.from('settings').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('streaks').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('recurring_transactions').select('*').eq('user_id', uid),
    supabase.from('debts').select('*').eq('user_id', uid),
    supabase.from('challenges').select('*').eq('user_id', uid),
    supabase.from('split_bills').select('*').eq('user_id', uid),
  ]);

  // Populate in-memory state from Supabase responses only
  if (txnsRes.data) {
    _transactions = txnsRes.data.map(mapTxFromDb);
  }
  if (budgetsRes.data) {
    _budgets = budgetsRes.data.map(mapBudgetFromDb);
  }
  if (goalsRes.data) {
    _goals = goalsRes.data.map(mapGoalFromDb);
  }

  if (accountsRes.data && accountsRes.data.length > 0) {
    _accounts = accountsRes.data.map(mapAccountFromDb);
  } else {
    await autoProvisionAccounts(uid);
  }

  if (catsRes.data && catsRes.data.length > 0) {
    _categories = catsRes.data.map(mapCategoryFromDb);
  } else {
    await autoProvisionCategories(uid);
  }

  if (settingsRes.data) {
    _settings = mapSettingsFromDb(settingsRes.data);
  } else {
    await autoProvisionSettings(uid);
  }

  if (streaksRes.data) {
    _streakData = mapStreakFromDb(streaksRes.data);
  } else {
    await autoProvisionStreak(uid);
  }

  if (recRes.data) {
    _recurring = recRes.data.map(mapRecurringFromDb);
  }
  if (debtsRes.data) {
    _debts = debtsRes.data.map(mapDebtFromDb);
  }
  if (challengesRes.data) {
    _challenges = challengesRes.data.map(mapChallengeFromDb);
  }
  if (splitBillsRes.data) {
    _splitBills = splitBillsRes.data.map(mapSplitBillFromDb);
  }
}

// ─── Read Operations (Synchronous from In-Memory State) ──────────────────────
// In-memory state is populated exclusively from pullAllFromSupabase().

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

// ─── Write Operations (Supabase FIRST → memory update on success) ─────────────
// CRITICAL: Never update in-memory state before Supabase confirms success.
// If Supabase insert/update/delete fails, throw the error.
// Never fake success. Never update UI on failure.

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add transaction.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const t: Transaction = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  // 1. Write to Supabase first
  const row = { ...mapTxToDb(t), user_id: uid };
  const { error: txnError } = await supabase.from('transactions').insert(row);
  if (txnError) throw txnError;

  // 2. Update account balance in Supabase
  const acc = _accounts.find(a => a.id === data.account);
  if (acc) {
    const updatedAcc = { ...acc };
    if (data.type === 'income') updatedAcc.balance += data.amount;
    else if (data.type === 'expense') updatedAcc.balance -= data.amount;
    else if (data.type === 'transfer') {
      updatedAcc.balance -= data.amount;
      const toAcc = _accounts.find(a => a.id === data.toAccount);
      if (toAcc) {
        const updatedToAcc = { ...toAcc, balance: toAcc.balance + data.amount };
        const { error: toAccErr } = await supabase
          .from('accounts')
          .update({ balance: updatedToAcc.balance })
          .eq('id', toAcc.id);
        if (!toAccErr) {
          const idx = _accounts.findIndex(a => a.id === toAcc.id);
          if (idx !== -1) _accounts[idx] = updatedToAcc;
        }
      }
    }
    const { error: accError } = await supabase
      .from('accounts')
      .update({ balance: updatedAcc.balance })
      .eq('id', acc.id);
    if (!accError) {
      const idx = _accounts.findIndex(a => a.id === acc.id);
      if (idx !== -1) _accounts[idx] = updatedAcc;
    }
  }

  // 3. Update budget spent if it's an expense
  if (data.type === 'expense') {
    await updateBudgetSpent(data.category, data.amount, data.date);
  }

  // 4. Update in-memory state only after all Supabase writes succeed
  _transactions.unshift(t);
  _transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  notifyWrite();
  return t;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update transaction.');
  }

  const idx = _transactions.findIndex(t => t.id === id);
  if (idx === -1) return;
  const old = _transactions[idx];

  // Reverse old transaction balance impact in Supabase first
  const oldAcc = _accounts.find(a => a.id === old.account);
  if (oldAcc) {
    let revertedBalance = oldAcc.balance;
    if (old.type === 'income') revertedBalance -= old.amount;
    else if (old.type === 'expense') revertedBalance += old.amount;
    else if (old.type === 'transfer') {
      revertedBalance += old.amount;
      const oldTo = _accounts.find(a => a.id === old.toAccount);
      if (oldTo) {
        const revertedToBalance = oldTo.balance - old.amount;
        await supabase.from('accounts').update({ balance: revertedToBalance }).eq('id', oldTo.id);
        const toIdx = _accounts.findIndex(a => a.id === oldTo.id);
        if (toIdx !== -1) _accounts[toIdx] = { ...oldTo, balance: revertedToBalance };
      }
    }
    await supabase.from('accounts').update({ balance: revertedBalance }).eq('id', oldAcc.id);
    const accIdx = _accounts.findIndex(a => a.id === oldAcc.id);
    if (accIdx !== -1) _accounts[accIdx] = { ...oldAcc, balance: revertedBalance };
  }

  if (old.type === 'expense') {
    await reverseBudgetSpent(old.category, old.amount, old.date);
  }

  const updated: Transaction = { ...old, ...data };

  // Write updated transaction to Supabase
  const { error } = await supabase.from('transactions').update(mapTxToDb(updated)).eq('id', id);
  if (error) throw error;

  _transactions[idx] = updated;

  // Apply new transaction balance impact
  const newAcc = _accounts.find(a => a.id === updated.account);
  if (newAcc) {
    let newBalance = newAcc.balance;
    if (updated.type === 'income') newBalance += updated.amount;
    else if (updated.type === 'expense') newBalance -= updated.amount;
    else if (updated.type === 'transfer') {
      newBalance -= updated.amount;
      const newTo = _accounts.find(a => a.id === updated.toAccount);
      if (newTo) {
        const newToBalance = newTo.balance + updated.amount;
        await supabase.from('accounts').update({ balance: newToBalance }).eq('id', newTo.id);
        const toIdx = _accounts.findIndex(a => a.id === newTo.id);
        if (toIdx !== -1) _accounts[toIdx] = { ...newTo, balance: newToBalance };
      }
    }
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', newAcc.id);
    const accIdx = _accounts.findIndex(a => a.id === newAcc.id);
    if (accIdx !== -1) _accounts[accIdx] = { ...newAcc, balance: newBalance };
  }

  if (updated.type === 'expense') {
    await updateBudgetSpent(updated.category, updated.amount, updated.date);
  }

  notifyWrite();
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete transaction.');
  }

  const txn = _transactions.find(t => t.id === id);
  if (!txn) return;

  // Delete from Supabase first
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;

  // Reverse balance impact
  const acc = _accounts.find(a => a.id === txn.account);
  if (acc) {
    let revertedBalance = acc.balance;
    if (txn.type === 'income') revertedBalance -= txn.amount;
    else if (txn.type === 'expense') revertedBalance += txn.amount;
    else if (txn.type === 'transfer') {
      revertedBalance += txn.amount;
      const toAcc = _accounts.find(a => a.id === txn.toAccount);
      if (toAcc) {
        const revertedToBalance = toAcc.balance - txn.amount;
        await supabase.from('accounts').update({ balance: revertedToBalance }).eq('id', toAcc.id);
        const toIdx = _accounts.findIndex(a => a.id === toAcc.id);
        if (toIdx !== -1) _accounts[toIdx] = { ...toAcc, balance: revertedToBalance };
      }
    }
    await supabase.from('accounts').update({ balance: revertedBalance }).eq('id', acc.id);
    const accIdx = _accounts.findIndex(a => a.id === acc.id);
    if (accIdx !== -1) _accounts[accIdx] = { ...acc, balance: revertedBalance };
  }

  if (txn.type === 'expense') {
    await reverseBudgetSpent(txn.category, txn.amount, txn.date);
  }

  // Update memory only after successful Supabase delete
  _transactions = _transactions.filter(t => t.id !== id);

  notifyWrite();
}

// ─── Accounts CRUD ───────────────────────────────────────────────────────────

export async function addAccount(data: Omit<Account, 'id'>): Promise<Account> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add account.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const acc: Account = { ...data, id: uuidv4(), isCustom: true };
  const row = { ...mapAccountToDb(acc), user_id: uid };
  const { error } = await supabase.from('accounts').insert(row);
  if (error) throw error;

  _accounts.push(acc);
  notifyWrite();
  return acc;
}

export async function deleteAccount(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete account.');
  }

  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;

  _accounts = _accounts.filter(a => a.id !== id);
  notifyWrite();
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot save accounts.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  for (const a of accounts) {
    await supabase.from('accounts').upsert({ ...mapAccountToDb(a), user_id: uid });
  }
  _accounts = accounts;
  notifyWrite();
}

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export async function addCategory(data: Omit<Category, 'id'>): Promise<Category> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add category.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const cat: Category = { ...data, id: uuidv4(), isCustom: true };
  const row = { ...mapCategoryToDb(cat), user_id: uid };
  const { error } = await supabase.from('categories').insert(row);
  if (error) throw error;

  _categories.push(cat);
  notifyWrite();
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete category.');
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;

  _categories = _categories.filter(c => c.id !== id);
  notifyWrite();
}

// ─── Budgets CRUD ────────────────────────────────────────────────────────────

export async function addBudget(data: Omit<Budget, 'id' | 'spent'>): Promise<Budget> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add budget.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const b: Budget = { ...data, id: uuidv4(), spent: 0 };
  const row = { ...mapBudgetToDb(b), user_id: uid };
  const { error } = await supabase.from('budgets').insert(row);
  if (error) throw error;

  _budgets.push(b);
  notifyWrite();
  return b;
}

export async function updateBudget(id: string, data: Partial<Budget>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update budget.');
  }

  const idx = _budgets.findIndex(b => b.id === id);
  if (idx === -1) return;
  const updated = { ..._budgets[idx], ...data };

  const { error } = await supabase.from('budgets').update(mapBudgetToDb(updated)).eq('id', id);
  if (error) throw error;

  _budgets[idx] = updated;
  notifyWrite();
}

export async function deleteBudget(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete budget.');
  }

  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;

  _budgets = _budgets.filter(b => b.id !== id);
  notifyWrite();
}

async function updateBudgetSpent(category: string, amount: number, dateStr: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

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
      const newSpent = b.spent + amount;
      await supabase.from('budgets').update({ spent_amount: newSpent }).eq('id', b.id);
      b.spent = newSpent;
    }
  }
}

async function reverseBudgetSpent(category: string, amount: number, dateStr: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

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
      const newSpent = Math.max(0, b.spent - amount);
      await supabase.from('budgets').update({ spent_amount: newSpent }).eq('id', b.id);
      b.spent = newSpent;
    }
  }
}

// ─── Goals CRUD ──────────────────────────────────────────────────────────────

export async function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add goal.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const g: Goal = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  const row = { ...mapGoalToDb(g), user_id: uid };
  const { error } = await supabase.from('goals').insert(row);
  if (error) throw error;

  _goals.push(g);
  notifyWrite();
  return g;
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update goal.');
  }

  const idx = _goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  const updated = { ..._goals[idx], ...data };

  const { error } = await supabase.from('goals').update(mapGoalToDb(updated)).eq('id', id);
  if (error) throw error;

  _goals[idx] = updated;
  notifyWrite();
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete goal.');
  }

  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;

  _goals = _goals.filter(g => g.id !== id);
  notifyWrite();
}

// ─── Settings CRUD ───────────────────────────────────────────────────────────

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback: keep in memory only (UI still works, won't persist cross-device)
    _settings = settings;
    notifyWrite();
    return;
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) {
    _settings = settings;
    notifyWrite();
    return;
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ ...mapSettingsToDb(settings), user_id: uid });
  if (error) throw error;

  _settings = settings;
  notifyWrite();
}

// ─── Streaks CRUD ────────────────────────────────────────────────────────────

export async function saveStreakData(streak: Partial<StreakData>): Promise<void> {
  const merged = { ..._streakData, ...streak };

  if (isSupabaseConfigured && supabase) {
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (uid) {
      await supabase.from('streaks').upsert({ ...mapStreakToDb(merged), user_id: uid });
    }
  }

  _streakData = merged;
  notifyWrite();
}

// ─── Recurring Transactions CRUD ─────────────────────────────────────────────

export async function addRecurringTransaction(
  rt: Omit<RecurringTransaction, 'id'>
): Promise<RecurringTransaction> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add recurring transaction.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const item: RecurringTransaction = { ...rt, id: uuidv4() };
  const { error } = await supabase
    .from('recurring_transactions')
    .insert({ ...mapRecurringToDb(item), user_id: uid });
  if (error) throw error;

  _recurring.push(item);
  notifyWrite();
  return item;
}

export async function updateRecurringTransaction(rt: RecurringTransaction): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update recurring transaction.');
  }

  const idx = _recurring.findIndex(item => item.id === rt.id);
  if (idx === -1) return;

  const { error } = await supabase
    .from('recurring_transactions')
    .update(mapRecurringToDb(rt))
    .eq('id', rt.id);
  if (error) throw error;

  _recurring[idx] = rt;
  notifyWrite();
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete recurring transaction.');
  }

  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;

  _recurring = _recurring.filter(item => item.id !== id);
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

    let updatedNextDue = new Date(rt.nextDueDate + 'T00:00:00');
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

      try {
        await addTransaction(txn);
        lastProcessed = curStr;
        itemMutated = true;
        changed = true;
      } catch (e) {
        console.error('Failed to process recurring transaction:', e);
        break;
      }

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
        await supabase
          .from('recurring_transactions')
          .update(mapRecurringToDb(rt))
          .eq('id', rt.id);
      }
    }
  }

  if (changed) notifyWrite();
  return changed;
}

// ─── Debts CRUD ──────────────────────────────────────────────────────────────

export async function addDebt(
  data: Omit<Debt, 'id' | 'createdAt' | 'status'>
): Promise<Debt> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add debt.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const d: Debt = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const row = { ...mapDebtToDb(d), user_id: uid };
  const { error } = await supabase.from('debts').insert(row);
  if (error) throw error;

  _debts.push(d);
  notifyWrite();
  return d;
}

export async function settleDebt(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot settle debt.');
  }

  const idx = _debts.findIndex(d => d.id === id);
  if (idx === -1) return;
  const updated: Debt = {
    ..._debts[idx],
    status: 'settled',
    settledAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('debts').update(mapDebtToDb(updated)).eq('id', id);
  if (error) throw error;

  _debts[idx] = updated;
  notifyWrite();
}

export async function deleteDebt(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete debt.');
  }

  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;

  _debts = _debts.filter(d => d.id !== id);
  notifyWrite();
}

export function getPendingDebtsSummary(): { totalLent: number; totalBorrowed: number; netOwed: number } {
  const pending = _debts.filter(d => d.status === 'pending');
  const totalLent = pending
    .filter(d => d.direction === 'lent')
    .reduce((s, d) => s + d.amount, 0);
  const totalBorrowed = pending
    .filter(d => d.direction === 'borrowed')
    .reduce((s, d) => s + d.amount, 0);
  return { totalLent, totalBorrowed, netOwed: totalLent - totalBorrowed };
}

// ─── Computed Statistics helpers (synchronous from live in-memory state) ─────

export function getMonthlyStats(year: number, month: number) {
  const txns = _transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, savings: income - expense, transactions: txns };
}

export function getTotalBalance(hiddenAccountIds: string[] = []): number {
  return _accounts
    .filter(a => !hiddenAccountIds.includes(a.id))
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

  // Persist streak update to Supabase (fire-and-forget)
  if (todaySpent > _settings.dailyLimit) {
    data.currentStreak = 0;
    data.lastFailedDay = todayStr;
    data.lastStreakUpdatedDate = todayStr;
    data.bestStreak = Math.max(data.bestStreak, 0);
    _streakData = data;
    if (isSupabaseConfigured && supabase) {
      const uid = getAuth(app).currentUser?.uid;
      if (uid) supabase.from('streaks').upsert({ ...mapStreakToDb(data), user_id: uid });
    }
  } else {
    if (data.lastStreakUpdatedDate === todayStr && data.lastFailedDay === todayStr) {
      data.currentStreak = Math.max(0, currentStreakForToday - 1);
      data.lastStreakUpdatedDate = yesterdayStr;
      data.lastFailedDay = '';
      _streakData = data;
    } else {
      _streakData = data;
    }
    if (isSupabaseConfigured && supabase) {
      const uid = getAuth(app).currentUser?.uid;
      if (uid) supabase.from('streaks').upsert({ ...mapStreakToDb(data), user_id: uid });
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

// ─── Challenges Operations ───────────────────────────────────────────────────

export function getChallenges(): Challenge[] {
  return _challenges;
}

export async function addChallenge(
  data: Omit<Challenge, 'id' | 'startDate' | 'endDate' | 'status' | 'checkedDays'>
): Promise<Challenge> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add challenge.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + data.durationDays);
  const c: Challenge = {
    ...data,
    id: uuidv4(),
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    status: 'active',
    checkedDays: [],
  };

  const row = { ...mapChallengeToDb(c), user_id: uid };
  const { error } = await supabase.from('challenges').insert(row);
  if (error) throw error;

  _challenges.push(c);
  notifyWrite();
  return c;
}

export async function updateChallenge(id: string, data: Partial<Challenge>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update challenge.');
  }

  const idx = _challenges.findIndex(c => c.id === id);
  if (idx === -1) return;
  _challenges[idx] = { ..._challenges[idx], ...data };

  const { error } = await supabase
    .from('challenges')
    .update(mapChallengeToDb(_challenges[idx]))
    .eq('id', id);
  if (error) {
    console.error('Failed to update challenge in Supabase:', error);
  }
  notifyWrite();
}

export async function deleteChallenge(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete challenge.');
  }

  const { error } = await supabase.from('challenges').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete challenge in Supabase:', error);
  }
  _challenges = _challenges.filter(c => c.id !== id);
  notifyWrite();
}

// ─── Split Bill Operations ────────────────────────────────────────────────────

export function getSplitBills(): SplitBillItem[] {
  return _splitBills;
}

export async function addSplitBill(data: Omit<SplitBillItem, 'id'>): Promise<SplitBillItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add split bill.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const s: SplitBillItem = { ...data, id: uuidv4() };
  const row = { ...mapSplitBillToDb(s), user_id: uid };
  const { error } = await supabase.from('split_bills').insert(row);
  if (error) throw error;

  _splitBills.unshift(s);
  notifyWrite();
  return s;
}

export async function updateSplitBill(id: string, data: Partial<SplitBillItem>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update split bill.');
  }

  const idx = _splitBills.findIndex(s => s.id === id);
  if (idx === -1) return;
  _splitBills[idx] = { ..._splitBills[idx], ...data };

  const { error } = await supabase
    .from('split_bills')
    .update(mapSplitBillToDb(_splitBills[idx]))
    .eq('id', id);
  if (error) {
    console.error('Failed to update split bill in Supabase:', error);
  }
  notifyWrite();
}

export async function deleteSplitBill(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete split bill.');
  }

  const { error } = await supabase.from('split_bills').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete split bill in Supabase:', error);
  }
  _splitBills = _splitBills.filter(s => s.id !== id);
  notifyWrite();
}

// ─── Export / Import All Data ─────────────────────────────────────────────────

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
    challenges: _challenges,
    splitBills: _splitBills,
  };
}

export async function importAllData(data: any): Promise<void> {
  // Import data into Supabase — do NOT write to localStorage
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot import data.');
  }

  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  if (data.transactions?.length) {
    const rows = data.transactions.map((t: Transaction) => ({ ...mapTxToDb(t), user_id: uid }));
    await supabase.from('transactions').upsert(rows);
  }
  if (data.budgets?.length) {
    const rows = data.budgets.map((b: Budget) => ({ ...mapBudgetToDb(b), user_id: uid }));
    await supabase.from('budgets').upsert(rows);
  }
  if (data.goals?.length) {
    const rows = data.goals.map((g: Goal) => ({ ...mapGoalToDb(g), user_id: uid }));
    await supabase.from('goals').upsert(rows);
  }
  if (data.accounts?.length) {
    const rows = data.accounts.map((a: Account) => ({ ...mapAccountToDb(a), user_id: uid }));
    await supabase.from('accounts').upsert(rows);
  }
  if (data.recurring?.length) {
    const rows = data.recurring.map((r: RecurringTransaction) => ({
      ...mapRecurringToDb(r),
      user_id: uid,
    }));
    await supabase.from('recurring_transactions').upsert(rows);
  }
  if (data.debts?.length) {
    const rows = data.debts.map((d: Debt) => ({ ...mapDebtToDb(d), user_id: uid }));
    await supabase.from('debts').upsert(rows);
  }
  if (data.challenges?.length) {
    const rows = data.challenges.map((c: Challenge) => ({ ...mapChallengeToDb(c), user_id: uid }));
    await supabase.from('challenges').upsert(rows);
  }
  if (data.splitBills?.length) {
    const rows = data.splitBills.map((s: SplitBillItem) => ({ ...mapSplitBillToDb(s), user_id: uid }));
    await supabase.from('split_bills').upsert(rows);
  }

  // Reload from Supabase to get fresh state
  await pullAllFromSupabase();
  notifyWrite();
}

export async function clearAllData(): Promise<void> {
  // 1. Clear in-memory state immediately
  _transactions = [];
  _budgets = [];
  _goals = [];
  _recurring = [];
  _debts = [];
  _challenges = [];
  _splitBills = [];
  _accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, isCustom: false }));
  _categories = DEFAULT_CATEGORIES.map(c => ({ ...c, isCustom: false }));
  _settings = { ...DEFAULT_SETTINGS };
  _streakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' };

  // 2. Clear from Supabase
  if (isSupabaseConfigured && supabase) {
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await Promise.all([
          supabase.from('transactions').delete().eq('user_id', uid),
          supabase.from('budgets').delete().eq('user_id', uid),
          supabase.from('goals').delete().eq('user_id', uid),
          supabase.from('recurring_transactions').delete().eq('user_id', uid),
          supabase.from('debts').delete().eq('user_id', uid),
          supabase.from('challenges').delete().eq('user_id', uid),
          supabase.from('split_bills').delete().eq('user_id', uid),
          supabase.from('accounts').delete().eq('user_id', uid),
          supabase.from('categories').delete().eq('user_id', uid),
          supabase.from('settings').delete().eq('user_id', uid),
          supabase.from('streaks').delete().eq('user_id', uid),
        ]);
        // Re-provision defaults in database
        await Promise.all([
          supabase
            .from('settings')
            .insert({ ...mapSettingsToDb(DEFAULT_SETTINGS), user_id: uid }),
          supabase
            .from('streaks')
            .insert({
              ...mapStreakToDb({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '' }),
              user_id: uid,
            }),
          autoProvisionAccounts(uid),
          autoProvisionCategories(uid),
        ]);
      } catch (err) {
        console.error('Failed to clear Supabase user data:', err);
      }
    }
  }

  notifyWrite();
}
