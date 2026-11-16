import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthService } from '../../src/services/auth.service';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { AuthScreen, authFooterStyles } from '../../src/components/auth/AuthScreen';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';
import { getErrorMessage } from '../../src/utils/errors';
import {
  CODE_LENGTH,
  PASSWORD_HINT,
  normalizeEmail,
  validateCode,
  validateEmail,
  validateNewPassword,
} from '../../src/utils/validation';

const RESEND_COOLDOWN_SECONDS = 30;

/** Forgot password: ask for the email, then take the emailed code and a new password. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; code?: string; password?: string; confirm?: string }>({});

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(): Promise<boolean> {
    const problem = validateEmail(email);
    setErrors({ email: problem });
    if (problem) return false;

    setLoading(true);
    try {
      await AuthService.resetPassword(normalizeEmail(email));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (err: unknown) {
      Alert.alert('Could not send code', getErrorMessage(err, 'Could not send a reset code. Try again.'));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest() {
    if (await sendCode()) setStep('confirm');
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;
    if (await sendCode()) Alert.alert('Code sent', 'If an account exists for this email, we sent a new code.');
  }

  async function handleConfirm() {
    const e: typeof errors = {
      code: validateCode(code),
      password: validateNewPassword(password),
      confirm: password !== confirmPassword ? 'Passwords do not match' : undefined,
    };
    setErrors(e);
    if (e.code || e.password || e.confirm) return;

    setLoading(true);
    try {
      const address = normalizeEmail(email);
      await AuthService.confirmResetPassword(address, code.trim(), password);
      Alert.alert('Password updated', 'Sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/(auth)/login', params: { email: address } }) },
      ]);
    } catch (err: unknown) {
      Alert.alert('Could not reset password', getErrorMessage(err, 'Could not reset your password. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  const backToSignIn = (
    <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
      <Text style={authFooterStyles.link}>Back to sign in</Text>
    </TouchableOpacity>
  );

  if (step === 'request') {
    return (
      <AuthScreen
        title="Reset password"
        subtitle="Enter your email and we'll send you a code"
        footer={backToSignIn}
      >
        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <Button label="Send code" onPress={handleRequest} loading={loading} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle={`If an account exists for ${normalizeEmail(email)}, we sent a code to it.`}
      footer={
        <>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || loading}>
            <Text style={authFooterStyles.link}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
          <Text style={authFooterStyles.text}>  ·  </Text>
          {backToSignIn}
        </>
      }
    >
      <Input
        label="Verification code"
        placeholder="123456"
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        error={errors.code}
      />
      <Input
        label="New password"
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        isPassword
        autoComplete="new-password"
        error={errors.password}
      />
      {!errors.password && <Text style={styles.hint}>{PASSWORD_HINT}</Text>}
      <Input
        label="Confirm new password"
        placeholder="Repeat the password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword
        autoComplete="new-password"
        error={errors.confirm}
      />
      <Button label="Update password" onPress={handleConfirm} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
});
