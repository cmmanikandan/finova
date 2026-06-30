// Database service – Supabase is the ONLY source of truth.
// Financial data is NEVER stored in localStorage, sessionStorage, or any browser cache.
// In-memory state is populated exclusively from Supabase after a successful fetch.
import type {
  Transaction, Budget, Goal, Account, Category,
  AppSettings, LimitStatus, StreakData, RecurringTransaction,
  Debt, Challenge, SplitBillItem,
  DailyTask, DailyTaskLog, PlannerSchedule, PlannerReminder,
  XPHistory, UserLevel, UserBadge, PlannerStatistics
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
let _streakData: StreakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' };
let _recurring: RecurringTransaction[] = [];
let _debts: Debt[] = [];
let _challenges: Challenge[] = [];
let _splitBills: SplitBillItem[] = [];

let _dailyTasks: DailyTask[] = [];
let _dailyTaskLogs: DailyTaskLog[] = [];
let _plannerSchedules: PlannerSchedule[] = [];
let _plannerReminders: PlannerReminder[] = [];
let _xpHistory: XPHistory[] = [];
let _userLevels: UserLevel = { currentLevel: 1, currentXP: 0 };
let _userBadges: UserBadge[] = [];
let _plannerStatistics: PlannerStatistics[] = [];

// Clear all in-memory state when user changes (never reads from localStorage)
export function setUserIdForCache(_uid: string | null) {
  _transactions = [];
  _budgets = [];
  _goals = [];
  _accounts = [];
  _categories = [];
  _settings = { ...DEFAULT_SETTINGS };
  _streakData = { currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' };
  _recurring = [];
  _debts = [];
  _challenges = [];
  _splitBills = [];
  _dailyTasks = [];
  _dailyTaskLogs = [];
  _plannerSchedules = [];
  _plannerReminders = [];
  _xpHistory = [];
  _userLevels = { currentLevel: 1, currentXP: 0 };
  _userBadges = [];
  _plannerStatistics = [];
}

// ─── Write listener registration ──────────────────────────────────────────────
let _writeListeners: (() => void)[] = [];

export function registerWriteListener(cb: () => void) {
  _writeListeners.push(cb);
  return () => {
    _writeListeners = _writeListeners.filter(l => l !== cb);
  };
}

function notifyWrite() {
  _writeListeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in db write listener callback:', e);
    }
  });
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
    upi_id: s.upiId || null,
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
    upiId: row.upi_id || undefined,
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
    planner_current_streak: s.plannerCurrentStreak || 0,
    planner_best_streak: s.plannerBestStreak || 0,
    planner_last_active_date: s.plannerLastActiveDate || null,
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
    plannerCurrentStreak: row.planner_current_streak || 0,
    plannerBestStreak: row.planner_best_streak || 0,
    plannerLastActiveDate: row.planner_last_active_date || undefined,
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

function mapDailyTaskToDb(t: DailyTask): any {
  return {
    id: t.id,
    title: t.title,
    description: t.description || null,
    icon: t.icon,
    color: t.color,
    category: t.category,
    budget_limit: t.budgetLimit,
    reminder_time: t.reminderTime || null,
    repeat_schedule: t.repeatSchedule,
    priority: t.priority,
    estimated_duration: t.estimatedDuration || null,
    notes: t.notes || null,
    location: t.location || null,
    notifications_enabled: t.notificationsEnabled,
  };
}

function mapDailyTaskFromDb(row: any): DailyTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    icon: row.icon,
    color: row.color,
    category: row.category,
    budgetLimit: Number(row.budget_limit || 0),
    reminderTime: row.reminder_time || undefined,
    repeatSchedule: row.repeat_schedule,
    priority: row.priority,
    estimatedDuration: row.estimated_duration ? Number(row.estimated_duration) : undefined,
    notes: row.notes || undefined,
    location: row.location || undefined,
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDailyTaskLogToDb(l: DailyTaskLog): any {
  return {
    id: l.id,
    task_id: l.taskId,
    date: l.date,
    status: l.status,
    completed_at: l.completedAt || null,
    spent_amount: l.spentAmount,
    xp_earned: l.xpEarned,
  };
}

