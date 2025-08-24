export interface Message {
  id: string;
  text: string;
  type: 'user' | 'ai' | 'memo';
  timestamp: Date;
  isMemory: boolean;
}

export type MessageType = 'user' | 'ai' | 'memo';