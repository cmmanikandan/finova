import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Transaction, Budget, Goal, Account, Category, AppSettings } from '../types';
import { onAuthStateChanged } from '../services/auth';
import * as db from '../services/db';

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
}

const AppContext = createContext<AppContextType>({
  user: null, loading: true,
  transactions: [], budgets: [], goals: [], accounts: [], categories: [],
  settings: db.getSettings(),
  refresh: () => {},
  saveSettings: () => {},
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
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());

  const refresh = useCallback(() => {
    setTransactions(db.getTransactions());
    setBudgets(db.getBudgets());
    setGoals(db.getGoals());
    setAccounts(db.getAccounts());
    setCategories(db.getCategories());
    setSettings(db.getSettings());
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(u => {
      setUser(u);
      setLoading(false);
      if (u) refresh();
    });
    return unsub;
  }, [refresh]);

  const saveSettings = useCallback((s: AppSettings) => {
    db.saveSettings(s);
    setSettings(s);
  }, []);

  return (
    <AppContext.Provider value={{
      user, loading,
      transactions, budgets, goals, accounts, categories,
      settings, refresh, saveSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
};
