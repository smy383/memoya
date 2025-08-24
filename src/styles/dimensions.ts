import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints
export const BREAKPOINTS = {
  PHONE_SMALL: 320,
  PHONE_MEDIUM: 375,
  PHONE_LARGE: 414,
  TABLET_SMALL: 768,
  TABLET_LARGE: 1024,
};

// Device types
export const DEVICE_TYPES = {
  PHONE: 'phone',
  TABLET: 'tablet',
} as const;

// Get device type based on screen width
export const getDeviceType = (): keyof typeof DEVICE_TYPES => {
  return SCREEN_WIDTH >= BREAKPOINTS.TABLET_SMALL ? 'TABLET' : 'PHONE';
};

// Responsive width/height functions
export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel(SCREEN_WIDTH * percentage / 100);
};

export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel(SCREEN_HEIGHT * percentage / 100);
};

// Responsive font size
export const responsiveFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // iPhone X base width
  const newSize = size * scale;
  return Math.max(newSize, size * 0.8); // Minimum 80% of original size
};

// Spacing system
export const SPACING = {
  xs: wp(1),   // ~4px
  sm: wp(2),   // ~8px
  md: wp(4),   // ~16px
  lg: wp(6),   // ~24px
  xl: wp(8),   // ~32px
  xxl: wp(12), // ~48px
};

// Screen dimensions
export const SCREEN = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT,
  isTablet: getDeviceType() === 'TABLET',
  isPhone: getDeviceType() === 'PHONE',
};