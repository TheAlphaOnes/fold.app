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

/** Story empty state: an open album, an empty photo frame on each page, waiting to be filled. */
export const ALBUM_ART = [
  " _______________________ _______________________ ",
  "|                       |                       |",
  "|   .- - - - - - - -.   |   .- - - - - - - -.   |",
  "|   '               '   |   '               '   |",
  "|   '               '   |   '               '   |",
  "|   '               '   |   '               '   |",
  "|   '               '   |   '               '   |",
  "|   '- - - - - - - -'   |   '- - - - - - - -'   |",
  "|                       |                       |",
  "|   ~~~~~~~~~~~         |   ~~~~~~~             |",
  "|                       |                       |",
  "|_______________________|_______________________|",
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

/** Time machine empty state: a small ASCII flower representing an empty memory. */
export const FLOWER_ART = [
  "     _     ",
  "   _(_)_   ",
  "  (_)@(_)  ",
  "    (_)    ",
  "    /      ",
  "  \\|/      ",
  "   |       ",
].join("\n");

/** Story creation tray: a cozy hot coffee mug. */
export const COFFEE_ART = [
  "  ) )",
  " ( ( ",
  " ) ) ",
  ".----.",
  "|    |]",
  "`----'",
].join("\n");

/** Recently Deleted empty state: an empty bin, symmetric on a 16-column grid. */
export const BIN_ART = [
  "      ____      ",
  " ____|____|____ ",
  "|______________|",
  " |   |    |   | ",
  " |   |    |   | ",
  "  |  |    |  |  ",
  "  |__|____|__|  ",
].join("\n");
