import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, radius, onAccent } from '../theme';
import { Goal } from '../types';

const DAYS = ['M','T','W','T','F','S','S'];

function todayIndex() {
  const w = new Date().getDay(); // 0=Sun
  return (w + 6) % 7;           // Mon=0
}

type DotState = 'done' | 'today' | 'missed' | 'future';

function dotState(i: number, verifiedCount: number): DotState {
  const today = todayIndex();
  if (i > today) return 'future';
  if (i === today) return 'today';
  return i < Math.min(verifiedCount, today) ? 'done' : 'missed';
}

function Dot({ label, state }: { label: string; state: DotState }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state !== 'today') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bg = state === 'done' || state === 'today' ? colors.blue
    : state === 'missed' ? colors.elevated : colors.elevated;
  const fg = state === 'future' || state === 'missed' ? colors.tertiary : onAccent;

  return (
    <Animated.View style={[
      styles.dot,
      { backgroundColor: bg, transform: [{ scale }] },
      state === 'today' && styles.dotToday,
    ]}>
      <Text style={[styles.dotLabel, { color: fg }]}>{label}</Text>
    </Animated.View>
  );
}

type Props = { goal: Goal; verifiedCount: number };

export default function StreakWidget({ goal, verifiedCount }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.label}>YOUR STREAK</Text>
        <Text style={styles.title} numberOfLines={1}>{goal.title}</Text>
      </View>
      <View style={styles.dots}>
        {DAYS.map((d, i) => <Dot key={i} label={d} state={dotState(i, verifiedCount)} />)}
      </View>
      <View style={styles.count}>
        <Text style={styles.countNum}>{verifiedCount}</Text>
        <Text style={styles.countLabel}>done</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 13, marginVertical: 4,
    borderWidth: 0.5, borderColor: colors.border,
  },
  info: { flex: 1, gap: 3 },
  label: { fontSize: 10, fontWeight: '700', color: colors.tertiary, letterSpacing: 0.5 },
  title: { fontSize: 13, fontWeight: '600', color: colors.primary },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dotToday: { shadowColor: colors.blue, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  dotLabel: { fontSize: 9, fontWeight: '800' },
  count: { alignItems: 'center', minWidth: 32 },
  countNum:   { fontSize: 20, fontWeight: '900', color: colors.blue },
  countLabel: { fontSize: 10, color: colors.tertiary },
});
