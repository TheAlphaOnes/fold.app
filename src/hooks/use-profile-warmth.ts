/**
 * useProfileWarmth — which profile sections have been built once this session.
 *
 * The profile screen unmounts when it closes, but its data stays cached. This
 * store keeps the view warmth too: a section built once stays built for the
 * rest of the session, so a return visit draws the full page in its first
 * frame — no skeletons, no staged mounting, no entrance animations.
 */

import { create } from 'zustand';

export type ProfileSection = 'map' | 'calendar' | 'activity' | 'wall';

interface ProfileWarmthState {
  /** Sections whose real content has been mounted at least once. */
  warm: Record<ProfileSection, boolean>;
  /** Marks a section warm; a no-op when it already is. */
  markWarm: (section: ProfileSection) => void;
}

const COLD: Record<ProfileSection, boolean> = {
  map: false,
  calendar: false,
  activity: false,
  wall: false,
};

export const useProfileWarmth = create<ProfileWarmthState>((set) => ({
  warm: COLD,
  markWarm: (section) =>
    set((state) => (state.warm[section] ? state : { warm: { ...state.warm, [section]: true } })),
}));
