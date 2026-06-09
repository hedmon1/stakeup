import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, GoalTier, tierPoints, tierBonus } from '../../theme';
import { FriendGroup, AppUser, Member } from '../../types';
import { proposeGoal } from '../../services/firestore';
import { useProfiles } from '../../hooks/useProfiles';

const TIERS: GoalTier[] = ['easy', 'medium', 'hard'];
const tierColor = (t: GoalTier) => t === 'easy' ? colors.easy : t === 'medium' ? colors.medium : colors.hard;

// Duration presets — calendar-style picking without a heavyweight date picker
const DURATIONS = [
  { label: '1 week',   days: 7  },
  { label: '2 weeks',  days: 14 },
  { label: '1 month',  days: 30 },
  { label: '3 months', days: 90 },
];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type Props = {
  visible: boolean;
  onClose: () => void;
  group: FriendGroup;
  currentUser: AppUser;
  members: Member[];
};

export default function NewGoalModal({ visible, onClose, group, currentUser, members }: Props) {
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [tier,         setTier]         = useState<GoalTier>('medium');
  const [target,       setTarget]       = useState(3);
  const [durationDays, setDurationDays] = useState(7);
  const [participants, setParticipants] = useState<Set<string>>(new Set([currentUser.id]));
  const [saving,       setSaving]       = useState(false);

  const profiles = useProfiles(members.map(m => m.id));

  const { startDate, endDate } = useMemo(() => {
    const s = new Date();
    const e = new Date();
    e.setDate(e.getDate() + durationDays);
    return { startDate: s, endDate: e };
  }, [durationDays]);

  const toggle = (uid: string) => {
    if (uid === currentUser.id) return; // proposer always included
    setParticipants(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const reset = () => {
    setTitle(''); setDescription(''); setTier('medium');
    setTarget(3); setDurationDays(7);
    setParticipants(new Set([currentUser.id]));
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title for your goal first.');
      return;
    }
    setSaving(true);
    try {
      const pids = Array.from(participants);
      await proposeGoal(group.id, {
        title: title.trim(), description: description.trim(),
        proposerId: currentUser.id, tier,
        pointsPerCheckin: tierPoints(tier), completionBonus: tierBonus(tier),
        participantIds: pids,
        schedule: { type: 'weekly_count', target, weekStart: 'mon' },
        startDate, endDate,
        status: 'proposed',
        approvalsNeeded: Math.max(1, Math.ceil(pids.length / 2)),
        approvals: [currentUser.id],
      });
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Could not propose goal', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.nav}>
          <Pressable onPress={onClose}><Text style={styles.navBtn}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>New Goal</Text>
          <Pressable onPress={submit} disabled={!title.trim() || saving}>
            <Text style={[styles.navBtn, styles.navBtnBold, (!title.trim() || saving) && { opacity: 0.4 }]}>
              {saving ? 'Saving…' : 'Propose'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">

          {/* Title + description */}
          <View style={styles.section}>
            <TextInput
              style={styles.input}
              placeholder="Goal title (e.g. Gym 3× this week)"
              placeholderTextColor={colors.tertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Description (optional) — what does success look like?"
              placeholderTextColor={colors.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          {/* Difficulty */}
          <Text style={styles.label}>DIFFICULTY</Text>
          <View style={styles.tierRow}>
            {TIERS.map(t => {
              const tc = tierColor(t);
              const selected = tier === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.tierBtn, { borderColor: selected ? tc : 'transparent', backgroundColor: tc + '18' }]}
                  onPress={() => setTier(t)}>
                  <Text style={[styles.tierName, { color: tc }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  <Text style={[styles.tierPts, { color: tc + 'cc' }]}>{tierPoints(t)}pt</Text>
                  <Text style={[styles.tierBonus, { color: tc + '99' }]}>+{tierBonus(t)} bonus</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Check-ins per week */}
          <Text style={styles.label}>CHECK-INS PER WEEK</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, target <= 1 && styles.stepBtnDisabled]}
              onPress={() => setTarget(Math.max(1, target - 1))}>
              <Feather name="minus" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.stepValueWrap}>
              <Text style={styles.stepValue}>{target}</Text>
              <Text style={styles.stepUnit}>× per week</Text>
            </View>
            <Pressable
              style={[styles.stepBtn, target >= 14 && styles.stepBtnDisabled]}
              onPress={() => setTarget(Math.min(14, target + 1))}>
              <Feather name="plus" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {/* Duration */}
          <Text style={styles.label}>DURATION</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map(d => {
              const selected = durationDays === d.days;
              return (
                <Pressable
                  key={d.days}
                  style={[styles.durBtn, selected && styles.durBtnSelected]}
                  onPress={() => setDurationDays(d.days)}>
                  <Text style={[styles.durBtnText, selected && styles.durBtnTextSelected]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Date preview */}
          <View style={styles.dateCard}>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={15} color={colors.blue} />
              <Text style={styles.dateLabel}>Starts</Text>
              <Text style={styles.dateValue}>{fmtDate(startDate)}</Text>
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateRow}>
              <Feather name="flag" size={15} color={colors.green} />
              <Text style={styles.dateLabel}>Ends</Text>
              <Text style={styles.dateValue}>{fmtDate(endDate)}</Text>
            </View>
          </View>

          {/* Participants */}
          <Text style={styles.label}>PARTICIPANTS</Text>
          <View style={styles.section}>
            {members.length === 0 && (
              <Text style={styles.noPeers}>No other members yet. You'll be the only participant.</Text>
            )}
            {members.map((m, i) => {
              const isMe = m.id === currentUser.id;
              return (
                <View key={m.id} style={[styles.memberRow, i < members.length - 1 && styles.memberRowBorder]}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(isMe ? 'Y' : (profiles[m.id]?.displayName ?? 'M').charAt(0)).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>
                    {isMe ? 'You (proposer)' : (profiles[m.id]?.displayName ?? 'Member')}
                  </Text>
                  <Switch
                    value={participants.has(m.id)}
                    onValueChange={() => toggle(m.id)}
                    disabled={isMe}
                    trackColor={{ true: colors.blue, false: colors.elevated }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
          </View>

          <Text style={styles.footer}>
            {participants.size === 1
              ? 'Solo goal — activates immediately on propose.'
              : `Needs ${Math.max(1, Math.ceil(participants.size / 2))} of ${participants.size} approvals to activate.`}
          </Text>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // ── Header ───────────────────────────────────────────────────────────────
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.separator,
  },
  navTitle: { fontSize: 17, fontWeight: '600', color: colors.primary },
  navBtn: { fontSize: 16, color: colors.blue },
  navBtnBold: { fontWeight: '700' },

  content: { padding: 16, gap: 4, paddingBottom: 60 },
  label: {
    fontSize: 12, fontWeight: '700', color: colors.tertiary, letterSpacing: 0.5,
    marginTop: 18, marginBottom: 8,
  },
  section: {
    backgroundColor: colors.card, borderRadius: radius.card,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  input: {
    padding: 14, fontSize: 16, color: colors.primary,
    borderBottomWidth: 0.5, borderBottomColor: colors.separator,
  },
  inputMulti: { height: 80, borderBottomWidth: 0 },

  // ── Tier ─────────────────────────────────────────────────────────────────
  tierRow: { flexDirection: 'row', gap: 8 },
  tierBtn: {
    flex: 1, padding: 12, borderRadius: radius.card,
    borderWidth: 2, alignItems: 'center', gap: 2,
  },
  tierName:  { fontSize: 14, fontWeight: '800' },
  tierPts:   { fontSize: 12, fontWeight: '700' },
  tierBonus: { fontSize: 10 },

  // ── Stepper ──────────────────────────────────────────────────────────────
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.card, padding: 4,
    borderWidth: 0.5, borderColor: colors.border,
  },
  stepBtn: {
    width: 52, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.small, backgroundColor: colors.elevated,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepValueWrap: { flex: 1, alignItems: 'center' },
  stepValue: { fontSize: 28, fontWeight: '800', color: colors.primary },
  stepUnit:  { fontSize: 11, color: colors.tertiary, marginTop: -2 },

  // ── Duration ─────────────────────────────────────────────────────────────
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durBtn: {
    flexGrow: 1, minWidth: '47%',
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: 'transparent',
    alignItems: 'center',
  },
  durBtnSelected: { borderColor: colors.blue, backgroundColor: colors.blue + '14' },
  durBtnText:         { fontSize: 14, fontWeight: '600', color: colors.secondary },
  durBtnTextSelected: { color: colors.blue },

  // ── Date preview ─────────────────────────────────────────────────────────
  dateCard: {
    marginTop: 10,
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  dateLabel: { fontSize: 13, color: colors.secondary, width: 56 },
  dateValue: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary, textAlign: 'right' },
  dateSep: { height: 0.5, backgroundColor: colors.separator, marginLeft: 38 },

  // ── Participants ─────────────────────────────────────────────────────────
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  memberRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.separator },
  memberAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.blue + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: colors.blue },
  memberName: { flex: 1, fontSize: 15, color: colors.primary },
  noPeers: { padding: 14, fontSize: 13, color: colors.tertiary, fontStyle: 'italic' },

  footer: {
    fontSize: 12, color: colors.tertiary, textAlign: 'center',
    marginTop: 14, lineHeight: 18,
  },
});
