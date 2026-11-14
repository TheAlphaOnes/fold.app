/**
 * useRecommendations — the picker's opening list: your artists, the
 * memory's mood and your country's chart, fetched together and mixed (see
 * `recommend.ts`). Rebuilt each time the picker opens, with a fresh seed;
 * the last mix shows at once while the new one loads.
 */

import { useEffect, useState } from 'react';

import { useMusicStore, type MusicTrack } from '@/hooks/use-music-store';
import { chartSongs, searchSongs } from '@/music/itunes';
import { mixRecommendations, moodTerm, tasteArtists, type CanvasContext } from '@/music/recommend';

/** The last mix, kept across openings so the picker never opens empty. */
let lastMix: MusicTrack[] = [];
let lastMood = '';

export function useRecommendations(visible: boolean, context: CanvasContext): { tracks: MusicTrack[]; loading: boolean; mood: string } {
  const [tracks, setTracks] = useState<MusicTrack[]>(lastMix);
  const [mood, setMood] = useState(lastMood);
  // Each opening is one request; it's loading until that opening's mix lands.
  const [opening, setOpening] = useState(0);
  const [landed, setLanded] = useState(0);
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setOpening((n) => n + 1);
  }
  const loading = visible && landed !== opening;

  useEffect(() => {
    if (!visible || opening === 0) return undefined;
    let cancelled = false;
    const { picks, savedTracks } = useMusicStore.getState();
    const artists = tasteArtists(picks, savedTracks, Date.now());
    const term = moodTerm(context);
    void (async () => {
      const [taste, moodSongs, chart] = await Promise.all([
        Promise.all(artists.map((a) => searchSongs(a, { limit: 12, artistOnly: true }))).then((lists) => lists.flat()),
        searchSongs(term, { limit: 25 }),
        chartSongs(25),
      ]);
      if (cancelled) return;
      const used = new Set(picks.map((p) => p.trackId));
      const mix = mixRecommendations([taste, moodSongs, chart], used, Date.now() % 100_000);
      // Never replace a good list with an empty one when the network is down.
      if (mix.length > 0) {
        lastMix = mix;
        lastMood = term;
        setTracks(mix);
        setMood(term);
      }
      setLanded(opening);
    })();
    return () => {
      cancelled = true;
    };
    // The context is read when the picker opens; typing in it later shouldn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  return { tracks, loading, mood };
}
