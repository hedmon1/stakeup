import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, onAccent } from '../theme';
import { FriendGroup, AppUser, ChatMessage, Goal, Redemption, Member } from '../types';
import {
  listenMessages, listenGoals, listenMembers, listenRedemptions,
  sendChat, proposeGoal, approveGoal,
} from '../services/firestore';
import { useProfiles } from '../hooks/useProfiles';
import GoalCard from '../components/cards/GoalCard';
import CheckinCard from '../components/cards/CheckinCard';
import RedemptionCard from '../components/cards/RedemptionCard';
import CatalogProposalCard from '../components/cards/CatalogProposalCard';
import StreakWidget from '../components/StreakWidget';
import NewGoalModal from './modals/NewGoalModal';
import CheckinModal from './modals/CheckinModal';

export default function GroupChatScreen({ navigation, route }: any) {
  const { group, currentUser }: { group: FriendGroup; currentUser: AppUser } = route.params;

  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [goals,       setGoals]       = useState<Record<string, Goal>>({});
  const [members,     setMembers]     = useState<Record<string, Member>>({});
  const [redemptions, setRedemptions] = useState<Record<string, Redemption>>({});
  const [draft,       setDraft]       = useState('');
  const [showAS,      setShowAS]      = useState(false);
  const [showGoal,    setShowGoal]    = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsubs = [
      listenMessages(group.id, setMessages),
      listenGoals(group.id, gs => {
        const map: Record<string, Goal> = {};
        gs.forEach(g => { map[g.id] = g; });
        setGoals(map);
      }),
      listenMembers(group.id, ms => {
        const map: Record<string, Member> = {};
        ms.forEach(m => { map[m.id] = m; });
        setMembers(map);
      }),
      listenRedemptions(group.id, rs => {
        const map: Record<string, Redemption> = {};
        rs.forEach(r => { map[r.id] = r; });
        setRedemptions(map);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [group.id]);

  const activeGoals = Object.values(goals).filter(
    g => g.status === 'active' && g.participantIds.includes(currentUser.id)
  );

  const onSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    try {
      await sendChat(group.id, currentUser.id, text);
    } catch (e: any) {
      setDraft(text); // restore so the message isn't lost
      Alert.alert('Message not sent', e?.message ?? 'Check your connection and try again.');
    }
  };

  // Resolve names for everyone who appears in the feed (chat authors, members,
  // redeemers) so we never show raw uids.
  const profiles = useProfiles([
    ...Object.keys(members),
    ...messages.map(m => m.authorId),
    ...Object.values(redemptions).map(r => r.redeemerId),
  ]);

  const nameFor = (uid?: string) => {
    if (!uid) return '';
    if (uid === currentUser.id) return 'You';
    return profiles[uid]?.displayName ?? 'Member';
  };

  const renderItem = ({ item: msg }: { item: ChatMessage }) => {
    switch (msg.type) {
      case 'chat': {
        const isMine = msg.authorId === currentUser.id;
        return (
          <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
            {!isMine && <Text style={styles.bubbleName}>{nameFor(msg.authorId)}</Text>}
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
            </View>
          </View>
        );
      }
      case 'system':
        return <Text style={styles.sys}>{msg.body}</Text>;
      case 'goal_card':
        return msg.refId && goals[msg.refId]
          ? <View style={styles.cardWrap}>
              <GoalCard goal={goals[msg.refId]} group={group} currentUser={currentUser} members={members} />
            </View>
          : null;
      case 'checkin_card':
        return msg.refId
          ? <View style={styles.cardWrap}>
              <CheckinCard checkinId={msg.refId} groupId={group.id} goals={goals} currentUser={currentUser} />
            </View>
          : null;
      case 'redemption_card':
        return msg.refId && redemptions[msg.refId]
          ? <View style={styles.cardWrap}>
              <RedemptionCard redemption={redemptions[msg.refId]} redeemerName={nameFor(redemptions[msg.refId].redeemerId)} />
            </View>
          : null;
      case 'catalog_proposal':
        return msg.refId
          ? <View style={styles.cardWrap}>
              <CatalogProposalCard proposalId={msg.refId} groupId={group.id} currentUser={currentUser} />
            </View>
          : null;
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      {/* Streak widget for first active goal */}
      {activeGoals.length > 0 && (
        <View style={styles.streakWrap}>
          <StreakWidget goal={activeGoals[0]} verifiedCount={0} />
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Compose */}
      <View style={styles.compose}>
        <Pressable style={styles.addBtn} onPress={() => setShowAS(true)}>
          <Feather name="plus" size={18} color={colors.primary} />
        </Pressable>
        <TextInput
          style={styles.input} placeholder="Message…"
          placeholderTextColor={colors.tertiary}
          value={draft} onChangeText={setDraft}
          multiline returnKeyType="send"
        />
        <Pressable style={styles.sendBtn} onPress={onSend}>
          <Feather name="arrow-up" size={16} color={onAccent} />
        </Pressable>
      </View>

      {/* Action Sheet */}
      <Modal visible={showAS} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowAS(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {[
              { icon: 'target', label: 'Propose a goal', action: () => { setShowAS(false); setShowGoal(true); } },
              { icon: 'camera', label: 'Check in',        action: () => { setShowAS(false); setShowCheckin(true); } },
              { icon: 'share',  label: 'Invite friends',  action: async () => {
                setShowAS(false);
                try {
                  await Share.share({
                    message: `Join my StakeUp group "${group.name}".\n\nPaste this ID in "Join with code":\n${group.id}`,
                  });
                } catch {}
              } },
            ].map(({ icon, label, action }) => (
              <Pressable key={label} style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]} onPress={action}>
                <View style={styles.sheetIcon}>
                  <Feather name={icon as any} size={18} color={colors.blue} />
                </View>
                <Text style={styles.sheetLabel}>{label}</Text>
                <Feather name="chevron-right" size={16} color={colors.tertiary} />
              </Pressable>
            ))}
            <Pressable style={styles.sheetCancel} onPress={() => setShowAS(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <NewGoalModal
        visible={showGoal} onClose={() => setShowGoal(false)}
        group={group} currentUser={currentUser} members={Object.values(members)}
      />
      <CheckinModal
        visible={showCheckin} onClose={() => setShowCheckin(false)}
        group={group} currentUser={currentUser} goals={activeGoals}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  streakWrap: { paddingHorizontal: 14, paddingTop: 8 },
  list: { padding: 14, gap: 6 },
  bubbleWrap: { alignItems: 'flex-start', marginVertical: 2 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubbleName: { fontSize: 11, color: colors.tertiary, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: colors.primary, lineHeight: 20 },
  bubbleTextMine: { color: onAccent, fontWeight: '600' },
  sys: { textAlign: 'center', fontSize: 12, color: colors.tertiary, paddingVertical: 6 },
  cardWrap: { marginVertical: 4 },
  compose: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 8, paddingBottom: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5, borderTopColor: colors.separator,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, color: colors.primary,
    borderWidth: 0.5, borderColor: colors.border, maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34, paddingHorizontal: 16, paddingTop: 8, gap: 6,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.elevated, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.elevated, borderRadius: radius.card, padding: 14,
  },
  sheetItemPressed: { opacity: 0.7 },
  sheetIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.blue + '22', alignItems: 'center', justifyContent: 'center',
  },
  sheetLabel: { flex: 1, fontSize: 16, color: colors.primary, fontWeight: '500' },
  sheetCancel: {
    backgroundColor: colors.elevated, borderRadius: radius.card,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  sheetCancelText: { fontSize: 16, fontWeight: '600', color: colors.blue },
});
