import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight, Spacing } from '../../src/constants/layout';
import { useChatStore } from '../../src/store/chat.store';
import { useAuthStore } from '../../src/store/auth.store';
import { SQLiteService } from '../../src/db/sqlite';
import { OnboardingService } from '../../src/services/onboarding.service';

export default function ChooseHowToStart() {
  const router = useRouter();
  const setDefaultUseHetuEngine = useChatStore((s) => s.setDefaultUseHetuEngine);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>How would you like Hetu to get to know you?</Text>
        <Text style={styles.subtitle}>
          I can learn about you quickly, or gradually while we chat. Your data stays on your device — we do not use it to train external models.
        </Text>

        <View style={styles.buttons}>
          <Button
            label="Jump start with quick questions"
            onPress={() => {
                setDefaultUseHetuEngine(true);
                router.push('/(onboarding)/quiz');
            }}
            style={{ marginBottom: Spacing.md }}
          />

          <Button
            label="Skip quiz — start chatting"
            variant="ghost"
            // when starting the chat without answering questions add a flag to not use hetu engine for the 1st conversation
            
            onPress={() => {
              setDefaultUseHetuEngine(false);
              // Mark user as having completed onboarding locally so the app doesn't show welcome again
              const currentUser = useAuthStore.getState().user;
              if (currentUser) {
                const updated = { ...currentUser, onboarding_complete: true };
                useAuthStore.setState({ user: updated });
                try {
                  SQLiteService.saveUser(updated);
                } catch (e) {
                  console.warn('[Onboarding] Failed to save onboarded flag locally', e);
                }
                // Also mark onboarding complete on the server (no empty quiz submission)
                OnboardingService.completeOnboarding().catch(() => {});
              }
              router.replace('/(tabs)/home');
            }}
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Privacy note</Text>
          <Text style={styles.disclaimerText}>
            All answers remain on your device. We never send your raw quiz answers to third parties or use them to train public models.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  container: { padding: Spacing.lg, flex: 1, justifyContent: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.text.secondary, marginBottom: Spacing.lg },
  buttons: { marginTop: Spacing.md },
  disclaimer: { marginTop: Spacing.lg, backgroundColor: Colors.bg.tertiary, padding: Spacing.md, borderRadius: 8 },
  disclaimerTitle: { color: Colors.text.primary, fontWeight: FontWeight.bold, marginBottom: 6 },
  disclaimerText: { color: Colors.text.secondary, fontSize: FontSize.sm },
});
