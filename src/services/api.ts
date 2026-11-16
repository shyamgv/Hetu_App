import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants/config';
import { isNetworkError } from '../utils/errors';
import { getAccessToken } from './tokens';

/**
 * Central Axios instance for all Hetu API calls.
 * - Base URL from config (the API Gateway mobile route in production, the backend directly in dev)
 * - Request interceptor: attaches the Cognito access token. It is sent as-is, without
 *   a "Bearer " prefix: API Gateway's Cognito authorizer takes the bare token, and the
 *   backend accepts both forms.
 * - Response interceptor: on a 401, gets a fresh token and retries the request once.
 *   Only when the session can't be renewed is the user signed out.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetriableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

let onSessionExpired: (() => void | Promise<void>) | null = null;

/** The auth store registers what to do when the session can't be renewed (sign out, show login). */
export function setSessionExpiredHandler(handler: () => void | Promise<void>) {
  onSessionExpired = handler;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = token;
    }
  } catch (e) {
    // The token needed refreshing and Cognito couldn't be reached. Fail the request as a
    // network error, which the app handles as "offline" (sending it without a token
    // would only draw a 401 that looks like the session was refused).
    if (isNetworkError(e)) throw e;
    console.debug('[api] could not get an access token', (e as Error)?.name);
  }
  return config;
});

// Requests that hit a 401 at the same moment share one refresh
let refreshInFlight: Promise<string | null> | null = null;

function forceRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = getAccessToken(true).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** A token that differs from the one the failed request sent, renewing it if necessary. */
async function renewedToken(sentToken: unknown): Promise<string | null> {
  // Another request may already have refreshed: use its token rather than refreshing again
  const current = await getAccessToken();
  if (current && current !== sentToken) return current;
  return forceRefresh();
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !original || original._authRetried) {
      return Promise.reject(error);
    }
    original._authRetried = true;

    try {
      const token = await renewedToken(original.headers?.Authorization);
      if (token) {
        original.headers.Authorization = token;
        return api.request(original);
      }
    } catch (refreshError) {
      // Can't reach Cognito: the session may well still be good, so keep it, and say so
      // on the error so callers don't take this 401 for a refusal
      if (isNetworkError(refreshError)) {
        return Promise.reject(Object.assign(error, { renewalUnavailable: true }));
      }
    }

    // No session left, or Cognito refused to renew it
    await onSessionExpired?.();
    return Promise.reject(error);
  }
);

export default api;
