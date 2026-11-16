jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('../src/db/sqlite', () => ({
  SQLiteService: {
    saveUser: jest.fn(),
    getUser: jest.fn(),
    clearAllData: jest.fn(),
    saveProfile: jest.fn(),
    getProfile: jest.fn(),
  },
}));
jest.mock('../src/services/tokens', () => ({ getAccessToken: jest.fn(), LEGACY_TOKEN_KEY: 'hetu_auth_token' }));
jest.mock('../src/services/auth.service', () => ({
  AuthService: {
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
    resendSignUpCode: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasSession: jest.fn(),
    getMe: jest.fn(),
  },
}));
jest.mock('../src/services/onboarding.service', () => ({ OnboardingService: { getProfile: jest.fn() } }));
jest.mock('../src/services/chat.service', () => ({ ChatService: { endConversation: jest.fn() } }));
jest.mock('../src/services/usage.service', () => ({ UsageService: { getToday: jest.fn() } }));

import * as SecureStore from 'expo-secure-store';
import { SQLiteService } from '../src/db/sqlite';
import { AuthService } from '../src/services/auth.service';
import { OnboardingService } from '../src/services/onboarding.service';
import { ChatService } from '../src/services/chat.service';
import { UsageService } from '../src/services/usage.service';
import { useAuthStore } from '../src/store/auth.store';
import { useChatStore } from '../src/store/chat.store';
import { useProfileStore } from '../src/store/profile.store';
import { useUsageStore } from '../src/store/usage.store';
import type { UserOut } from '../src/types/api.types';

const auth = AuthService as jest.Mocked<typeof AuthService>;
const sqlite = SQLiteService as jest.Mocked<typeof SQLiteService>;
const secure = SecureStore as jest.Mocked<typeof SecureStore>;

