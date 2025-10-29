import { apiService } from './api';
import { API_ENDPOINTS } from '../constants';
import { ConversationsResponse, ConversationDetailResponse } from '../types';

class ConversationsService {
  async getConversations(): Promise<ConversationsResponse> {
    return apiService.get<ConversationsResponse>(API_ENDPOINTS.CONVERSATIONS.LIST);
  }

  async getConversationDetail(conversationId: string): Promise<ConversationDetailResponse> {
    return apiService.get<ConversationDetailResponse>(
      API_ENDPOINTS.CONVERSATIONS.DETAIL(conversationId)
    );
  }
}

export const conversationsService = new ConversationsService();
