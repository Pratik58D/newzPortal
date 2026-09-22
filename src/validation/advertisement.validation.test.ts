import { describe, expect, it } from "vitest";

import {
  createAdvertisementSchema,
  updateAdvertisementSchema,
} from "./advertisement.validation.js";
import { MAX_REDIRECT_URL_LENGTH, redirectUrlProblem } from "./redirectUrl.js";

const base = {
  title: "Ad",
  placement: "sidebar",
  startDate: "2026-01-01",
  endDate: "2026-02-01",
};

const create = (redirectUrl: string) =>
  createAdvertisementSchema.safeParse({ ...base, redirectUrl });

describe("redirectUrlProblem", () => {
  it.each([
    "http://example.com",
    "https://example.com/path?utm_source=x&y=1#frag",
    "HTTPS://Example.COM",
    "https://example.com:8443/a",
    "https://sub.example.co.np/नेपाल",
    "http://192.168.0.1/x",
  ])("accepts %s", (url) => {
    expect(redirectUrlProblem(url)).toBeNull();
  });

  it.each([
    ["javascript:alert(1)", "http"],
    ["JaVaScRiPt:alert(1)", "http"],
    ["data:text/html,<script>alert(1)</script>", "http"],
    ["vbscript:msgbox(1)", "http"],
    ["ftp://example.com", "http"],
    ["file:///etc/passwd", "http"],
    ["mailto:a@b.com", "http"],
    ["//example.com", "http"],
    ["/relative/path", "http"],
    ["example.com", "http"],
    ["http:example.com", "http"],
    ["https:/example.com", "http"],
  ])("rejects non-http(s) or scheme-less %s", (url) => {
    expect(redirectUrlProblem(url)).toMatch(/http/i);
  });

  it.each([
    "https://user@example.com",
    "https://user:pass@example.com",
    "http://:secret@example.com",
    "https://admin:@example.com",
  ])("rejects embedded credentials %s", (url) => {
    expect(redirectUrlProblem(url)).toMatch(/username or password/);
  });

  it("rejects whitespace and control characters inside the URL", () => {
    expect(redirectUrlProblem("https://exa mple.com")).not.toBeNull();
    expect(redirectUrlProblem("https://example.com/\nfoo")).not.toBeNull();
    expect(redirectUrlProblem("https://example.com/\tfoo")).not.toBeNull();
    expect(redirectUrlProblem("ht\ttps://example.com")).not.toBeNull();
  });

  it("rejects empty and host-less URLs", () => {
    expect(redirectUrlProblem("")).not.toBeNull();
    expect(redirectUrlProblem("   ")).not.toBeNull();
    expect(redirectUrlProblem("https://")).not.toBeNull();
  });

  it("enforces the 2048 character limit exactly", () => {
    const prefix = "https://example.com/";
    const ok = prefix + "a".repeat(MAX_REDIRECT_URL_LENGTH - prefix.length);
    expect(ok).toHaveLength(MAX_REDIRECT_URL_LENGTH);
    expect(redirectUrlProblem(ok)).toBeNull();
    expect(redirectUrlProblem(ok + "a")).toMatch(/2048/);
  });
});

describe("createAdvertisementSchema redirectUrl", () => {
  it("accepts a valid URL and trims it", () => {
    const result = create("  https://example.com/x  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.redirectUrl).toBe("https://example.com/x");
  });

  it("returns a redirectUrl field error for unsafe URLs", () => {
    for (const url of ["javascript:alert(1)", "https://u:p@example.com", "ftp://x.com"]) {
      const result = create(url);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.redirectUrl?.length).toBeGreaterThan(0);
      }
    }
  });

  it("still requires the other fields", () => {
    expect(createAdvertisementSchema.safeParse({ redirectUrl: "https://example.com" }).success).toBe(false);
  });
});