function mapDailyTaskLogFromDb(row: any): DailyTaskLog {
  return {
    id: row.id,
    taskId: row.task_id,
    date: row.date,
    status: row.status,
    completedAt: row.completed_at || undefined,
    spentAmount: Number(row.spent_amount || 0),
    xpEarned: Number(row.xp_earned || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlannerScheduleToDb(s: PlannerSchedule): any {
  return {
    id: s.id,
    day_of_week: s.dayOfWeek,
    task_ids: s.taskIds,
  };
}

function mapPlannerScheduleFromDb(row: any): PlannerSchedule {
  return {
    id: row.id,
    dayOfWeek: Number(row.day_of_week),
    taskIds: row.task_ids || [],
  };
}

function mapPlannerReminderToDb(r: PlannerReminder): any {
  return {
    id: r.id,
    title: r.title,
    time: r.time,
    days: r.days,
    is_enabled: r.isEnabled,
  };
}

function mapPlannerReminderFromDb(row: any): PlannerReminder {
  return {
    id: row.id,
    title: row.title,
    time: row.time,
    days: row.days || [],
    isEnabled: row.is_enabled,
  };
}

function mapXPHistoryToDb(x: XPHistory): any {
  return {
    id: x.id,
    amount: x.amount,
    reason: x.reason,
    reference_id: x.referenceId || null,
  };
}

function mapXPHistoryFromDb(row: any): XPHistory {
  return {
    id: row.id,
    amount: Number(row.amount),
    reason: row.reason,
    referenceId: row.reference_id || undefined,
    createdAt: row.created_at,
  };
}

function mapUserLevelToDb(l: UserLevel): any {
  return {
    current_level: l.currentLevel,
    current_xp: l.currentXP,
  };
}

function mapUserLevelFromDb(row: any): UserLevel {
  return {
    currentLevel: Number(row.current_level || 1),
    currentXP: Number(row.current_xp || 0),
    updatedAt: row.updated_at,
  };
}

function mapUserBadgeToDb(b: UserBadge): any {
  return {
    id: b.id,
    badge_name: b.badgeName,
    unlocked_at: b.unlockedAt,
  };
}

function mapUserBadgeFromDb(row: any): UserBadge {
  return {
    id: row.id,
    badgeName: row.badge_name,
    unlockedAt: row.unlocked_at,
  };
}

function mapPlannerStatisticsFromDb(row: any): PlannerStatistics {
  return {
    id: row.id,
    date: row.date,
    tasksCompleted: Number(row.tasks_completed || 0),
    tasksTotal: Number(row.tasks_total || 0),
    budgetLimit: Number(row.budget_limit || 0),
    budgetSpent: Number(row.budget_spent || 0),
    xpEarned: Number(row.xp_earned || 0),
  };
}

async function autoProvisionUserLevel(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('user_levels')
    .insert({ user_id: uid, current_level: 1, current_xp: 0 });
  if (error) console.error('Failed to auto-provision user level:', error.message || JSON.stringify(error));
}

// ─── Sync provisioning on new user ──────────────────────────────────────────
// Creates default accounts/categories/settings/streak in Supabase on first login.

async function autoProvisionAccounts(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const suffix = `_${uid}`;
  _accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, id: `${a.id}${suffix}`, isCustom: false }));
  const rows = _accounts.map(a => ({ ...mapAccountToDb(a), user_id: uid }));
  const { error } = await supabase.from('accounts').insert(rows);
  if (error) console.error('Failed to auto-provision accounts:', error.message || JSON.stringify(error));
}

async function autoProvisionCategories(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const suffix = `_${uid}`;
  _categories = DEFAULT_CATEGORIES.map(c => ({ ...c, id: `${c.id}${suffix}`, isCustom: false }));
  const rows = _categories.map(c => ({ ...mapCategoryToDb(c), user_id: uid }));
  const { error } = await supabase.from('categories').insert(rows);
  if (error) console.error('Failed to auto-provision categories:', error.message || JSON.stringify(error));
}

async function autoProvisionSettings(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('settings')
    .insert({ ...mapSettingsToDb(_settings), user_id: uid });
  if (error) console.error('Failed to auto-provision settings:', error.message || JSON.stringify(error));
}

