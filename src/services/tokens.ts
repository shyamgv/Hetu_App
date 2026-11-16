import { fetchAuthSession } from 'aws-amplify/auth';

/** The token the app used to keep from the backend's own sign-in; removed on upgrade. */
export const LEGACY_TOKEN_KEY = 'hetu_auth_token';

/**
 * The signed-in user's Cognito access token, or null if there is no session.
 * Amplify returns the stored token, or refreshes it first when it has expired
 * (or always, with forceRefresh). Throws if a needed refresh can't reach Cognito.
 */
export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const { tokens } = await fetchAuthSession({ forceRefresh });
  return tokens?.accessToken?.toString() ?? null;
}
