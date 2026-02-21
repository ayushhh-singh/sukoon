export type SessionMode = 'voice' | 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}
