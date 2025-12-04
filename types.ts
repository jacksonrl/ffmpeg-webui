export enum ToolType {
  CONVERTER = 'CONVERTER',
  REMOVE_AUDIO = 'REMOVE_AUDIO',
  CLIP_VIDEO = 'CLIP_VIDEO',
  IMAGE_CONVERTER = 'IMAGE_CONVERTER'
}

export interface ToolDefinition {
  id: ToolType;
  title: string;
  description: string;
  icon: string; 
  color: string;
}

export interface LogEntry {
  type: 'info' | 'error' | 'progress';
  message: string;
  timestamp: number;
}

export enum FileState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ProcessingStats {
  time?: number;
  percentage?: number;
}