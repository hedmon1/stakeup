import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors, radius, fonts, brutalCard } from '../theme';
import { FriendGroup, Member } from '../types';
import { listenMembers } from '../services/firestore';
import { useProfiles } from '../hooks/useProfiles';
import GOATCard from '../components/GOATCard';
import MemberRing from '../components/MemberRing';

type Period = 'Week' | 'Month' | 'All Time';
const PERIODS: Period[] = ['Week', 'Month', 'All Time'];

export default function ScoreboardScreen({ route }: any) {
  const { group }: { group: FriendGroup } = route.params;
  const [members, setMembers] = useState<Member[]>([]);
  const [period,  setPeriod]  = useState<Period>('Week');

  useEffect(() => listenMembers(group.id, ms => setMembers(ms.sort((a, b) => b.points - a.points))), [group.id]);

  const profiles = useProfiles(members.map(m => m.id));
  const maxPts = members[0]?.points ?? 1;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {members[0] && (
        <GOATCard
          member={members[0]}
          profile={profiles[members[0].id] ? ({ displayName: profiles[members[0].id].displayName } as any) : undefined}
        />
      )}

      {/* Period picker */}
      <View style={styles.seg}>
        {PERIODS.map(p => (
          <Pressable key={p} style={[styles.segItem, period === p && styles.segActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.segText, period === p && styles.segTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {/* Ring rows */}
      <View style={styles.card}>
        {members.map((m, i) => {
          const rankColor = i === 0 ? colors.blue : i === 1 ? colors.green : i === 2 ? colors.orange : colors.tertiary;
          return (
            <View key={m.id}>
              <View style={styles.row}>
                <MemberRing rank={i + 1} points={m.points} maxPoints={maxPts} delayMs={i * 150} />
                <View style={styles.info}>
                  <Text style={styles.memberName}>{profiles[m.id]?.displayName ?? 'Member'}</Text>
                  <Text style={styles.memberSub}>{m.role}</Text>
                </View>
                <Text style={[styles.pts, { color: rankColor }]}>{m.points}</Text>
              </View>
              {i < members.length - 1 && <View style={styles.sep} />}
            </View>
          );
        })}
        {members.length === 0 && (
          <Text style={styles.empty}>No members yet — invite friends to get started.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.card, margin: 16, padding: 3, gap: 0 },
  segItem: { flex: 1, padding: 7, borderRadius: radius.xs, alignItems: 'center' },
  segActive: { backgroundColor: colors.elevated },
  segText: { fontSize: 13, fontWeight: '600', color: colors.tertiary },
  segTextActive: { color: colors.primary },
  card: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden', ...brutalCard },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  info: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: colors.primary },
  memberSub:  { fontSize: 12, color: colors.tertiary, marginTop: 2 },
  pts: { fontFamily: fonts.pixel, fontSize: 15 },
  sep: { height: 0.5, backgroundColor: colors.separator, marginLeft: 78 },
  empty: { padding: 24, textAlign: 'center', color: colors.secondary, fontSize: 14 },
});
