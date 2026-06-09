import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, tierColor } from '../theme';
import { FriendGroup, AppUser, Goal, Checkin } from '../types';
import { listenGoals, listenCheckins } from '../services/firestore';

// ── Tab filter ─────────────────────────────────────────────────────────────
type Filter = 'Active' | 'Proposed' | 'Past';
const FILTERS: Filter[] = ['Active', 'Proposed', 'Past'];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${Math.min(100, pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Goal row with check-in counts ──────────────────────────────────────────
function GoalRow({
  goal, groupId, currentUserId,
}: { goal: Goal; groupId: string; currentUserId: string }) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  useEffect(() => listenCheckins(groupId, goal.id, setCheckins), [groupId, goal.id]);

  const mine     = checkins.filter(c => c.userId === currentUserId);
  const mineDone = mine.filter(c => c.status === 'verified').length;
  const allDone  = checkins.filter(c => c.status === 'verified').length;
  const pending  = checkins.filter(c => c.status === 'pending').length;

  const target = goal.schedule.target ?? 1;
  const pct = Math.min(1, mineDone / target);
  const tc = tierColor(goal.tier);

  const statusColor =
    goal.status === 'active'    ? colors.green :
    goal.status === 'proposed'  ? colors.orange :
    goal.status === 'completed' ? colors.blue :
    colors.red;

  return (
    <View style={styles.row}>
      {/* Header: tier dot + title + status */}
      <View style={styles.rowHead}>
        <View style={[styles.tierDot, { backgroundColor: tc }]} />
        <Text style={styles.rowTitle} numberOfLines={2}>{goal.title}</Text>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusChipText, { color: statusColor }]}>{goal.status}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={11} color={colors.tertiary} />
          <Text style={styles.metaText}>
            {fmtDate(goal.startDate)} – {fmtDate(goal.endDate)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="users" size={11} color={colors.tertiary} />
          <Text style={styles.metaText}>{goal.participantIds.length}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="star" size={11} color={colors.tertiary} />
          <Text style={styles.metaText}>{goal.pointsPerCheckin}pt</Text>
        </View>
      </View>

      {/* Your progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabel}>
          <Text style={styles.progressLabelText}>Your check-ins this week</Text>
          <Text style={styles.progressCount}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{mineDone}</Text>
            <Text style={{ color: colors.tertiary }}> / {target}</Text>
          </Text>
        </View>
        <ProgressBar pct={pct} color={tc} />
      </View>

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{mine.length}</Text>
          <Text style={styles.statLabel}>your total</Text>
        </View>
        <View style={styles.statBlockDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{allDone}</Text>
          <Text style={styles.statLabel}>group verified</Text>
        </View>
        <View style={styles.statBlockDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, pending > 0 && { color: colors.orange }]}>{pending}</Text>
          <Text style={styles.statLabel}>pending vote</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function ProgressScreen({ route }: any) {
  const { group, currentUser }: { group: FriendGroup; currentUser: AppUser } = route.params;

  const [goals,  setGoals]   = useState<Goal[] | null>(null);
  const [filter, setFilter]  = useState<Filter>('Active');

  useEffect(() => listenGoals(group.id, setGoals), [group.id]);

  const visible = useMemo(() => {
    if (!goals) return [];
    if (filter === 'Active')   return goals.filter(g => g.status === 'active');
    if (filter === 'Proposed') return goals.filter(g => g.status === 'proposed');
    return goals.filter(g => g.status === 'completed' || g.status === 'failed');
  }, [goals, filter]);

  // Aggregate counts across all goals
  const totals = useMemo(() => {
    if (!goals) return { active: 0, proposed: 0, completed: 0, failed: 0, total: 0 };
    return {
      active:    goals.filter(g => g.status === 'active').length,
      proposed:  goals.filter(g => g.status === 'proposed').length,
      completed: goals.filter(g => g.status === 'completed').length,
      failed:    goals.filter(g => g.status === 'failed').length,
      total:     goals.length,
    };
  }, [goals]);

  if (!goals) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Summary banner */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.green }]}>{totals.active}</Text>
          <Text style={styles.summaryLabel}>active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.orange }]}>{totals.proposed}</Text>
          <Text style={styles.summaryLabel}>proposed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.blue }]}>{totals.completed}</Text>
          <Text style={styles.summaryLabel}>done</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.red }]}>{totals.failed}</Text>
          <Text style={styles.summaryLabel}>failed</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* Goals list */}
      {visible.length > 0 ? (
        visible.map(g => (
          <GoalRow key={g.id} goal={g} groupId={group.id} currentUserId={currentUser.id} />
        ))
      ) : (
        <View style={styles.empty}>
          <Feather name="target" size={36} color={colors.tertiary} />
          <Text style={styles.emptyTitle}>No {filter.toLowerCase()} goals</Text>
          <Text style={styles.emptySub}>
            {filter === 'Active'   && 'Propose a goal from the chat to get started.'}
            {filter === 'Proposed' && 'Goals waiting on group approval show up here.'}
            {filter === 'Past'     && 'Completed and failed goals show up here.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  center:  { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  // ── Summary ───────────────────────────────────────────────────────────────
  summary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14,
    borderWidth: 0.5, borderColor: colors.border,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 0.5, height: 32, backgroundColor: colors.separator },
  summaryNum:     { fontSize: 22, fontWeight: '800' },
  summaryLabel:   { fontSize: 11, color: colors.tertiary, marginTop: 2 },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 3, marginBottom: 4,
  },
  tab: { flex: 1, padding: 9, borderRadius: radius.xs, alignItems: 'center' },
  tabActive: { backgroundColor: colors.elevated },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.tertiary },
  tabTextActive: { color: colors.primary },

  // ── Goal row ─────────────────────────────────────────────────────────────
  row: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, gap: 12,
    borderWidth: 0.5, borderColor: colors.border,
  },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  statusChipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: colors.secondary },

  progressSection: { gap: 6 },
  progressLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabelText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  progressCount: { fontSize: 13 },

  bar: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.elevated, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },

  totalsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.elevated, borderRadius: radius.small,
    padding: 10,
  },
  statBlock:         { flex: 1, alignItems: 'center' },
  statBlockDivider:  { width: 0.5, height: 26, backgroundColor: colors.separator },
  statValue:         { fontSize: 17, fontWeight: '800', color: colors.primary },
  statLabel:         { fontSize: 10, color: colors.tertiary, marginTop: 1 },

  // ── Empty ─────────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', gap: 10, padding: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginTop: 4 },
  emptySub:   { fontSize: 13, color: colors.secondary, textAlign: 'center' },
});
