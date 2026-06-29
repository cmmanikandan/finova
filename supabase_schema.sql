-- ============================================================
-- FINOVA – Supabase SQL Schema
-- IDEMPOTENT: Safe to run multiple times without errors.
-- Paste this into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    photo_url   TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 2. ACCOUNTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    user_id    TEXT REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = global default
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
    user_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    user_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    category_id   TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
    limit_amount  NUMERIC(15,2) NOT NULL CHECK (limit_amount > 0),
    spent_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    period        TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','daily','custom')),
    start_date    DATE NOT NULL,
    end_date      DATE,
    color         TEXT NOT NULL DEFAULT '#2563EB',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. GOALS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    user_id                  TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- Migration: update budget period constraint to include 'daily' (idempotent)
DO $$
BEGIN
  -- Drop old constraint if it exists and doesn't include 'daily'
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budgets_period_check'
      AND conrelid = 'public.budgets'::regclass
  ) THEN
    ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_period_check;
  END IF;
  -- Re-add with 'daily' included
  ALTER TABLE public.budgets
    ADD CONSTRAINT budgets_period_check
    CHECK (period IN ('monthly','weekly','daily','custom'));
EXCEPTION WHEN others THEN
  NULL; -- Ignore if already correct
END;
$$;

-- Add updated_at column to budgets if missing
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();


-- ─── 8. STREAKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id                       TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    user_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- ─── 11. CHALLENGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL,
    target_category TEXT,
    limit_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    duration_days  INTEGER NOT NULL,
    start_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date       TIMESTAMPTZ NOT NULL,
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
    checked_days   INTEGER[] DEFAULT '{}'
);

-- ─── 12. SPLIT BILLS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.split_bills (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    description    TEXT,
    date           DATE NOT NULL DEFAULT CURRENT_DATE,
    category       TEXT NOT NULL,
    method         TEXT NOT NULL,
    members        JSONB NOT NULL DEFAULT '[]'::jsonb,
    upi_id         TEXT NOT NULL,
    receiver_name  TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
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
ALTER TABLE public.challenges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills             ENABLE ROW LEVEL SECURITY;

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

-- challenges
DROP POLICY IF EXISTS "challenges_all_own" ON public.challenges;
CREATE POLICY "challenges_all_own" ON public.challenges FOR ALL USING (auth.uid() = user_id);

-- split_bills
DROP POLICY IF EXISTS "split_bills_all_own" ON public.split_bills;
CREATE POLICY "split_bills_all_own" ON public.split_bills FOR ALL USING (auth.uid() = user_id);

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
CREATE INDEX IF NOT EXISTS idx_challenges_user        ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_user        ON public.split_bills(user_id);

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

    begin
      alter publication supabase_realtime add table public.challenges;
    exception when others then null;
    end;

    begin
      alter publication supabase_realtime add table public.split_bills;
    exception when others then null;
    end;
  end if;
end $$;

-- ============================================================
-- ─── 13. PLANNER & XP TABLES ───────────────────────────────────
-- ============================================================

-- Add planner streak columns to streaks table
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_best_streak    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_last_active_date DATE;

-- daily_tasks
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title                TEXT NOT NULL,
    description          TEXT,
    icon                 TEXT NOT NULL DEFAULT '🎯',
    color                TEXT NOT NULL DEFAULT '#2563EB',
    category             TEXT NOT NULL DEFAULT 'custom',
    budget_limit         NUMERIC(15,2) DEFAULT 0,
    reminder_time        TEXT, -- e.g. '08:00 AM'
    repeat_schedule      TEXT NOT NULL DEFAULT 'daily' CHECK (repeat_schedule IN ('daily','weekly','monthly','yearly','weekdays','weekends','custom')),
    priority             TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    estimated_duration   INTEGER, -- in minutes
    notes                TEXT,
    location             TEXT,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_task_logs
CREATE TABLE IF NOT EXISTS public.daily_task_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id              UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
    date                 DATE NOT NULL DEFAULT CURRENT_DATE,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','missed')),
    completed_at         TIMESTAMPTZ,
    spent_amount         NUMERIC(15,2) DEFAULT 0,
    xp_earned            INTEGER DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_task_date_user UNIQUE (task_id, date, user_id)
);

-- planner_schedule
CREATE TABLE IF NOT EXISTS public.planner_schedule (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week          INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    task_ids             UUID[] DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_day UNIQUE (user_id, day_of_week)
);

-- planner_reminders
CREATE TABLE IF NOT EXISTS public.planner_reminders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title                TEXT NOT NULL,
    time                 TEXT NOT NULL, -- e.g. '08:00 AM'
    days                 INTEGER[] DEFAULT '{}',
    is_enabled           BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- xp_history
