// Types for FINOVA

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory?: string;
  account: string;
  toAccount?: string;
  date: string; // ISO string
  note?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  isCustom?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'custom';
  balance: number;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'daily' | 'custom';
  startDate: string;
  endDate?: string;
  color: string;
  alertThreshold?: number; // % to warn at, default 80
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  notes?: string;
  icon: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  theme: 'light' | 'dark' | 'system';
  pinEnabled: boolean;
  pinHash?: string;
  dailyReminderEnabled: boolean;
  budgetAlertsEnabled: boolean;
  language: string;
  // Daily & Weekly limits
  dailyLimitEnabled: boolean;
  dailyLimit: number;
  weeklyLimitEnabled: boolean;
  weeklyLimit: number;
  // Savings
  savingsGoalPercent: number; // Target savings rate %
  dailyReminderTime?: string; // e.g. "21:00"
}

// Computed status shapes (not stored)
export interface LimitStatus {
  spent: number;
  limit: number;
  pct: number;     // 0-100+
  over: boolean;
  warn: boolean;   // >= alertThreshold %
  remaining: number;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastStreakUpdatedDate: string; // YYYY-MM-DD
  lastSuccessfulDay?: string;    // YYYY-MM-DD
  lastFailedDay?: string;        // YYYY-MM-DD
  lastMilestoneClaimed?: number; // e.g. 3, 7, 15, 30, 50, 100, 365
  lastNotificationShownDate?: string; // YYYY-MM-DD
}

export interface RecurringTransaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  account: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  lastProcessedDate?: string;
  note?: string;
  active: boolean;
}

export interface Debt {
  id: string;
  contactName: string;
  contactEmoji: string; // avatar emoji
  amount: number;
  direction: 'lent' | 'borrowed'; // lent = they owe me, borrowed = I owe them
  dueDate?: string; // YYYY-MM-DD
  note?: string;
  status: 'pending' | 'settled';
  createdAt: string;
  settledAt?: string;
}

export interface Challenge {
  id: string;
  name: string;
  type: string; // 'no-spend' | 'category-limit'
  targetCategory?: string;
  limitAmount: number;
  durationDays: number;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: 'active' | 'completed' | 'failed';
  checkedDays: number[];
}
