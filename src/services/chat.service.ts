import type { AxiosRequestConfig } from 'axios';
import api from './api';
import type { ConversationOut, FeedbackIn, MessageIn, MessageOut } from '../types/api.types';

/**
 * Chat service — wraps /api/chat/* endpoints
 */
export const ChatService = {
  /** POST /chat/conversations — create new conversation */
  async startConversation(): Promise<ConversationOut> {
    const res = await api.post<ConversationOut>('/chat/conversations');
    return res.data;
  },

  /** GET /chat/conversations — list all user conversations */
  async listConversations(): Promise<ConversationOut[]> {
    const res = await api.get<ConversationOut[]>('/chat/conversations');
    return res.data;
  },

  /** GET /chat/conversations/:id — get single conversation with messages */
  async getConversation(id: string): Promise<ConversationOut> {
    const res = await api.get<ConversationOut>(`/chat/conversations/${id}`);
    return res.data;
  },

  /** DELETE /chat/conversations/:id — delete conversation */
  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/chat/conversations/${id}`);
  },

  /**
   * POST /chat/conversations/:id/messages — send user message, get AI reply
   * use_engine=true enables the full Hetu Engine (Guna analysis, wellness output)
   */
  async sendMessage(
    conversationId: string,
    content: string,
    useEngine?: boolean,
    config?: AxiosRequestConfig
  ): Promise<MessageOut> {
    const payload: MessageIn = { content };
    const suffix = typeof useEngine === 'boolean' ? `?use_engine=${useEngine}` : '';
    const res = await api.post<MessageOut>(
      `/chat/conversations/${conversationId}/messages${suffix}`,
      payload,
      config
    );
    return res.data;
  },

  /**
   * PUT /chat/conversations/:id/messages/last — edit last user message and get new AI reply
   */
  async editLastMessage(
    conversationId: string,
    content: string,
    useEngine?: boolean,
    config?: AxiosRequestConfig
  ): Promise<MessageOut> {
    const payload: MessageIn = { content };
    const suffix = typeof useEngine === 'boolean' ? `?use_engine=${useEngine}` : '';
    const res = await api.put<MessageOut>(
      `/chat/conversations/${conversationId}/messages/last${suffix}`,
      payload,
      config
    );
    return res.data;
  },

  /** POST /chat/conversations/:id/feedback */
  async submitFeedback(conversationId: string, payload: FeedbackIn): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/feedback`, payload);
  },

  /**
   * POST /chat/conversations/:id/end
   * Ends the conversation immediately, cancelling any pending debounced Guna
   * update timer and running the continuous Guna analysis right away.
   */
  async endConversation(conversationId: string): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/end`);
  },
};

