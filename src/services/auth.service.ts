import {
  confirmResetPassword,
  confirmSignUp,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import api from './api';
import { isNetworkError } from '../utils/errors';
import type { UserOut } from '../types/api.types';

export type SignInOutcome = 'signed_in' | 'confirm_sign_up' | 'reset_password';

/**
 * Auth service: sign-up, sign-in and password reset go straight to Cognito (through
 * Amplify). Only /auth/me, which gives the app its backend user, calls our API.
 */
export const AuthService = {
  /** Creates the account; Cognito emails a verification code. */
  async signUp(email: string, password: string, fullName: string): Promise<'confirm_sign_up' | 'done'> {
    const { nextStep } = await signUp({
      username: email,
      password,
      options: { userAttributes: { email, name: fullName } },
    });
    return nextStep.signUpStep === 'DONE' ? 'done' : 'confirm_sign_up';
  },

  async confirmSignUp(email: string, code: string): Promise<void> {
    await confirmSignUp({ username: email, confirmationCode: code });
  },

  async resendSignUpCode(email: string): Promise<void> {
    await resendSignUpCode({ username: email });
  },

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    const attempt = () => signIn({ username: email, password });
    let result;
    try {
      result = await attempt();
    } catch (e) {
      // A session is left over (e.g. the backend was unreachable at launch): replace it
      if ((e as Error)?.name !== 'UserAlreadyAuthenticatedException') throw e;
      await signOut();
      result = await attempt();
    }

    switch (result.nextStep.signInStep) {
      case 'DONE':
        return 'signed_in';
      case 'CONFIRM_SIGN_UP':
        return 'confirm_sign_up';
      case 'RESET_PASSWORD':
        return 'reset_password';
      default:
        // The pool has no MFA or forced password change, so any other step is unexpected
        throw new Error(`Unsupported sign-in step: ${result.nextStep.signInStep}`);
    }
  },

  /**
   * Ends this device's session and revokes its refresh token. Works offline: the local
   * tokens are removed even if Cognito can't be told. Other devices stay signed in.
   */
  async signOut(): Promise<void> {
    await signOut();
  },

  /** Emails a code for choosing a new password. */
  async resetPassword(email: string): Promise<void> {
    await resetPassword({ username: email });
  },

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
  },

  /**
   * Whether tokens are stored on this device. No refresh is forced, so an offline launch
   * with an expired access token still counts as signed in (the user can read cached data).
   */
  async hasSession(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch (e) {
      return isNetworkError(e);
    }
  },

  /**
   * GET /auth/me. The first call after sign-up also creates the backend user.
   */
  async getMe(): Promise<UserOut> {
    const res = await api.get<UserOut>('/auth/me');
    return res.data;
  },
};
