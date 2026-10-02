import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
export interface MusicTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

const FILE_URI = `${FileSystem.documentDirectory}music-preferences.json`;

interface MusicStoreState {
  savedTracks: MusicTrack[];
  recentSearches: string[];
  /** True once the preferences file has been read (or found missing). */
  initialized: boolean;
  init: () => Promise<void>;
  saveTrack: (track: MusicTrack) => Promise<void>;
  removeTrack: (trackId: number) => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
}

// One in-flight init across all callers — the picker re-mounts with every
// compose screen entry, and only the first load should touch the filesystem.
let initPromise: Promise<void> | null = null;

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  savedTracks: [],
  recentSearches: [],
  initialized: false,
  init: () => {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          const info = await FileSystem.getInfoAsync(FILE_URI);
          if (info.exists) {
            const content = await FileSystem.readAsStringAsync(FILE_URI);
            const data = JSON.parse(content);
            set({
              savedTracks: data.savedTracks || [],
              recentSearches: data.recentSearches || []
            });
          }
        } catch (e) {
          console.error('Failed to load music preferences', e);
        } finally {
          set({ initialized: true });
        }
      })();
    }
    return initPromise;
  },
  saveTrack: async (track) => {
    const { savedTracks, recentSearches } = get();
    if (savedTracks.some(t => t.trackId === track.trackId)) return;
    const newTracks = [track, ...savedTracks];
    set({ savedTracks: newTracks });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks: newTracks, recentSearches }));
    } catch (e) {
      console.error('Failed to persist saved tracks', e);
    }
  },
  removeTrack: async (trackId) => {
    const { savedTracks, recentSearches } = get();
    const newTracks = savedTracks.filter(t => t.trackId !== trackId);
    set({ savedTracks: newTracks });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks: newTracks, recentSearches }));
    } catch (e) {
      console.error('Failed to persist saved tracks', e);
    }
  },
  addRecentSearch: async (query) => {
    if (query.trim().length < 2) return;
    const { savedTracks, recentSearches } = get();
    const newSearches = [query.trim(), ...recentSearches.filter(q => q.toLowerCase() !== query.trim().toLowerCase())].slice(0, 10);
    set({ recentSearches: newSearches });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks, recentSearches: newSearches }));
    } catch (e) {
      console.error('Failed to persist recent searches', e);
    }
  }
}));
