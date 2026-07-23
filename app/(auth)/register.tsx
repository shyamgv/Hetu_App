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
  Image,
  ImageBackground,
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
    <ImageBackground
      source={require('../../assets/bg.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
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
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  screen: { flex: 1, backgroundColor: 'rgba(10, 15, 29, 0.55)' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { width: 130, height: 65, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.white, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.text.secondary },
  form: { gap: Spacing.xs },
  submitBtn: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.text.secondary, fontSize: FontSize.md },
  footerLink: { color: Colors.teal[400], fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
