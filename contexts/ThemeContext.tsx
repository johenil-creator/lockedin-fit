import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  lightColors,
  darkColors,
  spacing,
  radius,
  typography,
  type AppThemeColors,
} from "../lib/theme";

export type AppTheme = {
  colors: AppThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const STORAGE_KEY = "lockedinfit:theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: { colors: lightColors, spacing, radius, typography },
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light") setIsDark(false);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    const currentTheme: AppTheme = { colors, spacing, radius, typography };
    return { theme: currentTheme, isDark, toggleTheme };
  }, [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
