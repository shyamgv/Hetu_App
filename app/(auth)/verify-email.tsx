import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { AuthScreen, authFooterStyles } from '../../src/components/auth/AuthScreen';
import { getErrorMessage } from '../../src/utils/errors';
import { CODE_LENGTH, validateCode } from '../../src/utils/validation';

const RESEND_COOLDOWN_SECONDS = 30;

/** Step after sign-up: the user enters the code Cognito emailed them. */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email = '', unverified } = useLocalSearchParams<{ email?: string; unverified?: string }>();
  const confirmEmail = useAuthStore((s) => s.confirmEmail);
  const resendCode = useAuthStore((s) => s.resendCode);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS); // a code was just sent

  useEffect(() => {
    if (!email) router.replace('/(auth)/login');
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleConfirm() {
    const problem = validateCode(code);
    setError(problem);
    if (problem) return;

    setLoading(true);
    try {
      const result = await confirmEmail(email, code.trim());
      if (result.status === 'signed_in') {
        router.replace(result.user.onboarding_complete ? '/(tabs)/home' : '/(onboarding)/welcome');
      } else {
        Alert.alert('Email verified', 'Your email is verified. Sign in to continue.', [
          { text: 'OK', onPress: () => router.replace({ pathname: '/(auth)/login', params: { email } }) },
        ]);
      }
    } catch (err: unknown) {
      Alert.alert('Verification failed', getErrorMessage(err, 'Could not verify your email. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendCode(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert('Code sent', `We sent a new code to ${email}.`);
    } catch (err: unknown) {
      Alert.alert('Could not send code', getErrorMessage(err, 'Could not send a new code. Try again.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen
      title="Check your email"
      subtitle={
        unverified
          ? `Your email isn't verified yet. We sent a new code to ${email}.`
          : `We sent a ${CODE_LENGTH}-digit code to ${email}.`
      }
      footer={
        <>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending}>
            <Text style={authFooterStyles.link}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
          <Text style={authFooterStyles.text}>  ·  </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={authFooterStyles.link}>Back to sign in</Text>
          </TouchableOpacity>
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
        error={error}
      />
      <Button label="Verify" onPress={handleConfirm} loading={loading} />
    </AuthScreen>
  );
}
