-- ============================================================
-- FINOVA – Supabase Unified SQL Schema & Migration Script
-- IDEMPOTENT: Safe to run multiple times without errors.
-- Paste this entire file into Supabase → SQL Editor and click "Run".
-- ============================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 0. AUTH HELPER FOR FIREBASE UIDS ────────────────────────
-- Extracts the Firebase Auth UID string from custom JWT claims
CREATE OR REPLACE FUNCTION public.auth_uid_text()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '');
$$;


-- ─── 1. DROP ALL EXISTING RLS POLICIES & FOREIGN KEYS ─────────
-- (RLS policies MUST be dropped first, otherwise column types cannot be altered)

-- Drop RLS policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "accounts_all_own" ON public.accounts;
DROP POLICY IF EXISTS "Allow users to manage own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow individual read own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow individual insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow individual update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow individual delete own accounts" ON public.accounts;

DROP POLICY IF EXISTS "categories_select_own_or_global"     ON public.categories;
DROP POLICY IF EXISTS "categories_insert_update_delete_own" ON public.categories;
DROP POLICY IF EXISTS "Allow individual read own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow individual insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow individual update own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow individual delete own categories" ON public.categories;

DROP POLICY IF EXISTS "transactions_all_own" ON public.transactions;
DROP POLICY IF EXISTS "budgets_all_own" ON public.budgets;
DROP POLICY IF EXISTS "goals_all_own" ON public.goals;
DROP POLICY IF EXISTS "settings_all_own" ON public.settings;
DROP POLICY IF EXISTS "streaks_all_own" ON public.streaks;
DROP POLICY IF EXISTS "recurring_transactions_all_own" ON public.recurring_transactions;
DROP POLICY IF EXISTS "debts_all_own" ON public.debts;
DROP POLICY IF EXISTS "challenges_all_own" ON public.challenges;
DROP POLICY IF EXISTS "split_bills_all_own" ON public.split_bills;

DROP POLICY IF EXISTS "daily_tasks_all_own" ON public.daily_tasks;
DROP POLICY IF EXISTS "daily_task_logs_all_own" ON public.daily_task_logs;
DROP POLICY IF EXISTS "planner_schedule_all_own" ON public.planner_schedule;
DROP POLICY IF EXISTS "planner_reminders_all_own" ON public.planner_reminders;
DROP POLICY IF EXISTS "xp_history_all_own" ON public.xp_history;
DROP POLICY IF EXISTS "user_levels_all_own" ON public.user_levels;
DROP POLICY IF EXISTS "user_badges_all_own" ON public.user_badges;
DROP POLICY IF EXISTS "planner_statistics_all_own" ON public.planner_statistics;

-- Drop foreign key constraints referencing profiles(id)
ALTER TABLE IF EXISTS public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE IF EXISTS public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE IF EXISTS public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE IF EXISTS public.settings DROP CONSTRAINT IF EXISTS settings_user_id_fkey;
ALTER TABLE IF EXISTS public.streaks DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_user_id_fkey;
ALTER TABLE IF EXISTS public.debts DROP CONSTRAINT IF EXISTS debts_user_id_fkey;
ALTER TABLE IF EXISTS public.challenges DROP CONSTRAINT IF EXISTS challenges_user_id_fkey;
ALTER TABLE IF EXISTS public.split_bills DROP CONSTRAINT IF EXISTS split_bills_user_id_fkey;

ALTER TABLE IF EXISTS public.daily_tasks DROP CONSTRAINT IF EXISTS daily_tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_task_logs DROP CONSTRAINT IF EXISTS daily_task_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_task_logs DROP CONSTRAINT IF EXISTS daily_task_logs_task_id_fkey;
ALTER TABLE IF EXISTS public.planner_schedule DROP CONSTRAINT IF EXISTS planner_schedule_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_reminders DROP CONSTRAINT IF EXISTS planner_reminders_user_id_fkey;
ALTER TABLE IF EXISTS public.xp_history DROP CONSTRAINT IF EXISTS xp_history_user_id_fkey;
ALTER TABLE IF EXISTS public.user_levels DROP CONSTRAINT IF EXISTS user_levels_user_id_fkey;
ALTER TABLE IF EXISTS public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE IF EXISTS public.planner_statistics DROP CONSTRAINT IF EXISTS planner_statistics_user_id_fkey;

