/**
 * TemplateSlider — templates in a horizontal strip, swiped sideways; the one
 * that settles in the middle is picked. Same icons and names as the
 * composer's TemplatePicker, for places with no room for its list (the
 * camera on today's page). Tapping a template slides it to the middle.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { TemplateId } from '@/canvas/types';
import { renderTemplate, TEMPLATE_IDS } from '@/components/compose/template-picker';
import { ROUND_BUTTON_SIZE } from '@/components/round-button';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

/** Every item is the same width, so the strip snaps one template at a time. */
const ITEM = 128;
const GAP = 8;
const STEP = ITEM + GAP;

interface TemplateSliderProps {
  value: TemplateId;
  onChange: (template: TemplateId) => void;
  /** The strip's width (it centres the picked template in it). */
  width: number;
}

export function TemplateSlider({ value, onChange, width }: TemplateSliderProps) {
  const theme = useTheme();
  const list = useRef<ScrollView>(null);
  const index = Math.max(0, TEMPLATE_IDS.indexOf(value));
  const side = (width - ITEM) / 2;

  // Start on the current template.
  useEffect(() => {
    list.current?.scrollTo({ x: index * STEP, animated: false });
    // Only on first layout; afterwards the strip itself drives the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(TEMPLATE_IDS.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / STEP)));
    if (TEMPLATE_IDS[i] !== value) {
      haptic.select();
      onChange(TEMPLATE_IDS[i]);
    }
  };

  return (
    <ScrollView
      ref={list}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={STEP}
      decelerationRate="fast"
      onMomentumScrollEnd={settle}
      style={{ width, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: side, gap: GAP }}
      accessibilityRole="adjustable"
      accessibilityLabel="Template"
      accessibilityValue={{ text: value }}
    >
      {TEMPLATE_IDS.map((id, i) => {
        const picked = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => list.current?.scrollTo({ x: i * STEP, animated: true })}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            style={[
              styles.item,
              picked
                ? { backgroundColor: theme.background, borderColor: theme.text }
                : { backgroundColor: '#00000059', borderColor: '#FFFFFF33' },
            ]}
          >
            <View style={styles.content}>{renderTemplate(id, picked ? theme.text : '#FFFFFFCC')}</View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { width: ITEM, height: ROUND_BUTTON_SIZE, borderRadius: ROUND_BUTTON_SIZE / 2, borderWidth: 1, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
});
