/** A stamp: a photo taken somewhere, kept as proof you were there. */
export interface Stamp {
  id: number;
  /** The cropped square photo (local file). */
  imageUri: string;
  /** City (or the nearest coarser place). */
  place: string;
  country?: string;
  latitude: number;
  longitude: number;
  createdAt: number;
}

export type NewStamp = Omit<Stamp, 'id'>;
