import { describe, expect, it } from "vitest";
import { updateHomepageSchema } from "./homepage.validation.js";
import { assignKeys, orderFor } from "../utils/homepageLayout.js";
import { homepageSectionsSeed } from "../seeds/siteContent.data.js";

const title = { np: "", en: "" };

const category = (slug = "sports", extra: object = {}) => ({
  type: "category" as const,
  enabled: true,
  title,
  config: { categorySlug: slug, limit: 5 },
  ...extra,
});

const parse = (sections: unknown[]) => updateHomepageSchema.safeParse({ sections });

describe("updateHomepageSchema", () => {
  it("accepts the seeded default layout (the site's current homepage)", () => {
    const seeded = homepageSectionsSeed.map((section) => ({
      key: section.key,
      type: section.type,
      enabled: section.enabled,
      title: section.title,
      config: section.config,
    }));

    expect(parse(seeded).success).toBe(true);
  });

  it("requires at least one section and caps the list at 20", () => {
    expect(parse([]).success).toBe(false);
    expect(parse(Array.from({ length: 21 }, (_, i) => category(`c${i}`))).success).toBe(false);
    expect(parse(Array.from({ length: 20 }, (_, i) => category(`c${i}`))).success).toBe(true);
  });

  it("rejects an unknown section type", () => {
    expect(
      parse([{ type: "carousel", enabled: true, title, config: {} }]).success,
    ).toBe(false);
  });

  describe("per-type config", () => {
    it("requires a category slug for category sections", () => {
      expect(parse([{ ...category(), config: { limit: 5 } }]).success).toBe(false);
      expect(parse([category("Bad Slug")]).success).toBe(false);
    });

    it("bounds the item limit to 1–20 whole numbers", () => {
      const withLimit = (limit: number) =>
        parse([{ ...category(), config: { categorySlug: "sports", limit } }]).success;

      expect(withLimit(1)).toBe(true);
      expect(withLimit(20)).toBe(true);
      expect(withLimit(0)).toBe(false);
      expect(withLimit(21)).toBe(false);
      expect(withLimit(2.5)).toBe(false);
    });

    it("only allows known ad placements", () => {
      const ad = (placement: string) =>
        parse([{ type: "banner-ad", enabled: true, title, config: { placement } }]).success;

      expect(ad("home_banner")).toBe(true);
      expect(ad("floating_popup")).toBe(false);
    });

    it("rejects config keys that don't belong to the type", () => {
      expect(
        parse([{ type: "hero", enabled: true, title, config: { limit: 5 } }]).success,
      ).toBe(false);
      expect(
        parse([
          { type: "latest", enabled: true, title, config: { limit: 5, categorySlug: "x" } },
        ]).success,
      ).toBe(false);
    });
  });

  it("allows only one hero, latest and province section", () => {
    const hero = { type: "hero", enabled: true, title, config: {} };
    expect(parse([hero, hero]).success).toBe(false);

    const latest = { type: "latest", enabled: true, title, config: { limit: 5 } };
    expect(parse([latest, latest]).success).toBe(false);
  });

  it("allows several category and banner sections", () => {
    expect(parse([category("sports"), category("politics")]).success).toBe(true);
  });

  it("rejects duplicate keys", () => {
    expect(parse([category("a", { key: "dup" }), category("b", { key: "dup" })]).success).toBe(
      false,
    );
  });

  it("rejects unknown top-level keys", () => {
    expect(
      updateHomepageSchema.safeParse({ sections: [category()], extra: 1 }).success,
    ).toBe(false);
  });
});

describe("assignKeys", () => {
  const input = (sections: object[]) =>
    assignKeys(
      updateHomepageSchema.parse({ sections }).sections,
    ).map((section) => section.key);

  it("keeps existing keys untouched", () => {
    expect(input([category("sports", { key: "category-sports" })])).toEqual(["category-sports"]);
  });

  it("derives readable keys for new sections", () => {
    expect(
      input([
        category("health"),
        { type: "banner-ad", enabled: true, title, config: { placement: "news_detail_top" } },
        { type: "hero", enabled: true, title, config: {} },
      ]),
    ).toEqual(["category-health", "banner-ad-news-detail-top", "hero"]);
  });

  it("makes keys unique when the derived key is already taken", () => {
    expect(
      input([
        category("sports", { key: "category-sports" }),
        category("sports"),
        category("sports"),
      ]),
    ).toEqual(["category-sports", "category-sports-2", "category-sports-3"]);
  });
});

describe("orderFor", () => {
  it("steps by 10 from the first position", () => {
    expect([0, 1, 2].map(orderFor)).toEqual([10, 20, 30]);
  });
});
