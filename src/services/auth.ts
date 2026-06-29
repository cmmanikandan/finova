// Auth service – Firebase Google Sign-In → Supabase session sync
import type { User } from '../types';
import { app } from './firebase';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { getSupabase, isSupabaseConfigured } from './supabase';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const supabase = getSupabase();

type AuthCallback = (user: User | null) => void;
const listeners: AuthCallback[] = [];

function mapFirebaseUser(fu: any): User {
  return {
    uid: fu.uid,
    name: fu.displayName || fu.email?.split('@')[0] || 'User',
    email: fu.email || '',
    photoURL:
      fu.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fu.email?.split('@')[0] || 'U')}&background=2563EB&color=fff&size=128`,
  };
}

function notifyListeners(user: User | null) {
  localStorage.setItem('finova_user', user ? JSON.stringify(user) : '');
  listeners.forEach(cb => cb(user));
}

// ─── Sign In With Google (Firebase popup) ────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const user = mapFirebaseUser(firebaseUser);

    // Sync Google ID token → Supabase so RLS works correctly
    if (isSupabaseConfigured && supabase) {
      try {
        const idToken = await firebaseUser.getIdToken();
        await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
      } catch (supabaseErr) {
        // Supabase sync failed, but Firebase login succeeded – app still works offline
        console.warn('Supabase session sync failed (data may store locally):', supabaseErr);
      }
    }

    notifyListeners(user);
    return user;
  } catch (err: any) {
    // User closed the popup – not an error
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return null;
    }
    throw err;
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {}
  if (isSupabaseConfigured && supabase) {
    try { await supabase.auth.signOut(); } catch {}
  }
  localStorage.removeItem('finova_user');
  notifyListeners(null);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuthStateChanged(callback: AuthCallback): () => void {
  listeners.push(callback);

  // Immediately check stored session
  const stored = localStorage.getItem('finova_user');
  try {
    if (stored) callback(JSON.parse(stored) as User);
  } catch { /* ignore */ }

  // Firebase state change is the source of truth
  const unsubscribe = firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = mapFirebaseUser(firebaseUser);
      localStorage.setItem('finova_user', JSON.stringify(user));
      callback(user);
    } else {
      localStorage.removeItem('finova_user');
      callback(null);
    }
  });

  return () => {
    unsubscribe();
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
