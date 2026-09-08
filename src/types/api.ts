import { Cut, MediaAsset, Overlay, PlayheadContext, VideoProjectState, Zoom } from './editor';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptRequestPayload {
  prompt: string;
  history?: ChatHistoryItem[];
  playhead: PlayheadContext;
  currentProject: VideoProjectState;
  mediaAssets?: MediaAsset[];
}

export interface PromptResponsePayload {
  actionDescription: string;
  appliedCuts?: Cut[];
  appliedOverlays?: Overlay[];
  appliedZooms?: Zoom[];
  updatedProject: VideoProjectState;
}

export interface ExportProjectPayload {
  project: VideoProjectState;
  resolution?: '1080p' | '720p' | '4k';
}

export interface ExportResponsePayload {
  jobId: string;
  status: 'queued' | 'processing' | 'completed';
  downloadUrl?: string;
}