async function autoProvisionStreak(uid: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('streaks')
    .insert({ ...mapStreakToDb(_streakData), user_id: uid });
  if (error) console.error('Failed to auto-provision streaks:', error.message || JSON.stringify(error));
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
    tasksRes, logsRes, schedulesRes, remindersRes, xpRes, levelsRes, badgesRes, statsRes
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
    supabase.from('daily_tasks').select('*').eq('user_id', uid),
    supabase.from('daily_task_logs').select('*').eq('user_id', uid),
    supabase.from('planner_schedule').select('*').eq('user_id', uid),
    supabase.from('planner_reminders').select('*').eq('user_id', uid),
    supabase.from('xp_history').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('user_levels').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('user_badges').select('*').eq('user_id', uid),
    supabase.from('planner_statistics').select('*').eq('user_id', uid),
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

  if (tasksRes.data) {
    _dailyTasks = tasksRes.data.map(mapDailyTaskFromDb);
  }
  if (logsRes.data) {
    _dailyTaskLogs = logsRes.data.map(mapDailyTaskLogFromDb);
  }
  if (schedulesRes.data) {
    _plannerSchedules = schedulesRes.data.map(mapPlannerScheduleFromDb);
  }
  if (remindersRes.data) {
    _plannerReminders = remindersRes.data.map(mapPlannerReminderFromDb);
  }
  if (xpRes.data) {
    _xpHistory = xpRes.data.map(mapXPHistoryFromDb);
  }
  if (levelsRes.data) {
    _userLevels = mapUserLevelFromDb(levelsRes.data);
  } else {
    await autoProvisionUserLevel(uid);
  }
  if (badgesRes.data) {
    _userBadges = badgesRes.data.map(mapUserBadgeFromDb);
  }
  if (statsRes.data) {
    _plannerStatistics = statsRes.data.map(mapPlannerStatisticsFromDb);
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
    const dateStr = data.date.split('T')[0];
    await recalculateAllTaskBudgetsForDate(dateStr);
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
    const oldDateStr = old.date.split('T')[0];
    await recalculateAllTaskBudgetsForDate(oldDateStr);
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
    const newDateStr = updated.date.split('T')[0];
    await recalculateAllTaskBudgetsForDate(newDateStr);
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

  // Update memory only after successful Supabase delete
  _transactions = _transactions.filter(t => t.id !== id);

  if (txn.type === 'expense') {
    await reverseBudgetSpent(txn.category, txn.amount, txn.date);
    const dateStr = txn.date.split('T')[0];
    // Recalculate ALL task budgets for that day — handles slug vs UUID mismatches
    await recalculateAllTaskBudgetsForDate(dateStr);
  }

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
  const { income, savings, expense } = getMonthlyStats(year, month);
  if (income === 0) {
    return expense > 0 ? -100 : 0;
  }
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
          supabase.from('daily_tasks').delete().eq('user_id', uid),
          supabase.from('daily_task_logs').delete().eq('user_id', uid),
          supabase.from('planner_schedule').delete().eq('user_id', uid),
          supabase.from('planner_reminders').delete().eq('user_id', uid),
          supabase.from('xp_history').delete().eq('user_id', uid),
          supabase.from('user_levels').delete().eq('user_id', uid),
          supabase.from('user_badges').delete().eq('user_id', uid),
          supabase.from('planner_statistics').delete().eq('user_id', uid),
        ]);
        // Re-provision defaults in database
        await Promise.all([
          supabase
            .from('settings')
            .insert({ ...mapSettingsToDb(DEFAULT_SETTINGS), user_id: uid }),
          supabase
            .from('streaks')
            .insert({
              ...mapStreakToDb({ currentStreak: 0, bestStreak: 0, lastStreakUpdatedDate: '', plannerCurrentStreak: 0, plannerBestStreak: 0, plannerLastActiveDate: '' }),
              user_id: uid,
            }),
          autoProvisionAccounts(uid),
          autoProvisionCategories(uid),
          autoProvisionUserLevel(uid),
        ]);
      } catch (err) {
        console.error('Failed to clear Supabase user data:', err);
      }
    }
  }

  notifyWrite();
}

// ─── Daily Planner & Habit Tracker V2 CRUD and Engine ───────────────────────

export function getDailyTasks(): DailyTask[] {
  return _dailyTasks;
}

export async function addDailyTask(data: Omit<DailyTask, 'id'>): Promise<DailyTask> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add daily task.');
  }
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const task: DailyTask = {
    ...data,
    id: uuidv4(),
  };

  const { error } = await supabase
    .from('daily_tasks')
    .insert({ ...mapDailyTaskToDb(task), user_id: uid });
  if (error) throw error;

  _dailyTasks.push(task);
  notifyWrite();
  return task;
}

