/**
 * Fold — Babel configuration
 *
 * Uses babel-preset-expo which includes all necessary plugins for
 * Expo Router, React Native, and the React Compiler.
 *
 * @see https://docs.expo.dev/versions/v57.0.0/config/metro/
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