-- Drop foreign keys referencing accounts and categories
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_to_account_id_fkey;
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_category_id_fkey;
ALTER TABLE IF EXISTS public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_account_id_fkey;

-- Drop trigger to prevent execution blocks
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- ─── 2. CONVERT EXISTING TABLE COLUMNS FROM UUID TO TEXT ──────
-- (Safe to run: alters column type with data migration if table exists)
DO $$
BEGIN
  -- profiles.id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id' AND data_type = 'uuid') THEN
    ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
  
  -- accounts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    ALTER TABLE public.accounts ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.accounts ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- categories
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.categories ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- transactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE public.transactions ALTER COLUMN account_id TYPE TEXT USING account_id::text;
    ALTER TABLE public.transactions ALTER COLUMN to_account_id TYPE TEXT USING to_account_id::text;
    ALTER TABLE public.transactions ALTER COLUMN category_id TYPE TEXT USING category_id::text;
  END IF;

  -- budgets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    ALTER TABLE public.budgets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE public.budgets ALTER COLUMN category_id TYPE TEXT USING category_id::text;
  END IF;

  -- goals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    ALTER TABLE public.goals ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE public.settings ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- streaks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streaks') THEN
    ALTER TABLE public.streaks ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- recurring_transactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_transactions') THEN
    ALTER TABLE public.recurring_transactions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE public.recurring_transactions ALTER COLUMN category_id TYPE TEXT USING category_id::text;
    ALTER TABLE public.recurring_transactions ALTER COLUMN account_id TYPE TEXT USING account_id::text;
  END IF;

  -- debts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
    ALTER TABLE public.debts ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- challenges
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenges') THEN
    ALTER TABLE public.challenges ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- split_bills
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'split_bills') THEN
    ALTER TABLE public.split_bills ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- daily_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_tasks') THEN
    ALTER TABLE public.daily_tasks ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- daily_task_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_task_logs') THEN
    ALTER TABLE public.daily_task_logs ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- planner_schedule
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planner_schedule') THEN
    ALTER TABLE public.planner_schedule ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- planner_reminders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planner_reminders') THEN
    ALTER TABLE public.planner_reminders ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- xp_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_history') THEN
    ALTER TABLE public.xp_history ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- user_levels
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_levels') THEN
    ALTER TABLE public.user_levels ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- user_badges
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    ALTER TABLE public.user_badges ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  -- planner_statistics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planner_statistics') THEN
    ALTER TABLE public.planner_statistics ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;
END;
$$;


-- ─── 3. CREATE / VERIFY TABLES ───────────────────────────────
-- (Ensures all tables are created with the correct TEXT datatypes)

CREATE TABLE IF NOT EXISTS public.profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    photo_url   TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('cash','bank','credit_card','debit_card','upi','wallet','custom')),
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
    icon       TEXT NOT NULL DEFAULT '💳',
    color      TEXT NOT NULL DEFAULT '#2563EB',
    is_custom  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT, -- NULL = global default
    name       TEXT NOT NULL,
    icon       TEXT NOT NULL,
    color      TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('expense','income','both')),
    is_custom  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
    amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    category_id    TEXT,
    category_name  TEXT NOT NULL,
    subcategory    TEXT,
    account_id     TEXT NOT NULL,
    to_account_id  TEXT,
    date           TIMESTAMPTZ NOT NULL,
    note           TEXT,
    receipt_url    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    category_id   TEXT,
    limit_amount  NUMERIC(15,2) NOT NULL CHECK (limit_amount > 0),
    spent_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    period        TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','daily','custom')),
    start_date    DATE NOT NULL,
    end_date      DATE,
    color         TEXT NOT NULL DEFAULT '#2563EB',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.settings (
    user_id                  TEXT PRIMARY KEY,
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
    savings_goal_percent     NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    upi_id                   TEXT
);

