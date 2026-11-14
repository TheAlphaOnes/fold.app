/**
 * iTunes music service — the one place the app talks to Apple's public
 * search and chart APIs. No account, no key. Every list comes back as
 * playable tracks only (a preview to play), and a failed request resolves
 * to an empty list after being recorded, so one source going down never
 * empties the picker.
 */

import * as Localization from 'expo-localization';

import type { MusicTrack } from '@/hooks/use-music-store';
import { trackError } from '@/services/analytics';

const SEARCH = 'https://itunes.apple.com/search';
const LOOKUP = 'https://itunes.apple.com/lookup';
/** Apple's chart feed (the newer rss.applemarketingtools API now redirects to nothing). */
const CHART = 'https://itunes.apple.com';

/** The storefront to search: the phone's region, else the US. */
export function storefront(): string {
  return (Localization.getLocales()[0]?.regionCode || 'US').toLowerCase();
}

interface ITunesResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

/** Keeps the results that can be played and shown. */
function playable(results: unknown): MusicTrack[] {
  if (!Array.isArray(results)) return [];
  return (results as ITunesResult[]).flatMap((r) =>
    r.trackId && r.trackName && r.artistName && r.previewUrl
      ? [{ trackId: r.trackId, trackName: r.trackName, artistName: r.artistName, artworkUrl100: r.artworkUrl100 ?? '', previewUrl: r.previewUrl }]
      : [],
  );
}

async function getJson(url: string, label: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    trackError(error, `music_${label}`);
    return null;
  }
}

/** Songs for a search term, a page at a time. */
export async function searchSongs(term: string, { limit = 25, offset = 0, artistOnly = false } = {}): Promise<MusicTrack[]> {
  const params = new URLSearchParams({ term, entity: 'song', limit: String(limit), offset: String(offset), country: storefront() });
  if (artistOnly) params.set('attribute', 'artistTerm');
  const data = (await getJson(`${SEARCH}?${params}`, 'search')) as { results?: unknown } | null;
  return playable(data?.results);
}

/** The country's most-played songs right now, with their previews. */
export async function chartSongs(limit = 25): Promise<MusicTrack[]> {
  const feed = (await getJson(`${CHART}/${storefront()}/rss/topsongs/limit=${limit}/json`, 'chart')) as {
    feed?: { entry?: { id?: { attributes?: { 'im:id'?: string } } }[] };
  } | null;
  const ids = (feed?.feed?.entry ?? []).flatMap((e) => (e.id?.attributes?.['im:id'] ? [e.id.attributes['im:id']] : []));
  if (ids.length === 0) return [];
  const data = (await getJson(`${LOOKUP}?id=${ids.join(',')}&country=${storefront()}`, 'lookup')) as { results?: unknown } | null;
  return playable(data?.results);
}
