/**
 * Fold — Metro configuration
 *
 * Uses Expo's default Metro config, which includes the expo-router
 * resolver and all necessary aliases for the project to bundle correctly.
 *
 * @see https://docs.expo.dev/versions/v57.0.0/config/metro/
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
