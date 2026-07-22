import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { BorderRadius, FontSize, Spacing } from '../../constants/layout';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({ label, error, isPassword = false, style, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.text.tertiary}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  inputError: {
    borderColor: Colors.sentiment.negative,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.md,
    color: Colors.text.primary,
    fontSize: FontSize.md,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.sentiment.negative,
  },
});
