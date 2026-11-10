/**
 * Where the phone is, named by city (or the nearest coarser place). Shared
 * by the composer's Place sticker and the stamp camera.
 */

import * as Location from 'expo-location';

export interface FoundPlace {
  name?: string;
  country?: string;
  lat: number;
  lng: number;
}

/** Null when location is off or can't be found; never throws. */
export async function lookupLocation(): Promise<FoundPlace | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [place] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    const name = place ? place.city || place.subregion || place.region || place.country || undefined : undefined;
    return { name: name ?? undefined, country: place?.country ?? undefined, lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (error) {
    console.warn('Failed to fetch location', error);
    return null;
  }
}
