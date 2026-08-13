import React from 'react';
import { StyleSheet, View, Text, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import type { Composition, MediaElement } from '@/types/journal';
import { DraggableSticker } from '@/components/draggable-sticker';
import { Image } from 'expo-image';
import { PlayCircle } from 'lucide-react-native';
import { VinylRecord } from '@/components/vinyl-record';

interface MemoryCardProps {
  item: Composition;
  height: number;
  onUpdatePositions: (id: number, updatedMedia: MediaElement[]) => void;
}

/**
 * MemoryCard — renders user content using one of three layouts:
 * 1. Text Only: Centered text.
 * 2. Single Media: Hero image framed with text below.
 * 3. Canvas Mode (Multi-Media): Text centered, multiple media stickers freely draggable around it.
 */
export function MemoryCard({ item, height, onUpdatePositions }: MemoryCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Card has 21px padding on both sides based on the flatlist paddingHorizontal
  const cardWidth = width - 42;

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(item.createdAt));

  const hasMedia = item.mediaElements && item.mediaElements.length > 0;
  const isSingleMedia = item.mediaElements && item.mediaElements.length === 1;
  const hasText = item.textContent && item.textContent.trim().length > 0;

  const handleDragEnd = (mediaId: string, newX: number, newY: number) => {
    const updatedMedia = item.mediaElements.map((m) =>
      m.id === mediaId ? { ...m, x_pos: newX, y_pos: newY } : m
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
      ]}
    >
      {/* LAYER 1: Stripes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DiagonalStripes color={theme.isDark ? "#000000" : "#D0D0D0"} opacity={theme.isDark ? 0.04 : 0.5} animated />
      </View>

      {/* LAYER 2: Content Depending on Type */}
      <View style={{ flex: 1, zIndex: 1 }}>
        {!hasMedia && (
          <View style={styles.textWrapperAbsolute}>
            <Text style={[styles.textContent, { color: theme.text, fontFamily: item.fontFamily || 'JetBrainsMono-Regular', fontSize: item.fontSize || 21, lineHeight: (item.fontSize || 21) * 1.5 }]} numberOfLines={13} ellipsizeMode="tail">
              {hasText ? item.textContent.trim() : '[NO TEXT SAVED]'}
            </Text>
          </View>
        )}

        {isSingleMedia && (
          <View style={styles.singleMediaContainer}>
            <View style={styles.heroImageWrapper}>
              {item.mediaElements[0].type === 'audio' ? (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }]}>
                  <VinylRecord size={120} isPlaying={false} isRecording={false} />
                </View>
              ) : (
                <Image 
                  source={{ uri: item.mediaElements[0].uri }} 
                  style={StyleSheet.absoluteFill} 
                  contentFit="cover" 
                />
              )}
              {item.mediaElements[0].type === 'video' && (
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                  <PlayCircle size={10} color="#FFFFFF" />
                </View>
              )}
            </View>
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
          <View style={{ flex: 1 }}>
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
      <View style={styles.timeRow} pointerEvents="none">
        <Text style={[styles.timeText, { color: theme.textMuted }]}>
          {formattedTime}
        </Text>
      </View>
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

  // Time pinned to the bottom of the card
  timeRow: {
    position: 'absolute',
    bottom: 13,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20, // Above stickers
    ...Platform.select({
      android: { elevation: 20 },
      default: {},
    }),
  },

  timeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 0.5,
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
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ─── Canvas Layout ───
});
