/**
 * TypeScript types mirroring the backend schemas.py exactly.
 * Keep in sync with: ifriend/backend/app/schemas.py
 */

// ---- Auth ----

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

// ---- Onboarding ----

export interface ProfileIn {
  age?: number | null;
  gender?: string | null;
  location?: string | null;
  race?: string | null;
  occupation?: string | null;
  education?: string | null;
  hobbies?: string[] | null;
  family_details?: Record<string, unknown> | null;
  bio?: string | null;
  resume_text?: string | null;
}

export interface ProfileOut extends ProfileIn {
  user_id: string;
  updated_at: string;
}

export type QuizAnswerData =
  | { selected_words: string[] }                      // word_selection
  | { ranked_items: string[] }                        // preference_rank
  | { choice: string }                                // scenario_completion | forced_choice | image_selection
  | { values: number[] }                              // slider_scale
  | { selections: Record<string, string> }            // time_pattern
  | { allocations: number[] };                        // percentage_allocation

export interface QuizAnswers {
  answers: Record<string, Record<string, unknown>>;
}

export interface PersonalityOut {
  sattva: number;
  rajas: number;
  tamas: number;
  dominant_guna: string | null;
  traits: Record<string, string> | null;
}

// ---- Quiz Question types ----

export type QuestionType =
  | 'word_selection'
  | 'preference_rank'
  | 'scenario_completion'
  | 'slider_scale'
  | 'time_pattern'
  | 'forced_choice'
  | 'percentage_allocation'
  | 'image_selection';

export interface QuizQuestion {
  id: string;
  question: string;        // actual backend field name
  question_text?: string;  // not sent by backend, kept for compat
  question_type: QuestionType;
  personality_category: string;
  options: Record<string, unknown>;
  display_shuffled?: boolean;
  display_type?: string;
}

// ---- Chat ----

export interface MessageIn {
  content: string;
}

export interface MessageOut {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationOut {
  id: string;
  topic: string | null;
  sentiment: string | null;
  urgency: string | null;
  intention: string | null;
  created_at: string;
  messages: MessageOut[];
}

export interface FeedbackIn {
  rating: number;  // 1-5
  comment?: string;
}
