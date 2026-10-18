/**
 * ScreenHeader — the one header for pushed screens (story board, story,
 * settings, ...), so every screen opens with the same geometry:
 *
 *   [ back ]  TITLE                       [ action ] [ action ]
 *             subtitle
 *
 * The title takes all the space between the buttons and only truncates at
 * the true edge. HeaderIconButton is the shared 40pt round control used for
 * both the leading button and the actions.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack } from '@/utils/navigation';

const BUTTON = 40;

type ButtonTone = 'default' | 'primary' | 'danger';

interface HeaderIconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: ButtonTone;
}

export function HeaderIconButton({ icon: Icon, onPress, accessibilityLabel, tone = 'default' }: HeaderIconButtonProps) {
  const theme = useTheme();
  const primary = tone === 'primary';
  const iconColor = primary ? theme.background : tone === 'danger' ? theme.destructive : theme.text;

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.text : theme.backgroundElement,
          borderColor: primary ? theme.text : theme.border,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon size={16} color={iconColor} strokeWidth={primary ? 2.6 : 2} />
    </Pressable>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-hand controls, typically HeaderIconButtons. */
  actions?: React.ReactNode;
  /** Defaults to going back (or home when there is no history). */
  onBack?: () => void;
  /** Lay the header over content (e.g. the story wheel) instead of above it. */
  floating?: boolean;
  /** Hairline under the header, for screens whose content scrolls beneath it. */
  divider?: boolean;
}

export function ScreenHeader({ title, subtitle, actions, onBack, floating = false, divider = false }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 12 },
        floating && styles.floating,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <HeaderIconButton icon={ArrowLeft} onPress={onBack ?? (() => goBack())} accessibilityLabel="Back" />

      <View style={styles.titleBlock}>
        <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
          {title.toUpperCase()}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
