import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#006341',
    secondary: '#862121',
    accent: '#FDB913',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#000000',
    error: '#B00020',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export type AppTheme = typeof theme; 