import { describe, expect, it } from 'vitest';

import { mixRecommendations, momentTerm, moodTerm, songKey, tasteArtists } from '@/music/recommend';
import type { MusicTrack } from '@/hooks/use-music-store';

const DAY = 24 * 60 * 60 * 1000;
const track = (trackId: number, artistName: string, trackName = `song ${trackId}`): MusicTrack => ({
  trackId,
  artistName,
  trackName,
  artworkUrl100: '',
  previewUrl: 'x',
});

describe('tasteArtists', () => {
  const now = 1_800_000_000_000;
  it('ranks by picks, fading with age, with hearts counting double', () => {
    const picks = [
      { trackId: 1, artistName: 'Arijit Singh', trackName: 'a', pickedAt: now - DAY },
      { trackId: 2, artistName: 'arijit singh', trackName: 'b', pickedAt: now - 2 * DAY },
      { trackId: 3, artistName: 'Old Band', trackName: 'c', pickedAt: now - 300 * DAY },
      { trackId: 4, artistName: 'Prateek Kuhad', trackName: 'd', pickedAt: now - DAY },
    ];
    expect(tasteArtists(picks, [track(9, 'Lorde')], now)).toEqual(['Lorde', 'Arijit Singh', 'Prateek Kuhad']);
  });
});

describe('moodTerm', () => {
  const evening = new Date(2026, 10, 14, 19);
  it('reads the canvas words and place first', () => {
    expect(moodTerm({ text: 'Caught in the RAIN again', at: evening })).toBe('rainy day acoustic');
    expect(moodTerm({ text: '', place: 'Calangute Beach, Goa', at: evening })).toBe('summer beach');
    expect(moodTerm({ text: "Riya's birthday!", at: evening })).toBe('party hits');
  });
  it('falls back to the time of day', () => {
    expect(moodTerm({ text: 'just a tuesday', at: evening })).toBe('evening chill');
    expect(momentTerm(new Date(2026, 0, 1, 7))).toBe('morning acoustic');
    expect(momentTerm(new Date(2026, 0, 1, 2))).toBe('late night lofi');
  });
  it("doesn't match words inside other words", () => {
    expect(moodTerm({ text: 'trained hard', at: evening })).toBe('evening chill');
  });
});

describe('mixRecommendations', () => {
  it('takes turns between sources, skips used songs and duplicates, caps each artist', () => {
    const taste = [track(1, 'A'), track(2, 'A'), track(3, 'A'), track(4, 'B')];
    const chart = [track(10, 'C'), track(11, 'D'), track(12, 'A', 'song 1 (Remastered)')];
    const mood = [track(20, 'E'), track(21, 'F')];
    const mix = mixRecommendations([taste, chart, mood], new Set([4]), 1);
    const ids = mix.map((t) => t.trackId);
    expect(ids).not.toContain(4);
    expect(mix.filter((t) => t.artistName === 'A').length).toBeLessThanOrEqual(2);
    expect(new Set(mix.map(songKey)).size).toBe(mix.length);
    // The first three come one from each source.
    expect([taste, chart, mood].map((s, i) => s.some((t) => t.trackId === ids[i]))).toEqual([true, true, true]);
  });

  it('is reproducible for a seed and different across seeds', () => {
    const big = Array.from({ length: 20 }, (_, i) => track(i, `artist ${i}`));
    const a = mixRecommendations([big], new Set(), 1).map((t) => t.trackId);
    expect(mixRecommendations([big], new Set(), 1).map((t) => t.trackId)).toEqual(a);
    expect(mixRecommendations([big], new Set(), 2).map((t) => t.trackId)).not.toEqual(a);
  });

  it('knows a remaster is the same song', () => {
    expect(songKey(track(1, 'X', 'Yellow (Remastered 2021)'))).toBe(songKey(track(2, 'x', 'Yellow')));
    expect(songKey(track(1, 'X', 'Yellow - Live'))).toBe(songKey(track(2, 'X', 'Yellow')));
  });
});
