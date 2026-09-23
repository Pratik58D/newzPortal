import { describe, expect, it } from "vitest";
import {
  breakingNotExpired,
  parseBreakingUntil,
  resolveNewsSort,
} from "./newsQuery.js";

describe("resolveNewsSort", () => {
  it("keeps featured-first as the default", () => {
    expect(resolveNewsSort(undefined)).toEqual({ isFeatured: -1, publishedAt: -1 });
    expect(resolveNewsSort("bogus")).toEqual({ isFeatured: -1, publishedAt: -1 });
  });

  it("sorts purely by recency for 'latest' (no featured pinning)", () => {
    expect(resolveNewsSort("latest")).toEqual({ publishedAt: -1 });
  });

  it("sorts by views for 'views'", () => {
    expect(resolveNewsSort("views")).toEqual({ views: -1, publishedAt: -1 });
  });
});

describe("breakingNotExpired", () => {
  it("allows no expiry or a future expiry", () => {
    const now = new Date("2026-09-21T10:00:00Z");
    expect(breakingNotExpired(now)).toEqual({
      $or: [{ breakingUntil: null }, { breakingUntil: { $gt: now } }],
    });
  });
});

describe("parseBreakingUntil", () => {
  it("returns undefined when the field was not sent", () => {
    expect(parseBreakingUntil(undefined)).toBeUndefined();
  });

  it("returns null for an intentionally cleared value", () => {
    expect(parseBreakingUntil("")).toBeNull();
    expect(parseBreakingUntil("   ")).toBeNull();
    expect(parseBreakingUntil(null)).toBeNull();
  });

  it("parses a valid ISO date", () => {
    expect(parseBreakingUntil("2026-09-21T10:00:00Z")?.toISOString()).toBe(
      "2026-09-21T10:00:00.000Z",
    );
  });

  it("returns undefined for garbage so callers can reject it", () => {
    expect(parseBreakingUntil("not-a-date")).toBeUndefined();
  });
});
