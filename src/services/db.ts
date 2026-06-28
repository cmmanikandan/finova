// Database service – LocalStorage backed (Supabase ready)
import type { Transaction, Budget, Goal, Account, Category, AppSettings } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from '../data/defaults';
import { v4 as uuidv4 } from '../utils/uuid';

const KEYS = {
  transactions: 'finova_transactions',
  budgets: 'finova_budgets',
  goals: 'finova_goals',
  accounts: 'finova_accounts',
  categories: 'finova_categories',
  settings: 'finova_settings',
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

  return t;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  const txns = load<Transaction[]>(KEYS.transactions, []);
  const idx = txns.findIndex(t => t.id === id);
  if (idx !== -1) {
    txns[idx] = { ...txns[idx], ...data };
    save(KEYS.transactions, txns);
  }
}

export function deleteTransaction(id: string): void {
  const txns = load<Transaction[]>(KEYS.transactions, []);
  save(KEYS.transactions, txns.filter(t => t.id !== id));
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
  return load<AppSettings>(KEYS.settings, { ...DEFAULT_SETTINGS });
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
  };
}

export function importAllData(data: any): void {
  if (data.transactions) save(KEYS.transactions, data.transactions);
  if (data.budgets)      save(KEYS.budgets, data.budgets);
  if (data.goals)        save(KEYS.goals, data.goals);
  if (data.accounts)     save(KEYS.accounts, data.accounts);
  if (data.categories)   save(KEYS.categories, data.categories);
  if (data.settings)     save(KEYS.settings, data.settings);
}
