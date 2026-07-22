import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OnboardingService } from '../../src/services/onboarding.service';
import { useProfileStore } from '../../src/store/profile.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight, Spacing } from '../../src/constants/layout';
import type { ProfileIn } from '../../src/types/api.types';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const EDU_OPTIONS    = ['High School', "Bachelor's", "Master's", 'PhD', 'Other'];

export default function ProfileScreen() {
  const router = useRouter();
  const { setProfile } = useProfileStore();

  const [form, setForm] = useState<ProfileIn>({
    age: undefined,
    gender: undefined,
    location: '',
    occupation: '',
    education: undefined,
    bio: '',
    hobbies: [],
  });
  const [hobbiesText, setHobbiesText] = useState('');
  const [loading, setLoading] = useState(false);

  function set<K extends keyof ProfileIn>(key: K, value: ProfileIn[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleNext() {
    setLoading(true);
    try {
      const payload: ProfileIn = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        hobbies: hobbiesText
          ? hobbiesText.split(',').map((h) => h.trim()).filter(Boolean)
          : [],
      };
      const saved = await OnboardingService.upsertProfile(payload);
      setProfile(saved);
      router.push('/(onboarding)/quiz');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}><Text style={styles.stepText}>Step 1 of 2</Text></View>
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>This helps Hetu personalise your experience</Text>
        </View>

        {/* Basic Info */}
        <Input
          label="Age"
          placeholder="Your age"
          value={form.age?.toString() ?? ''}
          onChangeText={(v) => set('age', v ? (Number(v) as unknown as undefined) : undefined)}
          keyboardType="numeric"
        />
        <Input
          label="Location"
          placeholder="City, Country"
          value={form.location ?? ''}
          onChangeText={(v) => set('location', v)}
        />
        <Input
          label="Occupation"
          placeholder="What do you do?"
          value={form.occupation ?? ''}
          onChangeText={(v) => set('occupation', v)}
        />

        {/* Gender selector */}
        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((g) => (
            <ChipButton
              key={g}
              label={g}
              selected={form.gender === g}
              onPress={() => set('gender', g)}
            />
          ))}
        </View>

        {/* Education selector */}
        <Text style={styles.sectionLabel}>Education</Text>
        <View style={styles.chipRow}>
          {EDU_OPTIONS.map((e) => (
            <ChipButton
              key={e}
              label={e}
              selected={form.education === e}
              onPress={() => set('education', e)}
            />
          ))}
        </View>

        <Input
          label="Hobbies"
          placeholder="Reading, hiking, cooking (comma-separated)"
          value={hobbiesText}
          onChangeText={setHobbiesText}
        />

        <Input
          label="About you (optional)"
          placeholder="Anything else you'd like Hetu to know about you?"
          value={form.bio ?? ''}
          onChangeText={(v) => set('bio', v)}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
        />

        <Button
          label="Continue to Quiz →"
          onPress={handleNext}
          loading={loading}
          style={styles.nextBtn}
        />
        <Button
          label="Skip for now"
          onPress={() => router.push('/(onboarding)/quiz')}
          variant="ghost"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChipButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { marginBottom: Spacing.xl },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.teal[600] + '30',
    borderRadius: 99,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  stepText: { color: Colors.teal[400], fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.text.secondary },
  sectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 99,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  chipSelected: {
    backgroundColor: Colors.teal[600] + '30',
    borderColor: Colors.teal[500],
  },
  chipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  chipTextSelected: { color: Colors.teal[300], fontWeight: FontWeight.semibold },
  nextBtn: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
});
