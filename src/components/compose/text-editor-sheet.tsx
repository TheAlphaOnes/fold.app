/**
 * TextEditorSheet — writing a text layer, the way Instagram's text tool
 * works: the canvas dims, the text sits centred and big with the keyboard
 * up, and the controls ride just above the keyboard:
 *   font strip · ink (colour) · highlight · alignment · size
 * Done (or a tap on the dimmed canvas) places the text; leaving it empty
 * removes the layer.
 *
 * The writing feel is the old compose screen's: same fonts, inks, sizes.
 * Above the keyboard there's also Camera and Gallery, so you can go from
 * writing straight to adding a photo.
 */

import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AlignCenter, AlignLeft, AlignRight, Camera, Highlighter, Image as ImageIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { InkButton, InkPalette } from '@/components/compose/ink-palette';
import { MEMORY_FONTS } from '@/constants/fonts';
import { fadeIn, riseIn } from '@/constants/motion';
import type { TextAlign, TextLayer } from '@/canvas/types';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { memoryTextMetrics } from '@/utils/memory-text';

const SIZES = [0.05, 0.065, 0.08, 0.11, 0.15];
const ALIGN_NEXT: Record<TextAlign, TextAlign> = { center: 'left', left: 'right', right: 'center' };
const ALIGN_ICON = { center: AlignCenter, left: AlignLeft, right: AlignRight };

export type TextDraft = Pick<TextLayer, 'text' | 'font' | 'color' | 'align' | 'style' | 'size'>;

interface TextEditorSheetProps {
  initial: TextDraft;
  /** Canvas width, so the preview matches the placed size. */
  canvasWidth: number;
  onDone: (draft: TextDraft) => void;
  /** Leaves writing (keeping the draft) to add a photo. */
  onCamera?: (draft: TextDraft) => void;
  onGallery?: (draft: TextDraft) => void;
}

export function TextEditorSheet({ initial, canvasWidth, onDone, onCamera, onGallery }: TextEditorSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<TextDraft>(initial);
  const [inkOpen, setInkOpen] = useState(false);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const set = (patch: Partial<TextDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const metrics = memoryTextMetrics(draft.font, draft.size * canvasWidth);
  const ink = draft.color ?? theme.text;
  const AlignIcon = ALIGN_ICON[draft.align];
  const sizeIndex = Math.max(0, SIZES.findIndex((s) => Math.abs(s - draft.size) < 0.004));

  return (
    <Animated.View entering={fadeIn(160)} style={[StyleSheet.absoluteFill, styles.root]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={() => onDone(draft)} accessibilityLabel="Done writing" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.flex, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              haptic.select();
              set({ style: draft.style === 'highlight' ? 'plain' : 'highlight' });
            }}
            accessibilityRole="button"
            accessibilityLabel="Highlight"
            accessibilityState={{ selected: draft.style === 'highlight' }}
            style={[styles.toolBtn, draft.style === 'highlight' && { backgroundColor: '#FFFFFF' }]}
          >
            <Highlighter size={18} color={draft.style === 'highlight' ? '#111111' : '#FFFFFF'} />
          </Pressable>
          <Pressable
            onPress={() => {
              haptic.select();
              set({ align: ALIGN_NEXT[draft.align] });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Align ${draft.align}`}
            style={styles.toolBtn}
          >
            <AlignIcon size={18} color="#FFFFFF" />
          </Pressable>
          <InkButton color={draft.color} open={inkOpen} onPress={() => setInkOpen((o) => !o)} />
          <Pressable
            onPress={() => {
              haptic.select();
              set({ size: SIZES[(sizeIndex + 1) % SIZES.length] });
            }}
            accessibilityRole="button"
            accessibilityLabel="Text size"
            style={styles.toolBtn}
          >
            <ThemedText style={styles.sizeLabel}>{['S', 'M', 'L', 'XL', 'XXL'][sizeIndex]}</ThemedText>
          </Pressable>
          <View style={styles.flex} />
          <Pressable onPress={() => onDone(draft)} accessibilityRole="button" style={styles.doneBtn}>
            <ThemedText style={styles.doneText}>DONE</ThemedText>
          </Pressable>
        </View>
        {inkOpen && <InkPalette color={draft.color} onChange={(color) => set({ color })} />}

        <View style={styles.center} pointerEvents="box-none">
          <View
            style={[
              { maxWidth: canvasWidth * 0.84 },
              draft.style === 'highlight' && {
                backgroundColor: ink === '#FFFFFF' ? '#000000CC' : '#FFFFFFE6',
                paddingHorizontal: metrics.fontSize * 0.5,
                paddingVertical: metrics.fontSize * 0.2,
                borderRadius: metrics.fontSize * 0.4,
              },
            ]}
          >
            <TextInput
              ref={input}
              value={draft.text}
              onChangeText={(text) => set({ text })}
              multiline
              placeholder="write something…"
              placeholderTextColor="#FFFFFF88"
              cursorColor={theme.accentWarm}
              selectionColor={theme.accentWarm}
              style={[metrics, styles.input, { fontFamily: draft.font, color: draft.style === 'highlight' ? ink : draft.color ?? '#FFFFFF', textAlign: draft.align }]}
            />
          </View>
        </View>

        <Animated.View entering={riseIn(260, 60, 8)} style={[styles.bottom, { paddingBottom: 8 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontRow} keyboardShouldPersistTaps="always">
            {(onCamera || onGallery) && (
              <View style={styles.quickAdd}>
                {onCamera && (
                  <Pressable onPress={() => onCamera(draft)} accessibilityRole="button" accessibilityLabel="Camera" style={styles.quickBtn}>
                    <Camera size={16} color="#111111" />
                  </Pressable>
                )}
                {onGallery && (
                  <Pressable onPress={() => onGallery(draft)} accessibilityRole="button" accessibilityLabel="Gallery" style={styles.quickBtn}>
                    <ImageIcon size={16} color="#111111" />
                  </Pressable>
                )}
              </View>
            )}
            {MEMORY_FONTS.map((f) => {
              const active = f.id === draft.font;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    haptic.select();
                    set({ font: f.id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Font ${f.name}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.fontChip, active && styles.fontChipActive]}
                >
                  <ThemedText style={[styles.fontChipText, { fontFamily: f.id, color: active ? '#111111' : '#FFFFFF' }]} numberOfLines={1}>
                    Aa
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 500 },
  flex: { flex: 1 },
  dim: { backgroundColor: '#000000E0' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeLabel: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, color: '#FFFFFF' },
  doneBtn: { paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  doneText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2, color: '#111111' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  input: { minWidth: 40, padding: 0 },
  bottom: {},
  fontRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  quickAdd: { flexDirection: 'row', gap: 8, marginRight: 8 },
  quickBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  fontChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  fontChipText: { fontSize: 15 },
});
