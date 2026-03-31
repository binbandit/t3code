import { type TimestampFormat } from "@t3tools/contracts/settings";

export function getTimestampFormatOptions(
  timestampFormat: TimestampFormat,
  includeSeconds: boolean,
): Intl.DateTimeFormatOptions {
  const baseOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  };

  if (timestampFormat === "locale") {
    return baseOptions;
  }

  return {
    ...baseOptions,
    hour12: timestampFormat === "12-hour",
  };
}

const timestampFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimestampFormatter(
  timestampFormat: TimestampFormat,
  includeSeconds: boolean,
): Intl.DateTimeFormat {
  const cacheKey = `${timestampFormat}:${includeSeconds ? "seconds" : "minutes"}`;
  const cachedFormatter = timestampFormatterCache.get(cacheKey);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat(
    undefined,
    getTimestampFormatOptions(timestampFormat, includeSeconds),
  );
  timestampFormatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatTimestamp(isoDate: string, timestampFormat: TimestampFormat): string {
  return getTimestampFormatter(timestampFormat, true).format(new Date(isoDate));
}

export function formatShortTimestamp(isoDate: string, timestampFormat: TimestampFormat): string {
  return getTimestampFormatter(timestampFormat, false).format(new Date(isoDate));
}

// ---------------------------------------------------------------------------
// Relative time formatting
// ---------------------------------------------------------------------------

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export type RelativeTimeStyle = "long" | "short";

let relativeTimeFormatter: Intl.RelativeTimeFormat | null = null;

function formatLongUnit(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  if (relativeTimeFormatter === null) {
    relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  }
  return relativeTimeFormatter.format(-value, unit);
}

interface RelativeTimeBucket {
  threshold: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
  shortSuffix: string;
}

const BUCKETS: RelativeTimeBucket[] = [
  { threshold: MINUTE_MS, divisor: MINUTE_MS, unit: "minute", shortSuffix: "m" },
  { threshold: HOUR_MS, divisor: HOUR_MS, unit: "hour", shortSuffix: "h" },
  { threshold: DAY_MS, divisor: DAY_MS, unit: "day", shortSuffix: "d" },
  { threshold: WEEK_MS, divisor: WEEK_MS, unit: "week", shortSuffix: "w" },
  { threshold: MONTH_MS, divisor: MONTH_MS, unit: "month", shortSuffix: "mo" },
  { threshold: YEAR_MS, divisor: YEAR_MS, unit: "year", shortSuffix: "y" },
];

function resolveRelativeBucket(
  diffMs: number,
): { value: number; bucket: RelativeTimeBucket } | null {
  if (diffMs < MINUTE_MS) return null;

  let matched = BUCKETS[0]!;
  for (const bucket of BUCKETS) {
    if (diffMs >= bucket.threshold) {
      matched = bucket;
    }
  }
  return { value: Math.floor(diffMs / matched.divisor), bucket: matched };
}

/**
 * Structured relative time for callers that style value and suffix independently.
 *
 * - `"short"` (default): `{ value: "5m", suffix: "ago" }`
 * - `"long"`: `{ value: "5 minutes", suffix: "ago" }`
 * - Returns `{ value: "just now", suffix: null }` for times under a minute.
 */
export function formatRelativeTime(
  isoDate: string,
  nowMs = Date.now(),
  style: RelativeTimeStyle = "short",
): { value: string; suffix: string | null } {
  const targetMs = Date.parse(isoDate);
  if (Number.isNaN(targetMs)) return { value: "", suffix: null };

  const diffMs = Math.max(0, nowMs - targetMs);
  const result = resolveRelativeBucket(diffMs);
  if (!result) return { value: "just now", suffix: null };

  if (style === "short") {
    return { value: `${result.value}${result.bucket.shortSuffix}`, suffix: "ago" };
  }

  const longText = formatLongUnit(result.value, result.bucket.unit);
  const agoMatch = longText.match(/^(.+)\s+ago$/);
  if (agoMatch) {
    return { value: agoMatch[1]!, suffix: "ago" };
  }
  return { value: longText, suffix: null };
}

export function formatRelativeTimeLabel(
  isoDate: string,
  style: RelativeTimeStyle = "short",
): string {
  const relative = formatRelativeTime(isoDate, Date.now(), style);
  return relative.suffix ? `${relative.value} ${relative.suffix}` : relative.value;
}
