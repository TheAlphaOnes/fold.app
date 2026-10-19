/**
 * ScreenHeader — the floating-pill header used by the story screens:
 *
 *   ( × )          [  TITLE  ]          ( a ) ( b )
 *
 * A round close button, the title in a centred pill, and round actions. The
 * pill is centred on the screen and inset by the wider of the two button
 * groups, so it stays optically centred while using all the room it has —
 * a long title only truncates at the true edge.
 *
 * HeaderIconButton is RoundButton (components/round-button), the same
 * control as every other header in the app.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { CloseButton, ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';

const BUTTON = ROUND_BUTTON_SIZE;
const ACTION_GAP = 12;
const SIDE_PADDING = 16;
const PILL_CLEARANCE = 12;

type ButtonTone = 'default' | 'danger';

interface HeaderIconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: ButtonTone;
}

export function HeaderIconButton({ icon, onPress, accessibilityLabel, tone = 'default' }: HeaderIconButtonProps) {
  const theme = useTheme();
  return (
    <RoundButton
      icon={icon}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      iconColor={tone === 'danger' ? theme.destructive : undefined}
    />
  );
}

interface ScreenHeaderProps {
  title: string;
  /** Right-hand round actions, in order. */
  actions?: React.ReactNode[];
  /** Defaults to going back (or home when there is no history). */
  onBack?: () => void;
  /** Lay the header over content (e.g. the story wheel) instead of above it. */
  floating?: boolean;
}

function groupWidth(count: number): number {
  return count * BUTTON + Math.max(0, count - 1) * ACTION_GAP;
}

export function ScreenHeader({ title, actions = [], onBack, floating = false }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, 20);
  const pillInset = SIDE_PADDING + Math.max(groupWidth(1), groupWidth(actions.length)) + PILL_CLEARANCE;

  return (
    <View style={[styles.header, { paddingTop: top }, floating && styles.floating]}>
      <CloseButton onPress={onBack} />

      <View style={styles.actions}>
        {actions.map((action, index) => (
          <React.Fragment key={index}>{action}</React.Fragment>
        ))}
      </View>

      <View
        style={[styles.pillSlot, { top, left: pillInset, right: pillInset }]}
        pointerEvents="none"
      >
        <View style={[styles.pill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 12,
    zIndex: 100,
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACTION_GAP,
  },
  pillSlot: {
    position: 'absolute',
    height: BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    maxWidth: '100%',
    height: BUTTON,
    paddingHorizontal: 16,
    borderRadius: BUTTON / 2,
    borderWidth: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    // Balances the trailing letter-spacing on the last character.
    marginLeft: 2,
  },
});
