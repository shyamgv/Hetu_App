import type { AxiosRequestConfig } from 'axios';
import api from './api';
import type { ConversationOut, FeedbackIn, MessageIn, MessageOut } from '../types/api.types';

/**
 * Chat service — wraps /api/chat/* endpoints
 */
export const ChatService = {
  /** POST /api/chat/conversations — create new conversation */
  async startConversation(): Promise<ConversationOut> {
    const res = await api.post<ConversationOut>('/api/chat/conversations');
    return res.data;
  },

  /** GET /api/chat/conversations — list all user conversations */
  async listConversations(): Promise<ConversationOut[]> {
    const res = await api.get<ConversationOut[]>('/api/chat/conversations');
    return res.data;
  },

  /** GET /api/chat/conversations/:id — get single conversation with messages */
  async getConversation(id: string): Promise<ConversationOut> {
    const res = await api.get<ConversationOut>(`/api/chat/conversations/${id}`);
    return res.data;
  },

  /** DELETE /api/chat/conversations/:id — delete conversation */
  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/api/chat/conversations/${id}`);
  },

  /**
   * POST /api/chat/conversations/:id/messages — send user message, get AI reply
   * use_engine=true enables the full Hetu Engine (Guna analysis, wellness output)
   */
  async sendMessage(
    conversationId: string,
    content: string,
    useEngine = true,
    config?: AxiosRequestConfig
  ): Promise<MessageOut> {
    const payload: MessageIn = { content };
    const res = await api.post<MessageOut>(
      `/api/chat/conversations/${conversationId}/messages?use_engine=${useEngine}`,
      payload,
      config
    );
    return res.data;
  },

  /**
   * PUT /api/chat/conversations/:id/messages/last — edit last user message and get new AI reply
   */
  async editLastMessage(
    conversationId: string,
    content: string,
    useEngine = true,
    config?: AxiosRequestConfig
  ): Promise<MessageOut> {
    const payload: MessageIn = { content };
    const res = await api.put<MessageOut>(
      `/api/chat/conversations/${conversationId}/messages/last?use_engine=${useEngine}`,
      payload,
      config
    );
    return res.data;
  },

  /** POST /api/chat/conversations/:id/feedback */
  async submitFeedback(conversationId: string, payload: FeedbackIn): Promise<void> {
    await api.post(`/api/chat/conversations/${conversationId}/feedback`, payload);
  },
};

