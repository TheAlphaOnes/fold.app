/**
 * Playback for a memory's song or voice note, with the feed's rules: it
 * auto-plays (if the setting is on) only while its memory is the active
 * one on a screen that's in front, pauses when it isn't, and a tap toggles.
 * Moved out of MemoryCard so canvas stickers behave the same.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useIsFocused, usePathname } from 'expo-router';

import { useAudioFocus } from '@/hooks/use-audio-focus';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { track } from '@/services/analytics';

export function useMemoryAudio(uri: string | null, compositionId: number, enabled: boolean) {
  const player = useAudioPlayer(enabled ? uri : null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = enabled && status.playing;
  const isLoaded = status.isLoaded;

  const activeCompositionId = useJournalStore((s) => s.activeCompositionId);
  const isAppVisible = useJournalStore((s) => s.isAppVisible);
  const autoPlayMusic = useSettingsStore((s) => s.settings.autoPlayMusic);
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const isPlayableScreen =
    isFocused && (pathname === '/' || pathname.startsWith('/time-machine') || pathname.startsWith('/memory'));

  const hasAutoPlayed = useRef(false);
  const hasTracked = useRef(false);
  const claimAudio = useAudioFocus(() => player.pause());

  const play = useCallback(() => {
    if (!isLoaded) return;
    try {
      const duration = player.duration ?? 0;
      if (duration > 0 && (player.currentTime ?? 0) >= duration - 0.5) player.seekTo(0);
      claimAudio();
      player.play();
    } catch {
      // A player torn down mid-call; nothing to recover.
    }
  }, [isLoaded, player, claimAudio]);

  useEffect(() => {
    if (!enabled) return;
    const active = activeCompositionId === compositionId && isPlayableScreen;
    if (active) {
      if (isAppVisible && autoPlayMusic && !hasAutoPlayed.current && !isPlaying && isLoaded) {
        hasAutoPlayed.current = true;
        play();
        if (!hasTracked.current) {
          track('audio_played', { surface: 'card', auto_play: true });
          hasTracked.current = true;
        }
      }
    } else {
      hasAutoPlayed.current = false;
      if (isPlaying) player.pause();
    }
  }, [enabled, activeCompositionId, compositionId, isPlayableScreen, isAppVisible, autoPlayMusic, isPlaying, isLoaded, player, play]);

  useEffect(
    () => () => {
      try {
        player.pause();
      } catch {
        // Already released.
      }
    },
    [player],
  );

  const toggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
      return;
    }
    play();
    if (!hasTracked.current) {
      track('audio_played', { surface: 'card', auto_play: false });
      hasTracked.current = true;
    }
  }, [isPlaying, player, play]);

  return { isPlaying, toggle };
}
