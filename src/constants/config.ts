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

export const IS_DEV = __DEV__;
