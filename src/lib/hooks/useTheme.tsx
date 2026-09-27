"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { IndexedDbUserRepository } from "@/lib/repositories/indexeddb/IndexedDbUserRepository";

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    async function loadTheme() {
      const userRepo = new IndexedDbUserRepository();
      const profile = await userRepo.getProfile();
      if (profile?.theme) {
        setThemeState(profile.theme);
      }
    }
    loadTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: Theme) => {
      let isDark = false;
      if (t === 'dark') {
        isDark = true;
      } else if (t === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    const userRepo = new IndexedDbUserRepository();
    await userRepo.upsert({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
