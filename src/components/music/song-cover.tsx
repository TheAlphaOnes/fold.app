/**
 * SongCover — a song on a memory, as its album cover: a still square
 * sleeve (rounded corners, a hairline edge, a soft shadow), a play/pause
 * button in its corner, and a thin line along its foot that fills as the
 * preview plays. Nothing spins or breathes: the cover sits like a record
 * sleeve on a table, and the button says what a tap will do.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Pause, Play } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';

interface SongCoverProps {
  uri: string;
  size: number;
  playing: boolean;
  /** 0 … 1 through the preview. */
  progress: number;
  /** Show the play/pause button (off in still exports). */
  controls: boolean;
}

export function SongCover({ uri, size, playing, progress, controls }: SongCoverProps) {
  const theme = useTheme();
  const radius = size * 0.06;
  const button = Math.max(22, size * 0.24);
  const Icon = playing ? Pause : Play;
  return (
    <View style={[styles.shadow, { width: size, height: size, borderRadius: radius }]}>
      <View style={[styles.sleeve, { borderRadius: radius }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        {progress > 0 && (
          <View style={[styles.track, { height: Math.max(2, size * 0.018) }]}>
            <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: theme.accentWarm }} />
          </View>
        )}
      </View>
      {controls && (
        <View
          style={[styles.button, { width: button, height: button, borderRadius: button / 2, right: size * 0.05, bottom: size * 0.07 }]}
          pointerEvents="none"
        >
          <Icon size={button * 0.42} color="#FFFFFF" fill="#FFFFFF" style={playing ? undefined : { marginLeft: button * 0.06 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  sleeve: { flex: 1, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFF40', backgroundColor: '#111111' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF33' },
  button: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000A6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFF55' },
});
