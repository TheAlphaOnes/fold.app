/**
 * DOB parsing and validation.
 *
 * Canonical storage format is DD.MM.YYYY (dots) — what the onboarding DOB
 * screen writes. The settings screen historically wrote DD/MM/YYYY (slashes),
 * so the parser accepts dots, slashes and ISO dashes to keep legacy rows
 * working without a data migration.
 */

const DOB_PATTERN = /^(\d{2})[./-](\d{2})[./-](\d{4})$/;

export interface DobParts {
  day: number;
  month: number;
  year: number;
}

/** Parses a stored DOB string into its parts, or null when malformed. */
export function parseDob(dob: string | undefined | null): DobParts | null {
  if (!dob) return null;
  const match = DOB_PATTERN.exec(dob.trim());
  if (!match) return null;
  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

/** Calendar-valid check including leap years and a sane year range. */
export function isValidDob(dob: string | undefined | null): boolean {
  const parts = parseDob(dob);
  if (!parts) return false;

  const { day, month, year } = parts;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;

  // Day 0 of the following month = last day of the target month.
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

/** Birth year for analytics bucketing; null when the value is unparseable. */
export function dobYear(dob: string | undefined | null): number | null {
  return parseDob(dob)?.year ?? null;
}

/**
 * Formats raw digit input as DD.MM.YYYY while typing.
 * Shared by the onboarding and settings DOB fields so both entry points
 * write the same canonical dot-separated format.
 */
export function formatDobInput(text: string): string {
  const cleaned = text.replace(/\D/g, "").slice(0, 8);
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 4)}.${cleaned.slice(4)}`;
  }
  if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  }
  return cleaned;
}
