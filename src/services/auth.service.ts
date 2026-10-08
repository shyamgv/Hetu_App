import api from './api';
import type { Token, UserOut, UserRegisterPayload } from '../types/api.types';

/**
 * Auth service — wraps /api/auth/* endpoints
 */
export const AuthService = {
  /**
   * POST /auth/register
   * Backend expects: { email, password, full_name }
   */
  async register(payload: UserRegisterPayload): Promise<UserOut> {
    const res = await api.post<UserOut>('/auth/register', payload);
    return res.data;
  },

  /**
   * POST /auth/token
   * Backend uses OAuth2PasswordRequestForm — must send form-encoded body
   */
  async login(email: string, password: string): Promise<Token> {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const res = await api.post<Token>('/auth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  console.debug('[AuthService] login response', { status: res.status, dataPresent: !!res.data });
    return res.data;
  },

  /**
   * GET /auth/me
   */
  async getMe(): Promise<UserOut> {
    const res = await api.get<UserOut>('/auth/me');
  console.debug('[AuthService] getMe response', { status: res.status, userId: res.data?.id, onboarding_complete: res.data?.onboarding_complete });
    return res.data;
  },
};
