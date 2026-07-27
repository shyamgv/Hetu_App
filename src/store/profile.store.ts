import { create } from 'zustand';
import { OnboardingService } from '../services/onboarding.service';
import { SQLiteService } from '../db/sqlite';
import type { PersonalityOut, ProfileOut } from '../types/api.types';

interface ProfileState {
  profile: ProfileOut | null;
  personality: PersonalityOut | null;
  isLoading: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  loadPersonality: () => Promise<void>;
  setProfile: (p: ProfileOut) => void;
  setPersonality: (p: PersonalityOut) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  personality: null,
  isLoading: false,

  loadProfile: async () => {
    // 1. Read from SQLite immediately for instant offline render
    const cachedProfile = SQLiteService.getProfile();
    if (cachedProfile) {
      set({ profile: cachedProfile, isLoading: false });
    } else {
      set({ isLoading: true });
    }

    // 2. Fetch fresh profile from network if online
    try {
      const profile = await OnboardingService.getProfile();
      SQLiteService.saveProfile(profile);
      set({ profile, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadPersonality: async () => {
    set({ isLoading: true });
    try {
      const personality = await OnboardingService.getPersonality();
      set({ personality, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setProfile: (profile) => {
    SQLiteService.saveProfile(profile);
    set({ profile });
  },
  setPersonality: (personality) => set({ personality }),
}));

