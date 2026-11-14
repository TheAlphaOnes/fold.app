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

/** A song chosen for a memory: what the recommendations learn from. */
export interface MusicPick {
  trackId: number;
  artistName: string;
  trackName: string;
  pickedAt: number;
}

/** How many picks are remembered; older taste fades out. */
const PICKS_KEPT = 60;

interface MusicStoreState {
  savedTracks: MusicTrack[];
  recentSearches: string[];
  /** Songs chosen for memories, newest first. */
  picks: MusicPick[];
  /** True once the preferences file has been read (or found missing). */
  initialized: boolean;
  init: () => Promise<void>;
  saveTrack: (track: MusicTrack) => Promise<void>;
  removeTrack: (trackId: number) => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
  /** Remembers a song chosen for a memory. */
  recordPick: (track: MusicTrack) => Promise<void>;
}

// One in-flight init across all callers — the picker re-mounts with every
// compose screen entry, and only the first load should touch the filesystem.
let initPromise: Promise<void> | null = null;

/** Writes the whole preferences file from the current state. */
async function persist(state: Pick<MusicStoreState, 'savedTracks' | 'recentSearches' | 'picks'>): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks: state.savedTracks, recentSearches: state.recentSearches, picks: state.picks }));
  } catch (e) {
    console.error('Failed to persist music preferences', e);
  }
}

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  savedTracks: [],
  recentSearches: [],
  picks: [],
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
              recentSearches: data.recentSearches || [],
              picks: data.picks || [],
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
    if (get().savedTracks.some(t => t.trackId === track.trackId)) return;
    set({ savedTracks: [track, ...get().savedTracks] });
    await persist(get());
  },
  removeTrack: async (trackId) => {
    set({ savedTracks: get().savedTracks.filter(t => t.trackId !== trackId) });
    await persist(get());
  },
  addRecentSearch: async (query) => {
    const q = query.trim();
    if (q.length < 2) return;
    set({ recentSearches: [q, ...get().recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 10) });
    await persist(get());
  },
  recordPick: async (track) => {
    const pick: MusicPick = { trackId: track.trackId, artistName: track.artistName, trackName: track.trackName, pickedAt: Date.now() };
    set({ picks: [pick, ...get().picks.filter(p => p.trackId !== track.trackId)].slice(0, PICKS_KEPT) });
    await persist(get());
  },
}));
