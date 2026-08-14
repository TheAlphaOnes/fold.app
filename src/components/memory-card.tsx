import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, useWindowDimensions, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import type { Composition, MediaElement } from '@/types/journal';
import { DraggableSticker } from '@/components/draggable-sticker';
import { Image } from 'expo-image';
import { PlayCircle, Share, MapPin } from 'lucide-react-native';
import { VinylRecord } from '@/components/vinyl-record';
import { Logo } from '@/components/logo';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

interface MemoryCardProps {
  item: Composition;
  height: number;
  onUpdatePositions: (id: number, updatedMedia: MediaElement[]) => void;
  isExporting?: boolean;
}

function SingleAudioCard({ media, cardWidth, theme }: { media: MediaElement, cardWidth: number, theme: any }) {
  const player = useAudioPlayer(media.uri);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (e) {}
    };
  }, [player]);

  const handlePress = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <Pressable style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }} onPress={handlePress}>
      <VinylRecord 
        size={cardWidth - 80} 
        isPlaying={isPlaying} 
        isRecording={false} 
        imageUrl={media.metadata?.artwork?.replace('100x100', '600x600')} 
      />
      {media.metadata ? (
        <View style={{ alignItems: 'center', marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
            {media.metadata.title}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '500', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
            {media.metadata.artist}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * MemoryCard — renders user content using one of three layouts:
 * 1. Text Only: Centered text.
 * 2. Single Media: Hero image framed with text below.
 * 3. Canvas Mode (Multi-Media): Text centered, multiple media stickers freely draggable around it.
 */
export function MemoryCard({ item, height, onUpdatePositions, isExporting }: MemoryCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  
  // Card has 21px padding on both sides based on the flatlist paddingHorizontal
  const cardWidth = width - 42;
  const isDark = theme.background === '#000000' || theme.background === '#111111';

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(item.createdAt));

  const hasMedia = item.mediaElements && item.mediaElements.length > 0;
  const isSingleMedia = item.mediaElements && item.mediaElements.length === 1;
  const hasText = item.textContent && item.textContent.trim().length > 0;

  // Generate video thumbnail for single-media video cards
  const singleMediaIsVideo = isSingleMedia && item.mediaElements[0].type === 'video';
  const videoThumbnailUri = useVideoThumbnail(
    singleMediaIsVideo ? item.mediaElements[0].uri : undefined
  );

  const handleDragEnd = (mediaId: string, newX: number, newY: number, newScale?: number) => {
    const updatedMedia = item.mediaElements.map((m) =>
      m.id === mediaId ? { ...m, x_pos: newX, y_pos: newY, scale: newScale ?? m.scale ?? 1 } : m
    );
    onUpdatePositions(item.id, updatedMedia);
  };

  return (
    <View
      style={[
        styles.card,
        {
          height,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        isExporting && { borderRadius: 0 },
      ]}
    >
      {/* LAYER 1: Stripes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DiagonalStripes color={isDark ? theme.border : "#D0D0D0"} opacity={isDark ? 0.12 : 0.5} animated />
      </View>

      {/* LAYER 2: Content Depending on Type */}
      <View style={{ flex: 1, zIndex: 1 }}>
        {!hasMedia && (
          <View style={styles.textWrapperAbsolute} pointerEvents="box-none">
            <Text style={[styles.textContent, { color: theme.text, fontFamily: item.fontFamily || 'JetBrainsMono-Regular', fontSize: item.fontSize || 21, lineHeight: (item.fontSize || 21) * 1.5 }]} numberOfLines={13} ellipsizeMode="tail">
              {hasText ? item.textContent.trim() : '[NO TEXT SAVED]'}
            </Text>
          </View>
        )}

        {isSingleMedia && (
          <View style={styles.singleMediaContainer} pointerEvents="box-none">
            {item.mediaElements[0].type === 'audio' ? (
              <SingleAudioCard media={item.mediaElements[0]} cardWidth={cardWidth} theme={theme} />
            ) : (
              <View style={styles.heroImageWrapper}>
                <Image 
                  source={{ uri: singleMediaIsVideo && videoThumbnailUri ? videoThumbnailUri : item.mediaElements[0].uri }} 
                  style={StyleSheet.absoluteFill} 
                  contentFit="cover" 
                />
                {item.mediaElements[0].type === 'video' && (
                  <View style={styles.videoBadge}>
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                    <PlayCircle size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
            )}
            {hasText && (
              <View style={{ flexShrink: 1, width: '100%' }}>
                <Text style={[styles.singleMediaText, { color: theme.text, fontFamily: item.fontFamily || 'JetBrainsMono-Regular', fontSize: item.fontSize || 18, lineHeight: (item.fontSize || 18) * 1.4 }]} numberOfLines={8} ellipsizeMode="tail">
                  {item.textContent.trim()}
                </Text>
              </View>
            )}
          </View>
        )}

        {hasMedia && !isSingleMedia && (
          <View style={{ flex: 1 }} pointerEvents="box-none">
            <View style={styles.textWrapperAbsolute} pointerEvents="none">
              <Text style={[styles.textContent, { color: theme.text, fontFamily: item.fontFamily || 'JetBrainsMono-Regular', fontSize: item.fontSize || 21, lineHeight: (item.fontSize || 21) * 1.5 }]} numberOfLines={13} ellipsizeMode="tail">
                {item.textContent.trim()}
              </Text>
            </View>
            
            {item.mediaElements.map((m) => (
              <DraggableSticker 
                key={m.id} 
                media={m} 
                onDragEnd={handleDragEnd} 
                cardWidth={cardWidth} 
                cardHeight={height} 
              />
            ))}
          </View>
        )}
      </View>

      {/* LAYER 3: Time (Bottom) */}
      <View style={styles.timeRow} pointerEvents="box-none">
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.timeText, { color: theme.textMuted, marginBottom: item.location?.name ? 2 : 0 }]}>
            {formattedTime}
          </Text>
          {item.location?.name && (
            <View style={styles.locationBadge}>
              <MapPin size={10} color={theme.textMuted} />
              <Text style={[styles.timeText, { color: theme.textMuted, marginLeft: 4 }]} numberOfLines={1}>
                {item.location.name.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* LAYER 4: Logo Stamp (Only on Export) */}
      {isExporting && (
        <View style={styles.stamp} pointerEvents="none" collapsable={false}>
          <Logo size={56} color={theme.text} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',

    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },

  // Strict absolute inset wrapper to enforce centering regardless of flex engine bugs
  textWrapperAbsolute: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    left: 24,
    right: 24,
    justifyContent: 'center',
    zIndex: 1,
  },

  textContent: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 21,
    lineHeight: 34,
    textAlign: 'center',
    color: '#000000',
  },

  timeRow: {
    position: 'absolute',
    bottom: 13,
    left: 20,
    right: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    zIndex: 20, // Above stickers
    ...Platform.select({
      android: { elevation: 20 },
      default: {},
    }),
  },

  timeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  shareBtn: {
    position: 'absolute',
    right: 21,
    bottom: -5,
    padding: 4,
  },

  stamp: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    opacity: 1, // Full opacity for stamp look
    zIndex: 10,
  },

  // ─── Single Media Layout ───
  singleMediaContainer: {
    flex: 1,
    padding: 21,
    paddingTop: 34,
    paddingBottom: 40, // Room for timestamp
    alignItems: 'center',
    justifyContent: 'center',
    gap: 21,
    zIndex: 1,
  },
  heroImageWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  singleMediaText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 18,
    textAlign: 'center',
    color: '#000000',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoBadgeText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // ─── Canvas Layout ───
});
