/**
 * Lightweight Navigation Stack Context
 * Enables push/pop navigation without React Router.
 * Screens slide in from the right like native Android.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface NavScreen {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

interface NavigationContextType {
  push: (screen: NavScreen) => void;
  pop: () => void;
  replace: (screen: NavScreen) => void;
  stack: NavScreen[];
}

const NavigationContext = createContext<NavigationContextType>({
  push: () => {},
  pop: () => {},
  replace: () => {},
  stack: [],
});

export const useNavigation = () => useContext(NavigationContext);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [stack, setStack] = useState<NavScreen[]>([]);

  const push = useCallback((screen: NavScreen) => {
    setStack(s => [...s, screen]);
  }, []);

  const pop = useCallback(() => {
    setStack(s => s.slice(0, -1));
  }, []);

  const replace = useCallback((screen: NavScreen) => {
    setStack(s => [...s.slice(0, -1), screen]);
  }, []);

  return (
    <NavigationContext.Provider value={{ push, pop, replace, stack }}>
      {children}
      {/* Render stacked screens as full-screen overlays */}
      {stack.map((screen, index) => (
        <ScreenSlide key={screen.id + index} screen={screen} />
      ))}
    </NavigationContext.Provider>
  );
};

/** Single screen: slides in from the right, animates out on pop */
const ScreenSlide: React.FC<{ screen: NavScreen }> = ({ screen }) => {
  const { component: Component, props = {} } = screen;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'var(--color-bg, #F8FAFC)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideLeft 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        maxWidth: '480px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
      }}
    >
      <Component {...props} />
    </div>
  );
};
