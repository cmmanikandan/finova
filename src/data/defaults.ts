import type { Category, Account, AppSettings } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food',          name: 'Food',          icon: '🍕', color: '#EA580C', type: 'expense' },
  { id: 'travel',        name: 'Travel',        icon: '✈️', color: '#4F46E5', type: 'expense' },
  { id: 'shopping',      name: 'Shopping',      icon: '🛍️', color: '#DB2777', type: 'expense' },
  { id: 'education',     name: 'Education',     icon: '📚', color: '#059669', type: 'expense' },
  { id: 'medical',       name: 'Medical',       icon: '🏥', color: '#DC2626', type: 'expense' },
  { id: 'bills',         name: 'Bills',         icon: '⚡', color: '#D97706', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', color: '#7C3AED', type: 'expense' },
  { id: 'fuel',          name: 'Fuel',          icon: '⛽', color: '#0F766E', type: 'expense' },
  { id: 'hostel',        name: 'Hostel',        icon: '🏠', color: '#0369A1', type: 'expense' },
  { id: 'canteen',       name: 'Canteen',       icon: '🍱', color: '#92400E', type: 'expense' },
  { id: 'stationery',   name: 'Stationery',    icon: '✏️', color: '#1D4ED8', type: 'expense' },
  { id: 'transport',    name: 'Transport',     icon: '🚌', color: '#065F46', type: 'expense' },
  { id: 'salary',       name: 'Salary',        icon: '💰', color: '#16A34A', type: 'income' },
  { id: 'business',     name: 'Business',      icon: '💼', color: '#0891B2', type: 'income' },
  { id: 'investment',   name: 'Investment',    icon: '📈', color: '#1D4ED8', type: 'income' },
  { id: 'freelance',    name: 'Freelance',     icon: '💻', color: '#7C3AED', type: 'income' },
  { id: 'transfer',     name: 'Transfer',      icon: '🔄', color: '#475569', type: 'both' },
  { id: 'others',       name: 'Others',        icon: '📦', color: '#475569', type: 'both' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'cash',        name: 'Cash',        type: 'cash',        balance: 0, icon: '💵', color: '#16A34A' },
  { id: 'bank',        name: 'Bank',        type: 'bank',        balance: 0, icon: '🏦', color: '#1D4ED8' },
  { id: 'credit_card', name: 'Credit Card', type: 'credit_card', balance: 0, icon: '💳', color: '#7C3AED' },
  { id: 'debit_card',  name: 'Debit Card',  type: 'debit_card',  balance: 0, icon: '💳', color: '#0891B2' },
  { id: 'upi',         name: 'UPI',         type: 'upi',         balance: 0, icon: '📱', color: '#EA580C' },
  { id: 'wallet',      name: 'Wallet',      type: 'wallet',      balance: 0, icon: '👛', color: '#D97706' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  theme: 'light',
  pinEnabled: false,
  dailyReminderEnabled: false,
  budgetAlertsEnabled: true,
  language: 'en',
};

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export const GOAL_TEMPLATES = [
  { name: 'Emergency Fund', icon: '🛡️', color: '#16A34A' },
  { name: 'New Phone',      icon: '📱', color: '#1D4ED8' },
  { name: 'Laptop',         icon: '💻', color: '#7C3AED' },
  { name: 'Bike',           icon: '🏍️', color: '#EA580C' },
  { name: 'Vacation',       icon: '✈️', color: '#0891B2' },
  { name: 'Higher Studies', icon: '🎓', color: '#059669' },
  { name: 'Car',            icon: '🚗', color: '#D97706' },
  { name: 'Home',           icon: '🏡', color: '#DC2626' },
];
