import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Mode = 'light' | 'dark';

interface DarkModeContextValue {
  mode: Mode;
  toggleMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
});

const STORAGE_KEY = 'admin-dark-mode';

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.querySelector('.admin-root');
    if (!root) return;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <DarkModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextValue => useContext(DarkModeContext);
