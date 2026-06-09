import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

type Props = { text: string; color: string };

export default function Pill({ text, color }: Props) {
  return (
    <Text style={[styles.pill, { color, backgroundColor: color + '22' }]}>
      {text.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    fontSize: 10, fontWeight: '800', letterSpacing: 0.4,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: radius.chip, overflow: 'hidden',
  },
});
