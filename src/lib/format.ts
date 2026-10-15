// The church is in the Philippines. Vercel servers run in UTC, so always format
// times in Manila time explicitly.
export const TZ = "Asia/Manila";

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ, weekday: "short", month: "short", day: "numeric",
  }).format(new Date(iso));
}

/** For date-only columns ("1984-07-22"): format without any timezone shifting. */
export function formatDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric", ...opts,
  }).format(new Date(Date.UTC(y, m - 1, day)));
}

export function daysAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

/** Today's date in Manila as "YYYY-MM-DD" (for date inputs). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
