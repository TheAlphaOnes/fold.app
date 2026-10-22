const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Leaves the Android main activity's orientation unspecified, while
 * app.json's "orientation": "portrait" keeps applying to iOS.
 *
 * Android 16 ignores orientation locks on large screens and Play flags apps
 * that declare them. Phones are locked to portrait at runtime instead
 * (src/hooks/use-phone-portrait-lock.ts), so tablets and foldables can rotate.
 */
const withAndroidFreeOrientation = (config) =>
  withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity.$['android:screenOrientation'] = 'unspecified';
    return config;
  });

module.exports = withAndroidFreeOrientation;
