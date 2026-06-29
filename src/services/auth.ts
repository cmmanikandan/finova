// Auth service – Direct Supabase Auth handles user identities and synchronization sessions
import type { User } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

const supabase = getSupabase();

type AuthCallback = (user: User | null) => void;
const listeners: AuthCallback[] = [];

function mapSupabaseUser(su: any): User {
  return {
    uid: su.id,
    name: su.user_metadata?.full_name || su.email?.split('@')[0] || 'User',
    email: su.email || '',
    photoURL:
      su.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(su.email?.split('@')[0] || 'U')}&background=2563EB&color=fff&size=128`,
  };
}

function notifyListeners(user: User | null) {
  localStorage.setItem('finova_user', user ? JSON.stringify(user) : '');
  listeners.forEach(cb => cb(user));
}

// ─── Sign In With Google ──────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    // OAuth flow redirects, session will be caught by onAuthStateChange on load
    return null;
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

// ─── Sign In With Email & Password ───────────────────────────────────────────
// Attempts login first; if user is not found, automatically signs up
export async function signInWithEmailAndPassword(email: string, password: string): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    // 1. Attempt login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // 2. If invalid credentials, attempt sign up
      if (signInError.message.toLowerCase().includes('invalid login credentials') || signInError.message.toLowerCase().includes('user not found')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (signUpData.user) {
          const user = mapSupabaseUser(signUpData.user);
          notifyListeners(user);
          return user;
        }
      }
      throw new Error(signInError.message);
    }

    if (signInData.user) {
      const user = mapSupabaseUser(signInData.user);
      notifyListeners(user);
      return user;
    }
  }

  // Local demo fallback
  const name = email.split('@')[0];
  const user: User = {
    uid: 'email-user-' + Math.random().toString(36).substring(2, 9),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    email: email,
    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff&size=128`,
  };
  notifyListeners(user);
  return user;
}

// ─── Legacy Email Callback Alias ──────────────────────────────────────────────
export async function signInWithEmail(email: string): Promise<User | null> {
  return signInWithEmailAndPassword(email, 'DefaultPassword123!');
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
  localStorage.removeItem('finova_user');
  notifyListeners(null);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuthStateChanged(callback: AuthCallback): () => void {
  listeners.push(callback);

  if (isSupabaseConfigured && supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        localStorage.setItem('finova_user', JSON.stringify(user));
        callback(user);
      } else {
        localStorage.removeItem('finova_user');
        callback(null);
      }
    });

    // Check active session immediately on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        localStorage.setItem('finova_user', JSON.stringify(user));
        callback(user);
      } else {
        const stored = localStorage.getItem('finova_user');
        if (!stored) {
          callback(null);
        } else {
          try {
            callback(JSON.parse(stored) as User);
          } catch {
            callback(null);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // Local storage demo fallback
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

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('finova_user');
  try {
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}
