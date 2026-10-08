import api from './api';
import type { PersonalityOut, ProfileIn, ProfileOut, QuizAnswers, QuizQuestion } from '../types/api.types';

/**
 * Onboarding service — wraps /api/onboarding/* endpoints
 */
export const OnboardingService = {
  /** GET /onboarding/quiz-questions */
  async getQuizQuestions(): Promise<QuizQuestion[]> {
    const res = await api.get<{ questions: QuizQuestion[] }>('/onboarding/quiz-questions');
    return res.data.questions;
  },

  /** POST /onboarding/profile — create or update user profile */
  async upsertProfile(payload: ProfileIn): Promise<ProfileOut> {
    const res = await api.post<ProfileOut>('/onboarding/profile', payload);
    return res.data;
  },

  /** GET /onboarding/profile */
  async getProfile(): Promise<ProfileOut> {
    const res = await api.get<ProfileOut>('/onboarding/profile');
    return res.data;
  },

  /** POST /onboarding/quiz — submit answers, get Guna scores */
  async submitQuiz(payload: QuizAnswers): Promise<PersonalityOut> {
    const res = await api.post<PersonalityOut>('/onboarding/quiz', payload);
    return res.data;
  },

  /** GET /onboarding/personality */
  async getPersonality(): Promise<PersonalityOut> {
    const res = await api.get<PersonalityOut>('/onboarding/personality');
    return res.data;
  },

  /**
   * POST /onboarding/complete
   * Marks onboarding complete server-side without submitting quiz answers
   */
  async completeOnboarding(): Promise<void> {
    await api.post('/onboarding/complete');
  },
};
