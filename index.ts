import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// This is REQUIRED for SDK 50+ when not using expo-router.
registerRootComponent(App);
