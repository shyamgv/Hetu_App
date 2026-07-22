import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, getGunaColor } from '../../constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/layout';

interface GunaBarProps {
  sattva: number; // 0–100 stored as int (raw * 100 in DB)
  rajas: number;
  tamas: number;
  showLabels?: boolean;
  compact?: boolean;
}

function normalizeGuna(val: number): number {
  // Backend stores as int (0–10000), display as 0–100%
  // If val > 100, assume it's stored * 100
  return val > 100 ? val / 100 : val;
}

export function GunaBar({ sattva, rajas, tamas, showLabels = true, compact = false }: GunaBarProps) {
  const s = normalizeGuna(sattva);
  const r = normalizeGuna(rajas);
  const t = normalizeGuna(tamas);
  const total = s + r + t || 1; // avoid divide by zero

  const sW = (s / total) * 100;
  const rW = (r / total) * 100;
  const tW = (t / total) * 100;

  const barH = compact ? 6 : 10;

  return (
    <View style={styles.container}>
      {/* Stacked bar */}
      <View style={[styles.track, { height: barH }]}>
        <View style={[styles.segment, { width: `${sW}%`, backgroundColor: Colors.sattva.main }]} />
        <View style={[styles.segment, { width: `${rW}%`, backgroundColor: Colors.rajas.main }]} />
        <View style={[styles.segment, { width: `${tW}%`, backgroundColor: Colors.tamas.main }]} />
      </View>

      {showLabels && (
        <View style={styles.labels}>
          <GunaLabel name="Sattva" value={s} color={Colors.sattva.main} />
          <GunaLabel name="Rajas"  value={r} color={Colors.rajas.main} />
          <GunaLabel name="Tamas"  value={t} color={Colors.tamas.main} />
        </View>
      )}
    </View>
  );
}

function GunaLabel({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <View style={styles.labelRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.labelName}>{name}</Text>
      <Text style={[styles.labelValue, { color }]}>{Math.round(value)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.bg.border,
  },
  segment: {
    height: '100%',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelName: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  labelValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
