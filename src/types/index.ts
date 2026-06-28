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
