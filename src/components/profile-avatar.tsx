/**
 * ProfileAvatar — the identity mark on the profile header.
 *
 * Defaults to the solid orange disc (Fold's accent). Tapping lets the user set
 * a photo; once set, tapping offers change or remove. The photo is copied into
 * app storage so it survives the picker's temporary files being cleared.
 */

import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { resolveDocumentUri } from '@/db/journal-repository';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const DEFAULT_COLOR = '#FF4B00';

async function removeFile(uri: string) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.error('Failed to remove old avatar', error);
  }
}

export function ProfileAvatar({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  const storedUri = useSettingsStore((state) => state.settings.avatarUri);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const avatarUri = storedUri ? resolveDocumentUri(storedUri) : '';

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const ext = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/)?.[1]?.toLowerCase() ?? 'jpg';
      const dest = `${FileSystem.documentDirectory}avatar_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });

      const saved = await updateSetting('avatarUri', dest);
      if (!saved) {
        await removeFile(dest);
        Alert.alert("COULDN'T SAVE", 'Your photo was not saved. Please try again.');
        return;
      }
      haptic.success();
      if (avatarUri) await removeFile(avatarUri);
    } catch (error) {
      console.error('Failed to set avatar', error);
      haptic.error();
      Alert.alert("COULDN'T SET PHOTO", 'Please try a different photo.');
    }
  };

  const removePhoto = async () => {
    const previous = avatarUri;
    if (await updateSetting('avatarUri', '')) {
      haptic.tap();
      await removeFile(previous);
    }
  };

  const handlePress = () => {
    haptic.tap();
    if (!avatarUri) {
      pickPhoto();
      return;
    }
    Alert.alert('PROFILE PHOTO', undefined, [
      { text: 'Choose new photo', onPress: pickPhoto },
      { text: 'Remove photo', style: 'destructive', onPress: removePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const radius = size / 2;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={(44 - size) / 2}
      accessibilityRole="button"
      accessibilityLabel={avatarUri ? 'Change profile photo' : 'Add profile photo'}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={[styles.photo, { width: size, height: size, borderRadius: radius, borderColor: theme.border }]}
          contentFit="cover"
          transition={160}
        />
      ) : (
        <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: DEFAULT_COLOR }} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
