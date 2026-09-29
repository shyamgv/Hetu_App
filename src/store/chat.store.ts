import { create } from 'zustand';
import axios from 'axios';
import { ChatService } from '../services/chat.service';
import { SQLiteService } from '../db/sqlite';
import type { ConversationOut, MessageOut } from '../types/api.types';

let currentAbortController: AbortController | null = null;

interface ChatState {
  conversations: ConversationOut[];
  activeConversation: ConversationOut | null;
  messages: MessageOut[];
  isSending: boolean;
  isLoading: boolean;
  error: string | null;
  defaultUseHetuEngine: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  startNewConversation: () => Promise<string>; // returns conversation ID
  setDefaultUseHetuEngine: (v: boolean) => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, useEngine?: boolean) => Promise<void>;
  editLastMessage: (content: string, useEngine?: boolean) => Promise<void>;
  stopSending: () => void;
  clearActive: () => void;
  submitFeedback: (rating: number, comment?: string) => Promise<void>;
  endConversation: (id?: string) => Promise<void>;
}

async function syncPendingDeletions() {
  const pendingIds = SQLiteService.getPendingDeletions();
  for (const id of pendingIds) {
    try {
      await ChatService.deleteConversation(id);
      SQLiteService.removePendingDeletion(id);
    } catch (e: any) {
      if (e.response?.status === 404) {
        SQLiteService.removePendingDeletion(id);
      }
    }
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isSending: false,
  isLoading: false,
  error: null,
  defaultUseHetuEngine: true,



  loadConversations: async () => {
    // 1. Read from SQLite immediately for instant offline render
    const cachedConvs = SQLiteService.getConversations();
    if (cachedConvs.length > 0) {
      set({ conversations: cachedConvs, isLoading: false, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    // 2. Flush any offline pending deletions first, then fetch fresh list from network
    try {
      await syncPendingDeletions();
      const convs = await ChatService.listConversations();
      SQLiteService.saveConversations(convs);
      set({ conversations: convs, isLoading: false, error: null });

      // Only pre-fetch details for conversations that are NOT yet cached in SQLite
      for (const conv of convs) {
        const local = SQLiteService.getConversation(conv.id);
        if (!local || local.messages.length === 0) {
          ChatService.getConversation(conv.id)
            .then((fullConv) => SQLiteService.saveConversationDetails(fullConv))
            .catch(() => {});
        }
      }
    } catch (e: unknown) {
      // If offline or network error, keep using SQLite cached data
      if (cachedConvs.length === 0) {
        set({ error: 'Offline - Failed to load conversations', isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  startNewConversation: async () => {
    try {
      const conv = await ChatService.startConversation();
      SQLiteService.saveConversationDetails(conv);
      set((s) => ({
        conversations: [conv, ...s.conversations],
        activeConversation: conv,
        messages: [],
      }));
      return conv.id;
    } catch (e: any) {
      const isNetworkError =
        !e.response ||
        e.code === 'ERR_NETWORK' ||
        e.message?.includes('Network Error');
      if (isNetworkError) {
        throw new Error('Internet connection required to start a new chat.');
      }
      throw e;
    }
  },

  setDefaultUseHetuEngine: (v: boolean) => set({ defaultUseHetuEngine: v }),

  loadConversation: async (id) => {
    // 1. Read from SQLite immediately
    const cachedConv = SQLiteService.getConversation(id);
    if (cachedConv) {
      set({
        activeConversation: cachedConv,
        messages: cachedConv.messages,
        isLoading: false,
      });
    } else {
      set({ isLoading: true });
    }

    // 2. Fetch latest messages from network if online
    try {
      const conv = await ChatService.getConversation(id);
      SQLiteService.saveConversationDetails(conv);
      set({ activeConversation: conv, messages: conv.messages, isLoading: false });
    } catch (e: any) {
      // If network error, retain SQLite cached conversation
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    // 1. Delete locally from SQLite first
    SQLiteService.deleteConversation(id);
    set((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      const isCurrentActive = s.activeConversation?.id === id;
      return {
        conversations: remaining,
        activeConversation: isCurrentActive ? null : s.activeConversation,
        messages: isCurrentActive ? [] : s.messages,
      };
    });

    // 2. Try deleting from server; if offline, queue in pending_deletions
    try {
      await ChatService.deleteConversation(id);
      SQLiteService.removePendingDeletion(id);
    } catch (e: unknown) {
      SQLiteService.addPendingDeletion(id);
    }
  },


  sendMessage: async (content, useEngine?: boolean) => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    const useHetu = typeof useEngine === 'boolean' ? useEngine : get().defaultUseHetuEngine;

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
        useHetu,
        { signal: controller.signal }
      );

      // Save user message and AI response to SQLite
      SQLiteService.saveMessage(activeConversation.id, {
        ...optimisticUserMsg,
        id: `user-${Date.now()}`,
      });
      SQLiteService.saveMessage(activeConversation.id, aiMsg);

      set((s) => ({
        messages: [...s.messages, aiMsg],
        isSending: false,
      }));
    } catch (e: any) {
      const isCanceled =
        axios.isCancel(e) ||
        e?.name === 'AbortError' ||
        e?.name === 'CanceledError' ||
        e?.code === 'ERR_CANCELED';
      const isNetworkError =
        !e.response ||
        e.code === 'ERR_NETWORK' ||
        e.message?.includes('Network Error');

      if (isCanceled) {
        set({ isSending: false });
      } else if (isNetworkError) {
        // Revert optimistic message and show network requirement error
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== optimisticUserMsg.id),
          isSending: false,
          error: 'Internet connection required to chat with Hetu AI.',
        }));
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

  editLastMessage: async (content, useEngine?: boolean) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;

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
      const useHetu = typeof useEngine === 'boolean' ? useEngine : get().defaultUseHetuEngine;
      const aiMsg = await ChatService.editLastMessage(
        activeConversation.id,
        content,
        useHetu,
        { signal: controller.signal }
      );

      // Update local SQLite
      SQLiteService.saveMessage(activeConversation.id, updatedUserMsg);
      SQLiteService.saveMessage(activeConversation.id, aiMsg);

      set((s) => ({
        messages: [...s.messages, aiMsg],
        isSending: false,
      }));
    } catch (e: any) {
      const isCanceled =
        axios.isCancel(e) ||
        e?.name === 'AbortError' ||
        e?.name === 'CanceledError' ||
        e?.code === 'ERR_CANCELED';
      const isNetworkError =
        !e.response ||
        e.code === 'ERR_NETWORK' ||
        e.message?.includes('Network Error');

      if (isCanceled) {
        set({ isSending: false });
      } else if (isNetworkError) {
        set({
          isSending: false,
          error: 'Internet connection required to edit message.',
        });
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
    try {
      await ChatService.submitFeedback(activeConversation.id, { rating, comment });
    } catch {
      // Catch offline error gracefully
    }
  },

  /**
   * Ends a conversation immediately, cancelling any pending debounced Guna
   * update timer and running the continuous Guna analysis right away.
   * Defaults to the currently active conversation if no id is given.
   * Safe to call multiple times / when offline — errors are swallowed.
   */
  endConversation: async (id?: string) => {
    const conversationId = id ?? get().activeConversation?.id;
    if (!conversationId) return;
    try {
      await ChatService.endConversation(conversationId);
    } catch (e) {
      console.warn('[Chat] Failed to end conversation:', e);
    } finally {
      // Reset the engine flag back to its normal default once a conversation
      // has ended, regardless of whether it was skipped-quiz or not.
      set({ defaultUseHetuEngine: true });
    }
  },
}));




