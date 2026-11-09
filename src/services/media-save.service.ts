/**
 * Saving a memory's photo or video to the device gallery. Shared by the
 * memory screen and the hold menu, so both ask, check and report the same way.
 *
 * Save-only access: Fold never reads the gallery, so it never asks to.
 */

import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Resolves true once the file is in the gallery. */
export async function saveToGallery(uri: string): Promise<boolean> {
  try {
    // Expo Go on Android can't write to the gallery; hand it to the share sheet.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo && Platform.OS === 'android') {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      return false;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow Fold to save to your gallery.');
      return false;
    }

    // Older memories may point at temp files the OS has since cleared.
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      Alert.alert('File unavailable', 'The original file is no longer on this device.');
      return false;
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('Saved', 'Saved to your gallery.');
    return true;
  } catch (error) {
    console.error('Save to gallery failed', error);
    Alert.alert('Couldn’t save', 'Please try again.');
    return false;
  }
}