export async function updateDailyTask(id: string, data: Partial<DailyTask>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update daily task.');
  }

  const idx = _dailyTasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  const nextTask = { ..._dailyTasks[idx], ...data };
  const { error } = await supabase
    .from('daily_tasks')
    .update(mapDailyTaskToDb(nextTask))
    .eq('id', id);
  if (error) throw error;

  _dailyTasks[idx] = nextTask;
  notifyWrite();
}

export async function deleteDailyTask(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete daily task.');
  }

  const { error } = await supabase.from('daily_tasks').delete().eq('id', id);
  if (error) throw error;

  _dailyTasks = _dailyTasks.filter(t => t.id !== id);
  _dailyTaskLogs = _dailyTaskLogs.filter(l => l.taskId !== id);
  
  _plannerSchedules = _plannerSchedules.map(sch => ({
    ...sch,
    taskIds: sch.taskIds.filter(tid => tid !== id),
  }));

  notifyWrite();
}

// ─── Daily Task Logs (Execution Checks) ──────────────────────────────────────

export function getDailyTaskLogs(dateStr: string): DailyTaskLog[] {
  return _dailyTaskLogs.filter(l => l.date === dateStr);
}

export function getOrCreateDailyTaskLog(taskId: string, dateStr: string): DailyTaskLog {
  const existing = _dailyTaskLogs.find(l => l.taskId === taskId && l.date === dateStr);
  if (existing) return existing;

  const newLog: DailyTaskLog = {
    id: uuidv4(),
    taskId,
    date: dateStr,
    status: 'pending',
    spentAmount: 0,
    xpEarned: 0,
  };
  return newLog;
}

export async function setTaskStatus(taskId: string, dateStr: string, status: 'pending' | 'completed' | 'skipped' | 'missed', bonusXp = 0): Promise<DailyTaskLog> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update task status.');
  }
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const task = _dailyTasks.find(t => t.id === taskId);
  if (!task) throw new Error('Daily task not found.');

  let logIdx = _dailyTaskLogs.findIndex(l => l.taskId === taskId && l.date === dateStr);
  let log: DailyTaskLog;
  let isNew = false;

  if (logIdx !== -1) {
    log = { ..._dailyTaskLogs[logIdx], status, completedAt: status === 'completed' ? new Date().toISOString() : undefined };
  } else {
    log = {
      id: uuidv4(),
      taskId,
      date: dateStr,
      status,
      spentAmount: 0,
      xpEarned: 0,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    };
    isNew = true;
  }

  let xpGain = 0;
  if (status === 'completed') {
    xpGain += 10;
    if (bonusXp > 0) xpGain += bonusXp;
    if (task.budgetLimit > 0 && log.spentAmount <= task.budgetLimit) {
      xpGain += 25;
    }
    log.xpEarned = xpGain;
  } else {
    log.xpEarned = 0;
  }

  if (isNew) {
    const { error } = await supabase
      .from('daily_task_logs')
      .insert({ ...mapDailyTaskLogToDb(log), user_id: uid });
    if (error) throw error;
    _dailyTaskLogs.push(log);
  } else {
    const { error } = await supabase
      .from('daily_task_logs')
      .update(mapDailyTaskLogToDb(log))
      .eq('id', log.id);
    if (error) throw error;
    _dailyTaskLogs[logIdx] = log;
  }

  if (xpGain > 0) {
    await addXP(xpGain, `Completed "${task.title}"`);
  }

  await checkPlannerDailyCompletion(dateStr);

  notifyWrite();
  return log;
}

