import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
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
    <ImageBackground
      source={require('../../assets/bg.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Headlines */}
          <Text style={styles.eyebrow}>WELCOME TO</Text>
          <Text style={styles.title}>Hetu</Text>
          <Text style={styles.tagline}>
            Causal AI for your Inner journey.
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
            Hetu goes beyond typical AI by combining causal reasoning with centuries of human insight to understand what drives you. Experience personalized clarity, emotional balance, and tailored direction on your journey toward growth.
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screen: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.55)',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 70,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.teal[400],
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 52,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.teal[300],
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
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
