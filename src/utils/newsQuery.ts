export type NewsSortKey = "latest" | "views";

// Default (no/unknown `sort`) keeps featured articles pinned first, which is
// what every public listing relied on before `sort` existed.
export function resolveNewsSort(sort: unknown): Record<string, 1 | -1> {
  if (sort === "latest") return { publishedAt: -1 };
  if (sort === "views") return { views: -1, publishedAt: -1 };
  return { isFeatured: -1, publishedAt: -1 };
}

// `{ breakingUntil: null }` matches both an explicit null and a missing field,
// so articles flagged breaking with no expiry stay breaking until unflagged.
export function breakingNotExpired(now: Date = new Date()) {
  return { $or: [{ breakingUntil: null }, { breakingUntil: { $gt: now } }] };
}

// Returns a valid Date, `null` for an intentionally empty value, or
// `undefined` when the input isn't a parseable date.
export function parseBreakingUntil(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