CREATE TABLE IF NOT EXISTS public.xp_history (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount               INTEGER NOT NULL,
    reason               TEXT NOT NULL,
    reference_id         UUID,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_levels
CREATE TABLE IF NOT EXISTS public.user_levels (
    user_id              TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_level        INTEGER NOT NULL DEFAULT 1,
    current_xp           INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_name           TEXT NOT NULL,
    unlocked_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_name)
);

-- planner_statistics
CREATE TABLE IF NOT EXISTS public.planner_statistics (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date                 DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks_completed      INTEGER DEFAULT 0,
    tasks_total          INTEGER DEFAULT 0,
    budget_limit         NUMERIC(15,2) DEFAULT 0,
    budget_spent         NUMERIC(15,2) DEFAULT 0,
    xp_earned            INTEGER DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_stat_date UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_statistics ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "daily_tasks_all_own" ON public.daily_tasks;
CREATE POLICY "daily_tasks_all_own" ON public.daily_tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_task_logs_all_own" ON public.daily_task_logs;
CREATE POLICY "daily_task_logs_all_own" ON public.daily_task_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_schedule_all_own" ON public.planner_schedule;
CREATE POLICY "planner_schedule_all_own" ON public.planner_schedule FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_reminders_all_own" ON public.planner_reminders;
CREATE POLICY "planner_reminders_all_own" ON public.planner_reminders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "xp_history_all_own" ON public.xp_history;
CREATE POLICY "xp_history_all_own" ON public.xp_history FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_levels_all_own" ON public.user_levels;
CREATE POLICY "user_levels_all_own" ON public.user_levels FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_all_own" ON public.user_badges;
CREATE POLICY "user_badges_all_own" ON public.user_badges FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_statistics_all_own" ON public.planner_statistics;
CREATE POLICY "planner_statistics_all_own" ON public.planner_statistics FOR ALL USING (auth.uid() = user_id);

-- Add to publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_logs;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_schedule;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_reminders;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_history;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_levels;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_statistics;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- ─── SYSTEM MIGRATION: RUN THIS TO FIX 400 BAD REQUEST ERRORS ───
-- ============================================================
-- COPY AND PASTE THIS ENTIRE SECTION INTO THE SUPABASE SQL EDITOR AND RUN IT
-- TO CONVERT USER_ID FIELDS FROM UUID TO TEXT TO SUPPORT FIREBASE AUTH UIDS.
-- ============================================================

-- 1. Drop foreign keys referencing profiles(id)
ALTER TABLE IF EXISTS public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE IF EXISTS public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE IF EXISTS public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.debts DROP CONSTRAINT IF EXISTS debts_user_id_fkey;
ALTER TABLE IF EXISTS public.challenges DROP CONSTRAINT IF EXISTS challenges_user_id_fkey;
ALTER TABLE IF EXISTS public.split_bills DROP CONSTRAINT IF EXISTS split_bills_user_id_fkey;
ALTER TABLE IF EXISTS public.streaks DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;

ALTER TABLE IF EXISTS public.daily_tasks DROP CONSTRAINT IF EXISTS daily_tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_task_logs DROP CONSTRAINT IF EXISTS daily_task_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_schedule DROP CONSTRAINT IF EXISTS planner_schedule_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_reminders DROP CONSTRAINT IF EXISTS planner_reminders_user_id_fkey;
ALTER TABLE IF EXISTS public.xp_history DROP CONSTRAINT IF EXISTS xp_history_user_id_fkey;
ALTER TABLE IF EXISTS public.user_levels DROP CONSTRAINT IF EXISTS user_levels_user_id_fkey;
ALTER TABLE IF EXISTS public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_statistics DROP CONSTRAINT IF EXISTS planner_statistics_user_id_fkey;

-- 2. Alter profiles.id type to TEXT and drop auth.users reference
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- 3. Alter other tables' user_id type to TEXT
ALTER TABLE public.accounts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.categories ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.budgets ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.goals ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.settings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.streaks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.recurring_transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.debts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.challenges ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.split_bills ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.daily_tasks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.daily_task_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_schedule ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_reminders ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.xp_history ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_levels ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_badges ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_statistics ALTER COLUMN user_id TYPE TEXT;

-- 4. Re-add foreign keys with TEXT reference
ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.streaks ADD CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.debts ADD CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.split_bills ADD CONSTRAINT split_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_tasks ADD CONSTRAINT daily_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.daily_task_logs ADD CONSTRAINT daily_task_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_schedule ADD CONSTRAINT planner_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_reminders ADD CONSTRAINT planner_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.xp_history ADD CONSTRAINT xp_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_levels ADD CONSTRAINT user_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_statistics ADD CONSTRAINT planner_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ============================================================
-- ─── SYSTEM MIGRATION: CONVERT ID & REFERENCE COLUMNS TO TEXT ───
-- ============================================================
-- COPY AND PASTE THIS ENTIRE SECTION INTO THE SUPABASE SQL EDITOR AND RUN IT
-- TO CONVERT COLUMNS FROM UUID TO TEXT SAFELY BY RESOLVING POLICY DEPENDENCIES.
-- ============================================================

-- 1. Drop all RLS policies dynamically across the entire public schema
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. Drop foreign key constraints referencing profiles(id)
ALTER TABLE IF EXISTS public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE IF EXISTS public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE IF EXISTS public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.debts DROP CONSTRAINT IF EXISTS debts_user_id_fkey;
ALTER TABLE IF EXISTS public.challenges DROP CONSTRAINT IF EXISTS challenges_user_id_fkey;
ALTER TABLE IF EXISTS public.split_bills DROP CONSTRAINT IF EXISTS split_bills_user_id_fkey;
ALTER TABLE IF EXISTS public.streaks DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;
ALTER TABLE IF EXISTS public.settings DROP CONSTRAINT IF EXISTS settings_user_id_fkey;

ALTER TABLE IF EXISTS public.daily_tasks DROP CONSTRAINT IF EXISTS daily_tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_task_logs DROP CONSTRAINT IF EXISTS daily_task_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_schedule DROP CONSTRAINT IF EXISTS planner_schedule_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_reminders DROP CONSTRAINT IF EXISTS planner_reminders_user_id_fkey;
ALTER TABLE IF EXISTS public.xp_history DROP CONSTRAINT IF EXISTS xp_history_user_id_fkey;
ALTER TABLE IF EXISTS public.user_levels DROP CONSTRAINT IF EXISTS user_levels_user_id_fkey;
ALTER TABLE IF EXISTS public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_statistics DROP CONSTRAINT IF EXISTS planner_statistics_user_id_fkey;

-- Drop foreign key constraints referencing accounts(id) or categories(id)
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_to_account_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_category_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_account_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_to_account_id_fkey;
ALTER TABLE IF EXISTS public.split_bills DROP CONSTRAINT IF EXISTS split_bills_category_id_fkey;
ALTER TABLE IF EXISTS public.split_bills DROP CONSTRAINT IF EXISTS split_bills_account_id_fkey;

-- 3. Alter profiles.id type to TEXT
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- Alter other tables' user_id type to TEXT
ALTER TABLE public.accounts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.categories ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.budgets ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.goals ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.settings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.streaks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.recurring_transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.debts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.challenges ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.split_bills ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.daily_tasks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.daily_task_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_schedule ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_reminders ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.xp_history ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_levels ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.user_badges ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.planner_statistics ALTER COLUMN user_id TYPE TEXT;

-- Convert accounts.id, categories.id and reference columns to TEXT
ALTER TABLE public.accounts ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT;

ALTER TABLE public.transactions ALTER COLUMN account_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN to_account_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN category_id TYPE TEXT;
ALTER TABLE public.budgets ALTER COLUMN category_id TYPE TEXT;
ALTER TABLE public.recurring_transactions ALTER COLUMN category_id TYPE TEXT;
ALTER TABLE public.recurring_transactions ALTER COLUMN account_id TYPE TEXT;
ALTER TABLE public.recurring_transactions ALTER COLUMN to_account_id TYPE TEXT;
ALTER TABLE public.split_bills ALTER COLUMN category_id TYPE TEXT;
ALTER TABLE public.split_bills ALTER COLUMN account_id TYPE TEXT;

-- 4. Re-add foreign key constraints referencing profiles(id)
ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.streaks ADD CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.debts ADD CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.split_bills ADD CONSTRAINT split_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_tasks ADD CONSTRAINT daily_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.daily_task_logs ADD CONSTRAINT daily_task_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_schedule ADD CONSTRAINT planner_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_reminders ADD CONSTRAINT planner_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.xp_history ADD CONSTRAINT xp_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_levels ADD CONSTRAINT user_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_statistics ADD CONSTRAINT planner_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Re-add foreign key constraints referencing accounts(id) or categories(id)
ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.split_bills ADD CONSTRAINT split_bills_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.split_bills ADD CONSTRAINT split_bills_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 5. Re-create RLS policies on profiles, accounts, and categories
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "categories_select_own_or_global" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert_update_delete_own" ON public.categories FOR ALL USING (auth.uid() = user_id);
