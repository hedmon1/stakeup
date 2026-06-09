import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, fonts, brutalBtn, onAccent } from '../theme';
import { markTutorialSeen } from '../services/auth';

type Slide = {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'target',
    color: colors.blue,
    title: 'Welcome to StakeUp',
    body: 'Bet on your goals with friends. Put your habits on the line and keep each other honest.',
  },
  {
    icon: 'flag',
    color: colors.orange,
    title: 'Set the stakes',
    body: 'Propose a challenge, pick a difficulty tier, and let the group approve it together.',
  },
  {
    icon: 'camera',
    color: colors.green,
    title: 'Check in & verify',
    body: 'Post proof with a quick note. Friends vote to verify — every verified check-in earns you points.',
  },
  {
    icon: 'gift',
    color: colors.purple,
    title: 'Win or pay up',
    body: 'Spend your points on rewards, or get hit with a punishment from the group catalog.',
  },
];

export default function TutorialScreen({ route }: any) {
  const { uid }: { uid: string } = route.params;
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex]   = useState(0);
  const [saving, setSaving] = useState(false);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await markTutorialSeen(uid);
      // The user-doc snapshot listener in Navigation advances to Main.
    } catch {
      setSaving(false);
    }
  };

  const onNext = () => {
    if (isLast) { finish(); return; }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={styles.root}>
      {/* Skip */}
      <View style={styles.topBar}>
        <Pressable onPress={finish} hitSlop={12} disabled={saving}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.flex}>
        {SLIDES.map(s => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: s.color + '22' }]}>
              <Feather name={s.icon} size={52} color={s.color} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots + button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={onNext}
          disabled={saving}>
          <Text style={styles.btnText}>
            {saving ? 'Starting…' : isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  flex:  { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  skip: { fontFamily: fonts.term, fontSize: 20, color: colors.secondary },

  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 22,
  },
  iconWrap: {
    width: 120, height: 120, borderRadius: radius.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.ink,
  },
  title: { fontFamily: fonts.pixel, fontSize: 18, lineHeight: 28, color: colors.primary, textAlign: 'center' },
  body:  { fontFamily: fonts.term, fontSize: 20, lineHeight: 24, color: colors.secondary, textAlign: 'center' },

  footer: { paddingHorizontal: 28, paddingBottom: 44, gap: 24 },
  dots:   { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot:    { height: 8, borderRadius: 4 },
  dotActive:   { width: 22, backgroundColor: colors.blue },
  dotInactive: { width: 8,  backgroundColor: colors.tertiary },

  btn: {
    backgroundColor: colors.green, borderRadius: radius.button,
    padding: 16, alignItems: 'center', ...brutalBtn,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
});
