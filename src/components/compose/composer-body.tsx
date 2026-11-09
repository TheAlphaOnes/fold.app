/**
 * ComposerBody — the composer screen. Layout (top to bottom):
 *
 *   ✕       ↶  [ADD TO STORY]  Aa     close · undo · story · text
 *   [Photo][GIF][Song][Voice][Place][Date]   AddRow, in the open
 *   ┌──────── 9:16 canvas ────────┐   (CanvasEditor)
 *   └─────────────────────────────┘
 *   [tools for the selection]          sticker or photo, while selected
 *   📷 🖼     [ ▦ TEMPLATE ⇅ ]     SAVE
 *
 * Laid out by priority: Save is the one filled action; adding media sits
 * at the thumb; the template is a quiet style pill (tap: next, hold: list,
 * gap inside the list). Filing into a story is optional, so it's an
 * outlined text CTA in the top bar.
 *
 * New memories open on the blank canvas, not in the keyboard: a quiet
 * "tap to write" hint sits in the middle until something is added, and
 * Aa or a tap on the card opens writing (TextEditorSheet).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Book, Camera, Image as ImageIcon, Type as TypeIcon, Undo2 } from 'lucide-react-native';

import { CanvasEditor } from '@/canvas/edit/canvas-editor';
import { initialComposerState, useComposerState } from '@/canvas/edit/use-composer-state';
import { fitCanvas, newId } from '@/canvas/geometry';
import type { CanvasDoc, StickerShape, TextLayer } from '@/canvas/types';
import { legacyCardFor } from '@/canvas/use-canvas-of';
import { ADD_ROW_HEIGHT, AddRow, type AddKind } from '@/components/compose/add-row';
import { FrameTools, StickerTools } from '@/components/compose/selection-bar';
import { TemplateList, TemplatePicker } from '@/components/compose/template-picker';
import { TextEditorSheet, type TextDraft } from '@/components/compose/text-editor-sheet';
import { GifPicker } from '@/components/gif-picker';
import { GrainBackground } from '@/components/grain-background';
import { MusicPicker } from '@/components/music-picker';
import { RecordingOverlay } from '@/components/recording-overlay';
import { CloseButton, ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';
import { StoryPicker } from '@/components/story-picker';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_MEMORY_FONT } from '@/constants/fonts';
import { fadeIn, riseIn } from '@/constants/motion';
import { useComposeMedia } from '@/hooks/use-compose-media';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettings } from '@/hooks/use-settings';
import { useStoriesStore } from '@/hooks/use-stories';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceTake } from '@/hooks/use-voice-take';
import { trackError, type CaptureSource } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { canvasOf } from '@/templates/legacy';
import { defaultTextSpot, frameMediaId, isBlankCard, scatterSticker, shownMediaIds } from '@/templates/registry';
import type { Composition, MediaElement } from '@/types/journal';
import { alertMusicLimit, hasMusicElement } from '@/utils/media-attach';
import { goBack } from '@/utils/navigation';
import { consumePendingCameraMedia } from '@/utils/pending-camera-media';

/** Reference card width that legacy font sizes were measured against. */
const LEGACY_CARD_WIDTH = 348;
/**
 * One spacing rhythm for the whole screen: every stacked element is SPACE
 * apart vertically (top bar, add row, canvas, bottom bar) and every
 * control GAP apart horizontally, all inset EDGE from the screen sides.
 */
const SPACE = 12;
const GAP = 8;
const EDGE = 16;
/** Bar heights excluding safe areas, shared by the layout and the writing spacers. */
const TOP_BAR = 6 + ROUND_BUTTON_SIZE + SPACE;
const ADD_AREA = ADD_ROW_HEIGHT;
const BOTTOM_BAR = SPACE + ROUND_BUTTON_SIZE + 8;
/** Between the canvas and the add row above / the bottom bar below. */
const CANVAS_MARGIN = SPACE;
const SHAPES: StickerShape[] = ['rounded', 'square', 'circle', 'heart', 'star', 'arch', 'polaroid', 'stamp', 'tape'];

const DEFAULT_TEXT: TextDraft = { text: '', font: DEFAULT_MEMORY_FONT, color: null, align: 'center', style: 'plain', size: 0.065 };

