package expo.modules.foldalarms

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Exact alarms for Fold's moment reminders.
 *
 * expo-notifications schedules a dated reminder with an exact alarm only
 * when the app may use one; otherwise it falls back to an inexact alarm,
 * which Android is free to hold back while the phone idles, batch, or (on
 * many OEM builds) drop. Android 12 and 13 grant SCHEDULE_EXACT_ALARM at
 * install; Android 14+ leaves it off until the person turns on "Alarms &
 * reminders" for the app. This module reports that state and opens the
 * setting.
 */
class FoldAlarmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FoldAlarms")

    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      alarms?.canScheduleExactAlarms() ?: false
    }

    /** Opens this app's "Alarms & reminders" page. Returns false if the phone has none. */
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (intent.resolveActivity(context.packageManager) == null) return@Function false
      context.startActivity(intent)
      true
    }
  }
}
