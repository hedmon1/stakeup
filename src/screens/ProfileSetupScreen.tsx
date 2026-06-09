import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, brutalBtn, onAccent } from '../theme';
import { completeProfile } from '../services/auth';
import { uploadProfilePhoto } from '../services/storage';

export default function ProfileSetupScreen({ route }: any) {
  const { uid } = route.params;
  const [name,   setName]   = useState('');
  const [photo,  setPhoto]  = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let photoURL: string | undefined;
      if (photo) {
        try {
          photoURL = await uploadProfilePhoto(uid, photo);
        } catch {
          // Don't block account creation if the upload fails (e.g. Storage not enabled).
          Alert.alert('Photo upload skipped', "We couldn't upload your picture, but your profile was saved. You can add one later from your profile.");
        }
      }
      await completeProfile(uid, name.trim(), photoURL);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.sub}>Add a photo and your name to get started</Text>

        {/* Avatar picker */}
        <Pressable style={styles.avatarWrap} onPress={pickPhoto} disabled={saving}>
          {photo
            ? <Image source={{ uri: photo }} style={styles.avatar} />
            : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Feather name="camera" size={28} color={colors.secondary} />
              </View>
            )}
          <View style={styles.avatarBadge}>
            <Feather name={photo ? 'edit-2' : 'plus'} size={13} color={onAccent} />
          </View>
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.tertiary}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={40}
        />

        <Pressable
          style={[styles.btn, (!name.trim() || saving) && styles.btnDisabled]}
          onPress={save}
          disabled={!name.trim() || saving}>
          {saving
            ? <ActivityIndicator color={onAccent} />
            : <Text style={styles.btnText}>Continue</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: 28, gap: 16, justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.secondary, textAlign: 'center', marginTop: -8 },

  avatarWrap: { alignSelf: 'center', marginVertical: 8 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: {
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },

  input: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: 16,
    fontSize: 16, color: colors.primary, borderWidth: 0.5, borderColor: colors.border,
  },
  btn: { backgroundColor: colors.green, borderRadius: radius.button, padding: 16, alignItems: 'center', ...brutalBtn },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
});
