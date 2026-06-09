import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Share, Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { colors, radius, tierColor, brutalBtn, onAccent } from '../theme';
import { FriendGroup, AppUser, Goal, Checkin, Member } from '../types';
import { listenGoals, listenMembers, listenCheckins } from '../services/firestore';
import CheckinCard from '../components/cards/CheckinCard';
import NewGoalModal from './modals/NewGoalModal';
import CheckinModal from './modals/CheckinModal';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

// ── Small progress ring (checkins this week ÷ target) ────────────────────────
function ProgressRing({ done, target, color }: { done: number; target: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = target > 0 ? Math.min(1, done / target) : 0;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 700, useNativeDriver: false }).start();
  }, [pct]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [RING_C, 0] });

  return (
    <View style={styles.ringWrap}>
      <Svg width={56} height={56} style={{ position: 'absolute' }}>
        <Circle cx={28} cy={28} r={RING_R} stroke={colors.elevated} strokeWidth={5} fill="none" />
        <AnimatedCircle
          cx={28} cy={28} r={RING_R}
          stroke={color} strokeWidth={5} fill="none"
          strokeDasharray={RING_C} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin="28,28"
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={[styles.ringDone, { color }]}>{done}</Text>
        <Text style={styles.ringTarget}>/{target}</Text>
      </View>
    </View>
  );
}

