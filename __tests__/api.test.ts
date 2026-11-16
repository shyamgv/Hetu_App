import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

jest.mock('../src/services/tokens', () => ({
  getAccessToken: jest.fn(),
  LEGACY_TOKEN_KEY: 'hetu_auth_token',
}));

import api, { setSessionExpiredHandler } from '../src/services/api';
import { getAccessToken } from '../src/services/tokens';

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const onSessionExpired = jest.fn();

/** A fake backend: answers 200 to the token it accepts and 401 to anything else. */
function backendAccepting(validToken: string) {
  const seen: Array<string | undefined> = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const sent = config.headers.Authorization as string | undefined;
    seen.push(sent);
    const response = { data: { ok: true }, status: sent === validToken ? 200 : 401, statusText: '', headers: {}, config };
    if (response.status === 200) return response;
    throw new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, response);
  };
  api.defaults.adapter = adapter;
  return seen;
}

const networkError = () => Object.assign(new Error('A network error has occurred.'), { name: 'NetworkError' });

beforeEach(() => {
  jest.resetAllMocks();
  setSessionExpiredHandler(onSessionExpired);
});

describe('request interceptor', () => {
  it('sends the access token as it is, without a Bearer prefix', async () => {
    mockGetAccessToken.mockResolvedValue('tok-1');
    const seen = backendAccepting('tok-1');

    await api.get('/auth/me');

    expect(seen).toEqual(['tok-1']);
  });

  it('sends no Authorization header when nobody is signed in', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    const seen = backendAccepting('tok-1');

    await expect(api.get('/auth/me')).rejects.toBeDefined(); // the backend says 401

    expect(seen[0]).toBeUndefined();
  });

  it('fails the request as a network error when the token could not be refreshed offline', async () => {
    mockGetAccessToken.mockRejectedValue(networkError());
    const seen = backendAccepting('tok-1');

    // Not sent without a token: that would draw a 401 that looks like the session was refused
    await expect(api.get('/auth/me')).rejects.toMatchObject({ name: 'NetworkError' });

    expect(seen).toHaveLength(0);
  });

  it('still sends the request when getting the token failed for some other reason', async () => {
    mockGetAccessToken.mockRejectedValue(new Error('unexpected'));
    const seen = backendAccepting('tok-1');

    await expect(api.get('/auth/me')).rejects.toBeDefined();

    expect(seen).toHaveLength(1);
  });
});

describe('response interceptor: a 401 from the backend', () => {
  it('gets a fresh token and retries once, and the caller never sees the 401', async () => {
    let current = 'stale';
    mockGetAccessToken.mockImplementation(async (force) => {
      if (force) current = 'fresh';
      return current;
    });
    const seen = backendAccepting('fresh');

    const res = await api.get('/chat/conversations');

    expect(res.data).toEqual({ ok: true });
    expect(seen).toEqual(['stale', 'fresh']);
    expect(mockGetAccessToken).toHaveBeenCalledWith(true);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('retries only once: a backend that keeps refusing does not loop, and the session is kept', async () => {
    mockGetAccessToken.mockResolvedValue('tok');
    const seen = backendAccepting('some-other-token');

    await expect(api.get('/auth/me')).rejects.toMatchObject({ response: { status: 401 } });

    expect(seen).toEqual(['tok', 'tok']);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs the user out when the session cannot be renewed', async () => {
    mockGetAccessToken.mockImplementation(async (force) => (force ? null : 'stale'));
    backendAccepting('fresh');

    await expect(api.get('/auth/me')).rejects.toMatchObject({ response: { status: 401 } });

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when Cognito cannot be reached to renew it, and marks the 401 so it is not taken as a refusal', async () => {
    mockGetAccessToken.mockImplementation(async (force) => {
      if (force) throw networkError();
      return 'stale';
    });
    backendAccepting('fresh');

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
      renewalUnavailable: true,
    });

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('shares one refresh between requests that fail at the same time', async () => {
    let current = 'stale';
    mockGetAccessToken.mockImplementation(async (force) => {
      if (force) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        current = 'fresh';
      }
      return current;
    });
    backendAccepting('fresh');

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(mockGetAccessToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  });

  it('leaves other errors alone: no refresh, no sign-out', async () => {
    mockGetAccessToken.mockResolvedValue('tok');
    api.defaults.adapter = async (config) => {
      throw new AxiosError('boom', 'ERR_BAD_RESPONSE', config, null, {
        data: { detail: { code: 'quota_exceeded' } },
        status: 429,
        statusText: '',
        headers: {},
        config,
      });
    };

    await expect(api.post('/chat/conversations/1/messages')).rejects.toMatchObject({ response: { status: 429 } });

    expect(mockGetAccessToken).toHaveBeenCalledTimes(1); // only the request's own lookup
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
