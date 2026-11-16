/**
 * API configuration
 * EXPO_PUBLIC_ prefix makes it available in the app bundle (client-side safe).
 * Set EXPO_PUBLIC_API_URL in your local .env file (see .env.example).
 * There is intentionally NO hardcoded fallback IP here — if the env var is
 * missing, fail loudly instead of silently hitting a stale developer's machine.
 */
if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    '[config] EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set it to your backend URL.'
  );
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Cognito user pool the app signs users in to (terraform outputs
 * mobile_cognito_user_pool_id and mobile_cognito_client_id). Neither is a secret:
 * the app client is public and has no secret.
 */
export const COGNITO_USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '';
export const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';

if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
  console.warn(
    '[config] EXPO_PUBLIC_COGNITO_USER_POOL_ID / EXPO_PUBLIC_COGNITO_CLIENT_ID are not set, so sign-in will not work. See .env.example.'
  );
}

export const IS_DEV = __DEV__;
