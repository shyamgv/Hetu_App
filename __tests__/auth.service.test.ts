jest.mock('aws-amplify/auth', () => ({
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
  resendSignUpCode: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  getCurrentUser: jest.fn(),
}));
jest.mock('../src/services/tokens', () => ({ getAccessToken: jest.fn(), LEGACY_TOKEN_KEY: 'hetu_auth_token' }));

import * as amplify from 'aws-amplify/auth';
import { AuthService } from '../src/services/auth.service';

const mocked = amplify as unknown as Record<string, jest.Mock>;
const named = (name: string) => Object.assign(new Error(name), { name });

beforeEach(() => jest.resetAllMocks());

describe('AuthService.signUp', () => {
  it('passes the email and name as Cognito attributes and asks for the code', async () => {
    mocked.signUp.mockResolvedValue({ nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } });

    const outcome = await AuthService.signUp('a@b.co', 'Passw0rd1', 'Ada');

    expect(outcome).toBe('confirm_sign_up');
    expect(mocked.signUp).toHaveBeenCalledWith({
      username: 'a@b.co',
      password: 'Passw0rd1',
      options: { userAttributes: { email: 'a@b.co', name: 'Ada' } },
    });
  });

  it('reports an account that needs no confirmation as done', async () => {
    mocked.signUp.mockResolvedValue({ nextStep: { signUpStep: 'DONE' } });
    expect(await AuthService.signUp('a@b.co', 'Passw0rd1', 'Ada')).toBe('done');
  });
});

describe('AuthService.signIn', () => {
  it.each([
    ['DONE', 'signed_in'],
    ['CONFIRM_SIGN_UP', 'confirm_sign_up'],
    ['RESET_PASSWORD', 'reset_password'],
  ])('maps the %s step to %s', async (step, outcome) => {
    mocked.signIn.mockResolvedValue({ isSignedIn: step === 'DONE', nextStep: { signInStep: step } });
    expect(await AuthService.signIn('a@b.co', 'pw')).toBe(outcome);
  });

  it('replaces a session left on the device instead of failing', async () => {
    mocked.signIn
      .mockRejectedValueOnce(named('UserAlreadyAuthenticatedException'))
      .mockResolvedValueOnce({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });

    expect(await AuthService.signIn('a@b.co', 'pw')).toBe('signed_in');
    expect(mocked.signOut).toHaveBeenCalledTimes(1);
    expect(mocked.signIn).toHaveBeenCalledTimes(2);
  });

  it('passes other errors on, such as a wrong password', async () => {
    mocked.signIn.mockRejectedValue(named('NotAuthorizedException'));
    await expect(AuthService.signIn('a@b.co', 'bad')).rejects.toMatchObject({ name: 'NotAuthorizedException' });
    expect(mocked.signOut).not.toHaveBeenCalled();
  });

  it('refuses a sign-in step the pool should never ask for', async () => {
    mocked.signIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' } });
    await expect(AuthService.signIn('a@b.co', 'pw')).rejects.toThrow(/Unsupported sign-in step/);
  });
});

describe('AuthService.hasSession', () => {
  it('is true when tokens are stored', async () => {
    mocked.getCurrentUser.mockResolvedValue({ userId: 'u' });
    expect(await AuthService.hasSession()).toBe(true);
  });

  it('is false when signed out', async () => {
    mocked.getCurrentUser.mockRejectedValue(named('UserUnAuthenticatedException'));
    expect(await AuthService.hasSession()).toBe(false);
  });

  it('is still true offline, when an expired token could not be refreshed', async () => {
    mocked.getCurrentUser.mockRejectedValue(named('NetworkError'));
    expect(await AuthService.hasSession()).toBe(true);
  });
});

describe('password reset', () => {
  it('sends the code and the new password to Cognito', async () => {
    await AuthService.resetPassword('a@b.co');
    await AuthService.confirmResetPassword('a@b.co', '123456', 'NewPassw0rd');

    expect(mocked.resetPassword).toHaveBeenCalledWith({ username: 'a@b.co' });
    expect(mocked.confirmResetPassword).toHaveBeenCalledWith({
      username: 'a@b.co',
      confirmationCode: '123456',
      newPassword: 'NewPassw0rd',
    });
  });
});
