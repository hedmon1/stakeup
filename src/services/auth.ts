import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as fbSignOut,
  onAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types';

// ── Email / password ─────────────────────────────────────────────────────────
export async function signUpWithEmail(email: string, password: string): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Fire off a verification email; don't block sign-up if it fails to send.
  try { await sendEmailVerification(cred.user); } catch {}
  return cred.user.uid;
}

export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('You are not signed in.');
  await sendEmailVerification(auth.currentUser);
}

// True for verified email users and for providers Apple treats as verified.
export function isEmailVerified(): boolean {
  const u = auth.currentUser;
  if (!u) return false;
  if (u.emailVerified) return true;
  // Apple / OAuth accounts are considered verified by the provider.
  return u.providerData.some(p => p.providerId === 'apple.com');
}

export async function signInWithEmail(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user.uid;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

// ── Sign in with Apple ─────────────────────────────────────────────────────────
// Requires a dev/production build (does NOT work in Expo Go) and Apple enabled
// in Firebase Console → Authentication → Sign-in method.
export async function isAppleAuthAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<{ uid: string; displayName?: string }> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }
  const provider = new OAuthProvider('apple.com');
  const firebaseCred = provider.credential({ idToken: credential.identityToken });
  const result = await signInWithCredential(auth, firebaseCred);

  // Apple only returns the user's name on the FIRST sign-in — capture it so we
  // can seed the profile and skip the name step.
  const given = credential.fullName?.givenName ?? '';
  const family = credential.fullName?.familyName ?? '';
  const displayName = `${given} ${family}`.trim() || undefined;
  const uid = result.user.uid;

  // First Apple sign-in with a name: seed the user doc so the profile-setup
  // step is skipped. (Apple never returns the name again on later sign-ins.)
  if (displayName) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) await completeProfile(uid, displayName);
  }
  return { uid, displayName };
}

// ── Profile ────────────────────────────────────────────────────────────────────
export async function completeProfile(
  uid: string,
  displayName: string,
  photoURL?: string
): Promise<AppUser> {
  const user: AppUser = {
    id: uid,
    displayName,
    ...(photoURL ? { photoURL } : {}),
    createdAt: new Date(),
    fcmTokens: [],
  };
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName,
      ...(photoURL ? { photoURL } : {}),
      fcmTokens: [],
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return user;
}

export async function updateUserPhoto(uid: string, photoURL: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { photoURL }, { merge: true });
}

export async function markTutorialSeen(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { tutorialSeen: true }, { merge: true });
}

export async function fetchUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    displayName: d.displayName,
    photoURL: d.photoURL,
    phone: d.phone,
    createdAt: d.createdAt?.toDate() ?? new Date(),
    fcmTokens: d.fcmTokens ?? [],
    tutorialSeen: d.tutorialSeen ?? false,
  };
}

// ── Session ──────────────────────────────────────────────────────────────────
export function signOut() { return fbSignOut(auth); }

export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// ── Friendly error messages ──────────────────────────────────────────────────
export function authErrorMessage(e: any): string {
  const code = e?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':          return 'That email address looks invalid.';
    case 'auth/email-already-in-use':   return 'An account already exists for that email. Try signing in.';
    case 'auth/weak-password':          return 'Password should be at least 6 characters.';
    case 'auth/missing-password':       return 'Please enter a password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':         return 'Incorrect email or password.';
    case 'auth/too-many-requests':      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'ERR_REQUEST_CANCELED':        return '';            // user dismissed Apple sheet
    default:                            return e?.message || 'Something went wrong. Please try again.';
  }
}
