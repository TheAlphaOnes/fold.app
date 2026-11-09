/**
 * The composer's state: the canvas doc being designed, the memory's media,
 * which layer is selected, and a short undo history. Every edit goes
 * through one of these actions so undo and template switching stay correct.
 *
 * Template choice: until the user picks one, adding media re-suggests the
 * template (0 or 1 photo → Canvas, 2–6 → a grid). Once they pick,
 * their choice sticks, unless new photos wouldn't fit it (a photo added to
 * Text, a second one to Story, a full grid): then it moves to a template
 * that shows everything, so nothing is ever added invisibly.
 */

import { useCallback, useRef, useState } from 'react';

import type { CanvasDoc, Crop, Layer, TemplateId } from '@/canvas/types';
import {
  applyTemplate,
  baseCandidates,
  clearFrame,
  fillFrame,
  newDoc,
  placesAll,
  removeLayerFrom,
  suggestTemplate,
  type FrameTarget,
} from '@/templates/registry';
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
  // One thing is selected at a time: a layer, or a photo frame in the base.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameTarget | null>(null);
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedFrame(null);
  }, []);
  const selectFrame = useCallback((target: FrameTarget | null) => {
    setSelectedFrame(target);
    setSelectedId(null);
  }, []);
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

  /**
   * Applies a change everywhere, history included, without an undo step:
   * a song's downloaded file must replace its preview URL in every state
   * undo could return to.
   */
  const setState = useCallback((change: (s: ComposerState) => ComposerState) => {
    setTimeline(({ present, past }) => ({ present: change(present), past: past.map(change) }));
  }, []);

  const addMedia = useCallback(
    (added: MediaElement[]) => {
      if (added.length === 0) return;
      commit((s) => {
        const media = [...s.media, ...added];
        const suggested = () => suggestTemplate(baseCandidates(s.doc, media));
        let doc = applyTemplate(s.doc, chosen.current ? s.doc.template : suggested(), media);
        if (!placesAll(doc, media)) doc = applyTemplate(doc, suggested(), media);
        return { media, doc };
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
      select(layer.id);
    },
    [commit, select],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      commit((s) => {
        const layer = s.doc.layers.find((l) => l.id === id);
        // Several gestures can end together with the same values: one undo step, not three.
        if (!layer || (Object.keys(patch) as (keyof Layer)[]).every((k) => layer[k] === patch[k])) return s;
        return { ...s, doc: { ...s.doc, layers: s.doc.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) } };
      });
    },
    [commit],
  );

  const removeLayer = useCallback(
    (id: string) => {
      // A sticker owns its media: removing it removes the photo/song too,
      // unless something else still shows it (otherwise the Stickers
      // template would bring a deleted photo straight back).
      commit((s) => removeLayerFrom(s, id));
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
        const same = (a: Crop) => a.x === crop.x && a.y === crop.y && a.scale === crop.scale;
        if (target === 'background') {
          if (s.doc.background.kind !== 'media' || same(s.doc.background.crop)) return s;
          return { ...s, doc: { ...s.doc, background: { ...s.doc.background, crop } } };
        }
        const cell = (s.doc.cells ?? []).find((c) => c.cellId === target);
        if (!cell || same(cell.crop)) return s;
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

  /** Puts new media into a frame: an empty cell's "+", or Replace on a selected photo. */
  const fillFrameWith = useCallback(
    (target: FrameTarget, added: MediaElement) => {
      commit((s) => fillFrame(s, target, added));
    },
    [commit],
  );

  /** Empties a frame (Remove on a selected photo); undo brings it back. */
  const clearFrameAt = useCallback(
    (target: FrameTarget) => {
      commit((s) => clearFrame(s, target));
      setSelectedFrame(null);
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
    select,
    selectedFrame,
    selectFrame,
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
    fillFrame: fillFrameWith,
    clearFrame: clearFrameAt,
    mirrorCell,
    setGap,
    replaceMedia,
  };
}

export function initialComposerState(media: MediaElement[], doc?: CanvasDoc): ComposerState {
  return { media, doc: doc ?? newDoc(media) };
}
