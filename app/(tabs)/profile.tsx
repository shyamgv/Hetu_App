import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { useProfileStore } from '../../src/store/profile.store';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/layout';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.[0]?.toUpperCase() ?? 'H'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Profile details */}
        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.card}>
              {profile.occupation && <InfoRow icon="briefcase-outline" label="Occupation" value={profile.occupation} />}
              {profile.location && <InfoRow icon="location-outline" label="Location" value={profile.location} />}
              {profile.education && <InfoRow icon="school-outline" label="Education" value={profile.education} />}
              {profile.age && <InfoRow icon="calendar-outline" label="Age" value={String(profile.age)} />}
              {profile.hobbies && profile.hobbies.length > 0 && (
                <InfoRow icon="heart-outline" label="Hobbies" value={profile.hobbies.join(', ')} />
              )}
              {profile.bio && <InfoRow icon="document-text-outline" label="About" value={profile.bio} />}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.sentiment.negative} />
            <Text style={styles.dangerBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as never} size={16} color={Colors.teal[400]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  header: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.teal[600], alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.teal[500], shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white },
  name: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  email: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 4 },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.md },

  card: {
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.bg.border,
    backgroundColor: Colors.bg.secondary,
  },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.bg.border,
  },
  infoLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  infoValue: { fontSize: FontSize.md, color: Colors.text.primary },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.sentiment.negative + '40',
  },
  dangerBtnText: { color: Colors.sentiment.negative, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
