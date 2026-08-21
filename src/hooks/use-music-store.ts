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
  init: () => Promise<void>;
  saveTrack: (track: MusicTrack) => Promise<void>;
  removeTrack: (trackId: number) => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
}

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  savedTracks: [],
  recentSearches: [],
  init: async () => {
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
    }
  },
  saveTrack: async (track) => {
    const { savedTracks, recentSearches } = get();
    if (savedTracks.some(t => t.trackId === track.trackId)) return;
    const newTracks = [track, ...savedTracks];
    set({ savedTracks: newTracks });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks: newTracks, recentSearches }));
    } catch(e) {}
  },
  removeTrack: async (trackId) => {
    const { savedTracks, recentSearches } = get();
    const newTracks = savedTracks.filter(t => t.trackId !== trackId);
    set({ savedTracks: newTracks });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks: newTracks, recentSearches }));
    } catch(e) {}
  },
  addRecentSearch: async (query) => {
    if (query.trim().length < 2) return;
    const { savedTracks, recentSearches } = get();
    const newSearches = [query.trim(), ...recentSearches.filter(q => q.toLowerCase() !== query.trim().toLowerCase())].slice(0, 10);
    set({ recentSearches: newSearches });
    try {
      await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ savedTracks, recentSearches: newSearches }));
    } catch(e) {}
  }
}));
