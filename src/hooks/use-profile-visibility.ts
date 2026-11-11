/**
 * useProfileVisibility — whether the profile layer is on screen.
 *
 * The profile is not a pushed route: a route is unmounted when it pops, and
 * rebuilding that page on every open (the map above all) is what made each
 * open take seconds. Home mounts the profile once and keeps it; the profile
 * tab and the close button only flip this store, and the layer itself slides
 * on the UI thread.
 */

import { create } from 'zustand';

interface ProfileVisibilityState {
  /** The layer is on screen; while it slides in or out it still counts. */
  open: boolean;
  /** The layer has been opened at least once this session, so its content stays mounted. */
  everOpened: boolean;
  openProfile: () => void;
  closeProfile: () => void;
}

export const useProfileVisibility = create<ProfileVisibilityState>((set) => ({
  open: false,
  everOpened: false,
  openProfile: () => set({ open: true, everOpened: true }),
  closeProfile: () => set({ open: false }),
}));
