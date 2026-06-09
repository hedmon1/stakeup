// ── Firebase App Check ─────────────────────────────────────────────────────────
// App Check attests that requests come from YOUR genuine app binary (not a
// script hitting your Firebase project directly). On iOS it uses Apple's App
// Attest; on Android, Play Integrity.
//
// The Firebase JS SDK cannot mint native attestation tokens on its own, so we
// bridge: the native @react-native-firebase/app-check module produces the real
// token, and we feed it to the JS SDK via a CustomProvider. The JS SDK then
// attaches that token to its Firestore/Storage/Auth requests.
//
// IMPORTANT: this requires a native build (EAS dev build or App Store build).
// It is a NO-OP in Expo Go, since the native module isn't present there.
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { app } from './firebase';

let initialized = false;

export async function setupAppCheck(): Promise<void> {
  if (initialized) return;

  // App Check relies on a native module (@react-native-firebase/app-check) that
  // only exists in a dev/standalone build. In Expo Go (StoreClient) the module
  // is absent and even REQUIRING it throws "Native module RNFBAppModule not
  // found", so bail out before touching it.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  // Dynamically require the native module so the JS bundle still runs in
  // Expo Go (where the module is absent) without crashing at import time.
  let rnAppCheck: any;
  try {
    rnAppCheck = require('@react-native-firebase/app-check').default;
  } catch {
    // Native module unavailable (e.g. Expo Go) — skip App Check.
    return;
  }
  if (!rnAppCheck) return;

  try {
    // Configure the native provider: App Attest on iOS, Play Integrity on
    // Android, with debug providers for the simulator/emulator.
    const provider = rnAppCheck().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: undefined,
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      },
    });
    await rnAppCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    // Bridge the native token into the JS SDK so JS-SDK Firestore/Storage calls
    // carry an App Check token too.
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token, expireTimeMillis } = await rnAppCheck().getToken();
          return { token, expireTimeMillis };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });

    initialized = true;
  } catch (e) {
    // Never let App Check setup crash the app; log and continue unprotected.
    console.warn('App Check init skipped:', e);
  }
}
