import { describe, expect, it } from "vitest";
import SiteSettings from "../models/siteSettings.model.js";
import HomepageSection, {
  HOMEPAGE_SECTION_TYPES,
} from "../models/homepageSection.model.js";
import Page from "../models/page.model.js";
import {
  homepageSectionsSeed,
  pagesSeed,
  siteSettingsSeed,
} from "./siteContent.data.js";

describe("homepage sections seed", () => {
  it("has unique keys and unique, ascending orders", () => {
    const keys = homepageSectionsSeed.map((section) => section.key);
    expect(new Set(keys).size).toBe(keys.length);

    const orders = homepageSectionsSeed.map((section) => section.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("only uses whitelisted section types", () => {
    for (const section of homepageSectionsSeed) {
      expect(HOMEPAGE_SECTION_TYPES).toContain(section.type);
    }
  });

  it("reproduces today's homepage order", () => {
    expect(homepageSectionsSeed.map((section) => section.key)).toEqual([
      "hero",
      "home-banner-ad",
      "latest",
      "category-politics",
      "category-business",
      "category-sports",
      "category-entertainment",
      "provinces",
    ]);
  });

  it("gives every category section a slug and the ad section a placement", () => {
    for (const section of homepageSectionsSeed) {
      if (section.type === "category") {
        expect(section.config.categorySlug).toBeTruthy();
      }
      if (section.type === "banner-ad") {
        expect(section.config.placement).toBe("home_banner");
      }
    }
  });

  it("passes model validation", () => {
    for (const section of homepageSectionsSeed) {
      expect(new HomepageSection(section).validateSync()).toBeUndefined();
    }
  });

  it("rejects an unknown section type (model guard)", () => {
    const error = new HomepageSection({
      ...homepageSectionsSeed[0],
      type: "carousel",
    }).validateSync();
    expect(error?.errors.type).toBeDefined();
  });
});

describe("pages seed", () => {
  it("contains the five starter pages", () => {
    expect(pagesSeed.map((page) => page.slug).sort()).toEqual([
      "about",
      "advertise",
      "contact",
      "privacy",
      "terms",
    ]);
  });

  it("has Nepali and English titles and bodies for every page", () => {
    for (const page of pagesSeed) {
      expect(page.title.np.trim()).not.toBe("");
      expect(page.title.en.trim()).not.toBe("");
      expect(page.body.np.trim()).not.toBe("");
      expect(page.body.en.trim()).not.toBe("");
    }
  });

  it("passes model validation", () => {
    for (const page of pagesSeed) {
      expect(new Page(page).validateSync()).toBeUndefined();
    }
  });

  it("rejects a malformed slug (model guard)", () => {
    const error = new Page({ ...pagesSeed[0], slug: "About Us!" }).validateSync();
    expect(error?.errors.slug).toBeDefined();
  });
});

describe("site settings seed", () => {
  it("passes model validation", () => {
    expect(
      new SiteSettings({ key: "site", ...siteSettingsSeed }).validateSync(),
    ).toBeUndefined();
  });

  it("keeps the current brand copy", () => {
    expect(siteSettingsSeed.siteName.np).toBe("प्रतिध्वनि");
    expect(siteSettingsSeed.tagline.np).toBe("भरपर्दो नेपाली समाचार");
    expect(siteSettingsSeed.footerNote.np).toBe("बागमती, नेपालबाट सञ्चालित");
  });

  it("links the footer only to seeded, published pages", () => {
    const published = new Set(
      pagesSeed.filter((page) => page.isPublished).map((page) => page.slug),
    );

    const links = siteSettingsSeed.footerLinks.flatMap((group) => group.links);
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(published.has(link.pageSlug)).toBe(true);
    }
  });

  it("does not invent contact details or social URLs", () => {
    expect(siteSettingsSeed.contact.email).toBe("");
    expect(siteSettingsSeed.contact.phone).toBe("");
    expect(Object.values(siteSettingsSeed.social).every((url) => url === "")).toBe(
      true,
    );
  });
});
