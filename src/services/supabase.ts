// Supabase client – used for cloud sync when credentials are present
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

// ─── Schema helper (run once on first login) ──────────────────────────────────
// These SQL statements are idempotent – they only create tables if they don't exist.
// Run them via Supabase Dashboard → SQL Editor if you want cloud sync.
export const SUPABASE_SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount      NUMERIC NOT NULL,
  category    TEXT NOT NULL,
  subcategory TEXT,
  account     TEXT NOT NULL,
  to_account  TEXT,
  date        TIMESTAMPTZ NOT NULL,
  note        TEXT,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  "limit"    NUMERIC NOT NULL,
  spent      NUMERIC DEFAULT 0,
  period     TEXT DEFAULT 'monthly',
  start_date TIMESTAMPTZ,
  end_date   TIMESTAMPTZ,
  color      TEXT DEFAULT '#2563EB'
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  name           TEXT NOT NULL,
  target_amount  NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  target_date    TIMESTAMPTZ,
  notes          TEXT,
  icon           TEXT DEFAULT '🎯',
  color          TEXT DEFAULT '#2563EB',
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  icon    TEXT,
  color   TEXT,
  is_custom BOOLEAN DEFAULT FALSE
);

-- Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users own their transactions" ON transactions FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users own their budgets"      ON budgets      FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users own their goals"        ON goals        FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users own their accounts"     ON accounts     FOR ALL USING (user_id = auth.uid()::text);
`;

export default getSupabase;
