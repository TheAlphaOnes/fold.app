import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { MAX_FILE_SIZE_BYTES, MAX_MEDIA_ELEMENTS, type MediaKind } from "@/constants/media";

/** True when a known file size fits under the per-file cap for its kind. */
export function withinFileSize(
  kind: MediaKind,
  bytes: number | null | undefined,
): boolean {
  if (bytes == null) return true;
  return bytes <= MAX_FILE_SIZE_BYTES[kind];
}

/**
 * Slices incoming elements down to the per-memory element cap.
 * Reports whether anything was dropped so callers can alert.
 */
export function sliceToElementCap<T>(
  currentCount: number,
  incoming: T[],
): { accepted: T[]; capped: boolean } {
  const room = Math.max(0, MAX_MEDIA_ELEMENTS - currentCount);
  const accepted = incoming.slice(0, room);
  return { accepted, capped: accepted.length < incoming.length };
}

export function alertElementCap() {
  Alert.alert(
    "ELEMENT LIMIT",
    `A memory holds up to ${MAX_MEDIA_ELEMENTS} media elements. Remove one to add more.`,
  );
}

export function alertFileTooLarge(kind: MediaKind, count = 1) {
  const mb = Math.round(MAX_FILE_SIZE_BYTES[kind] / (1024 * 1024));
  Alert.alert(
    "FILE TOO LARGE",
    count > 1
      ? `${count} files were skipped - the ${kind} limit is ${mb} MB.`
      : `That ${kind} is over the ${mb} MB limit and was skipped.`,
  );
}

/**
 * Verifies an already-copied or already-downloaded file against the size
 * cap. Deletes the file and returns false when it exceeds the cap.
 */
export async function verifyFileSize(
  kind: MediaKind,
  fileUri: string,
): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists && !withinFileSize(kind, info.size)) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return false;
  }
  return true;
}

/**
 * Copies a media file into app space, enforcing the per-file size cap.
 *
 * When the size is already known (e.g. ImagePickerAsset.fileSize) an
 * over-cap file is rejected before the copy. Otherwise the copy happens
 * first and the result is measured and removed if it exceeds the cap.
 * Returns the destination URI, or null when the file was rejected.
 */
export async function copyWithinFileSize(params: {
  from: string;
  to: string;
  kind: MediaKind;
  knownSizeBytes?: number | null;
}): Promise<string | null> {
  const { from, to, kind, knownSizeBytes } = params;

  if (!withinFileSize(kind, knownSizeBytes)) return null;

  await FileSystem.copyAsync({ from, to });

  return (await verifyFileSize(kind, to)) ? to : null;
}

/**
 * Downloads a remote media file into app space, enforcing the per-file
 * size cap on the result. Returns the destination URI, or null when the
 * downloaded file exceeds the cap (it is deleted in that case).
 */
export async function downloadWithinFileSize(params: {
  url: string;
  to: string;
  kind: MediaKind;
}): Promise<string | null> {
  const { url, to, kind } = params;
  const { uri } = await FileSystem.downloadAsync(url, to);

  return (await verifyFileSize(kind, to)) ? uri : null;
}
