import { useState, useCallback, useRef } from 'react';

/**
 * useScrollFAB — Returns FAB visibility + a scroll handler.
 * - Hides FAB when scrolling DOWN
 * - Shows FAB when scrolling UP, at bottom, or after 400ms idle
 */
export function useScrollFAB() {
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const currentY = el.scrollTop;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;

    // Clear idle timer
    if (idleTimer.current) clearTimeout(idleTimer.current);

    if (atBottom) {
      setFabVisible(true);
    } else if (currentY > lastScrollY.current + 4) {
      // Scrolling down — hide
      setFabVisible(false);
    } else if (currentY < lastScrollY.current - 4) {
      // Scrolling up — show
      setFabVisible(true);
    }

    lastScrollY.current = currentY;

    // Show again after idle
    idleTimer.current = setTimeout(() => setFabVisible(true), 400);
  }, []);

  return { fabVisible, handleScroll };
}
