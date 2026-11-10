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

/**
 * The quickest fix there is: the phone's last known position, named. Lets a
 * screen show the place at once while lookupLocation gets a fresh fix.
 * Null when there's no permission or no cached position.
 */
export async function lastKnownPlace(): Promise<FoundPlace | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (!pos) return null;
    const [place] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    const name = place ? place.city || place.subregion || place.region || place.country || undefined : undefined;
    return name ? { name, country: place?.country ?? undefined, lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch (error) {
    console.warn('Failed to read last known location', error);
    return null;
  }
}
