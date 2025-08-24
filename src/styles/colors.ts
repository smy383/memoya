export const LIGHT_COLORS = {
  // Primary colors
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0056CC',
  
  // Secondary colors
  secondary: '#34C759',
  secondaryLight: '#30D158',
  secondaryDark: '#28A745',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  backgroundTertiary: '#FFFFFF',
  
  // Surface colors
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  
  // Text colors
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  
  // Border colors
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  
  // Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  
  // Chat colors
  userBubble: '#007AFF',
  aiBubble: '#E5E5EA',
  memoBubble: '#34C759',
  
  // Tab bar
  tabBarBackground: '#F2F2F7',
  tabBarActive: '#007AFF',
  tabBarInactive: '#8E8E93',
};

export const DARK_COLORS = {
  // Primary colors
  primary: '#0A84FF',
  primaryLight: '#64D2FF',
  primaryDark: '#0056CC',
  
  // Secondary colors
  secondary: '#30D158',
  secondaryLight: '#32D74B',
  secondaryDark: '#28A745',
  
  // Background colors
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  
  // Surface colors
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  
  // Border colors
  border: '#38383A',
  borderLight: '#48484A',
  
  // Status colors
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',
  
  // Chat colors
  userBubble: '#0A84FF',
  aiBubble: '#2C2C2E',
  memoBubble: '#30D158',
  
  // Tab bar
  tabBarBackground: '#1C1C1E',
  tabBarActive: '#0A84FF',
  tabBarInactive: '#8E8E93',
};

export type ColorScheme = 'light' | 'dark' | 'system';

export const getColors = (scheme: ColorScheme, systemScheme: 'light' | 'dark' = 'light') => {
  if (scheme === 'system') {
    return systemScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
};