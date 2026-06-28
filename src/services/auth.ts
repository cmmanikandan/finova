// Auth service – Supabase Google Auth with localStorage session persistence
import type { User } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

const supabase = getSupabase();

type AuthCallback = (user: User | null) => void;
const listeners: AuthCallback[] = [];

function mapSupabaseUser(su: any): User {
  return {
    uid: su.id,
    name: su.user_metadata?.full_name || su.email || 'User',
    email: su.email || '',
    photoURL:
      su.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(su.user_metadata?.full_name || 'U')}&background=2563EB&color=fff&size=128`,
  };
}

function notifyListeners(user: User | null) {
  localStorage.setItem('finova_user', user ? JSON.stringify(user) : '');
  listeners.forEach(cb => cb(user));
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return null; // OAuth redirects the page
  }

  // Demo fallback
  const user: User = {
    uid: 'demo-user-001',
    name: 'Demo User',
    email: 'demo@finova.app',
    photoURL: 'https://ui-avatars.com/api/?name=Demo+User&background=2563EB&color=fff&size=128',
  };
  notifyListeners(user);
  return user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('finova_user');
  notifyListeners(null);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuthStateChanged(callback: AuthCallback): () => void {
  listeners.push(callback);

  if (isSupabaseConfigured && supabase) {
    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        localStorage.setItem('finova_user', JSON.stringify(user));
        callback(user);
      } else {
        localStorage.removeItem('finova_user');
        callback(null);
      }
    });

    // Run callback immediately with current session if exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        localStorage.setItem('finova_user', JSON.stringify(user));
        callback(user);
      } else {
        const stored = localStorage.getItem('finova_user');
        try {
          callback(stored ? (JSON.parse(stored) as User) : null);
        } catch {
          callback(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // Fallback demo auth
  const stored = localStorage.getItem('finova_user');
  try {
    callback(stored ? (JSON.parse(stored) as User) : null);
  } catch {
    callback(null);
  }

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
