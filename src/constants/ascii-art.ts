/**
 * The app's ASCII art registry — every piece in one place.
 *
 * Each art is pinned to an exact character grid and rendered through
 * <AsciiArt> (src/components/ascii-art.tsx), which converts the string
 * into SVG: one text node per line, bundled JetBrains Mono, one fixed
 * viewBox. The grid alignment IS the design — do not re-indent lines.
 */

/** Home empty state: a book opening to blank pages. (asciiart.eu) */
export const BOOK_ART = [
  "    __________________   __________________",
  ".-/|                  \\ /                  |\\-.",
  "||||                   |                   ||||",
  "||||                   |       ~~*~~       ||||",
  "||||    --==*==--      |                   ||||",
  "||||                   |                   ||||",
  "||||                   |                   ||||",
  "||||                   |     --==*==--     ||||",
  "||||                   |                   ||||",
  "||||                   |                   ||||",
  "||||                   |                   ||||",
  "||||                   |                   ||||",
  "||||__________________ | __________________||||",
  "||/===================\\|/===================\\||",
  "`--------------------~___~-------------------''",
].join("\n");

/** Story empty state: a blank cassette, SIDE A, waiting to be recorded. */
export const CASSETTE_ART = [
  "    ______________________________________",
  ".-/|                                      |\\-.",
  "   |   ________________________________   |",
  "   |  |   __________________________   |  |",
  "   |  |  |    .--.          .--.    |  |  |",
  "   |  |  |   ( () )        ( () )   |  |  |",
  "   |  |  |    `--'          `--'    |  |  |",
  "   |  |  |__________________________|  |  |",
  "   |  |                                |  |",
  "   |  |           S I D E  A           |  |",
  "   |  |                                |  |",
  "   |  |________________________________|  |",
  "   |      __________________________      |",
  "   |     |##########################|     |",
  "   |      --------------------------      |",
  "   |                                      |",
  "`-\\|______________________________________|/-'",
].join("\n");

/** Onboarding landing: a retro controller. */
export const CONTROLLER_ART = [
  "  +--------------------+",
  "  |   +             _  |",
  "  | + + +    ;;    ( ) |",
  "  |   +      ;;   _    |",
  "  |              ( )   |",
  "  +--------------------+",
].join("\n");

/** Onboarding name screen: the Master Sword. */
export const MASTER_SWORD_ART = "o=={::::::::::>";

/** Onboarding DOB screen: a small robot. */
export const ROBOT_ART = [
  "  .-------.",
  "  |  o o  |",
  "  |   ^   |",
  "  |  ___  |",
  "  '-------'",
].join("\n");

/** System core terminal mascot (settings + biometric privacy overlay). */
export const SYS_CORE_ART = [
  ".================.",
  "| .--.      .-.  |",
  "| |__|      |_|  |",
  "|                |",
  "|  .----------.  |",
  "|  |          |  |",
  "'=='=========='=='",
].join("\n");

/** Profile mascot: a terminal at the ready. */
export const SYS_READY_ART = [
  ".-----------.",
  "| .-------. |",
  "| |>_     | |",
  "| '-------' |",
  "|       ( ) |",
  "|   _       |",
  "| _| |_  (B)|",
  "||_   _|(A) |",
  "|  |_|      |",
  "'-----------'",
].join("\n");

/** Biometric lock screen: a cat guarding the gate. */
export const CAT_ART = [
  "    /\\_/\\",
  "   (=o.o=)",
  " .-(     )-.",
  "(           )",
  " '---------'",
].join("\n");

/** Story picker: cyber-minimalist canvas init terminal. */
export const CANVAS_TERMINAL_ART = [
  "█║▌│█│║▌║││█║▌║▌",
  " c a n v a s _  ",
].join("\n");
