export interface Message {
  id: string;
  text: string;
  type: 'user' | 'ai' | 'memo';
  timestamp: Date;
  isMemory: boolean;
  isFavorite?: boolean;
}

export type MessageType = 'user' | 'ai' | 'memo';