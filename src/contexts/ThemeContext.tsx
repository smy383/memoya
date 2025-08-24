import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme, getColors, LIGHT_COLORS, DARK_COLORS } from '../styles/colors';

interface ThemeContextType {
  colorScheme: ColorScheme;
  colors: typeof LIGHT_COLORS | typeof DARK_COLORS;
  isDark: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@memoya_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');
  
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setColorSchemeState(savedTheme as ColorScheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
      setColorSchemeState(scheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = getColors(colorScheme, systemColorScheme);
  const isDark = colorScheme === 'dark' || (colorScheme === 'system' && systemColorScheme === 'dark');

  const value: ThemeContextType = {
    colorScheme,
    colors,
    isDark,
    setColorScheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};