/**
 * FoldAlarms — whether Android lets Fold fire reminders at their exact
 * minute, and a way to the setting that allows it. See the Kotlin module.
 *
 * Null on iOS (where dated notifications are always on time) and on builds
 * made before this module existed, so callers treat it as nothing to do.
 */

import { requireOptionalNativeModule } from 'expo';

interface FoldAlarmsModule {
  canScheduleExactAlarms(): boolean;
  /** Returns false when the phone has no such setting page. */
  openExactAlarmSettings(): boolean;
}

export const FoldAlarms = requireOptionalNativeModule<FoldAlarmsModule>('FoldAlarms');
