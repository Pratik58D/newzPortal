import { describe, expect, it } from "vitest";
import { updateSiteSettingsSchema } from "./siteSettings.validation.js";
import { siteSettingsSeed } from "../seeds/siteContent.data.js";
import { changedTopLevelKeys } from "../utils/settingsDiff.js";

// The seed doubles as a known-good full settings document.
const valid = () => structuredClone(siteSettingsSeed);

const parse = (mutate: (draft: ReturnType<typeof valid>) => void) => {
  const draft = valid();
  mutate(draft);
  return updateSiteSettingsSchema.safeParse(draft);
};

describe("updateSiteSettingsSchema", () => {
  it("accepts the seeded default settings", () => {
    expect(updateSiteSettingsSchema.safeParse(valid()).success).toBe(true);
  });

  it("requires a Nepali site name", () => {
    expect(parse((d) => (d.siteName.np = "   ")).success).toBe(false);
  });

  it("allows an empty English site name (English is optional)", () => {
    expect(parse((d) => (d.siteName.en = "")).success).toBe(true);
  });

  it("rejects unknown top-level keys, including logo and the singleton key", () => {
    const withLogo = { ...valid(), logo: { url: "x", key: "y" } };
    const withKey = { ...valid(), key: "other" };
    expect(updateSiteSettingsSchema.safeParse(withLogo).success).toBe(false);
    expect(updateSiteSettingsSchema.safeParse(withKey).success).toBe(false);
  });

  it("rejects a missing section (PUT replaces the whole document)", () => {
    const { seo: _seo, ...withoutSeo } = valid();
    expect(updateSiteSettingsSchema.safeParse(withoutSeo).success).toBe(false);
  });

  describe("social URLs", () => {
    it("accepts empty and https URLs", () => {
      expect(
        parse((d) => {
          d.social.facebook = "https://facebook.com/pratidhwani";
          d.social.twitter = "";
        }).success,
      ).toBe(true);
    });

    it.each(["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "facebook.com/x"])(
      "rejects %s",
      (url) => {
        expect(parse((d) => (d.social.youtube = url)).success).toBe(false);
      },
    );
  });

  describe("contact", () => {
    it("accepts a valid email and rejects a malformed one", () => {
      expect(parse((d) => (d.contact.email = "news@example.com")).success).toBe(true);
      expect(parse((d) => (d.contact.email = "not-an-email")).success).toBe(false);
    });
  });

  describe("footer links", () => {
    const setLink = (link: Record<string, unknown>) => (d: ReturnType<typeof valid>) => {
      d.footerLinks[0].links = [link as never];
    };

    it("accepts a page link", () => {
      expect(
        parse(setLink({ label: { np: "हाम्रो बारे", en: "About" }, pageSlug: "about" }))
          .success,
      ).toBe(true);
    });

    it("accepts an external URL and a site-relative path", () => {
      expect(
        parse(setLink({ label: { np: "क", en: "" }, url: "https://example.com/a" })).success,
      ).toBe(true);
      expect(
        parse(setLink({ label: { np: "क", en: "" }, url: "/category/politics" })).success,
      ).toBe(true);
    });

    it("rejects both pageSlug and url, or neither", () => {
      expect(
        parse(setLink({ label: { np: "क", en: "" }, pageSlug: "about", url: "/x" })).success,
      ).toBe(false);
      expect(parse(setLink({ label: { np: "क", en: "" } })).success).toBe(false);
    });

    it.each(["javascript:alert(1)", "//evil.com", "mailto:a@b.com"])(
      "rejects the unsafe link target %s",
      (url) => {
        expect(parse(setLink({ label: { np: "क", en: "" }, url })).success).toBe(false);
      },
    );

    it("rejects a malformed page slug", () => {
      expect(
        parse(setLink({ label: { np: "क", en: "" }, pageSlug: "About Us" })).success,
      ).toBe(false);
    });

    it("caps groups at 6", () => {
      expect(
        parse((d) => {
          d.footerLinks = Array.from({ length: 7 }, () => structuredClone(d.footerLinks[0]));
        }).success,
      ).toBe(false);
    });
  });
});

describe("changedTopLevelKeys", () => {
  it("lists only the keys whose values differ", () => {
    const before = { a: { x: 1 }, b: "same", c: [1, 2] };
    const after = { a: { x: 2 }, b: "same", c: [1, 2, 3] };

    expect(changedTopLevelKeys(before, after, ["a", "b", "c"])).toEqual(["a", "c"]);
  });

  it("returns nothing when nothing changed", () => {
    const doc = { a: 1, b: { c: 2 } };
    expect(changedTopLevelKeys(doc, structuredClone(doc), ["a", "b"])).toEqual([]);
  });
});
