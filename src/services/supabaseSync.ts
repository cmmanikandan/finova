// supabaseSync.ts
// Syncs writes to Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
// Falls back silently to localStorage-only when not configured.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let _userId: string | null = null;

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (supabaseUrl && supabaseKey) {
  client = createClient(supabaseUrl, supabaseKey);
}

export function setSupabaseUserId(uid: string | null): void {
  _userId = uid;
}

export type SyncTable = 'transactions' | 'budgets' | 'goals' | 'accounts' | 'settings';

// Sync type: 'upsert' for add/update, 'delete' for removal
export async function syncToSupabase(
  table: SyncTable,
  record: Record<string, unknown>,
  mode: 'upsert' | 'delete' = 'upsert',
): Promise<void> {
  if (!client || !_userId) return;
  try {
    if (mode === 'upsert') {
      await client.from(table).upsert({ ...record, user_id: _userId });
    } else {
      await client.from(table).delete().eq('id', record.id).eq('user_id', _userId);
    }
  } catch {
    // Silently fail – app continues with localStorage data
  }
}

export async function syncDeleteToSupabase(table: SyncTable, id: string): Promise<void> {
  if (!client || !_userId) return;
  try {
    await client.from(table).delete().eq('id', id).eq('user_id', _userId);
  } catch { /* silent */ }
}

// On login: pull all user data from Supabase and return it for merging.
export async function pullFromSupabase(): Promise<{
  transactions: unknown[];
  budgets: unknown[];
  goals: unknown[];
  accounts: unknown[];
} | null> {
  if (!client || !_userId) return null;
  try {
    const [txns, budgets, goals, accounts] = await Promise.all([
      client.from('transactions').select('*').eq('user_id', _userId),
      client.from('budgets').select('*').eq('user_id', _userId),
      client.from('goals').select('*').eq('user_id', _userId),
      client.from('accounts').select('*').eq('user_id', _userId),
    ]);
    return {
      transactions: txns.data ?? [],
      budgets: budgets.data ?? [],
      goals: goals.data ?? [],
      accounts: accounts.data ?? [],
    };
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return !!client;
}
