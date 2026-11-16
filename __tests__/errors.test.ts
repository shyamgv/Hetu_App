import { formatResetTime, getErrorMessage, isNetworkError, parseApiError, quotaMessage } from '../src/utils/errors';

const httpError = (status: number, detail: unknown) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: { status, data: { detail } },
});

describe('parseApiError', () => {
  it('reads a plain string detail', () => {
    expect(parseApiError(httpError(400, 'Email already registered'))).toEqual({
      status: 400,
      message: 'Email already registered',
    });
  });

  it('reads the quota refusal the backend sends (an object with a code and the reset time)', () => {
    const err = httpError(429, {
      code: 'quota_exceeded',
      message: "You've reached today's limit.",
      reset_at: '2026-11-09T00:00:00+00:00',
    });

    const info = parseApiError(err);

    expect(info.status).toBe(429);
    expect(info.code).toBe('quota_exceeded');
    expect(info.resetAt?.toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });

  it('reads the "previous message still running" refusal', () => {
    const info = parseApiError(httpError(429, { code: 'request_in_flight', message: 'Please wait a moment.' }));
    expect(info).toMatchObject({ code: 'request_in_flight', message: 'Please wait a moment.' });
    expect(info.resetAt).toBeUndefined();
  });

  it('takes the first message of a validation error list', () => {
    expect(parseApiError(httpError(422, [{ msg: 'field required' }, { msg: 'other' }])).message).toBe('field required');
  });

  it('ignores an unparseable reset time', () => {
    expect(parseApiError(httpError(429, { code: 'quota_exceeded', reset_at: 'garbage' })).resetAt).toBeUndefined();
  });

  it('uses the fallback when there is no response body', () => {
    expect(parseApiError(new Error('x'), 'fallback').message).toBe('fallback');
  });
});

describe('isNetworkError', () => {
  it('recognises a request that got no response', () => {
    expect(isNetworkError({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' })).toBe(true);
    expect(isNetworkError({ isAxiosError: true, message: 'timeout of 30000ms exceeded', code: 'ECONNABORTED' })).toBe(true);
    expect(isNetworkError({ name: 'NetworkError', message: 'A network error has occurred.' })).toBe(true);
  });

  it('does not mistake an HTTP error response, or a Cognito error, for being offline', () => {
    expect(isNetworkError(httpError(500, 'boom'))).toBe(false);
    expect(isNetworkError({ name: 'InvalidParameterException', message: 'bad' })).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('translates Cognito errors', () => {
    expect(getErrorMessage({ name: 'NotAuthorizedException' }, 'x')).toBe('Incorrect email or password.');
    expect(getErrorMessage({ name: 'UsernameExistsException' }, 'x')).toMatch(/already exists/);
    expect(getErrorMessage({ name: 'CodeMismatchException' }, 'x')).toMatch(/isn't right/);
    expect(getErrorMessage({ name: 'LimitExceededException' }, 'x')).toMatch(/Too many attempts/);
  });

  it('shows the backend message for an HTTP error', () => {
    expect(getErrorMessage(httpError(403, 'Verify your email address to continue.'), 'x')).toBe(
      'Verify your email address to continue.'
    );
  });

  it('says so when the server cannot be reached', () => {
    expect(getErrorMessage({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' }, 'x')).toMatch(
      /Can't reach the server/
    );
  });

  it("passes through a named Cognito error's own message, and falls back otherwise", () => {
    expect(getErrorMessage({ name: 'InvalidParameterException', message: 'Cannot reset password' }, 'x')).toBe(
      'Cannot reset password'
    );
    expect(getErrorMessage(new Error('internal detail'), 'Something failed')).toBe('Something failed');
  });
});

describe('quota messages', () => {
  it('tells the user when the allowance resets', () => {
    const resetAt = new Date('2026-11-09T00:00:00Z');
    expect(quotaMessage(resetAt)).toContain(formatResetTime(resetAt));
  });

  it('still reads well without a reset time', () => {
    expect(quotaMessage()).toMatch(/resets tomorrow/);
  });
});
