
export interface TranscriptionEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export enum AgentStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}