// Recalculate a single task's budget spent for a given date.
// Matches transactions by: taskId in note OR category ID match OR category slug match.
export async function recalculateTaskBudgetSpent(category: string, dateStr: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Find matching category UUID (handles slug→UUID resolution for preset tasks)
  const catObj = _categories.find(c => c.id === category);
  const catName = catObj?.name?.toLowerCase();

  // Find tasks whose category matches by ID OR by name (slug fallback)
  const tasksWithCategory = _dailyTasks.filter(t => {
    if (t.category === category) return true;
    // Fallback: match by category name slug (e.g. 'food' matches category named 'Food')
    if (catName && t.category.toLowerCase().replace(/_/g, ' ') === catName) return true;
    // Also match if the category object for task's stored slug matches the uuid passed
    const taskCatObj = _categories.find(c => c.id === t.category);
    return taskCatObj?.id === category;
  });

  const dayTxns = _transactions.filter(t => {
    const tDateStr = t.date.split('T')[0];
    return tDateStr === dateStr && t.type === 'expense' && t.category === category;
  });
  const totalSpent = dayTxns.reduce((sum, t) => sum + t.amount, 0);

  for (const t of tasksWithCategory) {
    let logIdx = _dailyTaskLogs.findIndex(l => l.taskId === t.id && l.date === dateStr);
    if (logIdx !== -1) {
      const updatedLog = { ..._dailyTaskLogs[logIdx], spentAmount: totalSpent };
      await supabase.from('daily_task_logs').update({ spent_amount: totalSpent }).eq('id', updatedLog.id);
      _dailyTaskLogs[logIdx] = updatedLog;
    } else if (totalSpent > 0) {
      const newLog: DailyTaskLog = {
        id: uuidv4(),
        taskId: t.id,
        date: dateStr,
        status: 'pending',
        spentAmount: totalSpent,
        xpEarned: 0,
      };
      await supabase.from('daily_task_logs').insert({ ...mapDailyTaskLogToDb(newLog), user_id: uid });
      _dailyTaskLogs.push(newLog);
    }
  }
  notifyWrite();
}

// Recalculate budget spent for ALL tasks for a given date.
// Used after transaction delete to ensure every planner task shows correct spent amount.
export async function recalculateAllTaskBudgetsForDate(dateStr: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Get all expense transactions for that day, grouped by their note's taskId pattern
  const dayTxns = _transactions.filter(t => {
    const tDateStr = t.date.split('T')[0];
    return tDateStr === dateStr && t.type === 'expense';
  });

  // For every daily task that has a log for that date, recalculate spentAmount
  // by matching transactions: by task note containing taskId, or by category match
  for (const task of _dailyTasks) {
    const logIdx = _dailyTaskLogs.findIndex(l => l.taskId === task.id && l.date === dateStr);
    if (logIdx === -1) continue; // No log exists for this task today, skip

    // Find category UUID for this task (handle slug → UUID resolution)
    const taskCatObj = _categories.find(c =>
      c.id === task.category ||
      c.name.toLowerCase() === task.category.toLowerCase().replace(/_/g, ' ')
    );
    const taskCatId = taskCatObj?.id || task.category;

    // Match transactions by:
    // 1) Note contains the task title (from habit log)
    // 2) Category matches the resolved category ID
    const matchingTxns = dayTxns.filter(t => {
      const noteMatch = t.note && t.note.includes(task.title);
      const catMatch = t.category === taskCatId || t.category === task.category;
      return noteMatch || catMatch;
    });

    const newSpent = matchingTxns.reduce((sum, t) => sum + t.amount, 0);
    const currentLog = _dailyTaskLogs[logIdx];

    if (currentLog.spentAmount !== newSpent) {
      const updatedLog = { ...currentLog, spentAmount: newSpent };
      await supabase.from('daily_task_logs').update({ spent_amount: newSpent }).eq('id', currentLog.id);
      _dailyTaskLogs[logIdx] = updatedLog;
    }
  }
  notifyWrite();
}

// ─── Streak engine ───────────────────────────────────────────────────────────

