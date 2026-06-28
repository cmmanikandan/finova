-- FINOVA Supabase SQL Schema Definition
-- Paste this script directly into the Supabase SQL Editor.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked with Supabase Auth users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Accounts Table
CREATE TABLE public.accounts (
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
CREATE TABLE public.categories (
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
CREATE TABLE public.transactions (
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
CREATE TABLE public.budgets (
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
CREATE TABLE public.goals (
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
CREATE TABLE public.settings (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    currency TEXT DEFAULT 'INR' NOT NULL,
    currency_symbol TEXT DEFAULT '₹' NOT NULL,
    theme TEXT DEFAULT 'system' NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
    pin_enabled BOOLEAN DEFAULT false NOT NULL,
    pin_hash TEXT,
    daily_reminder_enabled BOOLEAN DEFAULT false NOT NULL,
    budget_alerts_enabled BOOLEAN DEFAULT true NOT NULL,
    language TEXT DEFAULT 'en' NOT NULL
);

-- ─── AUTOMATIC PROFILE CREATION TRIGGER ─────────────────────────────
-- Auto create a public profile and default settings when a user signs up via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, photo_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create policies so users can only view and modify their own records

-- Profiles Policies
CREATE POLICY "Allow individual read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts Policies
CREATE POLICY "Allow users to manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- Categories Policies
CREATE POLICY "Allow select global and custom categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Allow users to insert/edit/delete own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Allow users to manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Allow users to manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);

-- Goals Policies
CREATE POLICY "Allow users to manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- Settings Policies
CREATE POLICY "Allow users to manage own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- ─── DATABASE INDEXES FOR SPEED ──────────────────────────────────────
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_accounts_user ON public.accounts(user_id);
CREATE INDEX idx_budgets_user ON public.budgets(user_id);
CREATE INDEX idx_goals_user ON public.goals(user_id);
