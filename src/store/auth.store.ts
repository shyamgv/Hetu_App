import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../services/api';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';
import { ChatService } from '../services/chat.service';
import { useChatStore } from './chat.store';
import { SQLiteService } from '../db/sqlite';
import type { UserOut } from '../types/api.types';

interface AuthState {
  user: UserOut | null;
  token: string | null;
  isLoading: boolean;
  isOffline: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserOut>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isOffline: false,

  /**
   * Called once on app start — reads stored token and fetches /me or loads from SQLite if offline
   */
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log('[Auth] initialize - token present?', !!token);
      if (token) {
        set({ token });
        try {
          const user = await AuthService.getMe();
          SQLiteService.saveUser(user);
          set({ user, isOffline: false, isLoading: false });

          // Pre-fetch and cache profile details in SQLite immediately
          OnboardingService.getProfile()
            .then((prof) => SQLiteService.saveProfile(prof))
            .catch(() => {});
        } catch (error: any) {
          const isNetworkError =
            !error.response ||
            error.code === 'ERR_NETWORK' ||
            error.message?.includes('Network Error');

          console.log('[Auth] getMe failed', { isNetworkError, status: error.response?.status });

          if (isNetworkError) {
            // In development, prefer showing sign-in so developers don't get confused
            // by cached SQLite users when the backend is unreachable.
            if (__DEV__) {
              console.log('[Auth] __DEV__ - not restoring cached user on network error');
              set({ user: null, isOffline: true, isLoading: false });
            } else {
              // Offline boot — attempt to restore user profile from SQLite cache
              const cachedUser = SQLiteService.getUser();
              if (cachedUser) {
                set({ user: cachedUser, isOffline: true, isLoading: false });
              } else {
                set({ user: null, isOffline: true, isLoading: false });
              }
            }
          } else {
            // 401 / Invalid token — delete token & local SQLite cache
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            SQLiteService.clearAllData();
            useChatStore.getState().setDefaultUseHetuEngine(true);
            set({ user: null, token: null, isOffline: false, isLoading: false });
          }
        }
      } else {
        console.log('[Auth] initialize - no token found');
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
  const tokenData = await AuthService.login(email, password);
  console.debug('[Auth] login - tokenData', { access_token_present: !!tokenData?.access_token });
    await SecureStore.setItemAsync(TOKEN_KEY, tokenData.access_token);
    set({ token: tokenData.access_token });
  const user = await AuthService.getMe();
  console.debug('[Auth] login - fetched user', { id: user?.id, onboarding_complete: user?.onboarding_complete });
    SQLiteService.saveUser(user);
    set({ user, isOffline: false });

    // Pre-fetch profile details on login
    OnboardingService.getProfile()
      .then((prof) => SQLiteService.saveProfile(prof))
      .catch(() => {});

    return user;
  },


  register: async (email, password, fullName) => {
    await AuthService.register({ email, password, full_name: fullName });
    // Auto-login after register
    await get().login(email, password);
  },

  logout: async () => {
    // End the active conversation (if any) so Guna analysis runs before we
    // clear the session — best-effort, ignore failures (e.g. offline).
    try {
      const activeConversationId = useChatStore.getState().activeConversation?.id;
      if (activeConversationId) {
        await ChatService.endConversation(activeConversationId);
      }
    } catch (e) {
      console.warn('[Auth] Failed to end active conversation on logout:', e);
    }

    // Always reset the engine flag back to its default so the next login
    // (or the same user signing back in) starts fresh with the engine on.
    useChatStore.getState().setDefaultUseHetuEngine(true);

    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SQLiteService.clearAllData();
    set({ user: null, token: null, isOffline: false });
  },

  refreshUser: async () => {
    try {
      const user = await AuthService.getMe();
      SQLiteService.saveUser(user);
      set({ user, isOffline: false });
    } catch (error: any) {
      const isNetworkError =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.message?.includes('Network Error');

      if (!isNetworkError) {
        await get().logout();
      }
    }
  },
}));

