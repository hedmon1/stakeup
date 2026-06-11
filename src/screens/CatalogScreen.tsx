import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, brutalBtn, onAccent } from '../theme';
import { CatalogItem, CatalogType, FriendGroup, AppUser } from '../types';
import { fetchCatalog, redeem, listenMembers, listenGroupItems, proposeCatalogItem } from '../services/firestore';

type Filter = 'All' | 'Punishments' | 'Rewards';
const FILTERS: Filter[] = ['All', 'Punishments', 'Rewards'];

// Catalog item with a flag marking it as a group-made (member-proposed) item.
type ListItem = CatalogItem & { custom?: boolean };

export default function CatalogScreen({ route, navigation }: any) {
  const { group, currentUser, myPoints: initialPoints }: { group: FriendGroup; currentUser: AppUser; myPoints: number } = route.params;
  const [items,    setItems]    = useState<CatalogItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myPoints, setMyPoints] = useState(initialPoints);
  const [filter,   setFilter]   = useState<Filter>('All');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [note,     setNote]     = useState('');
  const [redeeming,setRedeeming]= useState(false);

  // Group-specific approved items (member-proposed) merged into the list.
  const [groupItems, setGroupItems] = useState<CatalogItem[]>([]);

  // Propose-new-item modal
  const [showPropose, setShowPropose] = useState(false);
  const [pType,   setPType]   = useState<CatalogType>('reward');
  const [pTitle,  setPTitle]  = useState('');
  const [pDesc,   setPDesc]   = useState('');
  const [pPoints, setPPoints] = useState('10');
  const [proposing, setProposing] = useState(false);

  // Load catalog — auto-seeds on first run if empty
  useEffect(() => {
    fetchCatalog()
      .then(setItems)
      .catch(e => Alert.alert('Could not load catalog', e.message))
      .finally(() => setLoading(false));
  }, []);

  // Approved custom items for this group, live.
  useEffect(() => listenGroupItems(group.id, setGroupItems), [group.id]);

  // Real-time point updates so balance reflects redemptions/check-ins
  useEffect(() => {
    return listenMembers(group.id, ms => {
      const me = ms.find(m => m.id === currentUser.id);
      if (me) setMyPoints(me.points);
    });
  }, [group.id, currentUser.id]);

  // Group's custom items first (flagged), then the shared defaults.
  const allItems: ListItem[] = useMemo(() => [
    ...groupItems.map(i => ({ ...i, custom: true })),
    ...items.map(i => ({ ...i, custom: false })),
  ], [groupItems, items]);

  const visible = allItems.filter(i =>
    filter === 'All' ? true : filter === 'Punishments' ? i.type === 'punishment' : i.type === 'reward'
  );

  const onPropose = async () => {
    const cost = parseInt(pPoints, 10);
    if (!pTitle.trim()) { Alert.alert('Add a title', 'Give your item a name first.'); return; }
    if (!Number.isFinite(cost) || cost < 0) { Alert.alert('Invalid points', 'Enter a valid point cost.'); return; }
    setProposing(true);
    try {
      await proposeCatalogItem(group.id, currentUser.id, group.memberIds.length, {
        type: pType, title: pTitle.trim(), description: pDesc.trim(), pointsCost: cost,
      });
      setShowPropose(false);
      setPType('reward'); setPTitle(''); setPDesc(''); setPPoints('10');
      const solo = group.memberIds.length <= 1;
      Alert.alert(
        solo ? 'Added to Rewards' : 'Proposed to the group',
        solo
          ? 'You’re the only member, so it was added right away.'
          : 'Your group can approve or deny it in the chat.'
      );
    } catch (e: any) {
      Alert.alert('Could not propose item', e?.message ?? 'Please try again.');
    } finally {
      setProposing(false);
    }
  };

  const onRedeem = async () => {
    if (!selected) return;
    setRedeeming(true);
    try {
      await redeem(group.id, currentUser.id, selected, note || undefined);
      setSelected(null); setNote('');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRedeeming(false);
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    const canAfford = item.pointsCost <= myPoints;
    const accent = item.type === 'reward' ? colors.purple : colors.orange;
    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed && canAfford && styles.itemPressed]}
        onPress={() => canAfford && setSelected(item)}
        disabled={!canAfford}>
        <View style={[styles.itemIcon, { backgroundColor: accent + '22' }]}>
          <Feather name={item.type === 'reward' ? 'gift' : 'zap'} size={20} color={accent} />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            {item.custom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>CUSTOM</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        </View>
        <Text style={[styles.itemCost, { color: canAfford ? colors.green : colors.tertiary }]}>
          {item.pointsCost}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* Balance banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerAmt}>{myPoints} pts</Text>
          <Text style={styles.bannerLabel}>Your balance · {group.name}</Text>
        </View>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeNum}>{allItems.filter(i => i.pointsCost <= myPoints).length}</Text>
          <Text style={styles.bannerBadgeLabel}>available</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.seg}>
        {FILTERS.map(f => (
          <Pressable key={f} style={[styles.segItem, filter === f && styles.segActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.segText, filter === f && styles.segTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* Propose a new item */}
      <Pressable style={styles.proposeBtn} onPress={() => setShowPropose(true)}>
        <Feather name="plus-circle" size={16} color={colors.blue} />
        <Text style={styles.proposeBtnText}>Propose a reward or punishment</Text>
      </Pressable>

      {loading
        ? <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.blue} />
            <Text style={styles.loadingText}>Loading catalog…</Text>
          </View>
        : <FlatList
            data={visible}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={
              <View style={styles.loadingWrap}>
                <Feather name="package" size={28} color={colors.tertiary} />
                <Text style={styles.loadingText}>No items in this filter</Text>
              </View>
            }
          />
      }

      {/* Confirm modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selected?.title}</Text>
            <Text style={styles.modalDesc}>{selected?.description}</Text>
            <Text style={styles.modalCost}>−{selected?.pointsCost} pts</Text>
            <TextInput
              style={styles.noteInput} placeholder="Optional note to the group…"
              placeholderTextColor={colors.tertiary} value={note} onChangeText={setNote}
              returnKeyType="done" maxLength={140}
            />
            <Pressable style={styles.redeemBtn} onPress={onRedeem} disabled={redeeming}>
              <Text style={styles.redeemBtnText}>{redeeming ? 'Redeeming…' : 'Confirm Redemption'}</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Propose modal */}
      <Modal visible={showPropose} transparent animationType="slide" onRequestClose={() => setShowPropose(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Propose an item</Text>

            {/* Type toggle */}
            <View style={styles.typeRow}>
              {(['reward', 'punishment'] as CatalogType[]).map(t => {
                const sel = pType === t;
                const c = t === 'reward' ? colors.purple : colors.orange;
                return (
                  <Pressable
                    key={t}
                    style={[styles.typeBtn, sel && { borderColor: c, backgroundColor: c + '18' }]}
                    onPress={() => setPType(t)}>
                    <Feather name={t === 'reward' ? 'gift' : 'zap'} size={16} color={sel ? c : colors.secondary} />
                    <Text style={[styles.typeBtnText, sel && { color: c }]}>
                      {t === 'reward' ? 'Reward' : 'Punishment'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={styles.noteInput} placeholder="Title (e.g. Loser buys coffee)"
              placeholderTextColor={colors.tertiary} value={pTitle} onChangeText={setPTitle} maxLength={80} />
            <TextInput
              style={[styles.noteInput, { height: 70 }]} placeholder="Description (optional)"
              placeholderTextColor={colors.tertiary} value={pDesc} onChangeText={setPDesc}
              multiline textAlignVertical="top" maxLength={200} />

            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Point cost</Text>
              <TextInput
                style={styles.pointsInput} value={pPoints}
                onChangeText={t => setPPoints(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" placeholder="10"
                placeholderTextColor={colors.tertiary} maxLength={4} />
            </View>

            <Pressable style={styles.redeemBtn} onPress={onPropose} disabled={proposing}>
              <Text style={styles.redeemBtnText}>
                {proposing ? 'Submitting…' : (group.memberIds.length <= 1 ? 'Add item' : 'Propose to group')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowPropose(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  banner: {
    margin: 16, backgroundColor: colors.card, borderRadius: radius.card, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0.5, borderColor: colors.border,
  },
  bannerAmt:   { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  bannerLabel: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  bannerBadge: { backgroundColor: colors.blue + '22', borderRadius: radius.small, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.blue + '44' },
  bannerBadgeNum:   { fontSize: 22, fontWeight: '800', color: colors.blue },
  bannerBadgeLabel: { fontSize: 11, color: colors.blue, opacity: 0.7 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.card, marginHorizontal: 16, marginBottom: 8, padding: 3 },
  segItem: { flex: 1, padding: 7, borderRadius: radius.xs, alignItems: 'center' },
  segActive: { backgroundColor: colors.elevated },
  segText: { fontSize: 13, fontWeight: '600', color: colors.tertiary },
  segTextActive: { color: colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: radius.card },
  itemPressed: { opacity: 0.7 },
  itemIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.primary, flexShrink: 1 },
  customBadge: {
    backgroundColor: colors.blue + '22', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 0.5, borderColor: colors.blue + '55',
  },
  customBadgeText: { fontSize: 9, fontWeight: '800', color: colors.blue, letterSpacing: 0.5 },
  itemDesc:  { fontSize: 13, color: colors.secondary, marginTop: 2, lineHeight: 17 },
  itemCost:  { fontSize: 15, fontWeight: '700' },
  sep: { height: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  modalDesc:  { fontSize: 14, color: colors.secondary, lineHeight: 20 },
  modalCost:  { fontSize: 16, fontWeight: '700', color: colors.red },
  noteInput: { backgroundColor: colors.elevated, borderRadius: radius.card, padding: 14, fontSize: 15, color: colors.primary, borderWidth: 0.5, borderColor: colors.border },
  redeemBtn: { backgroundColor: colors.green, borderRadius: radius.button, padding: 16, alignItems: 'center', ...brutalBtn },
  redeemBtnText: { fontSize: 16, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
  cancelText: { textAlign: 'center', color: colors.secondary, fontSize: 15, padding: 8 },
  loadingWrap: { alignItems: 'center', gap: 10, padding: 40 },
  loadingText: { fontSize: 13, color: colors.secondary, textAlign: 'center' },

  // Propose
  proposeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8, paddingVertical: 12,
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.blue + '44',
  },
  proposeBtnText: { fontSize: 14, fontWeight: '700', color: colors.blue },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated,
  },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.elevated, borderRadius: radius.card,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 0.5, borderColor: colors.border,
  },
  pointsLabel: { fontSize: 15, color: colors.secondary },
  pointsInput: {
    fontSize: 18, fontWeight: '800', color: colors.primary,
    minWidth: 70, textAlign: 'right', paddingVertical: 8,
  },
});
