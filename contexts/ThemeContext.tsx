import React, { createContext, useContext, useState, useEffect } from "react";
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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  const colors = isDark ? darkColors : lightColors;
  const currentTheme: AppTheme = { colors, spacing, radius, typography };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