export async function checkPlannerDailyCompletion(dateStr: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const d = new Date(dateStr);
  const dayOfWeek = d.getDay();
  const schedule = _plannerSchedules.find(s => s.dayOfWeek === dayOfWeek);
  if (!schedule || schedule.taskIds.length === 0) return;

  const scheduledTasks = _dailyTasks.filter(t => schedule.taskIds.includes(t.id));
  if (scheduledTasks.length === 0) return;

  const todayLogs = _dailyTaskLogs.filter(l => l.date === dateStr && schedule.taskIds.includes(l.taskId));
  const completedCount = todayLogs.filter(l => l.status === 'completed').length;
  
  if (completedCount === scheduledTasks.length) {
    const alreadyAwarded = _xpHistory.some(x => x.reason === `Daily Planner Completed` && x.createdAt.split('T')[0] === dateStr);
    if (!alreadyAwarded) {
      await addXP(50, `Daily Planner Completed`);
      
      let current = _streakData.plannerCurrentStreak || 0;
      let best = _streakData.plannerBestStreak || 0;
      const lastActive = _streakData.plannerLastActiveDate;
      const yesterdayStr = new Date(d.setDate(d.getDate() - 1)).toISOString().split('T')[0];

      if (lastActive === yesterdayStr) {
        current += 1;
      } else if (lastActive !== dateStr) {
        current = 1;
      }

      if (current > best) {
        best = current;
      }

      const nextStreak: StreakData = {
        ..._streakData,
        plannerCurrentStreak: current,
        plannerBestStreak: best,
        plannerLastActiveDate: dateStr,
      };

      await supabase.from('streaks').update(mapStreakToDb(nextStreak)).eq('user_id', uid);
      _streakData = nextStreak;

      if (current === 7) {
        await addXP(100, `7-Day Streak Milestone`);
        await unlockBadge('7 Day Streak');
      } else if (current === 30) {
        await addXP(500, `30-Day Streak Milestone`);
        await unlockBadge('30 Day Streak');
      } else if (current === 100) {
        await unlockBadge('100 Day Streak');
      } else if (current === 365) {
        await addXP(5000, `365-Day Streak Milestone`);
        await unlockBadge('365 Day Hero');
      }

      await unlockBadge('Planner Pro');
    }
  }
}

export async function auditStreaksLaunch(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const lastActive = _streakData.plannerLastActiveDate;
  if (lastActive && lastActive !== todayStr && lastActive !== yesterdayStr) {
    const nextStreak = {
      ..._streakData,
      plannerCurrentStreak: 0,
    };
    await supabase.from('streaks').update(mapStreakToDb(nextStreak)).eq('user_id', uid);
    _streakData = nextStreak;
    notifyWrite();
  }
}

// ─── Weekly Planner Schedule ──────────────────────────────────────────────────

export function getPlannerSchedule(): PlannerSchedule[] {
  return _plannerSchedules;
}

export async function savePlannerSchedule(dayOfWeek: number, taskIds: string[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot save planner schedule.');
  }
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const existingIdx = _plannerSchedules.findIndex(s => s.dayOfWeek === dayOfWeek);
  const payload = {
    id: existingIdx !== -1 ? _plannerSchedules[existingIdx].id : uuidv4(),
    dayOfWeek,
    taskIds,
  };

  const { error } = await supabase
    .from('planner_schedule')
    .upsert({ ...mapPlannerScheduleToDb(payload), user_id: uid });
  if (error) throw error;

  if (existingIdx !== -1) {
    _plannerSchedules[existingIdx] = payload;
  } else {
    _plannerSchedules.push(payload);
  }
  notifyWrite();
}

export async function copyPlannerSchedule(fromDay: number, toDay: number): Promise<void> {
  const source = _plannerSchedules.find(s => s.dayOfWeek === fromDay);
  const taskIds = source ? source.taskIds : [];
  await savePlannerSchedule(toDay, taskIds);
}

// ─── Planner Reminders ────────────────────────────────────────────────────────

export function getPlannerReminders(): PlannerReminder[] {
  return _plannerReminders;
}

export async function addPlannerReminder(data: Omit<PlannerReminder, 'id'>): Promise<PlannerReminder> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot add planner reminder.');
  }
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated.');

  const rem: PlannerReminder = {
    ...data,
    id: uuidv4(),
  };

  const { error } = await supabase
    .from('planner_reminders')
    .insert({ ...mapPlannerReminderToDb(rem), user_id: uid });
  if (error) throw error;

  _plannerReminders.push(rem);
  notifyWrite();
  return rem;
}

export async function updatePlannerReminder(id: string, data: Partial<PlannerReminder>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot update planner reminder.');
  }

  const idx = _plannerReminders.findIndex(r => r.id === id);
  if (idx === -1) return;

  const nextRem = { ..._plannerReminders[idx], ...data };
  const { error } = await supabase
    .from('planner_reminders')
    .update(mapPlannerReminderToDb(nextRem))
    .eq('id', id);
  if (error) throw error;

  _plannerReminders[idx] = nextRem;
  notifyWrite();
}

