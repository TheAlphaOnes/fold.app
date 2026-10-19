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
 * silently dropped. Here effects are labelled as touch feedback — the same
 * category as keyboard taps — so they follow the phone's touch feedback
 * setting, which is on by default. If the user has turned that off, they
 * go out unlabelled instead, under the phone's general vibration setting.
 *
 * Effects use the system's predefined clicks where the phone confirms it
 * implements them; elsewhere, plain pulses sized to the phone's motor.
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
        vibrate(v, effectFor(v, kind))
      } else {
        // Android 7 has no amplitude control to ask about; assume a slow motor.
        @Suppress("DEPRECATION")
        v.vibrate(pulseFor(kind, slowMotor = true), -1)
      }
      true
    }

    /** Why a phone might not be vibrating, readable without adb. */
    Function("diagnose") {
      val v = vibrator
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      mapOf(
        "hasVibrator" to (v?.hasVibrator() == true),
        "hasAmplitudeControl" to
          (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && v?.hasAmplitudeControl() == true),
        "touchFeedbackEnabled" to touchFeedbackEnabled(),
        "predefinedClicks" to (v != null && supportsPredefined(v, VibrationEffect.EFFECT_CLICK)),
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

  /** The phone's "Touch feedback" switch; on unless the user turned it off. */
  private fun touchFeedbackEnabled(): Boolean =
    Settings.System.getInt(context.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 1

  @TargetApi(Build.VERSION_CODES.O)
  private fun vibrate(v: Vibrator, effect: VibrationEffect) {
    if (!touchFeedbackEnabled()) {
      // Touch-labelled vibrations would be dropped. Unlabelled ones fall
      // under the phone's general vibration setting instead, which is the
      // best chance left of being felt.
      v.vibrate(effect)
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
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

  /** The system click for a kind, if it has one. */
  private fun predefinedFor(kind: String): Int? = when (kind) {
    "tap", "toggleOn" -> VibrationEffect.EFFECT_CLICK
    "select", "toggleOff" -> VibrationEffect.EFFECT_TICK
    "press", "thud" -> VibrationEffect.EFFECT_HEAVY_CLICK
    "success" -> VibrationEffect.EFFECT_DOUBLE_CLICK
    else -> null
  }

  /**
   * Predefined clicks only where the phone confirms it implements them
   * (Android 11+ can say). Elsewhere they may silently play nothing, which
   * is why haptics worked on some phones and not others.
   */
  private fun supportsPredefined(v: Vibrator, effectId: Int): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
      v.areAllEffectsSupported(effectId) == Vibrator.VIBRATION_EFFECT_SUPPORT_YES

  @TargetApi(Build.VERSION_CODES.O)
  private fun effectFor(v: Vibrator, kind: String): VibrationEffect {
    val predefined = predefinedFor(kind)
    if (predefined != null && supportsPredefined(v, predefined)) {
      return VibrationEffect.createPredefined(predefined)
    }
    val pattern = pulseFor(kind, slowMotor = !v.hasAmplitudeControl())
    return if (pattern.size == 2) {
      VibrationEffect.createOneShot(pattern[1], VibrationEffect.DEFAULT_AMPLITUDE)
    } else {
      VibrationEffect.createWaveform(pattern, -1)
    }
  }

  /**
   * [wait, buzz, wait, buzz…] in ms. Phones without amplitude control
   * usually have a spinning (ERM) motor that needs ~20–30ms to spin up,
   * so their pulses are longer or they would never be felt.
   */
  private fun pulseFor(kind: String, slowMotor: Boolean): LongArray = if (slowMotor) {
    when (kind) {
      "test" -> longArrayOf(0, 400)
      "select" -> longArrayOf(0, 22)
      "toggleOff" -> longArrayOf(0, 24)
      "toggleOn" -> longArrayOf(0, 32)
      "press" -> longArrayOf(0, 40)
      "thud" -> longArrayOf(0, 55)
      "success" -> longArrayOf(0, 30, 80, 40)
      "warning" -> longArrayOf(0, 36, 100, 36)
      "error" -> longArrayOf(0, 40, 70, 40, 70, 40)
      else -> longArrayOf(0, 30)
    }
  } else {
    when (kind) {
      "test" -> longArrayOf(0, 400)
      "select" -> longArrayOf(0, 12)
      "toggleOff" -> longArrayOf(0, 14)
      "toggleOn" -> longArrayOf(0, 20)
      "press" -> longArrayOf(0, 26)
      "thud" -> longArrayOf(0, 40)
      "success" -> longArrayOf(0, 18, 70, 30)
      "warning" -> longArrayOf(0, 26, 90, 26)
      "error" -> longArrayOf(0, 32, 60, 32, 60, 32)
      else -> longArrayOf(0, 18)
    }
  }
}
