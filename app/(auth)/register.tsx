import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/layout';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!fullName.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim());
      router.replace('/(onboarding)/welcome');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Registration failed. Try again.';
      Alert.alert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>H</Text>
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your journey with Hetu</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            error={errors.name}
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
            autoComplete="new-password"
            error={errors.password}
          />

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.teal[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.teal[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoLetter: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.text.secondary },
  form: { gap: Spacing.xs },
  submitBtn: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.text.secondary, fontSize: FontSize.md },
  footerLink: { color: Colors.teal[400], fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
