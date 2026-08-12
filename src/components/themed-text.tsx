import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: keyof typeof Colors.light;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 30,
  },
  linkPrimary: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 30,
    color: '#3c87f7',
  },
  code: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
  },
});
