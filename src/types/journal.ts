export interface MediaElement {
  id: string; // Unique ID for this media in the array
  uri: string;
  type: 'image' | 'video' | 'audio';
  x_pos: number;
  y_pos: number;
  width?: number;
  height?: number;
  scale?: number;
  metadata?: {
    title: string;
    artist: string;
    artwork: string;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string; // e.g. city or neighborhood name
}

export interface CompositionRow {
  id: number;
  text_content: string;
  media_elements: string; // JSON string
  created_at: number;
  font_family: string;
  font_size: number;
  location_name?: string;
  location_coords?: string; // JSON string of LocationData
  story_ids?: string; // Comma-separated string from GROUP_CONCAT
  story_id?: number; // Legacy column
}

export interface Composition {
  id: number;
  textContent: string;
  mediaElements: MediaElement[];
  createdAt: number;
  fontFamily: string;
  fontSize: number;
  location?: LocationData;
  storyIds: number[];
}

export interface StoryRow {
  id: number;
  title: string;
  cover_image_uri: string | null;
  created_at: number;
  updated_at: number;
}

export interface Story {
  id: number;
  title: string;
  coverImageUri?: string;
  sampleMedia?: { uri: string; type: 'image' | 'video' | 'audio' }[];
  createdAt: number;
  updatedAt: number;
  memories?: Composition[]; // Hydrated array of memories belonging to this story
}
