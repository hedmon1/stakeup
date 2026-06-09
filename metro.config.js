// Metro config — required for Firebase JS SDK to work with Expo SDK 53+
// See: https://github.com/firebase/firebase-js-sdk/issues/8088
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase uses .cjs files for its react-native build
config.resolver.sourceExts.push('cjs');

// Disable strict package.json "exports" — Firebase 10.x's component
// registration depends on legacy resolution
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
