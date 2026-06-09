import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { Member, AppUser } from '../types';

type Props = { member: Member; profile?: AppUser; checkins?: number };

export default function GOATCard({ member, profile, checkins = 0 }: Props) {
  const name = profile?.displayName ?? `#${member.id.slice(0, 6)}`;
  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <View style={styles.left}>
        <Text style={styles.label}>LEADING THIS WEEK</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.sub}>{checkins} check-in{checkins !== 1 ? 's' : ''} verified</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.pts}>{member.points}</Text>
        <Text style={styles.ptsLabel}>pts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: radius.card, padding: 18,
    backgroundColor: colors.blue + '1a',
    borderWidth: 1, borderColor: colors.blue + '4d',
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute', top: -40, right: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: colors.blue + '33',
  },
  left: { flex: 1, gap: 4 },
  label: { fontSize: 10, fontWeight: '800', color: colors.blue, letterSpacing: 1 },
  name:  { fontSize: 26, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  sub:   { fontSize: 13, color: colors.primary + '66' },
  right: { alignItems: 'flex-end' },
  pts:   { fontSize: 44, fontWeight: '900', color: colors.blue, lineHeight: 48 },
  ptsLabel: { fontSize: 12, fontWeight: '600', color: colors.blue + 'aa', textAlign: 'right' },
});
