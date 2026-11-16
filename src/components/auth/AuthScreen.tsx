import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Spacing } from '../../constants/layout';

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Links under the form ("Create one", "Back to sign in", ...) */
  footer?: React.ReactNode;
}

/** Shared frame of the sign-in, sign-up, verification and password-reset screens. */
export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <ImageBackground
      source={require('../../../assets/bg.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.overlay} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <View style={styles.form}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,10,14,0.75)' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { width: 130, height: 65, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: { fontSize: FontSize.md, color: Colors.text.secondary, textAlign: 'center' },
  form: { gap: Spacing.xs },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
});

/** Text styles for the links in an AuthScreen footer. */
export const authFooterStyles = StyleSheet.create({
  text: { color: Colors.text.secondary, fontSize: FontSize.md },
  link: { color: Colors.teal[400], fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
