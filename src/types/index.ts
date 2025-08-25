export interface Memo {
  id: string;
  content: string;
  timestamp: Date;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: number;
}

export type RootTabParamList = {
  Chat: undefined;
  Memos: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Trash: undefined;
};