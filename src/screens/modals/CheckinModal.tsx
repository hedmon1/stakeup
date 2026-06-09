import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, Image, Alert, ActivityIndicator,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { FriendGroup, AppUser, Goal } from '../../types';
import { submitCheckin } from '../../services/firestore';
import { uploadCheckinPhoto } from '../../services/storage';

type Props = {
  visible: boolean;
  onClose: () => void;
  group: FriendGroup;
  currentUser: AppUser;
  goals: Goal[];
};

export default function CheckinModal({ visible, onClose, group, currentUser, goals }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [photo,        setPhoto]        = useState<string | null>(null);
  const [note,         setNote]         = useState('');
  const [uploading,    setUploading]    = useState(false);

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access in Settings to add proof photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const submit = async () => {
    if (!selectedGoal) {
      Alert.alert('Pick a goal first.');
      return;
    }
    setUploading(true);
    try {
      let photoPath: string | undefined;
      if (photo) {
        try {
          photoPath = await uploadCheckinPhoto(group.id, selectedGoal.id, currentUser.id, photo);
        } catch {
          // Don't block the check-in if the upload fails — record it without the photo.
          Alert.alert('Photo upload skipped', "We couldn't upload your photo, but your check-in was recorded.");
        }
      }
      await submitCheckin(group.id, selectedGoal.id, currentUser.id, photoPath, note);
      setPhoto(null); setSelectedGoal(null); setNote('');
      onClose();
    } catch (e: any) {
      Alert.alert('Submit failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setPhoto(null); setSelectedGoal(null); setNote(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>

        {/* Header */}
        <View style={styles.nav}>
          <Pressable onPress={reset}><Text style={styles.navBtn}>Cancel</Text></Pressable>
          <Text style={styles.navTitle}>Check In</Text>
          <Pressable onPress={submit} disabled={!selectedGoal || uploading}>
            <Text style={[styles.navBtn, styles.navBold, (!selectedGoal || uploading) && { opacity: 0.4 }]}>
              Submit
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Goal picker */}
          <Text style={styles.label}>WHICH GOAL?</Text>
          {goals.length > 0
            ? goals.map(g => {
                const isSelected = selectedGoal?.id === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[styles.goalRow, isSelected && styles.goalRowSelected]}
                    onPress={() => setSelectedGoal(g)}>
                    <Feather name="target" size={18} color={isSelected ? colors.blue : colors.secondary} />
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalName, isSelected && { color: colors.blue }]}>{g.title}</Text>
                      <Text style={styles.goalSub}>{g.pointsPerCheckin} pts per check-in</Text>
                    </View>
                    {isSelected && <Feather name="check-circle" size={18} color={colors.blue} />}
                  </Pressable>
                );
              })
            : (
              <View style={styles.empty}>
                <Feather name="target" size={28} color={colors.tertiary} />
                <Text style={styles.emptyTitle}>No active goals yet</Text>
                <Text style={styles.emptySub}>Propose a goal first, then come back to check in.</Text>
              </View>
            )
          }

          {/* Optional photo */}
          <Text style={[styles.label, { marginTop: 24 }]}>PROOF PHOTO (OPTIONAL)</Text>
          {photo
            ? <View style={styles.photoWrap}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <Pressable style={styles.photoChip} onPress={openCamera}>
                  <Feather name="refresh-cw" size={13} color="#fff" />
                  <Text style={styles.photoChipText}>Retake</Text>
                </Pressable>
                <Pressable style={[styles.photoChip, { left: 12, right: undefined }]} onPress={() => setPhoto(null)}>
                  <Feather name="x" size={13} color="#fff" />
                  <Text style={styles.photoChipText}>Remove</Text>
                </Pressable>
              </View>
            : <Pressable style={styles.cameraBtn} onPress={openCamera}>
                <Feather name="camera" size={28} color={colors.secondary} />
                <Text style={styles.cameraBtnText}>Tap to take a proof photo</Text>
                <Text style={styles.cameraBtnSub}>Your group will see this photo when they vote.</Text>
              </Pressable>
          }

          {/* Note */}
          <Text style={[styles.label, { marginTop: 24 }]}>NOTE (OPTIONAL)</Text>
          <View style={styles.noteWrap}>
            <TextInput
              style={styles.noteInput}
              placeholder="Quick explanation — what did you do? Anything to brag about?"
              placeholderTextColor={colors.tertiary}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
              maxLength={240}
            />
            <Text style={styles.noteCount}>{note.length}/240</Text>
          </View>

          {uploading && <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.separator },
  navTitle: { fontSize: 17, fontWeight: '600', color: colors.primary },
  navBtn: { fontSize: 16, color: colors.blue },
  navBold: { fontWeight: '700' },
  content: { padding: 16, paddingBottom: 80 },
  label: { fontSize: 12, fontWeight: '700', color: colors.tertiary, letterSpacing: 0.5, marginBottom: 8 },

  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  goalRowSelected: { borderColor: colors.blue, backgroundColor: colors.blue + '12' },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  goalSub:  { fontSize: 12, color: colors.secondary, marginTop: 2 },

  empty: {
    alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: radius.card, padding: 24,
    borderWidth: 0.5, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.primary, marginTop: 4 },
  emptySub:   { fontSize: 13, color: colors.secondary, textAlign: 'center' },

  cameraBtn: {
    backgroundColor: colors.card, borderRadius: radius.card,
    height: 180, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: colors.border,
  },
  cameraBtnText: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  cameraBtnSub:  { fontSize: 11, color: colors.tertiary, textAlign: 'center', paddingHorizontal: 30 },

  photoWrap: { borderRadius: radius.card, overflow: 'hidden', height: 260 },
  photo: { width: '100%', height: '100%' },
  photoChip: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  photoChipText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  noteWrap: {
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 0.5, borderColor: colors.border,
    padding: 14,
  },
  noteInput: {
    fontSize: 15, color: colors.primary, minHeight: 80, lineHeight: 21,
  },
  noteCount: { fontSize: 11, color: colors.tertiary, textAlign: 'right', marginTop: 6 },
});
