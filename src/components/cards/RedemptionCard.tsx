import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';
import { Redemption } from '../../types';
import Pill from '../Pill';
import IconTile from '../IconTile';

type Props = { redemption: Redemption; redeemerName: string };

export default function RedemptionCard({ redemption, redeemerName }: Props) {
  const isReward = redemption.type === 'reward';
  const accent   = isReward ? colors.purple : colors.orange;

  return (
    <View style={[styles.card, { borderColor: accent + '33', backgroundColor: accent + '08' }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconTile name={isReward ? 'gift' : 'zap'} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLine}>
            <Text style={styles.name}>{redeemerName} </Text>
            <Text style={styles.verb}>redeemed</Text>
          </Text>
          <Text style={[styles.typeLabel, { color: accent }]}>
            {isReward ? 'Reward' : 'Punishment'}
          </Text>
        </View>
        <Text style={[styles.pts, { color: accent }]}>−{redemption.pointsCost} pts</Text>
      </View>

      {/* Content */}
      <Text style={styles.title}>{redemption.title}</Text>
      <Text style={styles.desc}>{redemption.description}</Text>
      {redemption.customNote && (
        <Text style={styles.note}>"{redemption.customNote}"</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.deadline}>
          Due {redemption.deadlineAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Pill
          text={redemption.status === 'fulfilled' ? 'Fulfilled' : 'Active'}
          color={redemption.status === 'fulfilled' ? colors.green : accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card, padding: 14, gap: 8,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerLine: { fontSize: 15 },
  name: { fontWeight: '700', color: colors.primary },
  verb: { color: colors.secondary },
  typeLabel: { fontSize: 12, marginTop: 1 },
  pts: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  desc:  { fontSize: 13, color: colors.secondary, lineHeight: 18 },
  note:  { fontSize: 13, color: colors.secondary, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 2,
  },
  deadline: { fontSize: 12, color: colors.tertiary },
});
