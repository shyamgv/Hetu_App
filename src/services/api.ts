import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

export const TOKEN_KEY = 'hetu_auth_token';

/**
 * Central Axios instance for all Hetu API calls.
 * - Base URL set from config (local IP for dev, production URL for release)
 * - Request interceptor: attaches JWT Bearer token from SecureStore
 * - Response interceptor: auto-clears token on 401
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token on every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable (e.g. web) — skip
  }
  return config;
});

// Handle 401 globally — clear token so app redirects to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
    return Promise.reject(error);
  }
);

export default api;