export async function deletePlannerReminder(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Cannot delete planner reminder.');
  }

  const { error } = await supabase.from('planner_reminders').delete().eq('id', id);
  if (error) throw error;

  _plannerReminders = _plannerReminders.filter(r => r.id !== id);
  notifyWrite();
}

// ─── XP / Levels System ───────────────────────────────────────────────────────

export function xpToLevel(xp: number): number {
  if (xp < 250) return 1;
  if (xp < 600) return 2;
  if (xp < 1200) return 3;
  if (xp < 2500) return 4;
  return 5 + Math.floor((xp - 2500) / 2000);
}

export function getUserLevel(): UserLevel {
  return _userLevels;
}

export function getXPHistory(): XPHistory[] {
  return _xpHistory;
}

export async function addXP(amount: number, reason: string, referenceId?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const xpItem: XPHistory = {
    id: uuidv4(),
    amount,
    reason,
    referenceId,
    createdAt: new Date().toISOString(),
  };

  const { error: xpErr } = await supabase
    .from('xp_history')
    .insert({ ...mapXPHistoryToDb(xpItem), user_id: uid });
  if (xpErr) {
    console.error('Failed to log XP history:', xpErr);
    return;
  }

  _xpHistory.unshift(xpItem);

  const nextXP = _userLevels.currentXP + amount;
  const nextLevel = xpToLevel(nextXP);
  
  const updatedLevelObj: UserLevel = {
    currentLevel: nextLevel,
    currentXP: nextXP,
  };

  const { error: lvlErr } = await supabase
    .from('user_levels')
    .update(mapUserLevelToDb(updatedLevelObj))
    .eq('user_id', uid);
  
  if (!lvlErr) {
    _userLevels = updatedLevelObj;
  }

  triggerFloatingXPNotification(amount);

  notifyWrite();
}

function triggerFloatingXPNotification(amount: number) {
  const event = new CustomEvent('finova_xp_earned', { detail: { amount } });
  window.dispatchEvent(event);
}

// ─── Badges Engine ────────────────────────────────────────────────────────────

export function getUserBadges(): UserBadge[] {
  return _userBadges;
}

export async function unlockBadge(badgeName: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const alreadyUnlocked = _userBadges.some(b => b.badgeName === badgeName);
  if (alreadyUnlocked) return;

  const newBadge: UserBadge = {
    id: uuidv4(),
    badgeName,
    unlockedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_badges')
    .insert({ ...mapUserBadgeToDb(newBadge), user_id: uid });
  if (error) {
    console.error('Failed to unlock badge:', error);
    return;
  }

  _userBadges.push(newBadge);
  await addXP(150, `Badge Unlocked: ${badgeName}`);

  const event = new CustomEvent('finova_badge_unlocked', { detail: { badgeName } });
  window.dispatchEvent(event);

  notifyWrite();
}

// ─── AI Insights behavioral generator ─────────────────────────────────────────

export function getAISuggestions(): string[] {
  const suggestions: string[] = [];
  const txns = _transactions;
  if (txns.length < 5) {
    return [
      "💡 AI Insight: Welcome! Add 5 or more transactions so our smart AI engine can analyze your habits.",
      "💡 AI Insight: Try setting up a daily limit budget to lock in early streak points."
    ];
  }

  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  const weekendExpenses = txns.filter(t => {
    const d = new Date(t.date);
    const day = d.getDay();
    return (day === 0 || day === 6) && t.type === 'expense';
  });
  const weekdayExpenses = txns.filter(t => {
    const d = new Date(t.date);
    const day = d.getDay();
    return (day >= 1 && day <= 5) && t.type === 'expense';
  });
  
  const avgWeekend = weekendExpenses.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, weekendExpenses.length);
  const avgWeekday = weekdayExpenses.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, weekdayExpenses.length);

  if (avgWeekend > avgWeekday * 1.4) {
    suggestions.push(`⚠️ Weekend Overspending: Your average weekend expense (₹${Math.round(avgWeekend)}) is 40%+ higher than weekdays. Consider locking weekend budgets.`);
  }

  const foodTxns = txns.filter(t => t.category?.toLowerCase().includes('food') || t.category?.toLowerCase().includes('canteen'));
  const totalFood = foodTxns.reduce((sum, t) => sum + t.amount, 0);
  if (totalFood > 3000) {
    const weeklyAvg = Math.round(totalFood / 4);
    suggestions.push(`🍔 Food & Dining Insight: You spend roughly ₹${weeklyAvg} weekly on dining. Packing lunch twice a week could save you up to ₹1,200/month!`);
  }

  const currentStreak = _streakData.plannerCurrentStreak || 0;
  if (currentStreak > 0) {
    suggestions.push(`🔥 Keep it up! You're on a ${currentStreak} day Daily Planner streak. Finish today's schedule for a level boost!`);
  } else {
    suggestions.push(`💡 Planner recommendation: Completing daily routines rewards you with streaks, badges, and up to +50 XP bonuses daily.`);
  }

  const { income, expense } = getMonthlyStats(today.getFullYear(), today.getMonth());
  if (income > 0) {
    const savings = income - expense;
    const rate = Math.round((savings / income) * 100);
    if (rate >= 20) {
      suggestions.push(`📈 Smart Savings Forecast: Great job! Your savings rate is ${rate}%. You are fully on track to achieve your target goals ahead of schedule.`);
    } else {
      suggestions.push(`📉 Savings alert: Your savings rate is currently ${rate}%. Trimming subscription services could help push you toward the recommended 20% mark.`);
    }
  }

  const subs = _recurring.filter(r => r.active && r.type === 'expense');
  if (subs.length > 3) {
    suggestions.push(`⚠️ Recurring Expenses: You have ${subs.length} active subscriptions. Reviewing unused recharges could easily reclaim ₹500/month.`);
  }

  return suggestions;
}

