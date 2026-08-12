export interface MediaElement {
  id: string; // Unique ID for this media in the array
  uri: string;
  type: 'image' | 'video' | 'audio';
  x_pos: number;
  y_pos: number;
  width?: number;
  height?: number;
}

export interface CompositionRow {
  id: number;
  text_content: string;
  media_elements: string; // JSON string
  created_at: number;
}

export interface Composition {
  id: number;
  textContent: string;
  mediaElements: MediaElement[];
  createdAt: number;
}
