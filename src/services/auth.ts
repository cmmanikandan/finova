// Auth service – Firebase Google Auth with localStorage session persistence
import type { User } from '../types';
import { app } from './firebase';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged as fbOnAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

const FIREBASE_CONFIGURED = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
);

export const isFirebaseConfigured = FIREBASE_CONFIGURED;

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

type AuthCallback = (user: User | null) => void;
const listeners: AuthCallback[] = [];

function mapFirebaseUser(fu: any): User {
  return {
    uid: fu.uid,
    name: fu.displayName || 'User',
    email: fu.email || '',
    photoURL:
      fu.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fu.displayName || 'U')}&background=2563EB&color=fff&size=128`,
  };
}

function notifyListeners(user: User | null) {
  localStorage.setItem('finova_user', user ? JSON.stringify(user) : '');
  listeners.forEach(cb => cb(user));
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  if (FIREBASE_CONFIGURED) {
    const result = await signInWithPopup(auth, provider);
    const user = mapFirebaseUser(result.user);
    notifyListeners(user);
    return user;
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
  if (FIREBASE_CONFIGURED) {
    await fbSignOut(auth);
  }
  localStorage.removeItem('finova_user');
  notifyListeners(null);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuthStateChanged(callback: AuthCallback): () => void {
  listeners.push(callback);

  if (FIREBASE_CONFIGURED) {
    // Firebase handles session persistence; mirror it to localStorage
    const unsub = fbOnAuthStateChanged(auth, fu => {
      if (fu) {
        const user = mapFirebaseUser(fu);
        localStorage.setItem('finova_user', JSON.stringify(user));
        callback(user);
      } else {
        localStorage.removeItem('finova_user');
        callback(null);
      }
    });
    return () => {
      unsub();
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // No Firebase – read from localStorage immediately
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
  try { return stored ? (JSON.parse(stored) as User) : null; } catch { return null; }
}

export async function signInWithEmail(email: string): Promise<User | null> {
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

