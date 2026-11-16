import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { AuthScreen, authFooterStyles } from '../../src/components/auth/AuthScreen';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';
import { getErrorMessage } from '../../src/utils/errors';
import {
  PASSWORD_HINT,
  normalizeEmail,
  validateEmail,
  validateNewPassword,
} from '../../src/utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!fullName.trim()) e.name = 'Name is required';
    e.email = validateEmail(email);
    e.password = validateNewPassword(password);
    setErrors(e);
    return !e.name && !e.email && !e.password;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const address = normalizeEmail(email);
      const result = await register(address, password, fullName.trim());

      if (result.status === 'signed_in') {
        router.replace('/(onboarding)/welcome');
      } else if (result.status === 'confirm_sign_up') {
        router.push({ pathname: '/(auth)/verify-email', params: { email: address } });
      } else if (result.status === 'account_exists') {
        Alert.alert('Account exists', 'An account with this email already exists.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign in',
            onPress: () => router.replace({ pathname: '/(auth)/login', params: { email: address } }),
          },
        ]);
      } else {
        router.replace({ pathname: '/(auth)/login', params: { email: address } });
      }
    } catch (err: unknown) {
      Alert.alert('Registration failed', getErrorMessage(err, 'Registration failed. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Create account"
      subtitle="Start your journey with Hetu"
      footer={
        <>
          <Text style={authFooterStyles.text}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={authFooterStyles.link}>Sign in</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Input
        label="Full Name"
        placeholder="Your name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        autoCapitalize="words"
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
        placeholder="Choose a password"
        value={password}
        onChangeText={setPassword}
        isPassword
        autoComplete="new-password"
        error={errors.password}
      />
      {!errors.password && <Text style={styles.hint}>{PASSWORD_HINT}</Text>}

      <Button label="Create Account" onPress={handleRegister} loading={loading} style={styles.submitBtn} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  submitBtn: { marginTop: Spacing.sm },
});
