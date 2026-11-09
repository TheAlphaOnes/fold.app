/**
 * The composer's state: the canvas doc being designed, the memory's media,
 * which layer is selected, and a short undo history. Every edit goes
 * through one of these actions so undo and template switching stay correct.
 *
 * Template choice: until the user picks one, adding media re-suggests the
 * template (no media → Text, 1 → Story, 2–6 → a grid). Once they pick,
 * their choice sticks.
 */

import { useCallback, useRef, useState } from 'react';

import type { CanvasDoc, Crop, Layer, TemplateId } from '@/canvas/types';
import { applyTemplate, newDoc, suggestTemplate } from '@/templates/registry';
import type { MediaElement } from '@/types/journal';

const UNDO_LIMIT = 30;

export interface ComposerState {
  doc: CanvasDoc;
  media: MediaElement[];
}

export function useComposerState(initial: ComposerState, templateChosen: boolean) {
  // The present state and what undo returns to, kept together so they change as one.
  const [timeline, setTimeline] = useState<{ present: ComposerState; past: ComposerState[] }>({ present: initial, past: [] });
  const state = timeline.present;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const chosen = useRef(templateChosen);

  /** Applies a change and remembers the previous state for undo. */
  const commit = useCallback((change: (s: ComposerState) => ComposerState) => {
    setTimeline(({ present, past }) => {
      const next = change(present);
      if (next === present) return { present, past };
      return { present: next, past: [...past.slice(-(UNDO_LIMIT - 1)), present] };
    });
  }, []);

  const undo = useCallback(() => {
    setTimeline(({ present, past }) => (past.length === 0 ? { present, past } : { present: past[past.length - 1], past: past.slice(0, -1) }));
  }, []);

  /** Updates the present without an undo step (e.g. a song's file arriving). */
  const setState = useCallback((change: (s: ComposerState) => ComposerState) => {
    setTimeline(({ present, past }) => ({ present: change(present), past }));
  }, []);

  const addMedia = useCallback(
    (added: MediaElement[]) => {
      if (added.length === 0) return;
      commit((s) => {
        const media = [...s.media, ...added];
        const template = chosen.current ? s.doc.template : suggestTemplate(media);
        return { media, doc: applyTemplate(s.doc, template, media) };
      });
    },
    [commit],
  );

  const setTemplate = useCallback(
    (template: TemplateId) => {
      chosen.current = true;
      commit((s) => (s.doc.template === template ? s : { ...s, doc: applyTemplate(s.doc, template, s.media) }));
    },
    [commit],
  );

  const addLayer = useCallback(
    (layer: Layer, media?: MediaElement) => {
      commit((s) => ({ media: media ? [...s.media, media] : s.media, doc: { ...s.doc, layers: [...s.doc.layers, layer] } }));
      setSelectedId(layer.id);
    },
    [commit],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      commit((s) => ({
        ...s,
        doc: { ...s.doc, layers: s.doc.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) },
      }));
    },
    [commit],
  );

  const removeLayer = useCallback(
    (id: string) => {
      commit((s) => {
        const layer = s.doc.layers.find((l) => l.id === id);
        if (!layer) return s;
        // A song/voice/photo sticker owns its media; drop the file reference too
        // unless something else still shows it.
        const mediaId = 'mediaId' in layer ? layer.mediaId : null;
        const layers = s.doc.layers.filter((l) => l.id !== id);
        const stillUsed =
          mediaId !== null &&
          (layers.some((l) => 'mediaId' in l && l.mediaId === mediaId) ||
            (s.doc.background.kind === 'media' && s.doc.background.mediaId === mediaId) ||
            (s.doc.cells ?? []).some((c) => c.mediaId === mediaId));
        const media = mediaId && !stillUsed && layer.kind !== 'media' ? s.media.filter((m) => m.id !== mediaId) : s.media;
        return { media, doc: { ...s.doc, layers } };
      });
      setSelectedId(null);
    },
    [commit],
  );

  const bringToFront = useCallback(
    (id: string) => {
      commit((s) => {
        const layer = s.doc.layers.find((l) => l.id === id);
        if (!layer || s.doc.layers[s.doc.layers.length - 1].id === id) return s;
        return { ...s, doc: { ...s.doc, layers: [...s.doc.layers.filter((l) => l.id !== id), layer] } };
      });
    },
    [commit],
  );

  /** Crop of the full-bleed background ('background') or of a grid cell. */
  const setCrop = useCallback(
    (target: 'background' | string, crop: Crop) => {
      commit((s) => {
        if (target === 'background') {
          if (s.doc.background.kind !== 'media') return s;
          return { ...s, doc: { ...s.doc, background: { ...s.doc.background, crop } } };
        }
        return { ...s, doc: { ...s.doc, cells: (s.doc.cells ?? []).map((c) => (c.cellId === target ? { ...c, crop } : c)) } };
      });
    },
    [commit],
  );

  const swapCells = useCallback(
    (a: string, b: string) => {
      commit((s) => {
        const cells = s.doc.cells ?? [];
        const ca = cells.find((c) => c.cellId === a);
        const cb = cells.find((c) => c.cellId === b);
        if (!ca || !cb) return s;
        return {
          ...s,
          doc: {
            ...s.doc,
            cells: cells.map((c) =>
              c.cellId === a ? { ...c, mediaId: cb.mediaId, crop: cb.crop, mirrored: cb.mirrored } : c.cellId === b ? { ...c, mediaId: ca.mediaId, crop: ca.crop, mirrored: ca.mirrored } : c,
            ),
          },
        };
      });
    },
    [commit],
  );

  /** Puts new media into one grid cell (tap on an empty cell). */
  const fillCell = useCallback(
    (cellId: string, added: MediaElement) => {
      commit((s) => ({
        media: [...s.media, added],
        doc: { ...s.doc, cells: (s.doc.cells ?? []).map((c) => (c.cellId === cellId ? { ...c, mediaId: added.id, crop: { x: 0, y: 0, scale: 1 } } : c)) },
      }));
    },
    [commit],
  );

  const mirrorCell = useCallback(
    (cellId: string) => {
      commit((s) => ({ ...s, doc: { ...s.doc, cells: (s.doc.cells ?? []).map((c) => (c.cellId === cellId ? { ...c, mirrored: !c.mirrored } : c)) } }));
    },
    [commit],
  );

  const setGap = useCallback(
    (gap: CanvasDoc['gap']) => {
      commit((s) => ({ ...s, doc: { ...s.doc, gap } }));
    },
    [commit],
  );

  /** Replaces a media element (e.g. a song's remote preview with its downloaded file). */
  const replaceMedia = useCallback((id: string, patch: Partial<MediaElement>) => {
    // Not an undoable edit: it's the same media, now local.
    setState((s) => ({ ...s, media: s.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [setState]);

  return {
    ...state,
    selectedId,
    select: setSelectedId,
    canUndo: timeline.past.length > 0,
    undo,
    addMedia,
    setTemplate,
    addLayer,
    updateLayer,
    removeLayer,
    bringToFront,
    setCrop,
    swapCells,
    fillCell,
    mirrorCell,
    setGap,
    replaceMedia,
  };
}

export function initialComposerState(media: MediaElement[], doc?: CanvasDoc): ComposerState {
  return { media, doc: doc ?? newDoc(media) };
}
