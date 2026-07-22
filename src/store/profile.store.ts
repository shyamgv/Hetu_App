import { create } from 'zustand';
import { OnboardingService } from '../services/onboarding.service';
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
    set({ isLoading: true });
    try {
      const profile = await OnboardingService.getProfile();
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

  setProfile: (profile) => set({ profile }),
  setPersonality: (personality) => set({ personality }),
}));
