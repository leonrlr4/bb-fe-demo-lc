import { apiService } from './api';
import { API_ENDPOINTS } from '../constants';
import { ConversationsResponse, ConversationDetailResponse } from '../types';

class ConversationsService {
  async getConversations(params?: { limit?: number; offset?: number }): Promise<ConversationsResponse> {
    let endpoint = API_ENDPOINTS.CONVERSATIONS.LIST;

    if (params) {
      const searchParams = new URLSearchParams();
      if (typeof params.limit === 'number') {
        searchParams.set('limit', params.limit.toString());
      }
      if (typeof params.offset === 'number') {
        searchParams.set('offset', params.offset.toString());
      }

      const query = searchParams.toString();
      if (query) {
        endpoint = `${endpoint}?${query}`;
      }
    }

    return apiService.get<ConversationsResponse>(endpoint);
  }

  async getConversationDetail(conversationId: string): Promise<ConversationDetailResponse> {
    return apiService.get<ConversationDetailResponse>(
      API_ENDPOINTS.CONVERSATIONS.DETAIL(conversationId)
    );
  }
}

export const conversationsService = new ConversationsService();
