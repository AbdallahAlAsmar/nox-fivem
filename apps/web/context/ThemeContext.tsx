'use client';

import React, { useEffect, useState, createContext } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}>({ theme: 'dark', toggleTheme: () => {}, mounted: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('nox-theme') as Theme | null;
    const current = saved || 'dark';
    setTheme(current);
    document.documentElement.classList.toggle('dark', current === 'dark');
    document.documentElement.classList.remove('light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('nox-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.classList.remove('light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}