import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollCache: Record<string, number> = {};

export const ScrollRestoration: React.FC = () => {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string>(pathname);

  useEffect(() => {
    const el = document.querySelector('.page-content');
    if (!el) return;

    // Restore scroll position
    const cached = scrollCache[pathname] || 0;
    
    const frameId = requestAnimationFrame(() => {
      const originalStyle = el.getAttribute('style') || '';
      el.setAttribute('style', originalStyle + '; scroll-behavior: auto !important;');
      el.scrollTop = cached;
      
      setTimeout(() => {
        el.setAttribute('style', originalStyle);
      }, 50);
    });

    // Save scroll position
    const handleScroll = () => {
      scrollCache[pathname] = el.scrollTop;
    };
    
    el.addEventListener('scroll', handleScroll, { passive: true });
    prevPathRef.current = pathname;

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  return null;
};
