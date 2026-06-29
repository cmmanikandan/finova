// Auth service – Firebase Google Sign-In → Supabase session sync
// User state is NEVER stored in localStorage. Auth state comes from Firebase/Supabase only.
import type { User } from '../types';
import { app } from './firebase';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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
  // NOTE: User object is NOT stored in localStorage.
  // Auth state is always resolved from Firebase / Supabase session, never from cache.
  listeners.forEach(cb => cb(user));
}

// ─── Sign In With Google (Firebase popup) ────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const user = mapFirebaseUser(firebaseUser);

    notifyListeners(user);
    return user;
  } catch (err: any) {
    // User closed the popup – not an error
    if (
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
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
  notifyListeners(null);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
// Auth state is resolved from Firebase in real-time. No localStorage reads.
export function onAuthStateChanged(callback: AuthCallback): () => void {
  listeners.push(callback);

  // Firebase state change is the source of truth.
  // We do NOT check localStorage for a cached user – that was the source of the bug.
  const unsubscribe = firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = mapFirebaseUser(firebaseUser);
      callback(user);
    } else {
      callback(null);
    }
  });

  return () => {
    unsubscribe();
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// ─── Get Current User (from live Firebase Auth, not localStorage) ─────────────
export async function getCurrentUserAsync(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return mapFirebaseUser(firebaseUser);
}

// Synchronous getter kept for backward compatibility – returns null if no cached user.
// Pages should prefer useApp().user from AppContext which is set by the auth observer.
export function getCurrentUser(): User | null {
  // NOTE: This returns null on first load since we no longer cache in localStorage.
  // Components should subscribe via onAuthStateChanged / useApp() instead.
  return null;
}
