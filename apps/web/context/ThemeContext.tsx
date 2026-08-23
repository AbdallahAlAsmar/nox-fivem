'use client';

import React, { useEffect, useState, createContext, useMemo } from 'react';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nox-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.matches) return 'dark';
  }
  return 'dark';
}

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}>({ theme: 'dark', toggleTheme: () => {}, mounted: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('nox-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.classList.toggle('light', next === 'light');
  };

  const value = useMemo(() => ({ theme, toggleTheme, mounted }), [theme, mounted]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