// ─── Analytics Aggregator ─────────────────────────────────────────────────────

export interface PlannerAnalytics {
  completionRates: { name: string; pct: number }[];
  budgetUsage: { name: string; limit: number; spent: number }[];
  xpGains: { date: string; xp: number }[];
}

export function getPlannerAnalytics(): PlannerAnalytics {
  const dates = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - idx);
    return d.toISOString().split('T')[0];
  }).reverse();

  const completionRates = dates.map(dateStr => {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const schedule = _plannerSchedules.find(s => s.dayOfWeek === dayOfWeek);
    const scheduledTaskCount = schedule ? schedule.taskIds.length : 0;
    
    if (scheduledTaskCount === 0) return { name: d.toLocaleDateString(undefined, { weekday: 'short' }), pct: 0 };
    
    const logs = _dailyTaskLogs.filter(l => l.date === dateStr && schedule?.taskIds.includes(l.taskId));
    const completed = logs.filter(l => l.status === 'completed').length;
    const pct = Math.round((completed / scheduledTaskCount) * 100);
    
    return { name: d.toLocaleDateString(undefined, { weekday: 'short' }), pct };
  });

  const categoryBudgets: Record<string, { limit: number; spent: number }> = {};
  _dailyTasks.forEach(task => {
    if (task.budgetLimit > 0) {
      if (!categoryBudgets[task.category]) {
        categoryBudgets[task.category] = { limit: 0, spent: 0 };
      }
      categoryBudgets[task.category].limit += task.budgetLimit;
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];
  _dailyTaskLogs.filter(l => l.date === todayStr).forEach(log => {
    const task = _dailyTasks.find(t => t.id === log.taskId);
    if (task && task.budgetLimit > 0) {
      if (categoryBudgets[task.category]) {
        categoryBudgets[task.category].spent += log.spentAmount;
      }
    }
  });

  const budgetUsage = Object.keys(categoryBudgets).map(cat => {
    const catObj = _categories.find(c => c.id === cat);
    return {
      name: catObj?.name || (cat.charAt(0).toUpperCase() + cat.slice(1)),
      limit: categoryBudgets[cat].limit,
      spent: categoryBudgets[cat].spent,
    };
  });

  const xpGains = dates.map(dateStr => {
    const dayXP = _xpHistory
      .filter(x => x.createdAt.split('T')[0] === dateStr)
      .reduce((sum, x) => sum + x.amount, 0);
    return {
      date: new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }),
      xp: dayXP,
    };
  });

  return {
    completionRates,
    budgetUsage: budgetUsage.length > 0 ? budgetUsage : [{ name: 'None', limit: 100, spent: 0 }],
    xpGains,
  };
}

export function getPlannerStatistics(): PlannerStatistics[] {
  return _plannerStatistics;
}

notifyWrite();
