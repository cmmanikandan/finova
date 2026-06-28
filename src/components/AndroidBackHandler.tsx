import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const AndroidBackHandler: React.FC = () => {
  const { pathname } = useLocation();
  const [showToast, setShowToast] = useState(false);
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    // Intercept back button exit ONLY on Home screen
    if (pathname !== '/home' && pathname !== '/') {
      return;
    }

    // Push dummy state to capture back button
    window.history.pushState({ noExit: true }, '');

    const handlePopState = () => {
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        // Exit PWA / browser
        window.close();
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#0F172A;color:#fff;font-family:sans-serif;">
            <h2 style="font-weight:800;">Goodbye!</h2>
            <p style="color:#64748B;font-weight:600;">You can close this tab now.</p>
          </div>
        `;
      } else {
        lastBackPress.current = now;
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        
        // Push the dummy blocker state back
        window.history.pushState({ noExit: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  if (!showToast) return null;

  return (
    <div className="android-toast">
      Press back again to exit
    </div>
  );
};

// Global Page Transition Direction Tracker
export const PageTransitionTracker: React.FC = () => {
  const location = useLocation();
  const visitedKeys = useRef<string[]>([]);

  useEffect(() => {
    const key = location.key || 'initial';
    const index = visitedKeys.current.indexOf(key);

    let direction: 'forward' | 'backward' = 'forward';

    if (index !== -1) {
      direction = 'backward';
      visitedKeys.current = visitedKeys.current.slice(0, index + 1);
    } else {
      direction = 'forward';
      visitedKeys.current.push(key);
    }

    document.documentElement.setAttribute('data-transition', direction);
  }, [location.pathname, location.key]);

  return null;
};
