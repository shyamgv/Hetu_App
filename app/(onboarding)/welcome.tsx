import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/layout';

const FEATURE_PILLS = [
  { label: '🧠 Deeply Personal', desc: 'Learns who you are' },
  { label: '💬 Always Here', desc: 'Talk anytime, anywhere' },
  { label: '🌱 Grow With You', desc: 'Adapts as you evolve' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>H</Text>
          </View>
        </View>

        {/* Headlines */}
        <Text style={styles.eyebrow}>WELCOME TO</Text>
        <Text style={styles.title}>Hetu</Text>
        <Text style={styles.tagline}>
          Your AI companion that understands{'\n'}who you truly are
        </Text>

        {/* Feature pills */}
        <View style={styles.pills}>
          {FEATURE_PILLS.map((f) => (
            <View key={f.label} style={styles.pill}>
              <Text style={styles.pillLabel}>{f.label}</Text>
              <Text style={styles.pillDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.desc}>
          Hetu combines modern AI with a deep understanding of your unique personality to provide support that feels genuinely personal — not generic.
        </Text>

        {/* CTA */}
        <View style={styles.ctas}>
          <Button
            label="Let's Get Started"
            onPress={() => router.push('/(onboarding)/profile')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.xl + 4,
    backgroundColor: Colors.teal[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.teal[500],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.teal[400],
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 56,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
  pills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },
  pillDesc: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    width: '100%',
  },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  ctas: {
    width: '100%',
  },
});