const user: UserOut = {
  id: 'u1',
  email: 'a@b.co',
  full_name: 'Ada',
  onboarding_complete: true,
  created_at: '2026-01-01T00:00:00Z',
};
const named = (name: string) => Object.assign(new Error(name), { name });
const httpError = (status: number) => ({ isAxiosError: true, message: `status ${status}`, response: { status, data: {} } });
const offlineError = () => ({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' });

const state = () => useAuthStore.getState();

beforeEach(() => {
  jest.resetAllMocks();
  (OnboardingService.getProfile as jest.Mock).mockResolvedValue({});
  (UsageService.getToday as jest.Mock).mockResolvedValue({ plan: 'free' });
  auth.signOut.mockResolvedValue(undefined);
  auth.resendSignUpCode.mockResolvedValue(undefined);
  secure.getItemAsync.mockResolvedValue(null);
  useAuthStore.setState({ user: null, isLoading: true, isOffline: false, pendingSignUp: null });
  useUsageStore.setState({ usage: null });
});

describe('initialize', () => {
  it('goes to sign-in when no session is stored, without calling the backend', async () => {
    auth.hasSession.mockResolvedValue(false);

    await state().initialize();

    expect(state()).toMatchObject({ user: null, isLoading: false });
    expect(auth.getMe).not.toHaveBeenCalled();
  });

  it('signs in the stored session and caches the user', async () => {
    auth.hasSession.mockResolvedValue(true);
    auth.getMe.mockResolvedValue(user);

    await state().initialize();

    expect(state()).toMatchObject({ user, isLoading: false, isOffline: false });
    expect(sqlite.saveUser).toHaveBeenCalledWith(user);
    expect(UsageService.getToday).toHaveBeenCalled();
  });

  it('drops the old backend-issued token and its cache, so those users sign in again', async () => {
    secure.getItemAsync.mockResolvedValue('old-jwt');
    auth.hasSession.mockResolvedValue(false);

    await state().initialize();

    expect(secure.deleteItemAsync).toHaveBeenCalledWith('hetu_auth_token');
    expect(sqlite.clearAllData).toHaveBeenCalled();
    expect(state().user).toBeNull();
  });

  it('signs out and wipes the cache when the backend refuses the session', async () => {
    auth.hasSession.mockResolvedValue(true);
    auth.getMe.mockRejectedValue(httpError(401));

    await state().initialize();

    expect(auth.signOut).toHaveBeenCalled();
    expect(sqlite.clearAllData).toHaveBeenCalled();
    expect(state()).toMatchObject({ user: null, isLoading: false });
  });

  describe('when the backend cannot be reached', () => {
    const originalDev = (global as any).__DEV__;
    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('uses the cached user in a release build, and keeps the session', async () => {
      (global as any).__DEV__ = false;
      auth.hasSession.mockResolvedValue(true);
      auth.getMe.mockRejectedValue(offlineError());
      sqlite.getUser.mockReturnValue(user);

      await state().initialize();

      expect(state()).toMatchObject({ user, isOffline: true, isLoading: false });
      expect(auth.signOut).not.toHaveBeenCalled();
    });

    it('shows sign-in in development instead of a cached user', async () => {
      (global as any).__DEV__ = true;
      auth.hasSession.mockResolvedValue(true);
      auth.getMe.mockRejectedValue(offlineError());
      sqlite.getUser.mockReturnValue(user);

      await state().initialize();

      expect(state()).toMatchObject({ user: null, isOffline: true, isLoading: false });
    });

    it('treats a backend outage (5xx) like being offline: the user is not signed out', async () => {
      (global as any).__DEV__ = false;
      auth.hasSession.mockResolvedValue(true);
      auth.getMe.mockRejectedValue(httpError(503));
      sqlite.getUser.mockReturnValue(user);

      await state().initialize();

      expect(auth.signOut).not.toHaveBeenCalled();
      expect(sqlite.clearAllData).not.toHaveBeenCalled();
      expect(state()).toMatchObject({ user, isOffline: true });
    });

    it('does not sign out over a 401 that only means Cognito was unreachable to renew the token', async () => {
      (global as any).__DEV__ = false;
      auth.hasSession.mockResolvedValue(true);
      auth.getMe.mockRejectedValue({ ...httpError(401), renewalUnavailable: true });
      sqlite.getUser.mockReturnValue(user);

      await state().initialize();

      expect(auth.signOut).not.toHaveBeenCalled();
      expect(sqlite.clearAllData).not.toHaveBeenCalled();
      expect(state()).toMatchObject({ user, isOffline: true });
    });
  });
});

describe('login', () => {
  it('signs in and loads the backend user', async () => {
    auth.signIn.mockResolvedValue('signed_in');
    auth.getMe.mockResolvedValue(user);

    const result = await state().login('a@b.co', 'pw');

    expect(result).toEqual({ status: 'signed_in', user });
    expect(state().user).toEqual(user);
    expect(sqlite.saveUser).toHaveBeenCalledWith(user);
  });

  it('does not leave a half signed-in session when the backend rejects the new sign-in', async () => {
    auth.signIn.mockResolvedValue('signed_in');
    auth.getMe.mockRejectedValue(httpError(403));

    await expect(state().login('a@b.co', 'pw')).rejects.toBeDefined();

    expect(auth.signOut).toHaveBeenCalled();
    expect(state().user).toBeNull();
  });

  it('for an unverified account, sends a new code and remembers the credentials for after it', async () => {
    auth.signIn.mockResolvedValue('confirm_sign_up');

    const result = await state().login('a@b.co', 'pw');

    expect(result).toEqual({ status: 'confirm_sign_up' });
    expect(auth.resendSignUpCode).toHaveBeenCalledWith('a@b.co');
    expect(state().pendingSignUp).toEqual({ email: 'a@b.co', password: 'pw' });
    expect(auth.getMe).not.toHaveBeenCalled();
  });

  it('reports that a password reset is needed', async () => {
    auth.signIn.mockResolvedValue('reset_password');
    expect(await state().login('a@b.co', 'pw')).toEqual({ status: 'reset_password' });
  });

  it('lets a wrong password through as an error', async () => {
    auth.signIn.mockRejectedValue(named('NotAuthorizedException'));
    await expect(state().login('a@b.co', 'bad')).rejects.toMatchObject({ name: 'NotAuthorizedException' });
  });
});

describe('register', () => {
  it('creates the account and waits for the emailed code', async () => {
    auth.signUp.mockResolvedValue('confirm_sign_up');

    const result = await state().register('a@b.co', 'Passw0rd1', 'Ada');

    expect(result).toEqual({ status: 'confirm_sign_up' });
    expect(auth.signUp).toHaveBeenCalledWith('a@b.co', 'Passw0rd1', 'Ada');
    expect(state().pendingSignUp).toEqual({ email: 'a@b.co', password: 'Passw0rd1' });
  });

  it('for an email that registered but never verified, sends a new code', async () => {
    auth.signUp.mockRejectedValue(named('UsernameExistsException'));
    auth.resendSignUpCode.mockResolvedValue(undefined);

    expect(await state().register('a@b.co', 'Passw0rd1', 'Ada')).toEqual({ status: 'confirm_sign_up' });
  });

  it('for an email that already has a verified account, says so', async () => {
    auth.signUp.mockRejectedValue(named('UsernameExistsException'));
    auth.resendSignUpCode.mockRejectedValue(named('InvalidParameterException')); // "User is already confirmed"

    expect(await state().register('a@b.co', 'Passw0rd1', 'Ada')).toEqual({ status: 'account_exists' });
    expect(state().pendingSignUp).toBeNull();
  });

  it('passes other errors on, such as a rejected password', async () => {
    auth.signUp.mockRejectedValue(named('InvalidPasswordException'));
    await expect(state().register('a@b.co', 'weak', 'Ada')).rejects.toMatchObject({ name: 'InvalidPasswordException' });
  });
});

describe('confirmEmail', () => {
  it('after the code is accepted, signs the user in with the credentials from sign-up', async () => {
    useAuthStore.setState({ pendingSignUp: { email: 'a@b.co', password: 'Passw0rd1' } });
    auth.signIn.mockResolvedValue('signed_in');
    auth.getMe.mockResolvedValue(user);

    const result = await state().confirmEmail('a@b.co', '123456');

    expect(auth.confirmSignUp).toHaveBeenCalledWith('a@b.co', '123456');
    expect(auth.signIn).toHaveBeenCalledWith('a@b.co', 'Passw0rd1');
    expect(result).toEqual({ status: 'signed_in', user });
    expect(state().pendingSignUp).toBeNull();
  });

  it('asks the user to sign in when there are no credentials to use (e.g. the app was restarted)', async () => {
    expect(await state().confirmEmail('a@b.co', '123456')).toEqual({ status: 'sign_in_required' });
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('asks the user to sign in when the automatic sign-in fails, since the email is verified anyway', async () => {
    useAuthStore.setState({ pendingSignUp: { email: 'a@b.co', password: 'not-the-original' } });
    auth.signIn.mockRejectedValue(named('NotAuthorizedException'));

    expect(await state().confirmEmail('a@b.co', '123456')).toEqual({ status: 'sign_in_required' });
  });

  it('a wrong code is an error and keeps the pending sign-up for the retry', async () => {
    useAuthStore.setState({ pendingSignUp: { email: 'a@b.co', password: 'Passw0rd1' } });
    auth.confirmSignUp.mockRejectedValue(named('CodeMismatchException'));

    await expect(state().confirmEmail('a@b.co', '000000')).rejects.toMatchObject({ name: 'CodeMismatchException' });

    expect(state().pendingSignUp).not.toBeNull();
  });
});

describe('logout and session expiry', () => {
  function signedInWithData() {
    useAuthStore.setState({ user, isLoading: false });
    useChatStore.setState({ activeConversation: { id: 'c1' } as any, messages: [{ id: 'm' } as any], conversations: [{ id: 'c1' } as any] });
    useProfileStore.setState({ profile: { user_id: 'u1' } as any });
    useUsageStore.setState({ usage: { plan: 'free' } as any });
  }

  it('ends the open conversation, signs out of Cognito, and clears everything held for the user', async () => {
    signedInWithData();

    await state().logout();

    expect(ChatService.endConversation).toHaveBeenCalledWith('c1');
    expect(auth.signOut).toHaveBeenCalled();
    expect(sqlite.clearAllData).toHaveBeenCalled();
    expect(state().user).toBeNull();
    expect(useChatStore.getState()).toMatchObject({ activeConversation: null, messages: [], conversations: [] });
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useUsageStore.getState().usage).toBeNull();
  });

  it('still signs out when the conversation cannot be ended (offline)', async () => {
    signedInWithData();
    (ChatService.endConversation as jest.Mock).mockRejectedValue(offlineError());

    await state().logout();

    expect(auth.signOut).toHaveBeenCalled();
    expect(state().user).toBeNull();
  });

  it('cleans up once when many requests find the session expired at the same time', async () => {
    signedInWithData();

    await Promise.all([state().handleSessionExpired(), state().handleSessionExpired(), state().handleSessionExpired()]);

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(state().user).toBeNull();
  });
});

describe('refreshUser', () => {
  beforeEach(() => useAuthStore.setState({ user, isLoading: false }));

  it('updates the user', async () => {
    auth.getMe.mockResolvedValue({ ...user, onboarding_complete: false });
    await state().refreshUser();
    expect(state().user?.onboarding_complete).toBe(false);
  });

  it('signs out when the backend refuses the session', async () => {
    auth.getMe.mockRejectedValue(httpError(401));
    await state().refreshUser();
    expect(state().user).toBeNull();
  });

  it.each([
    ['offline', offlineError()],
    ['a backend error', httpError(500)],
    ['a 401 only because Cognito was unreachable to renew the token', { ...httpError(401), renewalUnavailable: true }],
  ])('keeps the user signed in on %s', async (_name, error) => {
    auth.getMe.mockRejectedValue(error);
    await state().refreshUser();
    expect(state().user).toEqual(user);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
