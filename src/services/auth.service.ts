import api from './api';
import type { Token, UserOut, UserRegisterPayload } from '../types/api.types';

/**
 * Auth service — wraps /api/auth/* endpoints
 */
export const AuthService = {
  /**
   * POST /api/auth/register
   * Backend expects: { email, password, full_name }
   */
  async register(payload: UserRegisterPayload): Promise<UserOut> {
    const res = await api.post<UserOut>('/api/auth/register', payload);
    return res.data;
  },

  /**
   * POST /api/auth/token
   * Backend uses OAuth2PasswordRequestForm — must send form-encoded body
   */
  async login(email: string, password: string): Promise<Token> {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const res = await api.post<Token>('/api/auth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },

  /**
   * GET /api/auth/me
   */
  async getMe(): Promise<UserOut> {
    const res = await api.get<UserOut>('/api/auth/me');
    return res.data;
  },
};
