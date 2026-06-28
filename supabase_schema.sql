-- FINOVA Supabase SQL Schema Definition (Idempotent Migration Script)
-- Paste this script directly into the Supabase SQL Editor.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'debit_card', 'upi', 'wallet', 'custom')),
    balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    icon TEXT DEFAULT '💳' NOT NULL,
    color TEXT DEFAULT '#2563EB' NOT NULL,
    is_custom BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL if global default
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
    is_custom BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL, -- cache category name/fallback
    subcategory TEXT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL means 'All Categories'
    limit_amount NUMERIC(15, 2) NOT NULL CHECK (limit_amount > 0),
    spent_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    period TEXT DEFAULT 'monthly' NOT NULL CHECK (period IN ('monthly', 'weekly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE,
    color TEXT DEFAULT '#2563EB' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    target_date DATE NOT NULL,
    notes TEXT,
    icon TEXT DEFAULT '🎯' NOT NULL,
    color TEXT DEFAULT '#2563EB' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. App Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    currency TEXT DEFAULT 'INR' NOT NULL,
    currency_symbol TEXT DEFAULT '₹' NOT NULL,
    theme TEXT DEFAULT 'system' NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
    pin_enabled BOOLEAN DEFAULT false NOT NULL,
    pin_hash TEXT,
    daily_reminder_enabled BOOLEAN DEFAULT false NOT NULL,
    daily_reminder_time TEXT DEFAULT '21:00' NOT NULL,
    budget_alerts_enabled BOOLEAN DEFAULT true NOT NULL,
    language TEXT DEFAULT 'en' NOT NULL
);

-- Add daily_reminder_time column safely if table existed without it
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS daily_reminder_time TEXT DEFAULT '21:00' NOT NULL;

-- 8. Streaks Table (Daily Spending Streak Tracker)
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    best_streak INTEGER DEFAULT 0 NOT NULL,
    last_spent_date DATE,
    last_failed_day DATE,
    last_milestone_claimed INTEGER,
    last_notification_shown_date DATE
);

-- 9. Recurring Transactions Table (Scheduled Bills / Subscriptions)
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    last_processed_date DATE,
    note TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── AUTOMATIC PROFILE CREATION TRIGGER ─────────────────────────────
-- Auto create a public profile, default settings, and streak tracker when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile if not exists
  INSERT INTO public.profiles (id, name, email, photo_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert default settings if not exists
  INSERT INTO public.settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default streak values if not exists
  INSERT INTO public.streaks (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow individual read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update own profile" ON public.profiles;
CREATE POLICY "Allow individual read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts Policies
DROP POLICY IF EXISTS "Allow users to manage own accounts" ON public.accounts;
CREATE POLICY "Allow users to manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- Categories Policies
DROP POLICY IF EXISTS "Allow select global and custom categories" ON public.categories;
DROP POLICY IF EXISTS "Allow users to insert/edit/delete own categories" ON public.categories;
CREATE POLICY "Allow select global and custom categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Allow users to insert/edit/delete own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Allow users to manage own transactions" ON public.transactions;
CREATE POLICY "Allow users to manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Budgets Policies
DROP POLICY IF EXISTS "Allow users to manage own budgets" ON public.budgets;
CREATE POLICY "Allow users to manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);

-- Goals Policies
DROP POLICY IF EXISTS "Allow users to manage own goals" ON public.goals;
CREATE POLICY "Allow users to manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- Settings Policies
DROP POLICY IF EXISTS "Allow users to manage own settings" ON public.settings;
CREATE POLICY "Allow users to manage own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- Streaks Policies
DROP POLICY IF EXISTS "Allow users to manage own streaks" ON public.streaks;
CREATE POLICY "Allow users to manage own streaks" ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- Recurring Transactions Policies
DROP POLICY IF EXISTS "Allow users to manage own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Allow users to manage own recurring_transactions" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id);

-- ─── DATABASE INDEXES FOR SPEED ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON public.streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_txns_user ON public.recurring_transactions(user_id);
