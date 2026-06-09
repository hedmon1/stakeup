import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, tierColor, brutalBtn, onAccent } from '../../theme';
import { Goal, FriendGroup, AppUser, Member } from '../../types';
import Pill from '../Pill';
import IconTile from '../IconTile';
import { approveGoal } from '../../services/firestore';

type Props = {
  goal: Goal;
  group: FriendGroup;
  currentUser: AppUser;
  members: Record<string, Member>;
};

export default function GoalCard({ goal, group, currentUser, members }: Props) {
  const tc = tierColor(goal.tier);
  const alreadyApproved = goal.approvals.includes(currentUser.id);
  const isParticipant   = goal.participantIds.includes(currentUser.id);
  const scheduleText = goal.schedule.type === 'weekly_count'
    ? `${goal.schedule.target ?? 1}× per week`
    : (goal.schedule.days ?? []).join(', ');

  const [approving, setApproving] = useState(false);
  const onApprove = async () => {
    if (approving) return;
    setApproving(true);
    try {
      await approveGoal(group.id, goal.id, currentUser.id);
    } catch (e: any) {
      Alert.alert('Could not approve goal', e?.message ?? 'Please try again.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <IconTile name="target" color={colors.blue} />
        <Text style={styles.title} numberOfLines={2}>{goal.title}</Text>
        <Pill text={goal.tier} color={tc} />
      </View>

      {/* Meta */}
      <View style={[styles.row, styles.meta]}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={11} color={colors.tertiary} />
          <Text style={styles.metaText}>{scheduleText}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="star" size={11} color={colors.tertiary} />
          <Text style={styles.metaText}>{goal.pointsPerCheckin}pt · +{goal.completionBonus} bonus</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Status */}
      {goal.status === 'proposed' && (
        <View style={styles.row}>
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color={colors.tertiary} />
            <Text style={styles.metaText}>{goal.approvals.length}/{goal.approvalsNeeded} approvals</Text>
          </View>
          <View style={{ flex: 1 }} />
          {isParticipant && !alreadyApproved && (
            <Pressable style={[styles.approveBtn, approving && { opacity: 0.5 }]} onPress={onApprove} disabled={approving}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
          )}
          {alreadyApproved && (
            <View style={styles.metaItem}>
              <Feather name="check-circle" size={13} color={colors.green} />
              <Text style={[styles.metaText, { color: colors.green }]}>Approved</Text>
            </View>
          )}
        </View>
      )}
      {goal.status === 'active' && (
        <View style={styles.metaItem}>
          <View style={styles.activeDot} />
          <Text style={[styles.metaText, { color: colors.green }]}>
            Active · {goal.participantIds.length} participants
          </Text>
        </View>
      )}
      {goal.status === 'completed' && (
        <View style={styles.metaItem}>
          <Feather name="check-circle" size={13} color={colors.green} />
          <Text style={[styles.metaText, { color: colors.green }]}>Completed</Text>
        </View>
      )}
      {goal.status === 'failed' && (
        <View style={styles.metaItem}>
          <Feather name="x-circle" size={13} color={colors.red} />
          <Text style={[styles.metaText, { color: colors.red }]}>Failed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, gap: 10,
    borderWidth: 0.5, borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  meta: { flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.secondary },
  divider: { height: 0.5, backgroundColor: colors.separator },
  approveBtn: {
    backgroundColor: colors.green, borderRadius: radius.button,
    paddingHorizontal: 14, paddingVertical: 6, ...brutalBtn,
  },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.3 },
  activeDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green,
  },
});