describe("updateAdvertisementSchema redirectUrl", () => {
  it("is optional (partial updates keep working)", () => {
    expect(updateAdvertisementSchema.safeParse({ title: "New" }).success).toBe(true);
    expect(updateAdvertisementSchema.safeParse({}).success).toBe(true);
  });

  it("validates the URL when provided", () => {
    expect(updateAdvertisementSchema.safeParse({ redirectUrl: "https://example.com" }).success).toBe(true);
    expect(updateAdvertisementSchema.safeParse({ redirectUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(updateAdvertisementSchema.safeParse({ redirectUrl: "https://u:p@example.com" }).success).toBe(false);
  });
});

describe("createAdvertisementSchema: placements, priority, weight and labels", () => {
  const parse = (extra: Record<string, unknown>, withPlacement = false) =>
    createAdvertisementSchema.safeParse({
      title: "Ad",
      redirectUrl: "https://example.com",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
      ...(withPlacement ? { placement: "sidebar" } : {}),
      ...extra,
    });

  it("parses a JSON placements list and mirrors the first into `placement`", () => {
    const result = parse({ placements: '["footer_top","sidebar"]' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.placements).toEqual(["footer_top", "sidebar"]);
      expect(result.data.placement).toBe("footer_top");
    }
  });

  it("still accepts the legacy single placement and derives placements from it", () => {
    const result = parse({}, true);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.placements).toEqual(["sidebar"]);
  });

  it("requires at least one placement", () => {
    expect(parse({}).success).toBe(false);
    expect(parse({ placements: "[]" }).success).toBe(false);
  });

  it.each(["not json", '"sidebar"', '{"a":1}', '["sidebar","sidebar"]', '["nope"]'])(
    "rejects invalid placements %s",
    (placements) => {
      expect(parse({ placements }).success).toBe(false);
    },
  );

  it("validates priority (0-100) and weight (1-10) as whole numbers", () => {
    for (const ok of [{ priority: "0" }, { priority: "100" }, { weight: "1" }, { weight: "10" }]) {
      expect(parse({ placements: '["sidebar"]', ...ok }).success).toBe(true);
    }
    for (const bad of [
      { priority: "101" },
      { priority: "-1" },
      { priority: "5.5" },
      { priority: "abc" },
      { priority: "" },
      { weight: "0" },
      { weight: "11" },
    ]) {
      expect(parse({ placements: '["sidebar"]', ...bad }).success).toBe(false);
    }
  });

  it("converts priority and weight to numbers", () => {
    const result = parse({ placements: '["sidebar"]', priority: "70", weight: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(70);
      expect(result.data.weight).toBe(3);
    }
  });

  it("limits alt text and sponsor label length; an empty label means no label", () => {
    expect(parse({ placements: '["sidebar"]', altText: "a".repeat(200) }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', altText: "a".repeat(201) }).success).toBe(false);
    expect(parse({ placements: '["sidebar"]', sponsorLabel: "Sponsored" }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', sponsorLabel: "" }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', sponsorLabel: "  " }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', sponsorLabel: "x".repeat(31) }).success).toBe(false);
  });

  it("accepts a valid devices value and rejects an invalid one", () => {
    expect(parse({ placements: '["sidebar"]', devices: "desktop" }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', devices: "mobile" }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', devices: "all" }).success).toBe(true);
    expect(parse({ placements: '["sidebar"]', devices: "tablet" }).success).toBe(false);
  });
});

describe("updateAdvertisementSchema: new fields", () => {
  it("accepts partial updates of the new fields", () => {
    expect(updateAdvertisementSchema.safeParse({ priority: "80" }).success).toBe(true);
    expect(updateAdvertisementSchema.safeParse({ placements: '["top_banner"]' }).success).toBe(true);
    expect(updateAdvertisementSchema.safeParse({ removeMobileImage: "true" }).success).toBe(true);
    expect(updateAdvertisementSchema.safeParse({ removeMobileImage: "yes" }).success).toBe(false);
  });

  it("mirrors the first placement into `placement`", () => {
    const result = updateAdvertisementSchema.safeParse({ placements: '["news_detail_top","sidebar"]' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.placement).toBe("news_detail_top");
  });

  it("leaves placement fields absent when not sent", () => {
    const result = updateAdvertisementSchema.safeParse({ title: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.placement).toBeUndefined();
      expect(result.data.placements).toBeUndefined();
    }
  });
});
