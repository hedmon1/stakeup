import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 20;
const CIRCUMFERENCE = 2 * Math.PI * R;

const rankColor = (rank: number) =>
  rank === 1 ? colors.blue : rank === 2 ? colors.green : rank === 3 ? colors.orange : colors.tertiary;

type Props = {
  rank: number;
  points: number;
  maxPoints: number;
  delayMs?: number;
};

export default function MemberRing({ rank, points, maxPoints, delayMs = 0 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const progress = maxPoints > 0 ? points / maxPoints : 0;
  const color = rankColor(rank);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 900,
      delay: delayMs,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.wrap}>
      <Svg width={48} height={48} style={styles.svg}>
        {/* Track */}
        <Circle cx={24} cy={24} r={R} stroke={colors.elevated} strokeWidth={4} fill="none" />
        {/* Fill */}
        <AnimatedCircle
          cx={24} cy={24} r={R}
          stroke={color} strokeWidth={4} fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin="24,24"
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.rank, { color }]}>
          {rank === 1 ? '1' : `#${rank}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 48, height: 48 },
  svg:  { position: 'absolute' },
  label: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  rank: { fontSize: 13, fontWeight: '800' },
});
