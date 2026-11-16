const mockStore = new Map<string, string>();
const mockSetCalls: string[] = [];
const mockHooks: { failOnSetNumber?: number; afterMutation?: () => void } = {};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => {
    await tick();
    return mockStore.get(key) ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    await tick();
    mockSetCalls.push(key);
    if (mockHooks.failOnSetNumber === mockSetCalls.length) throw new Error('disk full');
    mockStore.set(key, value);
    mockHooks.afterMutation?.();
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    await tick();
    mockStore.delete(key);
    mockHooks.afterMutation?.();
  }),
}));

import { secureTokenStorage } from '../src/services/secureStorage';

// SecureStore's own key rule
const VALID_KEY = /^[A-Za-z0-9._-]+$/;
// A Cognito refresh token is a few KB of base64url text
const longToken = (fill: string) => fill.repeat(4000) + 'END';
const INDEX_KEY = 'hetu_amplify_keys';
const pieces = () => [...mockStore.keys()].filter((k) => k !== INDEX_KEY && k !== 'refreshToken');

beforeEach(() => {
  mockStore.clear();
  mockSetCalls.length = 0;
  mockHooks.failOnSetNumber = undefined;
  mockHooks.afterMutation = undefined;
});

describe('secureTokenStorage', () => {
  it('stores and returns a short value as it is', async () => {
    await secureTokenStorage.setItem('CognitoIdentityServiceProvider.abc.user.accessToken', 'token');

    expect(await secureTokenStorage.getItem('CognitoIdentityServiceProvider.abc.user.accessToken')).toBe('token');
  });

  it('returns null for a key that was never stored', async () => {
    expect(await secureTokenStorage.getItem('missing')).toBeNull();
  });

  it('only ever hands SecureStore valid keys, whatever characters Amplify uses', async () => {
    await secureTokenStorage.setItem('Cognito:Identity/Service@Provider key', 'v');
    await secureTokenStorage.setItem('Cognito:Identity/Service@Provider long', longToken('x'));

    expect(mockSetCalls.length).toBeGreaterThan(0);
    for (const key of mockSetCalls) expect(key).toMatch(VALID_KEY);
    expect(await secureTokenStorage.getItem('Cognito:Identity/Service@Provider key')).toBe('v');
  });

  it('splits a value too long for SecureStore across entries and puts it back together', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('x'));

    for (const [key, value] of mockStore) if (key !== INDEX_KEY) expect(value.length).toBeLessThanOrEqual(1500);
    expect(await secureTokenStorage.getItem('refreshToken')).toBe(longToken('x'));
  });

  it('leaves no stale pieces behind when a long value is replaced by a short one', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('x'));
    await secureTokenStorage.setItem('refreshToken', 'short');

    expect(await secureTokenStorage.getItem('refreshToken')).toBe('short');
    expect(pieces()).toEqual([]);
  });

  it('keeps only the newest pieces when a long value is replaced by another long one', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('a'));
    await secureTokenStorage.setItem('refreshToken', longToken('b'));

    expect(await secureTokenStorage.getItem('refreshToken')).toBe(longToken('b'));
    expect(pieces()).toHaveLength(3); // 4003 characters = 3 pieces
  });

  it('removes every piece of a long value', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('x'));
    await secureTokenStorage.removeItem('refreshToken');

    expect(await secureTokenStorage.getItem('refreshToken')).toBeNull();
    expect([...mockStore.keys()]).toEqual([]);
  });

  it('treats a value with a missing piece as absent rather than returning a corrupt token', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('x'));
    mockStore.delete(pieces()[1]);

    expect(await secureTokenStorage.getItem('refreshToken')).toBeNull();
  });

  it('clear() removes everything it stored', async () => {
    await secureTokenStorage.setItem('a', '1');
    await secureTokenStorage.setItem('b', longToken('x'));

    await secureTokenStorage.clear();

    expect(await secureTokenStorage.getItem('a')).toBeNull();
    expect(await secureTokenStorage.getItem('b')).toBeNull();
    expect([...mockStore.keys()]).toEqual([]);
  });
});

describe('replacing a token never makes it look signed out', () => {
  it.each([
    ['a long value by a long one', longToken('a'), longToken('b')],
    ['a short value by a long one', 'old', longToken('b')],
    ['a long value by a short one', longToken('a'), 'new'],
    ['a short value by a short one', 'old', 'new'],
  ])('the key is present after every single step when replacing %s', async (_name, oldValue, newValue) => {
    await secureTokenStorage.setItem('refreshToken', oldValue);

    // If the app were killed after any step, Amplify would find the key and a complete value
    const readableAfterEachStep: boolean[] = [];
    mockHooks.afterMutation = () => readableAfterEachStep.push(mockStore.has('refreshToken'));
    await secureTokenStorage.setItem('refreshToken', newValue);

    expect(readableAfterEachStep.length).toBeGreaterThan(0);
    expect(readableAfterEachStep.every(Boolean)).toBe(true);
    expect(await secureTokenStorage.getItem('refreshToken')).toBe(newValue);
  });

  it('keeps the old value, complete, when writing the new one fails part way', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('a'));
    mockHooks.failOnSetNumber = mockSetCalls.length + 2; // fail while writing the second piece

    await expect(secureTokenStorage.setItem('refreshToken', longToken('b'))).rejects.toThrow('disk full');

    expect(await secureTokenStorage.getItem('refreshToken')).toBe(longToken('a'));
    expect(pieces()).toHaveLength(3); // no leftovers from the failed attempt
  });

  it('a failed write does not block the operations after it', async () => {
    mockHooks.failOnSetNumber = 1;
    await expect(secureTokenStorage.setItem('x', '1')).rejects.toThrow();

    await secureTokenStorage.setItem('x', '2');

    expect(await secureTokenStorage.getItem('x')).toBe('2');
  });

  it('a read in the middle of a replacement returns the old value or the new one, never a mix or nothing', async () => {
    await secureTokenStorage.setItem('refreshToken', longToken('a'));

    const write = secureTokenStorage.setItem('refreshToken', longToken('b'));
    const reads = await Promise.all(Array.from({ length: 10 }, () => secureTokenStorage.getItem('refreshToken')));
    await write;

    for (const value of reads) expect([longToken('a'), longToken('b')]).toContain(value);
  });
});
