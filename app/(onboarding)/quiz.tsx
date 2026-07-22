import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OnboardingService } from '../../src/services/onboarding.service';
import { useProfileStore } from '../../src/store/profile.store';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/layout';
import type { QuizQuestion } from '../../src/types/api.types';

export default function QuizScreen() {
  const router = useRouter();
  const { setPersonality } = useProfileStore();
  const { refreshUser } = useAuthStore();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    OnboardingService.getQuizQuestions()
      .then(setQuestions)
      .catch(() => Alert.alert('Error', 'Could not load quiz.'))
      .finally(() => setLoading(false));
  }, []);

  const current = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const progress = questions.length ? (currentIdx + 1) / questions.length : 0;

  function saveAnswer(answer: Record<string, unknown>) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: answer }));
  }

  function handleNext() {
    if (!answers[current?.id]) {
      Alert.alert('Please answer', 'Select an answer to continue.');
      return;
    }
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await OnboardingService.submitQuiz({ answers });
      setPersonality(result);
      await refreshUser();
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.teal[500]} />
        <Text style={styles.loadingText}>Preparing your quiz…</Text>
      </View>
    );
  }

  if (!current) return null;

  // Backend uses field name "question", not "question_text"
  const questionText = current.question ?? current.question_text ?? '';

  return (
    <SafeAreaView style={styles.screen}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>
              Step 2 of 2 · Question {currentIdx + 1}/{questions.length}
            </Text>
          </View>
          <Text style={styles.category}>{current.personality_category?.toUpperCase()}</Text>
          <Text style={styles.question}>{questionText}</Text>
        </View>

        {/* Answer component by type */}
        <QuestionAnswerBlock
          question={current}
          current={answers[current.id]}
          onAnswer={saveAnswer}
        />

        {/* Navigation */}
        <View style={styles.nav}>
          {currentIdx > 0 && (
            <Button
              label="← Back"
              onPress={() => setCurrentIdx((i) => i - 1)}
              variant="ghost"
              fullWidth={false}
              style={{ paddingHorizontal: Spacing.lg }}
            />
          )}
          <View style={{ flex: 1 }} />
          <Button
            label={isLast ? 'Submit Answers' : 'Next →'}
            onPress={handleNext}
            loading={submitting}
            fullWidth={false}
            style={{ paddingHorizontal: Spacing.xl }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Question renderers — one per question_type
// ---------------------------------------------------------------------------

function QuestionAnswerBlock({
  question,
  current,
  onAnswer,
}: {
  question: QuizQuestion;
  current: Record<string, unknown> | undefined;
  onAnswer: (a: Record<string, unknown>) => void;
}) {
  const { question_type, options } = question;
  const opts = options as Record<string, unknown>;

  switch (question_type) {

    // ------------------------------------------------------------------ //
    // word_selection: options = { A: [words], B: [words], C: [words] }    //
    // Flatten all words and display as chip grid.                         //
    // ------------------------------------------------------------------ //
    case 'word_selection': {
      // Flatten all guna-buckets into one shuffled flat list
      const allWords: string[] = [];
      for (const key of ['A', 'B', 'C']) {
        const bucket = opts[key];
        if (Array.isArray(bucket)) allWords.push(...(bucket as string[]));
      }
      // Stable deterministic shuffle per question (not truly random — avoids re-renders)
      const displayWords = [...allWords].sort();
      const selected = (current?.selected_words ?? []) as string[];
      return (
        <View style={styles.chipGrid}>
          {displayWords.map((w) => {
            const isSelected = selected.includes(w);
            return (
              <TouchableOpacity
                key={w}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => {
                  const next = isSelected
                    ? selected.filter((s) => s !== w)
                    : [...selected, w];
                  onAnswer({ selected_words: next });
                }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSel]}>{w}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.selectHint}>
            {selected.length}/3 selected
          </Text>
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // preference_rank: options = { items: [{text, guna_weight}] }         //
    // Show as tappable ordered list — tap to set rank order.             //
    // ------------------------------------------------------------------ //
    case 'preference_rank': {
      const items = (opts.items ?? []) as Array<{ text: string }>;
      const ranked = (current?.ranked_items ?? []) as string[];

      return (
        <View style={styles.optionList}>
          <Text style={styles.hintText}>Tap items to rank them (top = most important)</Text>
          {items.map((item) => {
            const rankPos = ranked.indexOf(item.text);
            const isRanked = rankPos >= 0;
            return (
              <TouchableOpacity
                key={item.text}
                style={[styles.optionCard, isRanked && styles.optionCardSel]}
                onPress={() => {
                  let next: string[];
                  if (isRanked) {
                    // deselect
                    next = ranked.filter((r) => r !== item.text);
                  } else {
                    next = [...ranked, item.text];
                  }
                  onAnswer({ ranked_items: next });
                }}
              >
                <View style={[styles.rankBadge, isRanked && styles.rankBadgeSel]}>
                  <Text style={[styles.rankBadgeText, isRanked && styles.rankBadgeTextSel]}>
                    {isRanked ? rankPos + 1 : '—'}
                  </Text>
                </View>
                <Text style={[styles.optionLabel, isRanked && styles.optionLabelSel]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // scenario_completion / forced_choice: options = { A: str, B: str }  //
    // Simple choice cards — show option letter + description.            //
    // ------------------------------------------------------------------ //
    case 'scenario_completion':
    case 'forced_choice': {
      return (
        <View style={styles.optionList}>
          {(['A', 'B', 'C'] as const).map((key) => {
            const label = opts[key];
            if (!label) return null;
            const isSelected = (current?.choice as string) === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.optionCard, isSelected && styles.optionCardSel]}
                onPress={() => onAnswer({ choice: key })}
              >
                <View style={[styles.optionKey, isSelected && styles.optionKeySel]}>
                  <Text style={[styles.optionKeyText, isSelected && styles.optionKeyTextSel]}>
                    {key}
                  </Text>
                </View>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSel]}>
                  {typeof label === 'string' ? label : JSON.stringify(label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // image_selection: options = { A: {image, description}, B:..., C:... }//
    // Visual cards with description text (no real images in Expo Go).    //
    // ------------------------------------------------------------------ //
    case 'image_selection': {
      return (
        <View style={styles.optionList}>
          {(['A', 'B', 'C'] as const).map((key) => {
            const opt = opts[key] as { image?: string; description?: string } | undefined;
            if (!opt) return null;
            const isSelected = (current?.choice as string) === key;
            const emoji = key === 'A' ? '🌱' : key === 'B' ? '⚡' : '😴';
            return (
              <TouchableOpacity
                key={key}
                style={[styles.imageCard, isSelected && styles.imageCardSel]}
                onPress={() => onAnswer({ choice: key })}
              >
                <Text style={styles.imageEmoji}>{emoji}</Text>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSel]}>
                  {opt.description ?? ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // slider_scale: options = { scales: [{dimension, left, right}] }     //
    // +/- step buttons (RN Slider removed in SDK 54+).                   //
    // ------------------------------------------------------------------ //
    case 'slider_scale': {
      const scales = (opts.scales ?? []) as Array<{
        dimension: string;
        left?: string;
        right?: string;
        min_label?: string;  // fallback alias
        max_label?: string;
      }>;
      const values = (current?.values ?? scales.map(() => 50)) as number[];
      return (
        <View style={styles.sliders}>
          {scales.map((sc, i) => (
            <View key={sc.dimension} style={styles.sliderRow}>
              <Text style={styles.sliderDim}>{sc.dimension}</Text>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>{sc.left ?? sc.min_label ?? ''}</Text>
                <Text style={styles.sliderLabel}>{sc.right ?? sc.max_label ?? ''}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${values[i] ?? 50}%` }]} />
              </View>
              <View style={styles.sliderBtns}>
                <TouchableOpacity
                  style={styles.sliderBtnTouch}
                  onPress={() => {
                    const nv = [...values];
                    nv[i] = Math.max(0, (nv[i] ?? 50) - 10);
                    onAnswer({ values: nv });
                  }}
                >
                  <Text style={styles.sliderBtn}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{values[i] ?? 50}%</Text>
                <TouchableOpacity
                  style={styles.sliderBtnTouch}
                  onPress={() => {
                    const nv = [...values];
                    nv[i] = Math.min(100, (nv[i] ?? 50) + 10);
                    onAnswer({ values: nv });
                  }}
                >
                  <Text style={styles.sliderBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // time_pattern: options = { activities: [{activity, guna_time}] }    //
    // Show each activity with time-slot chip selector.                   //
    // ------------------------------------------------------------------ //
    case 'time_pattern': {
      const activities = (opts.activities ?? []) as Array<{
        activity: string;
        guna_time: Record<string, string>;
      }>;
      const selections = (current?.selections ?? {}) as Record<string, string>;

      return (
        <View style={styles.sliders}>
          {activities.map((act) => {
            const timeSlots = Object.values(act.guna_time);
            const chosen = selections[act.activity];
            return (
              <View key={act.activity} style={styles.timeBlock}>
                <Text style={styles.sliderDim}>{act.activity}</Text>
                <View style={styles.timeChips}>
                  {timeSlots.map((slot) => {
                    const isSel = chosen === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeChip, isSel && styles.timeChipSel]}
                        onPress={() => {
                          const next = { ...selections, [act.activity]: slot };
                          onAnswer({ selections: next });
                        }}
                      >
                        <Text style={[styles.timeChipText, isSel && styles.timeChipTextSel]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    // ------------------------------------------------------------------ //
    // percentage_allocation: options = { factors: [{factor, guna}] }     //
    // +/- buttons per factor, enforces sum ≤ 100.                       //
    // ------------------------------------------------------------------ //
    case 'percentage_allocation': {
      const factors = (opts.factors ?? []) as Array<{ factor: string; guna: string }>;
      const allocations = (current?.allocations ?? factors.map(() => 0)) as number[];
      const total = allocations.reduce((s, v) => s + (v ?? 0), 0);

      return (
        <View style={styles.sliders}>
          <Text style={styles.hintText}>Allocate 100% total across all three</Text>
          <View style={[styles.totalBadge, { borderColor: total === 100 ? Colors.teal[500] : Colors.bg.border }]}>
            <Text style={[styles.totalText, { color: total === 100 ? Colors.teal[400] : Colors.text.secondary }]}>
              {total}% used
            </Text>
          </View>
          {factors.map((factor, i) => (
            <View key={factor.factor} style={styles.sliderRow}>
              <Text style={styles.sliderDim}>{factor.factor}</Text>
              <View style={styles.sliderBtns}>
                <TouchableOpacity
                  style={styles.sliderBtnTouch}
                  onPress={() => {
                    const nv = [...allocations];
                    nv[i] = Math.max(0, (nv[i] ?? 0) - 5);
                    onAnswer({ allocations: nv });
                  }}
                >
                  <Text style={styles.sliderBtn}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{allocations[i] ?? 0}%</Text>
                <TouchableOpacity
                  style={styles.sliderBtnTouch}
                  onPress={() => {
                    const nv = [...allocations];
                    const remaining = 100 - total + (nv[i] ?? 0);
                    nv[i] = Math.min(remaining, (nv[i] ?? 0) + 5);
                    onAnswer({ allocations: nv });
                  }}
                >
                  <Text style={styles.sliderBtn}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${allocations[i] ?? 0}%` }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    // Fallback for any unknown future question types
    default:
      return (
        <View style={styles.optionList}>
          <Text style={styles.hintText}>
            Unknown question type: {question_type}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg.primary },
  loadingText: { marginTop: Spacing.md, color: Colors.text.secondary },

  progressTrack: { height: 3, backgroundColor: Colors.bg.border },
  progressFill: { height: 3, backgroundColor: Colors.teal[500] },

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
  category: { fontSize: FontSize.xs, color: Colors.teal[400], fontWeight: FontWeight.bold, letterSpacing: 2, marginBottom: Spacing.sm },
  question: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary, lineHeight: 30 },

  hintText: { fontSize: FontSize.sm, color: Colors.text.tertiary, marginBottom: Spacing.sm, fontStyle: 'italic' },

  // ---- Word selection ----
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 99, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.bg.border },
  chipSelected: { backgroundColor: Colors.teal[600] + '30', borderColor: Colors.teal[500] },
  chipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  chipTextSel: { color: Colors.teal[300], fontWeight: FontWeight.semibold },
  selectHint: { width: '100%', textAlign: 'center', color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: Spacing.xs },

  // ---- Option cards (scenario / forced_choice) ----
  optionList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.bg.border,
  },
  optionCardSel: { backgroundColor: Colors.teal[600] + '20', borderColor: Colors.teal[500] },
  optionKey: {
    width: 32, height: 32, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.bg.border, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionKeySel: { backgroundColor: Colors.teal[600] },
  optionKeyText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text.secondary },
  optionKeyTextSel: { color: Colors.white },
  optionLabel: { flex: 1, fontSize: FontSize.md, color: Colors.text.primary, lineHeight: 22 },
  optionLabelSel: { color: Colors.teal[200] },

  // ---- Preference rank ----
  rankBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bg.border, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadgeSel: { backgroundColor: Colors.teal[600] },
  rankBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text.secondary },
  rankBadgeTextSel: { color: Colors.white },

  // ---- Image selection ----
  imageCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.bg.border,
  },
  imageCardSel: { backgroundColor: Colors.teal[600] + '20', borderColor: Colors.teal[500] },
  imageEmoji: { fontSize: 32 },

  // ---- Sliders + allocation ----
  sliders: { gap: Spacing.lg, marginBottom: Spacing.lg },
  sliderRow: { gap: Spacing.sm },
  sliderDim: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  sliderTrack: { height: 6, backgroundColor: Colors.bg.border, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: 6, backgroundColor: Colors.teal[500] },
  sliderBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  sliderBtnTouch: { padding: Spacing.sm },
  sliderBtn: { fontSize: FontSize.xxl, color: Colors.teal[400], fontWeight: FontWeight.bold },
  sliderValue: { fontSize: FontSize.md, color: Colors.text.primary, fontWeight: FontWeight.semibold, minWidth: 48, textAlign: 'center' },

  // ---- Time pattern ----
  timeBlock: { gap: Spacing.sm },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 99, backgroundColor: Colors.bg.tertiary, borderWidth: 1, borderColor: Colors.bg.border },
  timeChipSel: { backgroundColor: Colors.teal[600] + '30', borderColor: Colors.teal[500] },
  timeChipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  timeChipTextSel: { color: Colors.teal[300], fontWeight: FontWeight.semibold },

  // ---- Percentage allocation ----
  totalBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: 99, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  totalText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  nav: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
});
