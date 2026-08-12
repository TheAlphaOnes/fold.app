import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';

interface MemoryCardProps {
  content: string;
  height: number;
  timestamp: number;
}

/**
 * MemoryCard — renders user text centered on the card.
 *
 * Layout strategy (solves SVG-over-text bug):
 *   - Outer View: the visible card with border, shadow, etc.
 *   - Inner View (stripeLayer): absolute-fill, holds only the SVG stripes,
 *     with pointerEvents="none" so it never intercepts.
 *   - Inner View (contentLayer): normal flex child that fills the card
 *     naturally. Because it's a NORMAL (non-absolute) child, it participates
 *     in the default paint order and always renders ON TOP of the absolute
 *     stripe layer — no zIndex hacks needed.
 */
export function MemoryCard({ content, height, timestamp }: MemoryCardProps) {
  const theme = useTheme();

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

  return (
    <View
      style={[
        styles.card,
        {
          height,
          backgroundColor: theme.backgroundElement,
        },
      ]}
    >
      {/* LAYER 1: Stripes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DiagonalStripes color="#D0D0D0" opacity={0.5} animated />
      </View>

      {/* LAYER 2: Content (Centered) */}
      <View style={styles.contentCenter}>
        <Text style={styles.textContent}>
          {content && content.trim().length > 0 ? content : '[NO TEXT SAVED]'}
        </Text>
      </View>

      {/* LAYER 3: Time (Bottom) */}
      <View style={styles.timeRow}>
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
    borderColor: '#878787',
    overflow: 'hidden',

    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },

  // Centered text area — explicit 100% dimensions to fix top-sticking
  contentCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 34,
    zIndex: 1,
    ...Platform.select({
      android: { elevation: 1 },
      default: {},
    }),
  },

  textContent: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 21,
    lineHeight: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#000000',
  },

  // Time pinned to the bottom of the card
  timeRow: {
    position: 'absolute',
    bottom: 13,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    ...Platform.select({
      android: { elevation: 2 },
      default: {},
    }),
  },

  timeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
