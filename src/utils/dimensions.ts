import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const screenWidth = width;
export const screenHeight = height;

export const isTablet = width >= 768;

export const getResponsiveFontSize = (size: number) => {
  const scale = width / 320;
  const newSize = size * scale;
  return Math.max(size * 0.8, Math.min(newSize, size * 1.2));
};

export const getResponsiveWidth = (percentage: number) => {
  return (width * percentage) / 100;
};

export const getResponsiveHeight = (percentage: number) => {
  return (height * percentage) / 100;
};