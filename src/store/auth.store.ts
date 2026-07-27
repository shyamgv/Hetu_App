import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../services/api';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';
import { SQLiteService } from '../db/sqlite';
import type { UserOut } from '../types/api.types';

interface AuthState {
  user: UserOut | null;
  token: string | null;
  isLoading: boolean;
  isOffline: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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

          if (isNetworkError) {
            // Offline boot — attempt to restore user profile from SQLite cache
            const cachedUser = SQLiteService.getUser();
            if (cachedUser) {
              set({ user: cachedUser, isOffline: true, isLoading: false });
            } else {
              set({ user: null, isOffline: true, isLoading: false });
            }
          } else {
            // 401 / Invalid token — delete token & local SQLite cache
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            SQLiteService.clearAllData();
            set({ user: null, token: null, isOffline: false, isLoading: false });
          }
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const tokenData = await AuthService.login(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, tokenData.access_token);
    set({ token: tokenData.access_token });
    const user = await AuthService.getMe();
    SQLiteService.saveUser(user);
    set({ user, isOffline: false });

    // Pre-fetch profile details on login
    OnboardingService.getProfile()
      .then((prof) => SQLiteService.saveProfile(prof))
      .catch(() => {});
  },


  register: async (email, password, fullName) => {
    await AuthService.register({ email, password, full_name: fullName });
    // Auto-login after register
    await get().login(email, password);
  },

  logout: async () => {
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

