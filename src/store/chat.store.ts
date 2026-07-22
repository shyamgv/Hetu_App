import { create } from 'zustand';
import axios from 'axios';
import { ChatService } from '../services/chat.service';
import type { ConversationOut, MessageOut } from '../types/api.types';

let currentAbortController: AbortController | null = null;

interface ChatState {
  conversations: ConversationOut[];
  activeConversation: ConversationOut | null;
  messages: MessageOut[];
  isSending: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  startNewConversation: () => Promise<string>; // returns conversation ID
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, useEngine?: boolean) => Promise<void>;
  editLastMessage: (content: string, useEngine?: boolean) => Promise<void>;
  stopSending: () => void;
  clearActive: () => void;
  submitFeedback: (rating: number, comment?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isSending: false,
  isLoading: false,
  error: null,

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const convs = await ChatService.listConversations();
      set({ conversations: convs, isLoading: false });
    } catch (e: unknown) {
      set({ error: 'Failed to load conversations', isLoading: false });
    }
  },

  startNewConversation: async () => {
    const conv = await ChatService.startConversation();
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversation: conv,
      messages: [],
    }));
    return conv.id;
  },

  loadConversation: async (id) => {
    set({ isLoading: true });
    try {
      const conv = await ChatService.getConversation(id);
      set({ activeConversation: conv, messages: conv.messages, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    try {
      await ChatService.deleteConversation(id);
      set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id);
        const isCurrentActive = s.activeConversation?.id === id;
        return {
          conversations: remaining,
          activeConversation: isCurrentActive ? null : s.activeConversation,
          messages: isCurrentActive ? [] : s.messages,
        };
      });
    } catch (e: unknown) {
      set({ error: 'Failed to delete conversation' });
    }
  },

  sendMessage: async (content, useEngine = true) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    // Optimistically add user message
    const optimisticUserMsg: MessageOut = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      meta: null,
      created_at: new Date().toISOString(),
    };

    const controller = new AbortController();
    currentAbortController = controller;

    set((s) => ({
      messages: [...s.messages, optimisticUserMsg],
      isSending: true,
      error: null,
    }));

    try {
      const aiMsg = await ChatService.sendMessage(
        activeConversation.id,
        content,
        useEngine,
        { signal: controller.signal }
      );
      set((s) => ({
        messages: [...s.messages, aiMsg],
        isSending: false,
      }));
    } catch (e: any) {
      const isCanceled = axios.isCancel(e) || e?.name === 'AbortError' || e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED';
      if (isCanceled) {
        set({ isSending: false });
      } else {
        // Remove optimistic message on failure
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== optimisticUserMsg.id),
          isSending: false,
          error: 'Failed to send message',
        }));
      }
    } finally {
      if (currentAbortController === controller) {
        currentAbortController = null;
      }
    }
  },

  editLastMessage: async (content, useEngine = true) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;

    // Truncate messages up to the last user message, and update its content
    const updatedUserMsg: MessageOut = {
      ...messages[lastUserIdx],
      content,
    };
    const truncatedMessages = [...messages.slice(0, lastUserIdx), updatedUserMsg];

    const controller = new AbortController();
    currentAbortController = controller;

    set({
      messages: truncatedMessages,
      isSending: true,
      error: null,
    });

    try {
      const aiMsg = await ChatService.editLastMessage(
        activeConversation.id,
        content,
        useEngine,
        { signal: controller.signal }
      );
      set((s) => ({
        messages: [...s.messages, aiMsg],
        isSending: false,
      }));
    } catch (e: any) {
      const isCanceled = axios.isCancel(e) || e?.name === 'AbortError' || e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED';
      if (isCanceled) {
        set({ isSending: false });
      } else {
        set({
          isSending: false,
          error: 'Failed to edit message',
        });
      }
    } finally {
      if (currentAbortController === controller) {
        currentAbortController = null;
      }
    }
  },

  stopSending: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set({ isSending: false });
  },

  clearActive: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set({ activeConversation: null, messages: [], isSending: false });
  },

  submitFeedback: async (rating, comment) => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    await ChatService.submitFeedback(activeConversation.id, { rating, comment });
  },
}));

