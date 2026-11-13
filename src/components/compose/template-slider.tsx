/**
 * TemplateSlider — a camera-style mode dial: templates as bare labels in a
 * horizontal strip, swiped sideways; the one that settles in the middle is
 * picked, set on a soft capsule. Labels fade with their distance
 * from the middle, read straight from the scroll on the UI thread. Same icons and names as the
 * composer's TemplatePicker, for places with no room for its list (the
 * camera on today's page). Tapping a template slides it to the middle.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, scrollTo, runOnUI, type SharedValue } from 'react-native-reanimated';

import type { TemplateId } from '@/canvas/types';
import { renderTemplate, TEMPLATE_IDS } from '@/components/compose/template-picker';
import { ROUND_BUTTON_SIZE } from '@/components/round-button';
import { haptic } from '@/services/haptics';

/** Every item is the same width, so the strip snaps one template at a time. */
const ITEM = 112;
const GAP = 4;
const STEP = ITEM + GAP;

interface TemplateSliderProps {
  value: TemplateId;
  onChange: (template: TemplateId) => void;
  /** The strip's width (it centres the picked template in it). */
  width: number;
  /** Label ink: white over a picture, dark over a light sky. */
  color?: string;
}

export function TemplateSlider({ value, onChange, width, color = '#FFFFFF' }: TemplateSliderProps) {
  const list = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.x;
  });
  const slideTo = (i: number) => runOnUI(() => scrollTo(list, i * STEP, 0, true))();
  const index = Math.max(0, TEMPLATE_IDS.indexOf(value));
  const side = (width - ITEM) / 2;

  // Start on the current template.
  useEffect(() => {
    list.current?.scrollTo({ x: index * STEP, animated: false });
    offset.set(index * STEP);
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

  const onDark = color.toUpperCase().startsWith('#FFF');
  return (
    <View style={{ width }}>
      {/* A soft capsule behind the middle slot: the picked label always has a
          calm ground under it, whatever the picture does there. */}
      <View pointerEvents="none" style={[styles.window, { left: side, backgroundColor: onDark ? '#00000080' : '#FFFFFF99' }]} />
    <Animated.ScrollView
      ref={list}
      onScroll={onScroll}
      scrollEventThrottle={16}
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
            onPress={() => slideTo(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            style={styles.item}
          >
            <Label index={i} offset={offset} shadow={onDark}>
              <View style={styles.content}>{renderTemplate(id, color)}</View>
            </Label>
          </Pressable>
        );
      })}
    </Animated.ScrollView>
    </View>
  );
}

/** One label's fade and scale, from its distance to the middle of the dial. */
function Label({ index, offset, shadow, children }: { index: number; offset: SharedValue<number>; shadow: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(offset.value / STEP - index);
    return {
      opacity: interpolate(d, [0, 1, 2.2], [1, 0.7, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1], [1, 0.9], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[styles.label, shadow && styles.shadow, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  item: { width: ITEM, height: ROUND_BUTTON_SIZE, justifyContent: 'center' },
  label: { alignItems: 'center', gap: 6 },
  // iOS casts this from the glyphs themselves, so thin strokes keep an edge on bright pictures.
  shadow: { shadowColor: '#000000', shadowOpacity: 0.85, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  window: { position: 'absolute', top: 0, width: ITEM, height: ROUND_BUTTON_SIZE, borderRadius: ROUND_BUTTON_SIZE / 2 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
});
