package expo.modules.foldhaptics

import android.annotation.TargetApi
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Fold's Android haptics.
 *
 * React Native's Vibration and expo-haptics both vibrate without saying
 * what the vibration is for. Android 13+ files such vibrations under
 * "media", and many phones ship with media vibration off, so they were
 * silently dropped. Here every effect is labelled as touch feedback — the
 * same category as keyboard taps — so it follows the phone's touch
 * feedback setting, which is on by default.
 *
 * Effects use the system's predefined clicks where available (API 29+):
 * they are tuned per device and feel crisp on modern motors.
 */
class FoldHapticsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val vibrator: Vibrator?
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

  override fun definition() = ModuleDefinition {
    Name("FoldHaptics")

    Function("play") { kind: String ->
      val v = vibrator ?: return@Function false
      if (!v.hasVibrator()) return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrate(v, effectFor(kind))
      } else {
        @Suppress("DEPRECATION")
        v.vibrate(legacyPattern(kind), -1)
      }
      true
    }

    /** Why a phone might not be vibrating, readable without adb. */
    Function("diagnose") {
      val v = vibrator
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      val touchFeedback = Settings.System.getInt(
        context.contentResolver,
        Settings.System.HAPTIC_FEEDBACK_ENABLED,
        1
      ) == 1
      mapOf(
        "hasVibrator" to (v?.hasVibrator() == true),
        "hasAmplitudeControl" to
          (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && v?.hasAmplitudeControl() == true),
        "touchFeedbackEnabled" to touchFeedback,
        "powerSaveMode" to (power?.isPowerSaveMode == true),
        "ringerMode" to when (audio?.ringerMode) {
          AudioManager.RINGER_MODE_SILENT -> "silent"
          AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
          else -> "normal"
        },
        "sdk" to Build.VERSION.SDK_INT,
        "manufacturer" to Build.MANUFACTURER
      )
    }
  }

  @TargetApi(Build.VERSION_CODES.O)
  private fun vibrate(v: Vibrator, effect: VibrationEffect) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      v.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH))
    } else {
      // Before Android 13, sonification audio attributes map to touch feedback.
      val attributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      @Suppress("DEPRECATION")
      v.vibrate(effect, attributes)
    }
  }

  @TargetApi(Build.VERSION_CODES.O)
  private fun effectFor(kind: String): VibrationEffect {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      when (kind) {
        "tap", "toggleOn" -> return VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
        "select", "toggleOff" -> return VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
        "press", "thud" -> return VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
        "success" -> return VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
      }
    }
    return when (kind) {
      "test" -> VibrationEffect.createOneShot(400, VibrationEffect.DEFAULT_AMPLITUDE)
      "select", "toggleOff" -> VibrationEffect.createOneShot(12, VibrationEffect.DEFAULT_AMPLITUDE)
      "press" -> VibrationEffect.createOneShot(22, VibrationEffect.DEFAULT_AMPLITUDE)
      "thud" -> VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE)
      "success" -> VibrationEffect.createWaveform(longArrayOf(0, 16, 70, 28), -1)
      "warning" -> VibrationEffect.createWaveform(longArrayOf(0, 24, 90, 24), -1)
      "error" -> VibrationEffect.createWaveform(longArrayOf(0, 30, 60, 30, 60, 30), -1)
      else -> VibrationEffect.createOneShot(16, VibrationEffect.DEFAULT_AMPLITUDE)
    }
  }

  /** Android 7: plain on/off patterns, [wait, buzz, wait, buzz…] in ms. */
  private fun legacyPattern(kind: String): LongArray = when (kind) {
    "test" -> longArrayOf(0, 400)
    "select", "toggleOff" -> longArrayOf(0, 12)
    "press" -> longArrayOf(0, 22)
    "thud" -> longArrayOf(0, 35)
    "success" -> longArrayOf(0, 16, 70, 28)
    "warning" -> longArrayOf(0, 24, 90, 24)
    "error" -> longArrayOf(0, 30, 60, 30, 60, 30)
    else -> longArrayOf(0, 16)
  }
}
