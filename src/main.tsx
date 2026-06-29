// FINOVA App Entry Point
// Note: localStorage is used ONLY for UI preferences (theme, hidden accounts, onboarding state).
// ALL financial data (transactions, accounts, balances, goals, budgets) is stored in Supabase ONLY.
// No localStorage override is needed — financial data never touches localStorage.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
