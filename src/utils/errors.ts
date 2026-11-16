/**
 * Turns the different kinds of failures the app sees (Cognito/Amplify errors,
 * backend HTTP errors, no connection) into something a person can act on.
 */
import { PASSWORD_HINT } from './validation';

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

/** Error names Amplify's Auth APIs throw, mapped to what we tell the user. */
const AUTH_MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'Incorrect email or password.',
  UserNotFoundException: 'Incorrect email or password.',
  UsernameExistsException: 'An account with this email already exists. Try signing in.',
  InvalidPasswordException: `Password doesn't meet the requirements. ${PASSWORD_HINT}`,
  CodeMismatchException: "That code isn't right. Check it and try again.",
  ExpiredCodeException: 'That code has expired. Request a new one.',
  CodeDeliveryFailureException: "We couldn't send the email. Please try again later.",
  PasswordResetRequiredException: 'You need to reset your password before signing in.',
  LimitExceededException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyFailedAttemptsException: 'Too many attempts. Please wait a few minutes and try again.',
  NetworkError: NETWORK_MESSAGE,
};

/** A request that never got an answer (no connection, timeout), as opposed to an error response. */
export function isNetworkError(err: unknown): boolean {
  const e = err as {
    response?: unknown;
    code?: string;
    message?: string;
    name?: string;
    isAxiosError?: boolean;
  } | null;
  if (!e) return false;
  return (
    e.name === 'NetworkError' ||
    e.code === 'ERR_NETWORK' ||
    e.code === 'ECONNABORTED' ||
    (typeof e.message === 'string' && e.message.includes('Network Error')) ||
    // An HTTP request with no response. (Other errors without one, e.g. Cognito's, are not network errors.)
    (e.isAxiosError === true && !e.response)
  );
}

/**
 * The API client sets this on a 401 it could not renew the session for because Cognito was
 * unreachable. The session may well still be good, so that 401 is not a refusal.
 */
export function isRenewalUnavailable(err: unknown): boolean {
  return (err as { renewalUnavailable?: boolean } | null)?.renewalUnavailable === true;
}

export interface ApiErrorInfo {
  status?: number;
  /** Machine-readable code from the backend, e.g. "quota_exceeded" */
  code?: string;
  message: string;
  /** When a daily limit starts over (quota_exceeded) */
  resetAt?: Date;
}

/** Reads FastAPI's error body: `detail` is a string, a list of validation errors, or an object with a code. */
export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ApiErrorInfo {
  const response = (err as { response?: { status?: number; data?: { detail?: unknown } } } | null)?.response;
  const status = response?.status;
  const detail = response?.data?.detail;

  if (typeof detail === 'string' && detail) return { status, message: detail };

  if (Array.isArray(detail)) {
    const first = detail.find((d) => typeof d?.msg === 'string');
    return { status, message: first?.msg ?? fallback };
  }

  if (detail && typeof detail === 'object') {
    const d = detail as { code?: string; message?: string; reset_at?: string };
    const resetAt = d.reset_at ? new Date(d.reset_at) : undefined;
    return {
      status,
      code: d.code,
      message: d.message ?? fallback,
      resetAt: resetAt && !Number.isNaN(resetAt.getTime()) ? resetAt : undefined,
    };
  }

  return { status, message: fallback };
}

/** Message for any failure, whether it came from Cognito, the backend or the network. */
export function getErrorMessage(err: unknown, fallback: string): string {
  const name = (err as { name?: string } | null)?.name;
  if (name && AUTH_MESSAGES[name]) return AUTH_MESSAGES[name];

  const api = parseApiError(err, '');
  if (api.message) return api.message;

  if (isNetworkError(err)) return NETWORK_MESSAGE;

  // Amplify's own message is usually readable (e.g. which password rule failed)
  const message = (err as { message?: string } | null)?.message;
  return name && name !== 'Error' && message ? message : fallback;
}

/** "5:30 AM" in the user's time zone, for telling them when their allowance resets. */
export function formatResetTime(resetAt: Date): string {
  return resetAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function quotaMessage(resetAt?: Date): string {
  return resetAt
    ? `You've used today's allowance. It resets at ${formatResetTime(resetAt)}.`
    : "You've used today's allowance. It resets tomorrow.";
}
