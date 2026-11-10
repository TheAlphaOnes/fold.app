/**
 * KeyCaption — the line above the orange key. Mostly it's the date; every
 * few seconds it scrambles into one of the key's gestures not used yet
 * ("hold · voice note") while the key acts that gesture out, then settles
 * back to the date. Once every gesture is known it's only the date.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { HINT_GAP_MS, HINT_SHOW_MS, KEY_HINTS, nextHint, type KeyGesture } from '@/home/key-hints';
import { useScrambleText } from '@/hooks/use-scramble-text';

interface KeyCaptionProps {
  date: string;
  unlearned: KeyGesture[];
  /** Cycling runs only while home is in front and idle (not recording). */
  active: boolean;
  /** A hint is showing: the key acts it out. */
  onDemo: (gesture: KeyGesture) => void;
  style?: StyleProp<TextStyle>;
}

export function KeyCaption({ date, unlearned, active, onDemo, style }: KeyCaptionProps) {
  const [showing, setShowing] = useState<KeyGesture | null>(null);
  const last = useRef<KeyGesture | null>(null);
  // The loop reads the latest list and callback without restarting on every render.
  const latest = useRef({ unlearned, onDemo });
  useEffect(() => {
    latest.current = { unlearned, onDemo };
  });
  const teaching = active && unlearned.length > 0;

  useEffect(() => {
    if (!teaching) return;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      timer = setTimeout(() => {
        const hint = nextHint(latest.current.unlearned, last.current);
        if (!hint) return;
        last.current = hint;
        setShowing(hint);
        latest.current.onDemo(hint);
        timer = setTimeout(() => {
          setShowing(null);
          cycle();
        }, HINT_SHOW_MS);
      }, HINT_GAP_MS);
    };
    cycle();
    return () => {
      clearTimeout(timer);
      setShowing(null);
    };
  }, [teaching]);

  const text = useScrambleText(showing && teaching ? KEY_HINTS[showing] : date);
  return (
    <Text style={[styles.text, style]} numberOfLines={1} allowFontScaling={false} accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center' },
});
