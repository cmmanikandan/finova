// Override localStorage globally to achieve strict user data isolation
const originalGetItem = localStorage.getItem;
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.getItem = function(key: string) {
  if (typeof key !== 'string') return originalGetItem.call(localStorage, key);
  if (key === 'finova_user') {
    return originalGetItem.call(localStorage, key);
  }
  if (key.startsWith('finova_')) {
    const userRaw = originalGetItem.call(localStorage, 'finova_user');
    let uid = 'default-demo';
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u && u.uid) uid = u.uid;
      } catch {}
    }
    const baseName = key.substring(7);
    return originalGetItem.call(localStorage, `finova_${uid}_${baseName}`);
  }
  return originalGetItem.call(localStorage, key);
};

localStorage.setItem = function(key: string, value: string) {
  if (typeof key !== 'string') return originalSetItem.call(localStorage, key, value);
  if (key === 'finova_user') {
    return originalSetItem.call(localStorage, key, value);
  }
  if (key.startsWith('finova_')) {
    const userRaw = originalGetItem.call(localStorage, 'finova_user');
    let uid = 'default-demo';
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u && u.uid) uid = u.uid;
      } catch {}
    }
    const baseName = key.substring(7);
    return originalSetItem.call(localStorage, `finova_${uid}_${baseName}`, value);
  }
  return originalSetItem.call(localStorage, key, value);
};

localStorage.removeItem = function(key: string) {
  if (typeof key !== 'string') return originalRemoveItem.call(localStorage, key);
  if (key === 'finova_user') {
    return originalRemoveItem.call(localStorage, key);
  }
  if (key.startsWith('finova_')) {
    const userRaw = originalGetItem.call(localStorage, 'finova_user');
    let uid = 'default-demo';
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u && u.uid) uid = u.uid;
      } catch {}
    }
    const baseName = key.substring(7);
    return originalRemoveItem.call(localStorage, `finova_${uid}_${baseName}`);
  }
  return originalRemoveItem.call(localStorage, key);
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