// ── A single active-goal row that tracks its own check-ins ───────────────────
function GoalProgressRow({
  goal, groupId, currentUserId,
}: { goal: Goal; groupId: string; currentUserId: string }) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  useEffect(() => listenCheckins(groupId, goal.id, setCheckins), [groupId, goal.id]);

  const mineDone = checkins.filter(c => c.userId === currentUserId && c.status === 'verified').length;
  const target = goal.schedule.target ?? 1;
  const tc = tierColor(goal.tier);
  const complete = mineDone >= target;

  return (
    <View style={styles.goalRow}>
      <ProgressRing done={mineDone} target={target} color={tc} />
      <View style={styles.goalInfo}>
        <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
        <Text style={styles.goalSub}>
          {complete
            ? 'Target hit this week 🎉'
            : `${target - mineDone} more check-in${target - mineDone === 1 ? '' : 's'} to go`}
        </Text>
      </View>
      <Text style={[styles.goalPts, { color: tc }]}>{goal.pointsPerCheckin}pt</Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function TodayScreen({ route }: any) {
  const { group, currentUser }: { group: FriendGroup; currentUser: AppUser } = route.params;

  const [members,  setMembers]  = useState<Member[]>([]);
  const [goals,    setGoals]    = useState<Goal[]>([]);
  const [pending,  setPending]  = useState<Record<string, Checkin>>({});
  const [showGoal, setShowGoal] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  useEffect(() => listenMembers(group.id, setMembers), [group.id]);
  useEffect(() => listenGoals(group.id, setGoals), [group.id]);

  const myPoints = members.find(m => m.id === currentUser.id)?.points ?? 0;

  const activeGoals = useMemo(
    () => goals.filter(g => g.status === 'active' && g.participantIds.includes(currentUser.id)),
    [goals, currentUser.id]
  );
  const allActiveGoals = useMemo(
    () => goals.filter(g => g.status === 'active'),
    [goals]
  );

  // Collect pending check-ins (from others) across all active goals for the vote section
  useEffect(() => {
    const unsubs = allActiveGoals.map(g =>
      listenCheckins(group.id, g.id, cs => {
        setPending(prev => {
          const next = { ...prev };
          cs.forEach(c => {
            if (c.status === 'pending' && c.userId !== currentUser.id) {
              next[c.id] = c;
            } else {
              delete next[c.id];
            }
          });
          return next;
        });
      })
    );
    return () => unsubs.forEach(u => u());
  }, [group.id, allActiveGoals.map(g => g.id).join(','), currentUser.id]);

  const goalsMap = useMemo(() => {
    const m: Record<string, Goal> = {};
    goals.forEach(g => { m[g.id] = g; });
    return m;
  }, [goals]);

  const pendingList = Object.values(pending);
  const proposedCount = goals.filter(g => g.status === 'proposed').length;

  const invite = async () => {
    try {
      await Share.share({
        message: `Join my StakeUp group "${group.name}".\n\nPaste this ID in "Join with code":\n${group.id}`,
      });
    } catch {}
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>{group.name}</Text>
            <Text style={styles.sub}>Let's keep the streak alive</Text>
          </View>
          <View style={styles.balance}>
            <Text style={styles.balanceNum}>{myPoints}</Text>
            <Text style={styles.balanceLabel}>pts</Text>
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={() => setShowCheckin(true)}>
          <Feather name="camera" size={20} color={onAccent} />
          <Text style={styles.ctaText}>Check in</Text>
        </Pressable>

        {/* Active goals */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>YOUR GOALS</Text>
          {proposedCount > 0 && (
            <Text style={styles.sectionHint}>{proposedCount} awaiting approval</Text>
          )}
        </View>

        {activeGoals.length > 0 ? (
          <View style={styles.card}>
            {activeGoals.map((g, i) => (
              <View key={g.id}>
                <GoalProgressRow goal={g} groupId={group.id} currentUserId={currentUser.id} />
                {i < activeGoals.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Feather name="target" size={32} color={colors.tertiary} />
            <Text style={styles.emptyTitle}>No active goals yet</Text>
            <Text style={styles.emptySub}>Propose your first goal to start earning points.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowGoal(true)}>
              <Text style={styles.emptyBtnText}>Propose a goal</Text>
            </Pressable>
          </View>
        )}

        {/* Needs your vote */}
        {pendingList.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>NEEDS YOUR VOTE</Text>
              <View style={styles.voteBadge}>
                <Text style={styles.voteBadgeText}>{pendingList.length}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {pendingList.map(c => (
                <CheckinCard
                  key={c.id}
                  checkinId={c.id}
                  groupId={group.id}
                  goals={goalsMap}
                  currentUser={currentUser}
                />
              ))}
            </View>
          </>
        )}

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 8 }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => setShowGoal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: colors.blue + '22' }]}>
              <Feather name="target" size={18} color={colors.blue} />
            </View>
            <Text style={styles.actionLabel}>New goal</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={invite}>
            <View style={[styles.actionIcon, { backgroundColor: colors.purple + '22' }]}>
              <Feather name="user-plus" size={18} color={colors.purple} />
            </View>
            <Text style={styles.actionLabel}>Invite friends</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Modals */}
      <NewGoalModal
        visible={showGoal} onClose={() => setShowGoal(false)}
        group={group} currentUser={currentUser} members={members}
      />
      <CheckinModal
        visible={showCheckin} onClose={() => setShowCheckin(false)}
        group={group} currentUser={currentUser} goals={activeGoals}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  hi:  { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.secondary, marginTop: 2 },
  balance: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    backgroundColor: colors.card, borderRadius: radius.card,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 0.5, borderColor: colors.border,
  },
  balanceNum:   { fontSize: 24, fontWeight: '800', color: colors.blue },
  balanceLabel: { fontSize: 12, color: colors.secondary },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: radius.button,
    paddingVertical: 16, marginBottom: 8, ...brutalBtn,
  },
  ctaText: { fontSize: 17, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.tertiary, letterSpacing: 0.5 },
  sectionHint:  { fontSize: 12, color: colors.orange },

  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden',
  },
  divider: { height: 0.5, backgroundColor: colors.separator, marginLeft: 84 },

  // Goal row
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  ringWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { flexDirection: 'row', alignItems: 'baseline' },
  ringDone:   { fontSize: 17, fontWeight: '800' },
  ringTarget: { fontSize: 12, color: colors.tertiary },
  goalInfo:  { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  goalSub:   { fontSize: 12, color: colors.secondary, marginTop: 2 },
  goalPts:   { fontSize: 14, fontWeight: '700' },

  // Empty
  empty: {
    alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: radius.card, padding: 28,
    borderWidth: 0.5, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginTop: 4 },
  emptySub:   { fontSize: 13, color: colors.secondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: colors.green, borderRadius: radius.button,
    paddingHorizontal: 20, paddingVertical: 11, ...brutalBtn,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Vote badge
  voteBadge: {
    backgroundColor: colors.orange, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  voteBadgeText: { fontSize: 12, fontWeight: '800', color: onAccent },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.card, padding: 14,
    borderWidth: 0.5, borderColor: colors.border,
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
