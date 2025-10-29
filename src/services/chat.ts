import { apiService } from './api';
import { API_ENDPOINTS } from '../constants';
import { GenerateCodeResponse } from '../types';

class ChatService {
  async generateCode(
    query: string,
    conversationId?: string,
    files?: File[]
  ): Promise<GenerateCodeResponse> {
    const formData = new FormData();
    formData.append('query', query);

    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }

    return apiService.postFormData<GenerateCodeResponse>(
      API_ENDPOINTS.CHAT.GENERATE,
      formData
    );
  }
}

export const chatService = new ChatService();
