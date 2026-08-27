import { create } from 'zustand';
import { 
  getAllStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  getCompositionsByStoryId,
  type CreateStoryInput,
  type UpdateStoryInput
} from '@/db/stories-repository';
import { toggleCompositionStoryId } from '@/db/journal-repository';
import type { Story, Composition } from '@/types/journal';

interface StoriesState {
  stories: Story[];
  loading: boolean;
  error: Error | null;
  
  refreshStories: () => Promise<void>;
  addStory: (input: CreateStoryInput) => Promise<Story>;
  editStory: (input: UpdateStoryInput) => Promise<void>;
  removeStory: (id: number) => Promise<void>;
  
  // Specific story hydrated with memories
  activeStory: Story | null;
  activeStoryMemories: Composition[];
  loadStory: (id: number) => Promise<void>;
  clearActiveStory: () => void;
  
  // Linking memories
  assignMemoryToStory: (memoryId: number, storyId: number) => Promise<void>;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: [],
  loading: true,
  error: null,
  activeStory: null,
  activeStoryMemories: [],

  refreshStories: async () => {
    try {
      set({ loading: true, error: null });
      const storiesList = await getAllStories();
      set({ stories: storiesList, loading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err : new Error(String(err)), 
        loading: false 
      });
    }
  },

  addStory: async (input: CreateStoryInput) => {
    const newStory = await createStory(input);
    await get().refreshStories();
    return newStory;
  },

  editStory: async (input: UpdateStoryInput) => {
    await updateStory(input);
    await get().refreshStories();
    
    // Update active story if it's the one being edited
    const { activeStory } = get();
    if (activeStory?.id === input.id) {
      set({ activeStory: { ...activeStory, ...input, updatedAt: Date.now() } as Story });
    }
  },

  removeStory: async (id: number) => {
    await deleteStory(id);
    await get().refreshStories();
    if (get().activeStory?.id === id) {
      get().clearActiveStory();
    }
  },

  loadStory: async (id: number) => {
    try {
      set({ loading: true, error: null });
      const [story, memories] = await Promise.all([
        getStoryById(id),
        getCompositionsByStoryId(id)
      ]);
      set({ 
        activeStory: story, 
        activeStoryMemories: memories,
        loading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err : new Error(String(err)), 
        loading: false 
      });
    }
  },

  clearActiveStory: () => {
    set({ activeStory: null, activeStoryMemories: [] });
  },

  assignMemoryToStory: async (memoryId: number, storyId: number) => {
    await toggleCompositionStoryId(memoryId, storyId);
    
    // Refresh the active story if we are currently viewing one
    const { activeStory } = get();
    if (activeStory) {
      await get().loadStory(activeStory.id);
    }
    
    // Update the local list if needed to show cover images etc
    await get().refreshStories();
  }
}));
