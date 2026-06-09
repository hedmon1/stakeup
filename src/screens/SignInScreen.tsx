import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, radius, fonts, brutalBtn, onAccent } from '../theme';
import {
  signInWithEmail, signUpWithEmail, signInWithApple,
  sendPasswordReset, isAppleAuthAvailable, authErrorMessage,
} from '../services/auth';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode,     setMode]     = useState<Mode>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [appleOk,  setAppleOk]  = useState(false);

  useEffect(() => { isAppleAuthAvailable().then(setAppleOk); }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit  = emailValid && password.length >= 6 && !loading;

  const handleEmail = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (mode === 'signup') await signUpWithEmail(email, password);
      else                   await signInWithEmail(email, password);
      // Navigation auto-advances on the auth state change.
    } catch (e: any) {
      const msg = authErrorMessage(e);
      if (msg) Alert.alert('Sign-in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      const msg = authErrorMessage(e);
      if (msg) Alert.alert('Apple sign-in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    if (!emailValid) {
      Alert.alert('Reset password', 'Enter your email above first, then tap “Forgot password”.');
      return;
    }
    sendPasswordReset(email)
      .then(() => Alert.alert('Check your email', `We sent a password reset link to ${email.trim()}.`))
      .catch(e => Alert.alert('Could not send reset', authErrorMessage(e)));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.wordmark}>StakeUp</Text>
          <Text style={styles.tagline}>Keep your friends accountable — for real.</Text>
        </View>

        {/* Email / password */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.tertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.tertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          />

          <Pressable
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={handleEmail}
            disabled={!canSubmit}>
            {loading
              ? <ActivityIndicator color={onAccent} />
              : <Text style={styles.primaryBtnText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>}
          </Pressable>

          {mode === 'signin' && (
            <Pressable onPress={handleForgot} hitSlop={8}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        {/* Divider */}
        {appleOk && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={radius.button}
              style={styles.appleBtn}
              onPress={handleApple}
            />
          </>
        )}

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} hitSlop={8}>
            <Text style={styles.toggleLink}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 28, paddingVertical: 40 },

  hero:     { alignItems: 'center', gap: 14 },
  wordmark: { fontFamily: fonts.pixel, fontSize: 30, color: colors.green, textAlign: 'center', lineHeight: 38 },
  tagline:  { fontFamily: fonts.term, fontSize: 20, color: colors.secondary, textAlign: 'center' },

  form: {
    backgroundColor: colors.card, borderRadius: radius.card,
    padding: 20, gap: 12,
    borderWidth: 0.5, borderColor: colors.border,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  input: {
    backgroundColor: colors.elevated, borderRadius: radius.small,
    padding: 14, fontSize: 16, color: colors.primary,
    borderWidth: 0.5, borderColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.green, borderRadius: radius.button,
    padding: 16, alignItems: 'center', marginTop: 4, ...brutalBtn,
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
  link: { fontSize: 14, color: colors.blue, textAlign: 'center', marginTop: 4 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider:    { flex: 1, height: 0.5, backgroundColor: colors.separator },
  dividerText:{ fontSize: 13, color: colors.tertiary },

  appleBtn: { height: 52, width: '100%' },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  toggleText: { fontSize: 14, color: colors.secondary },
  toggleLink: { fontSize: 14, fontWeight: '700', color: colors.blue },
});
