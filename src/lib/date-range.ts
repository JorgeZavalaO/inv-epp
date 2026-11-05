/** America/Lima is UTC-5 all year (no DST). */
const LIMA_UTC_OFFSET = "-05:00";
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

export type DayBoundary = "start" | "end";

/**
 * Parses a `yyyy-mm-dd` string as the start or end of that day in America/Lima.
 * Returns null when the value is missing or is not a valid calendar date.
 */
export function parseLimaDateBoundary(
  value: string | null | undefined,
  boundary: DayBoundary,
): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const date = new Date(`${year}-${month}-${day}T${time}${LIMA_UTC_OFFSET}`);

  if (Number.isNaN(date.getTime())) return null;
  // Reject out-of-range dates that JS would silently roll over (e.g. 2026-02-31).
  return limaDateKey(date) === `${year}-${month}-${day}` ? date : null;
}

/** Returns the `yyyy-mm-dd` day key for a date as observed in America/Lima. */
export function limaDateKey(date: Date): string {
  const lima = new Date(date.getTime() - LIMA_OFFSET_MS);
  const month = String(lima.getUTCMonth() + 1).padStart(2, "0");
  const day = String(lima.getUTCDate()).padStart(2, "0");
  return `${lima.getUTCFullYear()}-${month}-${day}`;
}

/** Returns the `yyyy-mm` month key for a date as observed in America/Lima. */
export function limaMonthKey(date: Date): string {
  return limaDateKey(date).slice(0, 7);
}
