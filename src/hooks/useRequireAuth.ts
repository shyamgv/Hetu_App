import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

/**
 * For layouts of the signed-in part of the app: when the user goes away (the session
 * expired and couldn't be renewed, or they signed out), send them to the sign-in screen.
 */
export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, user]);
}
