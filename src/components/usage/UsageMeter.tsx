import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUsageStore } from '../../store/usage.store';
import { formatResetTime } from '../../utils/errors';
import { Colors } from '../../constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/layout';

/** Today's allowance: plan, how much is used, and when it starts over. Hidden until it has loaded. */
export function UsageMeter() {
  const usage = useUsageStore((s) => s.usage);
  if (!usage) return null;

  const fraction = usage.daily_limit > 0 ? Math.min(usage.used / usage.daily_limit, 1) : 0;
  const percent = Math.round(fraction * 100);
  const exhausted = usage.remaining <= 0;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.plan}>{usage.plan_name} plan</Text>
        <Text style={[styles.percent, exhausted && styles.exhausted]}>{percent}% used</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percent}%` },
            exhausted && { backgroundColor: Colors.sentiment.negative },
          ]}
        />
      </View>
      <Text style={styles.reset}>
        {exhausted ? 'Limit reached. ' : ''}Resets daily at {formatResetTime(new Date(usage.reset_at))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    backgroundColor: Colors.bg.secondary,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  plan: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  percent: { fontSize: FontSize.sm, color: Colors.text.secondary },
  exhausted: { color: Colors.sentiment.negative },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.bg.tertiary,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: Colors.teal[500] },
  reset: { marginTop: Spacing.sm, fontSize: FontSize.xs, color: Colors.text.tertiary },
});
