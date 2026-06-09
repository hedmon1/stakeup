import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Image, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, GoalTier, tierColor, onAccent } from '../theme';
import { AppUser, FriendGroup, Member } from '../types';
import { listenGroups, listenMembers } from '../services/firestore';
import { signOut, updateUserPhoto, isEmailVerified, resendEmailVerification } from '../services/auth';
import { uploadProfilePhoto } from '../services/storage';

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <View style={[styles.stat, { borderColor: accent + '33' }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────
function GroupRow({ group, points }: { group: FriendGroup; points: number }) {
  return (
    <View style={styles.groupRow}>
      <View style={styles.groupAvatar}>
        <Feather name="users" size={16} color={colors.blue} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupSub}>{group.memberIds.length} members</Text>
      </View>
      <View style={styles.groupPts}>
        <Text style={styles.groupPtsNum}>{points}</Text>
        <Text style={styles.groupPtsLabel}>pts</Text>
      </View>
    </View>
  );
}

// ── Tier badge row ────────────────────────────────────────────────────────────
function TierRow({ tier, count }: { tier: GoalTier; count: number }) {
  const c = tierColor(tier);
  return (
    <View style={styles.tierRow}>
      <View style={[styles.tierDot, { backgroundColor: c }]} />
      <Text style={[styles.tierLabel, { color: c }]}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Text>
      <Text style={styles.tierCount}>{count} goals</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen({ route }: any) {
  const { currentUser }: { currentUser: AppUser } = route.params;
  const insets = useSafeAreaInsets();

  const [groups,  setGroups]  = useState<FriendGroup[]>([]);
  const [memberships, setMemberships] = useState<Record<string, Member>>({});
  const [photoURL, setPhotoURL] = useState<string | undefined>(currentUser.photoURL);
  const [uploading, setUploading] = useState(false);
  const [verified] = useState(isEmailVerified());
  const [sentVerify, setSentVerify] = useState(false);

  const resendVerify = async () => {
    try {
      await resendEmailVerification();
      setSentVerify(true);
      Alert.alert('Verification sent', 'Check your inbox for the verification link.');
    } catch (e: any) {
      Alert.alert('Could not send', e?.message ?? 'Try again later.');
    }
  };

  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to change your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(currentUser.id, result.assets[0].uri);
      await updateUserPhoto(currentUser.id, url);
      setPhotoURL(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`); // bust image cache
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not update your photo. Make sure Firebase Storage is enabled.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    return listenGroups(currentUser.id, gs => {
      setGroups(gs);
      // For each group, fetch the member doc to get per-group points
      gs.forEach(g => {
        listenMembers(g.id, ms => {
          const me = ms.find(m => m.id === currentUser.id);
          if (me) {
            setMemberships(prev => ({ ...prev, [g.id]: me }));
          }
        });
      });
    });
  }, [currentUser.id]);

  const totalPoints = Object.values(memberships).reduce((s, m) => s + m.points, 0);
  const groupCount  = groups.length;

  const handleSignOut = () =>
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.avatarWrap} onPress={changePhoto} disabled={uploading}>
          {photoURL
            ? <Image source={{ uri: photoURL }} style={styles.avatar} />
            : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          }
          {/* Edit / loading badge */}
          <View style={styles.editBadge}>
            {uploading
              ? <ActivityIndicator size="small" color={onAccent} />
              : <Feather name="camera" size={13} color={onAccent} />}
          </View>
        </Pressable>
        <Text style={styles.name}>{currentUser.displayName}</Text>
        {currentUser.phone && (
          <Text style={styles.phone}>{currentUser.phone}</Text>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatTile label="Total pts"    value={totalPoints} accent={colors.blue}   />
        <StatTile label="Groups"       value={groupCount}  accent={colors.purple} />
        <StatTile label="Member since" value={currentUser.createdAt.getFullYear()} accent={colors.green} />
      </View>

      {/* Email verification banner */}
      {!verified && (
        <Pressable style={styles.verifyBanner} onPress={resendVerify}>
          <Feather name="mail" size={18} color={colors.orange} />
          <Text style={styles.verifyText}>
            {sentVerify
              ? 'Verification email sent — check your inbox.'
              : 'Verify your email to secure your account. Tap to resend.'}
          </Text>
          {!sentVerify && <Feather name="chevron-right" size={16} color={colors.tertiary} />}
        </Pressable>
      )}

      {/* Groups breakdown */}
      {groups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>YOUR GROUPS</Text>
          <View style={styles.card}>
            {groups.map((g, i) => (
              <View key={g.id}>
                <GroupRow group={g} points={memberships[g.id]?.points ?? 0} />
                {i < groups.length - 1 && <View style={styles.sep} />}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Tier breakdown placeholder */}
      <Text style={styles.sectionTitle}>GOALS BY DIFFICULTY</Text>
      <View style={styles.card}>
        <TierRow tier="hard"   count={0} />
        <View style={styles.sep} />
        <TierRow tier="medium" count={0} />
        <View style={styles.sep} />
        <TierRow tier="easy"   count={0} />
        <Text style={styles.tierNote}>Complete goals to see your breakdown</Text>
      </View>

      {/* Motivational banner */}
      <View style={styles.banner}>
        <Feather name="zap" size={18} color={colors.orange} />
        <Text style={styles.bannerText}>
          Keep checking in — your streak is your reputation.
        </Text>
      </View>

      {/* Sign out */}
      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Feather name="log-out" size={16} color={colors.red} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.version}>StakeUp v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 60 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: { alignItems: 'center', paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: colors.blue,
  },
  avatarFallback: {
    backgroundColor: colors.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.primary },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  name:  { fontSize: 22, fontWeight: '700', color: colors.primary },
  phone: { fontSize: 14, color: colors.secondary, marginTop: 4 },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24 },
  stat: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.card,
    padding: 14, alignItems: 'center', borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.secondary, marginTop: 3, textAlign: 'center' },

  // ── Verify banner ───────────────────────────────────────────────────────────
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: colors.orange + '18',
    borderRadius: radius.card, padding: 14,
    borderWidth: 1, borderColor: colors.orange + '33',
  },
  verifyText: { flex: 1, fontSize: 13, color: colors.secondary, lineHeight: 18 },

  // ── Section ───────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.tertiary, letterSpacing: 0.5,
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
  },
  card: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: colors.card, borderRadius: radius.card,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  sep: { height: 0.5, backgroundColor: colors.separator, marginLeft: 16 },

  // ── Group rows ────────────────────────────────────────────────────────────
  groupRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  groupAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.blue + '22', alignItems: 'center', justifyContent: 'center',
  },
  groupInfo:    { flex: 1 },
  groupName:    { fontSize: 15, fontWeight: '600', color: colors.primary },
  groupSub:     { fontSize: 12, color: colors.tertiary, marginTop: 2 },
  groupPts:     { alignItems: 'flex-end' },
  groupPtsNum:  { fontSize: 18, fontWeight: '800', color: colors.blue },
  groupPtsLabel:{ fontSize: 11, color: colors.secondary },

  // ── Tiers ─────────────────────────────────────────────────────────────────
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierLabel: { fontSize: 14, fontWeight: '700', width: 62 },
  tierCount: { fontSize: 14, color: colors.secondary },
  tierNote:  { fontSize: 12, color: colors.tertiary, textAlign: 'center', padding: 12, paddingTop: 0 },

  // ── Banner ────────────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: colors.orange + '18',
    borderRadius: radius.card, padding: 14,
    borderWidth: 1, borderColor: colors.orange + '33',
  },
  bannerText: { flex: 1, fontSize: 13, color: colors.secondary, lineHeight: 18 },

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, padding: 16,
    backgroundColor: colors.red + '18',
    borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.red + '33',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.red },

  version: { textAlign: 'center', fontSize: 12, color: colors.tertiary, marginTop: 16 },
});
