export interface Memo {
  id: string;
  roomId: string; // 새로 추가: 채팅방 연결
  content: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string; // 새로 추가: 채팅방 연결
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'record';
  memoStatus?: 'active' | 'deleted' | 'permanentlyDeleted';
}

export interface ChatRoom {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    content: string;
    timestamp: Date;
    type: 'user' | 'ai' | 'record';
  };
  messageCount: number;
  memoCount: number;
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
  ChatRooms: undefined; // 변경: Chat → ChatRooms
  Memos: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Trash: undefined;
  ChatRoom: { roomId: string }; // 새로 추가: 개별 채팅방 화면
};