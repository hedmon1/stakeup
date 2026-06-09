import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import Navigation from './src/navigation';
import { setupAppCheck } from './src/config/appcheck';

// ─── Error boundary so we see the real error instead of "main not registered" ──
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
          <Text style={styles.title}>App crashed</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Load the retro arcade fonts used for headings/brand (matches stakeupapp.com).
  // We render once they're ready OR if loading errors — never block forever, and
  // any text referencing these falls back to the system font until loaded.
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P: require('./assets/fonts/PressStart2P-Regular.ttf'),
    VT323:        require('./assets/fonts/VT323-Regular.ttf'),
  });

  // Attest the app binary to Firebase before it makes data calls. No-ops in
  // Expo Go (native module absent); active in EAS dev/production builds.
  React.useEffect(() => {
    setupAppCheck().catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.root} />;
  }

  return (
    <ErrorBoundary>
      <Navigation />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0a1f' },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: '700', color: '#ff4d4d', marginBottom: 12 },
  msg:   { fontSize: 15, color: '#f3f0ff', marginBottom: 16, lineHeight: 22 },
  stack: { fontSize: 11, color: '#7c77ad', fontFamily: 'Courier' },
});
