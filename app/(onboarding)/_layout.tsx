import { Stack } from 'expo-router';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';

export default function OnboardingLayout() {
  useRequireAuth();

  return <Stack screenOptions={{ headerShown: false }} />;
}
