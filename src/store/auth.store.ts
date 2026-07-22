import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../services/api';
import { AuthService } from '../services/auth.service';
import type { UserOut } from '../types/api.types';

interface AuthState {
  user: UserOut | null;
  token: string | null;
  isLoading: boolean;

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

  /**
   * Called once on app start — reads stored token and fetches /me
   */
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ token });
        const user = await AuthService.getMe();
        set({ user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Token invalid or expired
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const tokenData = await AuthService.login(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, tokenData.access_token);
    set({ token: tokenData.access_token });
    const user = await AuthService.getMe();
    set({ user });
  },

  register: async (email, password, fullName) => {
    await AuthService.register({ email, password, full_name: fullName });
    // Auto-login after register
    await get().login(email, password);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ user: null, token: null });
  },

  refreshUser: async () => {
    try {
      const user = await AuthService.getMe();
      set({ user });
    } catch {
      await get().logout();
    }
  },
}));
