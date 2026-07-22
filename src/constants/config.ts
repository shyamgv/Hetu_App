/**
 * API configuration
 * EXPO_PUBLIC_ prefix makes it available in the app bundle (client-side safe).
 * Set this in .env file.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.29.118:8000';

export const IS_DEV = __DEV__;
