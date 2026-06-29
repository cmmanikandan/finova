-- ============================================================
-- FINOVA – Supabase SQL Schema
-- IDEMPOTENT: Safe to run multiple times without errors.
-- Paste this into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    photo_url   TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 2. ACCOUNTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('cash','bank','credit_card','debit_card','upi','wallet','custom')),
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
    icon       TEXT NOT NULL DEFAULT '💳',
    color      TEXT NOT NULL DEFAULT '#2563EB',
    is_custom  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. CATEGORIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = global default
    name       TEXT NOT NULL,
    icon       TEXT NOT NULL,
    color      TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('expense','income','both')),
    is_custom  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. TRANSACTIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
    amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    category_id    TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name  TEXT NOT NULL,
    subcategory    TEXT,
    account_id     TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id  TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    date           TIMESTAMPTZ NOT NULL,
    note           TEXT,
    receipt_url    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. BUDGETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    category_id   TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
    limit_amount  NUMERIC(15,2) NOT NULL CHECK (limit_amount > 0),
    spent_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    period        TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','custom')),
    start_date    DATE NOT NULL,
    end_date      DATE,
    color         TEXT NOT NULL DEFAULT '#2563EB',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. GOALS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    target_date    DATE NOT NULL,
    notes          TEXT,
    icon           TEXT NOT NULL DEFAULT '🎯',
    color          TEXT NOT NULL DEFAULT '#2563EB',
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. SETTINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    user_id                  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency                 TEXT NOT NULL DEFAULT 'INR',
    currency_symbol          TEXT NOT NULL DEFAULT '₹',
    theme                    TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
    pin_enabled              BOOLEAN NOT NULL DEFAULT false,
    pin_hash                 TEXT,
    daily_reminder_enabled   BOOLEAN NOT NULL DEFAULT false,
    daily_reminder_time      TEXT NOT NULL DEFAULT '21:00',
    budget_alerts_enabled    BOOLEAN NOT NULL DEFAULT true,
    language                 TEXT NOT NULL DEFAULT 'en',
    daily_limit_enabled      BOOLEAN NOT NULL DEFAULT false,
    daily_limit              NUMERIC(15,2) NOT NULL DEFAULT 0,
    weekly_limit_enabled     BOOLEAN NOT NULL DEFAULT false,
    weekly_limit             NUMERIC(15,2) NOT NULL DEFAULT 0,
    savings_goal_percent     NUMERIC(5,2) NOT NULL DEFAULT 20.00
);

-- Safe column additions in case settings table existed before without these columns
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_reminder_time    TEXT NOT NULL DEFAULT '21:00';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS budget_alerts_enabled  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS language                TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_limit_enabled     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_limit             NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS weekly_limit_enabled    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS weekly_limit            NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS savings_goal_percent    NUMERIC(5,2) NOT NULL DEFAULT 20.00;

-- ─── 8. STREAKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id                       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak                INTEGER NOT NULL DEFAULT 0,
    best_streak                   INTEGER NOT NULL DEFAULT 0,
    last_spent_date               DATE,
    last_failed_day               DATE,
    last_milestone_claimed        INTEGER,
    last_notification_shown_date  DATE
);

-- ─── 9. RECURRING TRANSACTIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type                 TEXT NOT NULL CHECK (type IN ('expense','income')),
    amount               NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    category_id          TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id           TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    frequency            TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
    start_date           DATE NOT NULL,
    next_due_date        DATE NOT NULL,
    last_processed_date  DATE,
    note                 TEXT,
    active               BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 10. DEBTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_name  TEXT NOT NULL,
    contact_emoji TEXT NOT NULL DEFAULT '👤',
    amount        NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    direction     TEXT NOT NULL CHECK (direction IN ('lent','borrowed')),
    due_date      DATE,
    note          TEXT,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at    TIMESTAMPTZ
);

-- ─── AUTO PROFILE / SETTINGS / STREAK TRIGGER ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, photo_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.streaks (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── ENABLE ROW LEVEL SECURITY ───────────────────────────────
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts                  ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ────────────────────────────────────────────
-- Drop all policies first (idempotent), then recreate

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- accounts
DROP POLICY IF EXISTS "accounts_all_own" ON public.accounts;
CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- categories (global defaults readable by all logged-in users; custom ones only by owner)
DROP POLICY IF EXISTS "categories_select_own_or_global"     ON public.categories;
DROP POLICY IF EXISTS "categories_insert_update_delete_own" ON public.categories;
CREATE POLICY "categories_select_own_or_global"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert_update_delete_own"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id);

-- transactions
DROP POLICY IF EXISTS "transactions_all_own" ON public.transactions;
CREATE POLICY "transactions_all_own" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- budgets
DROP POLICY IF EXISTS "budgets_all_own" ON public.budgets;
CREATE POLICY "budgets_all_own" ON public.budgets FOR ALL USING (auth.uid() = user_id);

-- goals
DROP POLICY IF EXISTS "goals_all_own" ON public.goals;
CREATE POLICY "goals_all_own" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- settings
DROP POLICY IF EXISTS "settings_all_own" ON public.settings;
CREATE POLICY "settings_all_own" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- streaks
DROP POLICY IF EXISTS "streaks_all_own" ON public.streaks;
CREATE POLICY "streaks_all_own" ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- recurring_transactions
DROP POLICY IF EXISTS "recurring_transactions_all_own" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions_all_own" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id);

-- debts
DROP POLICY IF EXISTS "debts_all_own" ON public.debts;
CREATE POLICY "debts_all_own" ON public.debts FOR ALL USING (auth.uid() = user_id);

-- ─── PERFORMANCE INDEXES ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_user          ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user        ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user           ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user             ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user           ON public.streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user         ON public.recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user             ON public.debts(user_id);

-- ─── ENABLE REALTIME REPLICATION ─────────────────────────────
-- We safely add each table to the realtime publication.
-- Each table is wrapped in a sub-block so that if it is already present,
-- the script safely continues to register the rest of the tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.accounts;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.categories;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.transactions;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.budgets;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.goals;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.settings;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.streaks;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.recurring_transactions;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.debts;
    exception when others then null;
    end;
  end if;
end $$;
