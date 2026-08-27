import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedGif {
  id: string;
  url: string;
  width: number;
  height: number;
  title: string;
}

interface GifState {
  savedGifs: SavedGif[];
  saveGif: (gif: SavedGif) => void;
  removeGif: (id: string) => void;
}

export const useGifStore = create<GifState>()(
  persist(
    (set) => ({
      savedGifs: [],
      saveGif: (gif) => set((state) => {
        if (state.savedGifs.some(g => g.id === gif.id)) return state;
        return { savedGifs: [gif, ...state.savedGifs] };
      }),
      removeGif: (id) => set((state) => ({
        savedGifs: state.savedGifs.filter((g) => g.id !== id),
      })),
    }),
    {
      name: 'fold-saved-gifs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
