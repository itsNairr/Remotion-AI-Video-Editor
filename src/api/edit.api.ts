import {
  ApiResponse,
  ExportProjectPayload,
  ExportResponsePayload,
  PromptRequestPayload,
  PromptResponsePayload,
  VideoProjectState,
} from '@/types';
import { executeApi } from './api';
import { https } from './https';

export const editApi = {
  /**
   * Submits a conversational prompt to the editor backend (LLM Orchestrator)
   */
  async submitPrompt(payload: PromptRequestPayload): Promise<PromptResponsePayload> {
    return executeApi(
      async () => {
        const res = await https.post<ApiResponse<PromptResponsePayload>>('/api/edit/prompt', payload);
        return res.data;
      },
      {
        successToast: 'Edit applied to video state!',
        errorToastPrefix: 'Edit Failed',
      }
    );
  },

  /**
   * Requests rendering/export of the final VideoProjectState
   */
  async exportProject(payload: ExportProjectPayload): Promise<ExportResponsePayload> {
    return executeApi(
      async () => {
        const res = await https.post<ApiResponse<ExportResponsePayload>>('/api/edit/export', payload);
        return res.data;
      },
      {
        successToast: 'Video export job queued!',
        errorToastPrefix: 'Export Failed',
      }
    );
  },

  /**
   * Fetches an existing project state
   */
  async getProject(projectId: string): Promise<VideoProjectState> {
    return executeApi(
      async () => {
        const res = await https.get<ApiResponse<VideoProjectState>>(`/api/edit/project/${projectId}`);
        return res.data;
      },
      {
        errorToastPrefix: 'Failed to load project',
      }
    );
  },
};
