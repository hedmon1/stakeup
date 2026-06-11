import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, brutalBtn, onAccent } from '../../theme';
import { CatalogProposal, AppUser } from '../../types';
import IconTile from '../IconTile';
import { listenCatalogProposal, voteCatalogProposal } from '../../services/firestore';
import { useProfiles } from '../../hooks/useProfiles';

type Props = {
  proposalId: string;
  groupId: string;
  currentUser: AppUser;
};

export default function CatalogProposalCard({ proposalId, groupId, currentUser }: Props) {
  const [item, setItem]     = useState<CatalogProposal | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => listenCatalogProposal(groupId, proposalId, setItem), [groupId, proposalId]);

  const profiles = useProfiles(item ? [item.proposerId] : []);

  if (!item) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  const isReward      = item.type === 'reward';
  const accent        = isReward ? colors.purple : colors.orange;
  const isProposer    = item.proposerId === currentUser.id;
  const proposerName  = isProposer ? 'You' : (profiles[item.proposerId]?.displayName ?? 'Member');
  const alreadyVoted  = item.approvals.includes(currentUser.id) || item.rejections.includes(currentUser.id);

  const onVote = async (vote: 'approve' | 'reject') => {
    if (voting) return;
    setVoting(true);
    try {
      await voteCatalogProposal(groupId, item.id, currentUser.id, vote);
    } catch (e: any) {
      Alert.alert('Could not record your vote', e?.message ?? 'Please try again.');
    } finally {
      setVoting(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: accent + '55' }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconTile name={isReward ? 'gift' : 'zap'} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLine}>
            <Text style={styles.name}>{proposerName} </Text>
            <Text style={styles.verb}>proposed a {item.type}</Text>
          </Text>
          <Text style={[styles.typeLabel, { color: accent }]}>
            {isReward ? 'Reward' : 'Punishment'}
          </Text>
        </View>
        <Text style={[styles.cost, { color: accent }]}>{item.pointsCost} pts</Text>
      </View>

      {/* Content */}
      <Text style={styles.title}>{item.title}</Text>
      {!!item.description && <Text style={styles.desc}>{item.description}</Text>}

      <View style={styles.divider} />

      {/* Status / voting */}
      {item.status === 'proposed' && (
        <View style={styles.voteRow}>
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color={colors.tertiary} />
            <Text style={styles.metaText}>{item.approvals.length}/{item.approvalsNeeded} approvals</Text>
          </View>
          <View style={{ flex: 1 }} />
          {isProposer ? (
            <Text style={styles.metaText}>Waiting for the group…</Text>
          ) : alreadyVoted ? (
            <View style={styles.metaItem}>
              <Feather name="check" size={13} color={colors.green} />
              <Text style={[styles.metaText, { color: colors.green }]}>Voted</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={[styles.rejectBtn, voting && { opacity: 0.5 }]}
                onPress={() => onVote('reject')} disabled={voting}>
                <Text style={styles.rejectBtnText}>Deny</Text>
              </Pressable>
              <Pressable
                style={[styles.approveBtn, voting && { opacity: 0.5 }]}
                onPress={() => onVote('approve')} disabled={voting}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      {item.status === 'active' && (
        <View style={styles.metaItem}>
          <Feather name="check-circle" size={14} color={colors.green} />
          <Text style={[styles.metaText, { color: colors.green }]}>Approved · added to Rewards</Text>
        </View>
      )}
      {item.status === 'denied' && (
        <View style={styles.metaItem}>
          <Feather name="x-circle" size={14} color={colors.red} />
          <Text style={[styles.metaText, { color: colors.red }]}>Denied by the group</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLine: { fontSize: 14 },
  name: { fontWeight: '700', color: colors.primary },
  verb: { color: colors.secondary },
  typeLabel: { fontSize: 12, marginTop: 1, fontWeight: '600' },
  cost: { fontSize: 15, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  desc:  { fontSize: 13, color: colors.secondary, lineHeight: 18 },
  divider: { height: 0.5, backgroundColor: colors.separator, marginVertical: 2 },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: colors.secondary },
  approveBtn: {
    backgroundColor: colors.green, borderRadius: radius.button,
    paddingHorizontal: 14, paddingVertical: 6, ...brutalBtn,
  },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.3 },
  rejectBtn: {
    borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1.5, borderColor: colors.red + '66', backgroundColor: colors.red + '14',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: colors.red },
});
