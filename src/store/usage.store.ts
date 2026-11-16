import { create } from 'zustand';
import { UsageService } from '../services/usage.service';
import type { UsageOut } from '../types/api.types';

interface UsageState {
  usage: UsageOut | null;
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  usage: null,

  /** Best effort: the meter just keeps its last value when offline. */
  refresh: async () => {
    try {
      set({ usage: await UsageService.getToday() });
    } catch {
      // offline or signed out
    }
  },

  clear: () => set({ usage: null }),
}));
