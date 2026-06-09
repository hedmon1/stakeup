import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, fonts, brutalBtn, onAccent } from '../theme';
import { FriendGroup, AppUser } from '../types';
import { listenGroups, createGroup, joinGroup } from '../services/firestore';

export default function GroupsListScreen({ navigation, route }: any) {
  const { currentUser }: { currentUser: AppUser } = route.params;
  const [groups, setGroups]     = useState<FriendGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [groupName,  setGroupName]  = useState('');
  const [joinCode,   setJoinCode]   = useState('');

  useEffect(() => listenGroups(currentUser.id, setGroups), [currentUser.id]);

  const onCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      await createGroup(groupName.trim(), currentUser.id);
      setGroupName(''); setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Could not create group', e?.message ?? 'Please try again.');
    }
  };

  const onJoinGroup = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinGroup(joinCode.trim(), currentUser.id);
      setJoinCode(''); setShowJoin(false);
    } catch (e: any) {
      Alert.alert('Could not join group', e?.message ?? 'Double-check the invite code and try again.');
    }
  };

  const renderGroup = ({ item }: { item: FriendGroup }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => navigation.navigate('GroupHome', { group: item, currentUser })}>
      <View style={[styles.avatar, { backgroundColor: colors.blue }]}>
        <Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSub}>{item.memberIds.length} members</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.tertiary} />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        renderItem={renderGroup}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={44} color={colors.tertiary} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>Create one or join with an invite code.</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={() => setShowCreate(true)}>
              <Feather name="plus" size={16} color={colors.blue} />
              <Text style={styles.actionBtnText}>New group</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowJoin(true)}>
              <Feather name="link" size={16} color={colors.blue} />
              <Text style={styles.actionBtnText}>Join with code</Text>
            </Pressable>
          </View>
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New group</Text>
            <TextInput style={styles.modalInput} placeholder="Group name"
              placeholderTextColor={colors.tertiary} value={groupName} onChangeText={setGroupName}
              autoFocus returnKeyType="done" onSubmitEditing={onCreateGroup} maxLength={80} />
            <Pressable style={styles.modalBtn} onPress={onCreateGroup}>
              <Text style={styles.modalBtnText}>Create</Text>
            </Pressable>
            <Pressable onPress={() => setShowCreate(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Modal */}
      <Modal visible={showJoin} transparent animationType="slide" onRequestClose={() => setShowJoin(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Join group</Text>
            <TextInput style={styles.modalInput} placeholder="Group ID / invite code"
              placeholderTextColor={colors.tertiary} value={joinCode} onChangeText={setJoinCode}
              autoCapitalize="none" autoCorrect={false} autoFocus returnKeyType="done" onSubmitEditing={onJoinGroup} />
            <Pressable style={styles.modalBtn} onPress={onJoinGroup}>
              <Text style={styles.modalBtnText}>Join</Text>
            </Pressable>
            <Pressable onPress={() => setShowJoin(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingTop: 20, gap: 0 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.card, borderRadius: radius.card,
    padding: 13, borderWidth: 0.5, borderColor: colors.border,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.blue },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: colors.card, padding: 14, borderRadius: radius.card,
    borderWidth: 0.5, borderColor: colors.border,
  },
  rowPressed: { opacity: 0.7 },
  avatar: { width: 50, height: 50, borderRadius: radius.avatar, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  avatarText: { fontFamily: fonts.pixel, fontSize: 13, color: onAccent },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.primary },
  rowSub:   { fontSize: 13, color: colors.secondary, marginTop: 2 },
  sep: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.primary },
  emptySub:   { fontSize: 14, color: colors.secondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 16, color: colors.primary, marginBottom: 4 },
  modalInput: {
    backgroundColor: colors.elevated, borderRadius: radius.card, padding: 14,
    fontSize: 16, color: colors.primary, borderWidth: 0.5, borderColor: colors.border,
  },
  modalBtn: { backgroundColor: colors.green, borderRadius: radius.button, padding: 14, alignItems: 'center', ...brutalBtn },
  modalBtnText: { fontSize: 16, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalCancel: { textAlign: 'center', color: colors.secondary, fontSize: 15, padding: 8 },
});
