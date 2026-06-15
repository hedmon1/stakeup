import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, radius, brutalBtn, onAccent } from '../../theme';
import { Checkin, Goal, AppUser, VoteValue } from '../../types';
import Pill from '../Pill';
import IconTile from '../IconTile';
import { castVote } from '../../services/firestore';
import { getPhotoURL } from '../../services/storage';
import { useProfiles } from '../../hooks/useProfiles';

type Props = {
  checkinId: string;
  groupId: string;
  goals: Record<string, Goal>;
  currentUser: AppUser;
};

export default function CheckinCard({ checkinId, groupId, goals, currentUser }: Props) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    // Try to find goal context by scanning goals
    const goalId = Object.values(goals).find(g =>
      // We'll update this once we have the checkin doc
      true
    )?.id;

    // Listen to checkin from any goal (try each)
    let found = false;
    const unsubs = Object.keys(goals).map(gid => {
      const ref = doc(db, 'groups', groupId, 'goals', gid, 'checkins', checkinId);
      return onSnapshot(ref, snap => {
        if (!snap.exists() || found) return;
        found = true;
        const d = snap.data()!;
        const ci: Checkin = {
          id: snap.id, goalId: gid, userId: d.userId,
          submittedAt: d.submittedAt?.toDate() ?? new Date(),
          photoPath: d.photoPath, note: d.note,
          status: d.status ?? 'pending',
          verifications: (d.verifications ?? []).map((v: any) => ({
            userId: v.userId, vote: v.vote, at: v.at?.toDate() ?? new Date(),
          })),
          resolvedAt: d.resolvedAt?.toDate(),
          awardedPoints: d.awardedPoints,
        };
        setCheckin(ci);
        if (d.photoPath) {
          getPhotoURL(d.photoPath).then(setPhotoURL).catch(() => {});
        }
      });
    });
    return () => unsubs.forEach(u => u());
  }, [checkinId, groupId]);

  const profiles = useProfiles(checkin ? [checkin.userId] : []);

  if (!checkin) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  const goal = goals[checkin.goalId];
  const isMine = checkin.userId === currentUser.id;
  const alreadyVoted = checkin.verifications.some(v => v.userId === currentUser.id);
  const approvals = checkin.verifications.filter(v => v.vote === 'approve').length;
  const rejects   = checkin.verifications.filter(v => v.vote === 'reject').length;
  const submitterName = isMine ? 'You' : (profiles[checkin.userId]?.displayName ?? 'Member');

  const pillColor = checkin.status === 'verified' ? colors.green
    : checkin.status === 'rejected' ? colors.red : colors.orange;

  const onVote = async (vote: VoteValue) => {
    if (voting) return;
    setVoting(true);
    try {
      await castVote(groupId, checkin.goalId, checkin.id, currentUser.id, vote);
    } catch (e: any) {
      Alert.alert('Could not record your vote', e?.message ?? 'Please try again.');
    } finally {
      setVoting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <IconTile name="camera" color={colors.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            <Text style={{ color: colors.primary }}>{submitterName}</Text>
            <Text style={{ color: colors.secondary }}> checked in</Text>
          </Text>
          {goal && <Text style={styles.goalName} numberOfLines={1}>{goal.title}</Text>}
        </View>
        <Pill text={checkin.status} color={pillColor} />
      </View>

      {/* Photo (only render if we have one) */}
      {photoURL && (
        <View style={styles.photoWrap}>
          <Image source={{ uri: photoURL }} style={styles.photo} resizeMode="cover" />
        </View>
      )}

      {/* Note */}
      {checkin.note && (
        <View style={styles.noteBubble}>
          <Feather name="message-circle" size={12} color={colors.tertiary} />
          <Text style={styles.noteText}>{checkin.note}</Text>
        </View>
      )}

      {/* Votes */}
      <View style={styles.voteRow}>
        <View style={styles.tally}>
          <Feather name="check-circle" size={14} color={colors.green} />
          <Text style={[styles.tallyText, { color: colors.green }]}>{approvals}</Text>
        </View>
        <View style={[styles.tally, { marginLeft: 10 }]}>
          <Feather name="x-circle" size={14} color={colors.red} />
          <Text style={[styles.tallyText, { color: colors.red }]}>{rejects}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {checkin.status === 'pending' && !isMine && !alreadyVoted && (
          <>
            <Pressable style={[styles.rejectBtn, voting && { opacity: 0.5 }]} onPress={() => onVote('reject')} disabled={voting}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
            <Pressable style={[styles.approveBtn, voting && { opacity: 0.5 }]} onPress={() => onVote('approve')} disabled={voting}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
          </>
        )}
        {checkin.status === 'verified' && (
          <View style={styles.tally}>
            <Feather name="check-circle" size={14} color={colors.green} />
            <Text style={[styles.tallyText, { color: colors.green, fontWeight: '600' }]}>Verified</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, gap: 10,
    borderWidth: 0.5, borderColor: colors.border,
  },
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerTitle: { fontSize: 15, fontWeight: '600' },
  goalName: { fontSize: 12, color: colors.secondary, marginTop: 1 },
  photoWrap: {
    borderRadius: radius.small, overflow: 'hidden', height: 160,
    backgroundColor: colors.elevated,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPlaceholderText: { fontSize: 12, color: colors.tertiary },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tally: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyText: { fontSize: 13, fontWeight: '600' },
  approveBtn: {
    backgroundColor: colors.green, borderRadius: radius.button,
    paddingHorizontal: 14, paddingVertical: 6, ...brutalBtn,
  },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.3 },
  rejectBtn: {
    borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1.5, borderColor: colors.red + '66',
    backgroundColor: colors.red + '14',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: colors.red },
  noteBubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.elevated, borderRadius: radius.small,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
});
