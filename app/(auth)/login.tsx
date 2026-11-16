import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { AuthScreen, authFooterStyles } from '../../src/components/auth/AuthScreen';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';
import { getErrorMessage } from '../../src/utils/errors';
import { normalizeEmail, validateEmail } from '../../src/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    e.email = validateEmail(email);
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return !e.email && !e.password;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const address = normalizeEmail(email);
      const result = await login(address, password);

      if (result.status === 'signed_in') {
        router.replace(result.user.onboarding_complete ? '/(tabs)/home' : '/(onboarding)/welcome');
      } else if (result.status === 'confirm_sign_up') {
        // Registered but never verified: a new code was just sent
        router.push({ pathname: '/(auth)/verify-email', params: { email: address, unverified: '1' } });
      } else {
        router.push({ pathname: '/(auth)/forgot-password', params: { email: address } });
      }
    } catch (err: unknown) {
      Alert.alert('Login failed', getErrorMessage(err, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to Hetu"
      footer={
        <>
          <Text style={authFooterStyles.text}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={authFooterStyles.link}>Create one</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        error={errors.email}
        autoComplete="email"
      />
      <Input
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        isPassword
        error={errors.password}
        autoComplete="password"
      />

      <View style={styles.forgotRow}>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/(auth)/forgot-password', params: { email: normalizeEmail(email) } })
          }
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <Button label="Sign In" onPress={handleLogin} loading={loading} style={styles.loginBtn} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignItems: 'flex-end', marginTop: -Spacing.xs, marginBottom: Spacing.xs },
  forgotText: { color: Colors.teal[400], fontSize: FontSize.sm },
  loginBtn: { marginTop: Spacing.sm },
});
