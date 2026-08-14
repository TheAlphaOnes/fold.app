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
}

export interface Composition {
  id: number;
  textContent: string;
  mediaElements: MediaElement[];
  createdAt: number;
  fontFamily: string;
  fontSize: number;
  location?: LocationData;
}
