import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setSessionExpiredHandler } from '../services/api';
import { AuthService } from '../services/auth.service';
import { LEGACY_TOKEN_KEY } from '../services/tokens';
import { OnboardingService } from '../services/onboarding.service';
import { ChatService } from '../services/chat.service';
import { useChatStore } from './chat.store';
import { useProfileStore } from './profile.store';
import { useUsageStore } from './usage.store';
import { SQLiteService } from '../db/sqlite';
import { isRenewalUnavailable } from '../utils/errors';
import type { UserOut } from '../types/api.types';

/** What a sign-in, sign-up or code confirmation ended with; each screen routes on `status`. */
export type SignedIn = { status: 'signed_in'; user: UserOut };
export type NeedsEmailCode = { status: 'confirm_sign_up' };
export type NeedsPasswordReset = { status: 'reset_password' };
export type SignInResult = SignedIn | NeedsEmailCode | NeedsPasswordReset;
export type RegisterResult = SignInResult | { status: 'account_exists' };
export type ConfirmResult = SignInResult | { status: 'sign_in_required' };

interface AuthState {
  user: UserOut | null;
  isLoading: boolean;
  isOffline: boolean;
  /**
   * Credentials of a sign-up waiting for its email code, so the user is signed in as soon
   * as they confirm. Kept in memory only; gone when the app closes.
   */
  pendingSignUp: { email: string; password: string } | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<SignInResult>;
  register: (email: string, password: string, fullName: string) => Promise<RegisterResult>;
  confirmEmail: (email: string, code: string) => Promise<ConfirmResult>;
  resendCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** The session can't be renewed: clear everything local. Called by the API client and by the actions below. */
  handleSessionExpired: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/** The old backend-issued token. Those users sign in again, now with Cognito. */
async function dropLegacySession() {
  try {
    if (await SecureStore.getItemAsync(LEGACY_TOKEN_KEY)) {
      await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
      SQLiteService.clearAllData();
    }
  } catch {
    // nothing stored, or secure storage unavailable
  }
}

/** The backend refused the credentials, as opposed to being unreachable or having a bad moment. */
function isAuthRejection(error: any): boolean {
  if (isRenewalUnavailable(error)) return false;
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

let expiring: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  /** Sign out of Cognito and wipe everything cached for the user, on this device. */
  async function clearLocalSession() {
    await AuthService.signOut().catch(() => {});
    SQLiteService.clearAllData();
    useChatStore.getState().setDefaultUseHetuEngine(true);
    useChatStore.setState({
      conversations: [],
      activeConversation: null,
      messages: [],
      isSending: false,
      error: null,
      errorKind: null,
    });
    useProfileStore.setState({ profile: null, personality: null });
    useUsageStore.getState().clear();
    set({ user: null, isOffline: false, pendingSignUp: null });
  }

  /** Fetch the backend user for a fresh Cognito session; the first call creates it. */
  async function loadSignedInUser(): Promise<UserOut> {
    try {
      const user = await AuthService.getMe();
      SQLiteService.saveUser(user);
      set({ user, isOffline: false });

      // Pre-fetch and cache profile details and today's usage
      OnboardingService.getProfile()
        .then((prof) => SQLiteService.saveProfile(prof))
        .catch(() => {});
      useUsageStore.getState().refresh();
      return user;
    } catch (e) {
      // Signed in to Cognito but not accepted by the backend: don't leave a half signed-in session
      await AuthService.signOut().catch(() => {});
      throw e;
    }
  }

  return {
    user: null,
    isLoading: true,
    isOffline: false,
    pendingSignUp: null,

    /**
     * Called once on app start: if a Cognito session is stored, fetch /auth/me, or fall
     * back to the SQLite cache when the backend can't be reached.
     */
    initialize: async () => {
      try {
        await dropLegacySession();

        if (!(await AuthService.hasSession())) {
          console.log('[Auth] initialize - no session found');
          set({ isLoading: false });
          return;
        }

        try {
          const user = await AuthService.getMe();
          SQLiteService.saveUser(user);
          set({ user, isOffline: false, isLoading: false });

          OnboardingService.getProfile()
            .then((prof) => SQLiteService.saveProfile(prof))
            .catch(() => {});
          useUsageStore.getState().refresh();
        } catch (error: any) {
          console.log('[Auth] getMe failed', { status: error?.response?.status });

          if (isAuthRejection(error)) {
            await get().handleSessionExpired();
            set({ isLoading: false });
          } else if (__DEV__) {
            // In development, prefer showing sign-in so developers don't get confused
            // by cached SQLite users when the backend is unreachable.
            set({ user: null, isOffline: true, isLoading: false });
          } else {
            // No connection, or the backend is having trouble: use the cached user
            set({ user: SQLiteService.getUser(), isOffline: true, isLoading: false });
          }
        }
      } catch {
        set({ isLoading: false });
      }
    },

    login: async (email, password) => {
      const outcome = await AuthService.signIn(email, password);

      if (outcome === 'confirm_sign_up') {
        // The account exists but its email was never verified: send a fresh code
        await AuthService.resendSignUpCode(email).catch(() => {});
        set({ pendingSignUp: { email, password } });
        return { status: 'confirm_sign_up' };
      }
      if (outcome === 'reset_password') return { status: 'reset_password' };

      const user = await loadSignedInUser();
      return { status: 'signed_in', user };
    },

    register: async (email, password, fullName) => {
      try {
        const outcome = await AuthService.signUp(email, password, fullName);
        if (outcome === 'done') return await get().login(email, password);

        set({ pendingSignUp: { email, password } });
        return { status: 'confirm_sign_up' };
      } catch (e) {
        if ((e as Error)?.name !== 'UsernameExistsException') throw e;

        // Signed up before but never verified? Then send a new code. Otherwise they have an account.
        try {
          await AuthService.resendSignUpCode(email);
          set({ pendingSignUp: { email, password } });
          return { status: 'confirm_sign_up' };
        } catch {
          return { status: 'account_exists' };
        }
      }
    },

    confirmEmail: async (email, code) => {
      await AuthService.confirmSignUp(email, code);

      const pending = get().pendingSignUp;
      set({ pendingSignUp: null });
      if (!pending || pending.email !== email) return { status: 'sign_in_required' };

      try {
        return await get().login(pending.email, pending.password);
      } catch {
        // The email is verified; signing in just didn't work (e.g. they re-registered with a
        // different password than the first attempt). Let them sign in themselves.
        return { status: 'sign_in_required' };
      }
    },

    resendCode: async (email) => {
      await AuthService.resendSignUpCode(email);
    },

    logout: async () => {
      // End the active conversation (if any) so Guna analysis runs before we
      // clear the session — best-effort, ignore failures (e.g. offline).
      try {
        const activeConversationId = useChatStore.getState().activeConversation?.id;
        if (activeConversationId) {
          await ChatService.endConversation(activeConversationId);
        }
      } catch (e) {
        console.warn('[Auth] Failed to end active conversation on logout:', e);
      }

      await clearLocalSession();
    },

    handleSessionExpired: () => {
      // Several requests can fail at once; they all wait for the same cleanup
      if (!expiring) {
        expiring = clearLocalSession().finally(() => {
          expiring = null;
        });
      }
      return expiring;
    },

    refreshUser: async () => {
      try {
        const user = await AuthService.getMe();
        SQLiteService.saveUser(user);
        set({ user, isOffline: false });
      } catch (error: any) {
        // Only a refusal ends the session; being offline or a backend hiccup does not
        if (isAuthRejection(error)) {
          await get().handleSessionExpired();
        }
      }
    },
  };
});

// When the API client can't renew the session, sign out; the protected layouts then show login
setSessionExpiredHandler(() => useAuthStore.getState().handleSessionExpired());
