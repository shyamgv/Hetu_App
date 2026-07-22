import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/constants/colors';

/**
 * Root index — reads auth state and redirects accordingly.
 * - Not logged in → /(auth)/login
 * - Logged in, onboarding incomplete → /(onboarding)/welcome
 * - Logged in, onboarding complete → /(tabs)/home
 */
export default function Index() {
  const router = useRouter();
  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
    } else if (!user.onboarding_complete) {
      router.replace('/(onboarding)/welcome');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, user]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg.primary }}>
      <ActivityIndicator size="large" color={Colors.teal[500]} />
    </View>
  );
}
