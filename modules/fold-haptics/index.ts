/**
 * FoldHaptics — Android touch feedback labelled as touch, so phones with
 * media vibration off still feel it. See the Kotlin module for why.
 *
 * Null on iOS (which uses expo-haptics) and on builds made before this
 * module existed, so callers fall back instead of crashing.
 */

import { requireOptionalNativeModule } from 'expo';

export type FoldHapticKind =
  | 'tap'
  | 'select'
  | 'press'
  | 'thud'
  | 'toggleOn'
  | 'toggleOff'
  | 'success'
  | 'warning'
  | 'error'
  | 'test';

/** Phone state that decides whether vibration can be felt. */
export interface HapticsDiagnosis {
  hasVibrator: boolean;
  hasAmplitudeControl: boolean;
  touchFeedbackEnabled: boolean;
  /** The phone implements Android's predefined click effects. */
  predefinedClicks: boolean;
  powerSaveMode: boolean;
  ringerMode: 'silent' | 'vibrate' | 'normal';
  sdk: number;
  manufacturer: string;
}

interface FoldHapticsModule {
  /** Returns false when the phone has no vibrator. */
  play(kind: FoldHapticKind): boolean;
  diagnose(): HapticsDiagnosis;
}

export const FoldHaptics = requireOptionalNativeModule<FoldHapticsModule>('FoldHaptics');