/** Where the phone is, named by city (or the nearest coarser place). */
async function lookupLocation(): Promise<{ name?: string; lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [place] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    const name = place ? place.city || place.subregion || place.region || place.country || undefined : undefined;
    return { name: name ?? undefined, lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (error) {
    console.warn('Failed to fetch location', error);
    return null;
  }
}

interface ComposerBodyProps {
  existing: Composition | null;
  sharedText?: string;
  storyId?: number;
  createdAt?: number;
}

type Editing = { id: string; isNew: boolean } | null;

export function ComposerBody({ existing, sharedText, storyId, createdAt }: ComposerBodyProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { settings } = useSettings();
  const stories = useStoriesStore((s) => s.stories);
  const addComposition = useJournalStore((s) => s.addComposition);
  const updateComposition = useJournalStore((s) => s.updateComposition);

  // ─── Starting point ───────────────────────────────────────────────────
  // Computed once: the composer starts from this and never restarts.
  const [start] = useState(() => {
    if (existing) {
      const state = initialComposerState(existing.mediaElements, canvasOf(existing, legacyCardFor(window.width, window.height)));
      return { state, chosen: true, source: 'compose' as CaptureSource };
    }
    const pending = consumePendingCameraMedia();
    const source: CaptureSource = pending.length > 0 ? 'camera' : sharedText ? 'share_extension' : 'compose';
    const media: MediaElement[] = pending.map((p) => ({
      id: newId(),
      uri: p.uri,
      type: p.type,
      x_pos: 0,
      y_pos: 0,
      width: p.width,
      height: p.height,
    }));
    const state = initialComposerState(media);
    if (sharedText?.trim()) {
      const spot = defaultTextSpot(state.doc);
      state.doc = {
        ...state.doc,
        layers: [...state.doc.layers, { id: newId(), kind: 'text', ...DEFAULT_TEXT, text: sharedText.trim(), ...spot, scale: 1, rotation: 0 }],
      };
    }
    return { state, chosen: false, source };
  });

  const c = useComposerState(start.state, start.chosen);
  // Save reads the newest state after awaiting song downloads.
  const latest = useRef(c);
  useEffect(() => {
    latest.current = c;
  });
  const [openedAt] = useState(() => createdAt ?? Date.now());
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const [storyIds, setStoryIds] = useState<number[]>(existing?.storyIds ?? (storyId ? [storyId] : []));
  const [location, setLocation] = useState<{ name?: string; lat?: number; lng?: number }>(
    existing?.location ? { name: existing.location.name, lat: existing.location.latitude, lng: existing.location.longitude } : {},
  );
  // Writing opens on request (Aa, or a tap on the blank card), never by itself.
  const [editing, setEditing] = useState<Editing>(null);
  const [sheet, setSheet] = useState<'music' | 'gif' | 'stories' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Song downloads by media id: the local file, or null if it failed.
  const pendingSongs = useRef(new Map<string, Promise<{ uri: string; artwork: string } | null>>());

  const media = useComposeMedia(c.media.length);
  const take = useVoiceTake();

  // ─── Canvas size: the largest 9:16 that fits between the bars ─────────
  const canvas = fitCanvas({
    width: window.width - 32,
    height: window.height - insets.top - insets.bottom - TOP_BAR - ADD_AREA - BOTTOM_BAR - CANVAS_MARGIN * 2,
  });
  const memory = {
    id: existing?.id ?? -1,
    createdAt: openedAt,
    location: location.name ? { latitude: location.lat ?? 0, longitude: location.lng ?? 0, name: location.name } : undefined,
  };

  // ─── Location (auto-tag setting, and the Place sticker) ───────────────
  useEffect(() => {
    if (existing || !settings.autoLocationTagging) return;
    lookupLocation().then((found) => found && setLocation(found));
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Text ─────────────────────────────────────────────────────────────
  const editingLayer = editing ? (c.doc.layers.find((l) => l.id === editing.id) as TextLayer | undefined) : undefined;
  const finishText = (draft: TextDraft) => {
    if (!editing) return;
    const text = draft.text.trim();
    if (editing.isNew) {
      if (text) {
        const spot = defaultTextSpot(c.doc);
        c.addLayer({ id: editing.id, kind: 'text', ...draft, text, ...spot, scale: 1, rotation: 0 });
      }
    } else if (!text) {
      c.removeLayer(editing.id);
    } else {
      c.updateLayer(editing.id, { ...draft, text });
    }
    setEditing(null);
  };

  // ─── Media ────────────────────────────────────────────────────────────
  const addFromGallery = async () => {
    const added = await media.pickFromGallery();
    c.addMedia(added);
  };
  const addFromCamera = async () => {
    const added = await media.captureWithCamera('image');
    c.addMedia(added);
  };
  /** From the text editor's camera/gallery buttons: keep what was typed, then add the photo. */
  const fromWriting = (action: () => Promise<void>) => async (draft: TextDraft) => {
    finishText(draft);
    await action();
  };

  const addSticker = (m: MediaElement, offset = 0) => {
    const count = c.doc.layers.filter((l) => l.kind === 'media').length;
    c.addLayer(scatterSticker(m.id, count + offset), m);
  };

  const onAdd = async (kind: AddKind) => {
    switch (kind) {
      case 'photo': {
        const added = await media.pickFromGallery();
        // Each gets its own spot, not the same one.
        added.forEach((m, i) => addSticker(m, i));
        return;
      }
      case 'gif':
        setSheet('gif');
        return;
      case 'music':
        if (hasMusicElement(c.media)) {
          alertMusicLimit();
          return;
        }
        setSheet('music');
        return;
      case 'voice':
        haptic.tap();
        await take.start();
        return;
      case 'location':
        if (!location.name) {
          const found = await lookupLocation();
          if (!found?.name) {
            Alert.alert('No place yet', 'Allow location for Fold to add where you are.');
            return;
          }
          setLocation(found);
        }
        c.addLayer({ id: newId(), kind: 'location', x: 0.5, y: 0.2, scale: 1, rotation: -3 });
        return;
      case 'date':
        c.addLayer({ id: newId(), kind: 'date', style: 'stamp', x: 0.78, y: 0.16, scale: 1, rotation: 4 });
        return;
    }
  };

  const saveVoice = async () => {
    const uri = await take.finish();
    if (!uri) return;
    const dest = `${FileSystem.documentDirectory}audio_${Date.now()}_${newId()}.m4a`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    const m: MediaElement = { id: newId(), uri: dest, type: 'audio', x_pos: 0, y_pos: 0 };
    c.addLayer({ id: newId(), kind: 'audio', mediaId: m.id, x: 0.5, y: 0.45, scale: 1.3, rotation: 0 }, m);
  };

  /** Fills an empty cell, or replaces the selected photo, from the gallery. */
  const fillFrame = async (target: string) => {
    const [first] = await media.pickFromGallery();
    if (first) c.fillFrame(target, first);
  };

  // ─── Selected sticker tools ───────────────────────────────────────────
  const selected = c.selectedId ? c.doc.layers.find((l) => l.id === c.selectedId) : undefined;
  const cycleShape = () => {
    if (selected?.kind !== 'media') return;
    c.updateLayer(selected.id, { shape: SHAPES[(SHAPES.indexOf(selected.shape) + 1) % SHAPES.length] });
  };

  // ─── Save ─────────────────────────────────────────────────────────────
  const textLayers = c.doc.layers.filter((l): l is TextLayer => l.kind === 'text');
  const hasContent = c.media.length > 0 || textLayers.some((t) => t.text.trim()) || c.doc.layers.length > 0;

  const save = async () => {
    if (!hasContent || isSaving) return;
    setIsSaving(true);
    try {
      // Songs still downloading finish first, and their local files are
      // patched in here, so a memory never stores a remote preview URL.
      const songs = await Promise.all([...pendingSongs.current].map(async ([id, job]) => [id, await job] as const));
      let { doc, media: mediaList } = latest.current;
      for (const [id, files] of songs) {
        if (files) {
          mediaList = mediaList.map((m) =>
            m.id === id && m.metadata ? { ...m, uri: files.uri, metadata: { ...m.metadata, artwork: files.artwork } } : m,
          );
        } else {
          mediaList = mediaList.filter((m) => m.id !== id);
          doc = { ...doc, layers: doc.layers.filter((l) => !('mediaId' in l && l.mediaId === id)) };
        }
      }
      // What you see is what's kept: media nothing on the canvas shows isn't saved.
      const shown = shownMediaIds(doc);
      mediaList = mediaList.filter((m) => shown.has(m.id));
      const texts = doc.layers.filter((l): l is TextLayer => l.kind === 'text');
      const first = texts[0];
      const body = texts
        .map((t) => t.text.trim())
        .filter(Boolean)
        .join('\n');
      const fields = {
        textContent: body,
        mediaElements: mediaList,
        fontFamily: first?.font ?? DEFAULT_MEMORY_FONT,
        fontSize: Math.round((first?.size ?? DEFAULT_TEXT.size) * LEGACY_CARD_WIDTH),
        textColor: first?.color ?? null,
        locationName: location.name,
        locationCoords: location.lat !== undefined ? JSON.stringify({ lat: location.lat, lng: location.lng }) : undefined,
        storyIds,
        layout: doc as CanvasDoc,
      };
      if (existing) {
        await updateComposition({ id: existing.id, ...fields });
      } else {
        await addComposition({ ...fields, createdAt }, start.source);
      }
      haptic.success();
      goBack();
    } catch (error) {
      console.error('Failed to save memory', error);
      trackError(error, existing ? 'memory_edit' : 'memory_create');
      setIsSaving(false);
      haptic.error();
      Alert.alert("COULDN'T SAVE", "Your memory wasn't saved. Please try again.");
    }
  };

  const storyLabel =
    storyIds.length === 0
      ? 'ADD TO STORY'
      : storyIds.length === 1
        ? (stories.find((s) => s.id === storyIds[0])?.title.toUpperCase() ?? 'STORY')
        : `${storyIds.length} STORIES`;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GrainBackground />

      {/* While writing, the text editor owns the screen: the composer's own
          controls aren't drawn, so nothing doubles up under it. They rise
          back in when writing ends. */}
      {!editing && (
        <Animated.View entering={fadeIn(200)} style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <CloseButton accessibilityLabel="Close without saving" />
          <View style={styles.topRight}>
            {c.canUndo && <RoundButton icon={Undo2} accessibilityLabel="Undo" onPress={c.undo} />}
            {/* Optional filing: an outlined text CTA, never as loud as Save. */}
            <Pressable
              onPress={() => {
                haptic.tap();
                setSheet('stories');
              }}
              accessibilityRole="button"
              accessibilityLabel={storyIds.length > 0 ? `In ${storyLabel.toLowerCase()}. Change stories` : 'Add to a story'}
              style={({ pressed }) => [styles.storyCta, { borderColor: storyIds.length > 0 ? theme.text : theme.border, opacity: pressed ? 0.5 : 1 }]}
            >
              <Book size={12} color={theme.text} />
              <ThemedText style={[styles.storyCtaText, { color: theme.text }]} numberOfLines={1}>
                {storyLabel}
              </ThemedText>
            </Pressable>
            <RoundButton icon={TypeIcon} accessibilityLabel="Add text" onPress={() => setEditing({ id: newId(), isNew: true })} />
          </View>
        </Animated.View>
      )}
      {!editing && (
        <View style={styles.addArea}>
          <AddRow onAdd={onAdd} />
        </View>
      )}
      {editing && <View style={{ height: insets.top + TOP_BAR + ADD_AREA }} />}

      <Animated.View entering={riseIn(320, 60, 12)} style={styles.canvasSlot}>
        <CanvasEditor
          doc={c.doc}
          media={c.media}
          memory={memory}
          width={canvas.width}
          height={canvas.height}
          selectedId={c.selectedId}
          onSelect={c.select}
          onLayerChange={c.updateLayer}
          onLayerDelete={c.removeLayer}
          onEditText={(id) => setEditing({ id, isNew: false })}
          onCrop={c.setCrop}
          onFillCell={fillFrame}
          selectedFrame={c.selectedFrame}
          onSelectFrame={c.selectFrame}
          onSwapCells={c.swapCells}
          onBackgroundTap={() => {
            if (c.selectedId || c.selectedFrame) c.select(null);
            else if (isBlankCard(c.doc) && textLayers.length === 0) setEditing({ id: newId(), isNew: true });
          }}
        />
        {!editing && isBlankCard(c.doc) && c.doc.layers.length === 0 && (
          <Animated.View entering={fadeIn(300, 260)} style={styles.writeHint} pointerEvents="none">
            <ThemedText style={[styles.writeHintText, { color: theme.textMuted }]}>tap to write</ThemedText>
          </Animated.View>
        )}
        {templatesOpen && (
          <View style={styles.templateList}>
            <TemplateList
              current={c.doc.template}
              gap={c.doc.gap}
              onGap={c.setGap}
              onPick={(template) => {
                c.setTemplate(template);
                setTemplatesOpen(false);
              }}
            />
          </View>
        )}
        {!templatesOpen && selected?.kind === 'media' && (
          <StickerTools
            sticker={selected}
            onCycleShape={cycleShape}
            onFront={() => c.bringToFront(selected.id)}
            onRemove={() => c.removeLayer(selected.id)}
          />
        )}
        {!templatesOpen && c.selectedFrame && frameMediaId(c.doc, c.selectedFrame) && (
          <FrameTools
            canFlip={c.selectedFrame !== 'background'}
            onReplace={() => fillFrame(c.selectedFrame!)}
            onFlip={() => c.mirrorCell(c.selectedFrame!)}
            onRemove={() => c.clearFrame(c.selectedFrame!)}
          />
        )}
      </Animated.View>

      {!editing && (
        <Animated.View entering={riseIn(340, 180, 12)} style={[styles.bottomRow, { paddingBottom: insets.bottom + 8 }]}>
          <RoundButton icon={Camera} accessibilityLabel="Take a photo" onPress={addFromCamera} />
          <RoundButton icon={ImageIcon} accessibilityLabel="Add from gallery" onPress={addFromGallery} />
          <View style={styles.middle}>
            <TemplatePicker
              current={c.doc.template}
              open={templatesOpen}
              onPick={c.setTemplate}
              onToggleList={() => setTemplatesOpen((o) => !o)}
            />
          </View>
          <Pressable
            onPress={save}
            disabled={!hasContent || isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save memory"
            style={({ pressed }) => [styles.save, { backgroundColor: theme.text, opacity: !hasContent || isSaving ? 0.35 : pressed ? 0.7 : 1 }]}
          >
            <ThemedText style={[styles.saveText, { color: theme.background }]}>{isSaving ? '…' : 'SAVE'}</ThemedText>
          </Pressable>
        </Animated.View>
      )}
      {editing && <View style={{ height: BOTTOM_BAR + insets.bottom }} />}

      {editing && (
        <TextEditorSheet
          initial={
            editingLayer
              ? {
                  text: editingLayer.text,
                  font: editingLayer.font,
                  color: editingLayer.color,
                  align: editingLayer.align,
                  style: editingLayer.style,
                  size: editingLayer.size,
                }
              : DEFAULT_TEXT
          }
          canvasWidth={canvas.width}
          onDone={finishText}
          onCamera={fromWriting(addFromCamera)}
          onGallery={fromWriting(addFromGallery)}
        />
      )}


      <MusicPicker
        visible={sheet === 'music'}
        onClose={() => setSheet(null)}
        onSelect={(track) => {
          setSheet(null);
          const { media: song, local } = media.songFrom(track);
          const layerId = newId();
          c.addLayer({ id: layerId, kind: 'audio', mediaId: song.id, x: 0.5, y: 0.42, scale: 1.3, rotation: 0 }, song);
          const job = local.then((files) => {
            if (files) {
              c.replaceMedia(song.id, { uri: files.uri, metadata: { ...song.metadata!, artwork: files.artwork } });
            } else {
              c.removeLayer(layerId);
              Alert.alert("COULDN'T ADD SONG", 'Check your connection and try choosing it again.');
            }
            return files;
          });
          pendingSongs.current.set(song.id, job);
        }}
      />

      <GifPicker
        visible={sheet === 'gif'}
        onClose={() => setSheet(null)}
        onSelect={async (url) => {
          setSheet(null);
          const gif = await media.downloadGif(url);
          if (gif) addSticker(gif);
        }}
      />

      <StoryPicker
        mode="multi"
        visible={sheet === 'stories'}
        onClose={() => setSheet(null)}
        selectedStoryIds={storyIds}
        onToggle={async (id) => setStoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
      />

      <RecordingOverlay
        visible={take.isActive}
        paused={take.isPaused}
        durationMillis={take.durationMillis}
        onPause={take.pause}
        onResume={take.resume}
        onSave={saveVoice}
        onDiscard={take.discard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: EDGE, paddingBottom: SPACE },
  topRight: { flexDirection: 'row', gap: GAP },
  canvasSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Floats over the bottom of the canvas, right above the picker it opened from.
  templateList: { position: 'absolute', left: 24, right: 24, bottom: 8 },
  // Every control in the row is one height (the app's 34pt round button), inset clear of the screen's rounded corners.
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: EDGE, paddingTop: SPACE },
  middle: { flex: 1, flexDirection: 'row' },
  addArea: { height: ADD_AREA },
  writeHint: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  writeHintText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, letterSpacing: 1 },
  storyCta: { height: ROUND_BUTTON_SIZE, maxWidth: 160, paddingHorizontal: 14, borderRadius: ROUND_BUTTON_SIZE / 2, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  storyCtaText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1.2, flexShrink: 1 },
  save: { height: ROUND_BUTTON_SIZE, paddingHorizontal: 22, borderRadius: ROUND_BUTTON_SIZE / 2, justifyContent: 'center' },
  saveText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2 },
});
