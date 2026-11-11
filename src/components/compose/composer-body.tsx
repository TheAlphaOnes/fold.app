/**
 * ComposerBody — the composer screen. Layout (top to bottom):
 *
 *   ✕      TUE 10.11 · 09:59    ↶  SAVE    close · when · undo · save
 *   [Text][GIF][Doodle][Song][Voice]…       AddRow: everything else
 *   ┌──────── 9:16 canvas ────────┐   (CanvasEditor)
 *   └─────────────────────────────┘
 *   [tools for the selection]          sticker or photo, while selected
 *   📷 🖼  [ ▦ TEMPLATE ⇅ ]  [ ▢ STORY ]    camera · gallery · template · story
 *
 * Laid out by priority: Save is the one filled action, top right where a
 * finished thing is confirmed; writing sits at
 * the thumb, and every media source lives once, in the add row; the
 * template is a quiet style pill (tap: next, hold: list, gap inside it).
 * Filing into a story is optional, so it's the template pill's outlined
 * twin beside it.
 *
 * New memories open on the blank canvas, not in the keyboard: a quiet
 * gentle journaling line ("start your page") sits in the middle until something is added, and
 * Aa or a tap on the card opens writing (TextEditorSheet).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { useBottomInset } from '@/hooks/use-bottom-inset';
import { Book, Camera, Image as ImageIcon, Undo2 } from 'lucide-react-native';

import { CanvasEditor } from '@/canvas/edit/canvas-editor';
import { initialComposerState, useComposerState } from '@/canvas/edit/use-composer-state';
import { fitCanvas, newId } from '@/canvas/geometry';
import type { CanvasDoc, StickerShape, TemplateId, TextLayer } from '@/canvas/types';
import { formatMoment } from '@/utils/format-date';
import { legacyCardFor } from '@/canvas/use-canvas-of';
import { ADD_ROW_HEIGHT, AddRow, type AddKind } from '@/components/compose/add-row';
import { FrameTools, StickerTools } from '@/components/compose/selection-bar';
import { TemplateList, TemplatePicker } from '@/components/compose/template-picker';
import { TextEditorSheet, type TextDraft } from '@/components/compose/text-editor-sheet';
import { DoodleSurface, DoodleToolbar, type PenState } from '@/components/compose/doodle-pad';
import { PEN_WIDTHS, toDoodle } from '@/canvas/doodle';
import { GifPicker } from '@/components/gif-picker';
import { StampPicker } from '@/components/stamps/stamp-picker';
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
import { useGuardedPress } from '@/hooks/use-guarded-press';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceTake } from '@/hooks/use-voice-take';
import { track, trackError, type CaptureSource } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { markGuideDone } from '@/services/guide-progress';
import { lookupLocation } from '@/services/location.service';
import { canvasOf } from '@/templates/legacy';
import { defaultTextSpot, frameMediaId, isBlankCard, newDoc, scatterSticker, shownMediaIds } from '@/templates/registry';
import type { Composition, MediaElement } from '@/types/journal';
import { alertElementCap, alertMusicLimit, hasMusicElement } from '@/utils/media-attach';
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
// The canvas slot centres the card, so the gap above it (to the add row)
// and below it (to this bar) come out equal; the bar adds no padding of its own.
const BOTTOM_BAR = ROUND_BUTTON_SIZE + 8;
/** Between the canvas and the add row above / the bottom bar below. */
const CANVAS_MARGIN = SPACE;
/** Width of the bottom row's side controls (text, story). */
const SIDE_WIDTH = 92;
const SHAPES: StickerShape[] = ['rounded', 'square', 'circle', 'heart', 'star', 'arch', 'polaroid', 'stamp', 'tape'];

const DEFAULT_TEXT: TextDraft = { text: '', font: DEFAULT_MEMORY_FONT, color: null, align: 'center', style: 'plain', size: 0.065 };

interface ComposerBodyProps {
  existing: Composition | null;
  sharedText?: string;
  storyId?: number;
  createdAt?: number;
  /** A new memory starts in this template (otherwise the one that suits its media). */
  template?: TemplateId;
}

type Editing = { id: string; isNew: boolean } | null;

