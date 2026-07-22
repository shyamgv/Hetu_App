import api from './api';
import type { PersonalityOut, ProfileIn, ProfileOut, QuizAnswers, QuizQuestion } from '../types/api.types';

/**
 * Onboarding service — wraps /api/onboarding/* endpoints
 */
export const OnboardingService = {
  /** GET /api/onboarding/quiz-questions */
  async getQuizQuestions(): Promise<QuizQuestion[]> {
    const res = await api.get<{ questions: QuizQuestion[] }>('/api/onboarding/quiz-questions');
    return res.data.questions;
  },

  /** POST /api/onboarding/profile — create or update user profile */
  async upsertProfile(payload: ProfileIn): Promise<ProfileOut> {
    const res = await api.post<ProfileOut>('/api/onboarding/profile', payload);
    return res.data;
  },

  /** GET /api/onboarding/profile */
  async getProfile(): Promise<ProfileOut> {
    const res = await api.get<ProfileOut>('/api/onboarding/profile');
    return res.data;
  },

  /** POST /api/onboarding/quiz — submit answers, get Guna scores */
  async submitQuiz(payload: QuizAnswers): Promise<PersonalityOut> {
    const res = await api.post<PersonalityOut>('/api/onboarding/quiz', payload);
    return res.data;
  },

  /** GET /api/onboarding/personality */
  async getPersonality(): Promise<PersonalityOut> {
    const res = await api.get<PersonalityOut>('/api/onboarding/personality');
    return res.data;
  },
};
