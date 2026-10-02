import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface TimelinePlaceholderProps {
  height: number;
  cardHeight: number;
}

/** Same slot height as a memory card, with no media decoded. */
export function TimelinePlaceholder({ height, cardHeight }: TimelinePlaceholderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.slot, { height }]}>
      <View
        style={[
          styles.card,
          {
            height: cardHeight,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 21,
  },
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 28,
    opacity: 0.55,
  },
});