export function ComposerBody({ existing, sharedText, storyId, createdAt, template }: ComposerBodyProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
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
    const heldVoice = pending.length > 0 && pending.every((p) => p.type === 'audio');
    const source: CaptureSource = heldVoice ? 'voice_hold' : pending.length > 0 ? 'camera' : sharedText ? 'share_extension' : 'compose';
    const media: MediaElement[] = pending.map((p) => ({
      id: newId(),
      uri: p.uri,
      type: p.type,
      x_pos: 0,
      y_pos: 0,
      width: p.width,
      height: p.height,
    }));
    const state = initialComposerState(media, template ? newDoc(media, template) : undefined);
    // A voice note (held on the orange key) arrives as a disc in the middle,
    // the same sticker the composer's own Voice button adds.
    const voices = media.filter((m) => m.type === 'audio');
    if (voices.length > 0) {
      state.doc = {
        ...state.doc,
        layers: [...state.doc.layers, ...voices.map((m, i) => ({ id: newId(), kind: 'audio' as const, mediaId: m.id, x: 0.5, y: 0.45 + i * 0.12, scale: 1.3, rotation: 0 }))],
      };
    }
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
  // Doodling: strokes in canvas pixels until Done makes them one layer.
  const [doodle, setDoodle] = useState<number[][] | null>(null);
  const [pen, setPen] = useState<PenState>({ color: null, widthIndex: 1 });
  const [sheet, setSheet] = useState<'music' | 'gif' | 'stamp' | 'stories' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Song downloads by media id: the local file, or null if it failed.
  const pendingSongs = useRef(new Map<string, Promise<{ uri: string; artwork: string } | null>>());

  const media = useComposeMedia(c.media.length);
  const take = useVoiceTake();

  // ─── Canvas size: the largest 9:16 that fits between the bars ─────────
  const canvas = fitCanvas({
    width: window.width - 32,
    height: window.height - insets.top - bottomInset - TOP_BAR - ADD_AREA - BOTTOM_BAR - CANVAS_MARGIN * 2,
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
    const added = await media.captureWithCamera();
    c.addMedia(added);
  };
  /** Holding the camera button opens the camera ready to film. */
  const addVideoFromCamera = async () => {
    const added = await media.captureWithCamera({ video: true });
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

  const pickTemplate = (template: TemplateId) => {
    c.setTemplate(template);
    markGuideDone('template');
  };

  const onAdd = async (kind: AddKind) => {
    markGuideDone('addrow');
    switch (kind) {
      case 'text':
        setEditing({ id: newId(), isNew: true });
        return;
      case 'gif':
        setSheet('gif');
        return;
      case 'stamp':
        setSheet('stamp');
        return;
      case 'music':
        if (hasMusicElement(c.media)) {
          alertMusicLimit();
          return;
        }
        if (media.roomLeft <= 0) {
          alertElementCap();
          return;
        }
        setSheet('music');
        return;
      case 'voice':
        if (media.roomLeft <= 0) {
          alertElementCap();
          return;
        }
        haptic.tap();
        {
          const started = await take.start();
          if (started === 'denied') Alert.alert('Microphone is off', 'Allow microphone access in Settings to record a voice note.');
          else if (started === 'failed') Alert.alert("Couldn't start recording", 'Your phone may be low on storage, or another app is using the microphone. Try again in a moment.');
        }
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
      case 'doodle':
        c.select(null);
        setDoodle([]);
        return;
    }
  };

  const finishDoodle = () => {
    if (doodle && doodle.length > 0) {
      const d = toDoodle(doodle, canvas.width, canvas.height);
      c.addLayer({ id: newId(), kind: 'doodle', ...d, color: pen.color, width: PEN_WIDTHS[pen.widthIndex], scale: 1, rotation: 0 });
    }
    setDoodle(null);
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
    // A photo already there gives up its slot, so even a full memory can swap one.
    const [first] = await media.pickFromGallery({ replacing: !!frameMediaId(c.doc, target) });
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

  // Double taps act once: Save holds until the save has finished.
  const saveOnce = useGuardedPress(() => save());
  const openStories = useGuardedPress(() => {
    haptic.tap();
    setSheet('stories');
  });


  const storyLabel =
    storyIds.length === 0
      ? 'STORY'
      : storyIds.length === 1
        ? (stories.find((s) => s.id === storyIds[0])?.title.toUpperCase() ?? 'STORY')
        : `${storyIds.length} STORIES`;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GrainBackground />

      {/* While writing, the text editor owns the screen: the composer's own
          controls aren't drawn, so nothing doubles up under it. They rise
          back in when writing ends. */}
      {doodle && (
        <View style={[styles.doodleBar, { paddingTop: insets.top + 6 }]}>
          <DoodleToolbar pen={pen} onPen={setPen} canUndo={doodle.length > 0} onUndo={() => setDoodle((d) => d && d.slice(0, -1))} onDone={finishDoodle} />
        </View>
      )}
      {!editing && !doodle && (
        <Animated.View entering={fadeIn(200)} style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          {/* Two equal side groups, so the date stays in the true centre whether or not undo shows. */}
          <View style={styles.topLeft}>
            <CloseButton accessibilityLabel="Close without saving" />
            {c.canUndo && <RoundButton icon={Undo2} accessibilityLabel="Undo" onPress={c.undo} />}
          </View>
          {/* When this memory is from, for context. */}
          <View style={styles.moment} pointerEvents="none">
            <ThemedText style={[styles.momentText, { color: theme.textMuted }]} numberOfLines={1}>
              {formatMoment(openedAt)}
            </ThemedText>
          </View>
          <View style={styles.topRight}>
            <Pressable
              onPress={saveOnce}
              disabled={!hasContent || isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save memory"
              style={({ pressed }) => [styles.save, { backgroundColor: theme.text, opacity: !hasContent || isSaving ? 0.35 : pressed ? 0.7 : 1 }]}
            >
              <ThemedText style={[styles.saveText, { color: theme.background }]}>{isSaving ? '…' : 'SAVE'}</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      )}
      {!editing && !doodle && (
        <View style={styles.addArea}>
          <AddRow onAdd={onAdd} />
        </View>
      )}
      {editing && <View style={{ height: insets.top + TOP_BAR + ADD_AREA }} />}
      {doodle && <View style={{ height: insets.top + TOP_BAR + ADD_AREA }} />}

      <Animated.View entering={riseIn(320, 60, 12)} style={styles.canvasSlot}>
        {/* Taps around the canvas (not on it) let go of a selected sticker or photo. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (c.selectedId || c.selectedFrame) c.select(null);
          }}
          accessible={false}
        />
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
        {doodle && (
          <DoodleSurface width={canvas.width} height={canvas.height} pen={pen} strokes={doodle} onStroke={(points) => setDoodle((d) => [...(d ?? []), points])} />
        )}
        {!editing && !doodle && isBlankCard(c.doc) && c.doc.layers.length === 0 && (
          <Animated.View entering={fadeIn(300, 260)} style={styles.writeHint} pointerEvents="none">
            <ThemedText style={[styles.writeHintText, { color: theme.textMuted }]}>start your page</ThemedText>
          </Animated.View>
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
            onReplace={() => {
              markGuideDone('frame');
              fillFrame(c.selectedFrame!);
            }}
            onFlip={() => {
              markGuideDone('frame');
              c.mirrorCell(c.selectedFrame!);
            }}
            onRemove={() => {
              markGuideDone('frame');
              c.clearFrame(c.selectedFrame!);
            }}
          />
        )}
      </Animated.View>

      {!editing && !doodle && (
        <Animated.View entering={riseIn(340, 180, 12)} style={[styles.bottomRow, { paddingBottom: bottomInset + 8 }]}>
          {/* Camera and gallery at the thumb, the most common way in; the add row has the rest. */}
          <View style={styles.side}>
            <RoundButton icon={Camera} accessibilityLabel="Take a photo, or hold to record a video" onPress={addFromCamera} onLongPress={addVideoFromCamera} />
            <RoundButton icon={ImageIcon} accessibilityLabel="Add from gallery" onPress={addFromGallery} />
          </View>
          <View style={styles.middle}>
            <TemplatePicker
              current={c.doc.template}
              open={templatesOpen}
              onPick={pickTemplate}
              onToggleList={() => setTemplatesOpen((o) => !o)}
            />
          </View>
          {/* Optional filing: a short outlined pill, the text button's twin on the other side. */}
          <Pressable
            onPress={openStories}
            accessibilityRole="button"
            accessibilityLabel={storyIds.length > 0 ? `In ${storyLabel.toLowerCase()}. Change stories` : 'Add to a story'}
            style={({ pressed }) => [styles.storyCta, { borderColor: storyIds.length > 0 ? theme.text : theme.border, opacity: pressed ? 0.5 : 1 }]}
          >
            <Book size={14} color={theme.text} />
            <ThemedText style={[styles.storyCtaText, { color: theme.text }]} numberOfLines={1}>
              {storyLabel}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}
      {/* The template list floats above its pill; a tap anywhere else closes it. */}
      {templatesOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTemplatesOpen(false)} accessibilityLabel="Close templates" />
          <View style={[styles.templateList, { bottom: bottomInset + 8 + ROUND_BUTTON_SIZE + GAP }]}>
            <TemplateList
              current={c.doc.template}
              gap={c.doc.gap}
              onGap={c.setGap}
              onPick={(template) => {
                pickTemplate(template);
                setTemplatesOpen(false);
              }}
            />
          </View>
        </>
      )}
      {(editing || doodle) && <View style={{ height: BOTTOM_BAR + bottomInset }} />}

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

      <StampPicker
        visible={sheet === 'stamp'}
        onClose={() => setSheet(null)}
        onSelect={async (stamp) => {
          setSheet(null);
          if (media.roomLeft <= 0) {
            alertElementCap();
            return;
          }
          // The memory keeps its own copy of the stamp's photo, so it stays whole even if
          // the stamp is later removed from the collection.
          const dest = `${FileSystem.documentDirectory}stamp_sticker_${Date.now()}_${newId()}.jpg`;
          try {
            await FileSystem.copyAsync({ from: stamp.imageUri, to: dest });
          } catch (error) {
            trackError(error, 'stamp_sticker_copy');
            Alert.alert("Couldn't add the stamp", 'Try picking it again.');
            return;
          }
          const m: MediaElement = { id: newId(), uri: dest, type: 'image', isStamp: true, x_pos: 0, y_pos: 0 };
          markGuideDone('stampsticker');
          c.addLayer({ id: newId(), kind: 'stamp', mediaId: m.id, place: stamp.place, stampedAt: stamp.createdAt, x: 0.5, y: 0.4, scale: 1, rotation: -5 }, m);
          track('stamp_used_on_memory', {});
          haptic.thud();
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
  topLeft: { flex: 1, flexBasis: 0, flexDirection: 'row', gap: GAP },
  topRight: { flex: 1, flexBasis: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: GAP },
  canvasSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Floats over the bottom of the canvas, right above the picker it opened from (bottom set inline).
  templateList: { position: 'absolute', left: 24, right: 24 },
  // Every control in the row is one height (the app's 34pt round button), inset clear of the screen's rounded corners.
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: EDGE },
  middle: { flex: 1, flexBasis: 0, flexDirection: 'row' },
  addArea: { height: ADD_AREA },
  // Over the top bar and add row while doodling, so the canvas doesn't move.
  doodleBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  writeHint: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  writeHintText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, letterSpacing: 1 },
  // The two side controls share one width, so the template pill sits in the true centre.
  side: { width: SIDE_WIDTH, flexDirection: 'row', justifyContent: 'center', gap: GAP },
  moment: { height: ROUND_BUTTON_SIZE, alignItems: 'center', justifyContent: 'center', marginHorizontal: GAP },
  momentText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.2 },
  // Same height, border, radius and type as the template pill.
  storyCta: { width: SIDE_WIDTH, height: ROUND_BUTTON_SIZE, paddingHorizontal: 12, borderRadius: ROUND_BUTTON_SIZE / 2, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  storyCtaText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5, flexShrink: 1 },
  save: { height: ROUND_BUTTON_SIZE, paddingHorizontal: 22, borderRadius: ROUND_BUTTON_SIZE / 2, justifyContent: 'center' },
  saveText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2 },
});
