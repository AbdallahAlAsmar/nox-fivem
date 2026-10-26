'use client';

import React, { useEffect, useState, createContext, useMemo } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}>({ theme: 'dark', toggleTheme: () => {}, mounted: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Keep the server and first client render identical; browser preferences are
  // applied after hydration to avoid a theme hydration mismatch.
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let preferredTheme: Theme = 'dark';
    try {
      const saved = window.localStorage.getItem('nox-theme');
      if (saved === 'dark' || saved === 'light') {
        preferredTheme = saved;
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        preferredTheme = 'light';
      }
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
    setTheme(preferredTheme);
    setMounted(true);
    document.documentElement.classList.toggle('dark', preferredTheme === 'dark');
    document.documentElement.classList.toggle('light', preferredTheme === 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('nox-theme', next);
    } catch {
      // Theme still changes for this session when storage is unavailable.
    }
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