-- Ensure settings columns exist (for backwards compatibility if tables existed before)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency                 TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency_symbol          TEXT NOT NULL DEFAULT '₹';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme                    TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system'));
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pin_enabled              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pin_hash                 TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_reminder_enabled   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_reminder_time      TEXT NOT NULL DEFAULT '21:00';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS budget_alerts_enabled    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS language                 TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_limit_enabled      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_limit              NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS weekly_limit_enabled     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS weekly_limit             NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS savings_goal_percent     NUMERIC(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS upi_id                  TEXT;

-- Adjust budgets updated_at
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Adjust budgets check constraint period
DO $$
BEGIN
  ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_period_check;
  ALTER TABLE public.budgets ADD CONSTRAINT budgets_period_check CHECK (period IN ('monthly','weekly','daily','custom'));
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.streaks (
    user_id                       TEXT PRIMARY KEY,
    current_streak                INTEGER NOT NULL DEFAULT 0,
    best_streak                   INTEGER NOT NULL DEFAULT 0,
    last_spent_date               DATE,
    last_failed_day               DATE,
    last_milestone_claimed        INTEGER,
    last_notification_shown_date  DATE
);

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    type                 TEXT NOT NULL CHECK (type IN ('expense','income')),
    amount               NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    category_id          TEXT,
    account_id           TEXT NOT NULL,
    frequency            TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
    start_date           DATE NOT NULL,
    next_due_date        DATE NOT NULL,
    last_processed_date  DATE,
    note                 TEXT,
    active               BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.challenges (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.split_bills (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
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

ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_best_streak    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS planner_last_active_date DATE;

CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    title                TEXT NOT NULL,
    description          TEXT,
    icon                 TEXT NOT NULL DEFAULT '🎯',
    color                TEXT NOT NULL DEFAULT '#2563EB',
    category             TEXT NOT NULL DEFAULT 'custom',
    budget_limit         NUMERIC(15,2) DEFAULT 0,
    reminder_time        TEXT,
    repeat_schedule      TEXT NOT NULL DEFAULT 'daily' CHECK (repeat_schedule IN ('daily','weekly','monthly','yearly','weekdays','weekends','custom')),
    priority             TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    estimated_duration   INTEGER,
    notes                TEXT,
    location             TEXT,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_task_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    task_id              UUID NOT NULL,
    date                 DATE NOT NULL DEFAULT CURRENT_DATE,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','missed')),
    completed_at         TIMESTAMPTZ,
    spent_amount         NUMERIC(15,2) DEFAULT 0,
    xp_earned            INTEGER DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_task_date_user UNIQUE (task_id, date, user_id)
);

CREATE TABLE IF NOT EXISTS public.planner_schedule (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    day_of_week          INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    task_ids             UUID[] DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_day UNIQUE (user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.planner_reminders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    title                TEXT NOT NULL,
    time                 TEXT NOT NULL,
    days                 INTEGER[] DEFAULT '{}',
    is_enabled           BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xp_history (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    amount               INTEGER NOT NULL,
    reason               TEXT NOT NULL,
    reference_id         UUID,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_levels (
    user_id              TEXT PRIMARY KEY,
    current_level        INTEGER NOT NULL DEFAULT 1,
    current_xp           INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
    badge_name           TEXT NOT NULL,
    unlocked_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_name)
);

CREATE TABLE IF NOT EXISTS public.planner_statistics (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              TEXT NOT NULL,
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


-- ─── 4. RE-ADD FOREIGN KEY CONSTRAINTS ────────────────────────
-- (Now that all tables are aligned to TEXT primary/foreign keys)

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
ALTER TABLE public.daily_task_logs ADD CONSTRAINT daily_task_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.planner_schedule ADD CONSTRAINT planner_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_reminders ADD CONSTRAINT planner_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.xp_history ADD CONSTRAINT xp_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_levels ADD CONSTRAINT user_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.planner_statistics ADD CONSTRAINT planner_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


-- ─── 5. ENABLE ROW LEVEL SECURITY ─────────────────────────────

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
ALTER TABLE public.daily_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_schedule       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_reminders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_statistics     ENABLE ROW LEVEL SECURITY;


-- ─── 6. RECREATE RLS POLICIES ─────────────────────────────────

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (public.auth_uid_text() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (public.auth_uid_text() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (public.auth_uid_text() = id);

-- Accounts
CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL USING (public.auth_uid_text() = user_id);

-- Categories
CREATE POLICY "categories_select_own_or_global" ON public.categories FOR SELECT USING (user_id IS NULL OR public.auth_uid_text() = user_id);
CREATE POLICY "categories_insert_update_delete_own" ON public.categories FOR ALL USING (public.auth_uid_text() = user_id);

-- Transactions
CREATE POLICY "transactions_all_own" ON public.transactions FOR ALL USING (public.auth_uid_text() = user_id);

-- Budgets
CREATE POLICY "budgets_all_own" ON public.budgets FOR ALL USING (public.auth_uid_text() = user_id);

-- Goals
CREATE POLICY "goals_all_own" ON public.goals FOR ALL USING (public.auth_uid_text() = user_id);

-- Settings
CREATE POLICY "settings_all_own" ON public.settings FOR ALL USING (public.auth_uid_text() = user_id);

-- Streaks
CREATE POLICY "streaks_all_own" ON public.streaks FOR ALL USING (public.auth_uid_text() = user_id);

-- Recurring Transactions
CREATE POLICY "recurring_transactions_all_own" ON public.recurring_transactions FOR ALL USING (public.auth_uid_text() = user_id);

-- Debts
CREATE POLICY "debts_all_own" ON public.debts FOR ALL USING (public.auth_uid_text() = user_id);

-- Challenges
CREATE POLICY "challenges_all_own" ON public.challenges FOR ALL USING (public.auth_uid_text() = user_id);

-- Split Bills
CREATE POLICY "split_bills_all_own" ON public.split_bills FOR ALL USING (public.auth_uid_text() = user_id);

-- Daily Tasks
CREATE POLICY "daily_tasks_all_own" ON public.daily_tasks FOR ALL USING (public.auth_uid_text() = user_id);

-- Daily Task Logs
CREATE POLICY "daily_task_logs_all_own" ON public.daily_task_logs FOR ALL USING (public.auth_uid_text() = user_id);

-- Planner Schedule
CREATE POLICY "planner_schedule_all_own" ON public.planner_schedule FOR ALL USING (public.auth_uid_text() = user_id);

-- Planner Reminders
CREATE POLICY "planner_reminders_all_own" ON public.planner_reminders FOR ALL USING (public.auth_uid_text() = user_id);

-- XP History
CREATE POLICY "xp_history_all_own" ON public.xp_history FOR ALL USING (public.auth_uid_text() = user_id);

-- User Levels
CREATE POLICY "user_levels_all_own" ON public.user_levels FOR ALL USING (public.auth_uid_text() = user_id);

-- User Badges
CREATE POLICY "user_badges_all_own" ON public.user_badges FOR ALL USING (public.auth_uid_text() = user_id);

-- Planner Statistics
CREATE POLICY "planner_statistics_all_own" ON public.planner_statistics FOR ALL USING (public.auth_uid_text() = user_id);


-- ─── 7. PERFORMANCE INDEXES ───────────────────────────────────

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


-- ─── 8. ENABLE REALTIME REPLICATION ───────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.streaks;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_transactions;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bills;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_logs;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_schedule;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_reminders;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_history;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_levels;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_statistics;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;


-- ─── 9. TRIGGER FOR NEW USER PROVISIONING ─────────────────────

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
