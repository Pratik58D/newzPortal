import { describe, expect, it } from "vitest";
import { createPageSchema } from "./page.validation.js";

const valid = {
  slug: "about",
  title: { np: "हाम्रो बारे", en: "" },
  body: { np: "# hi", en: "" },
  isPublished: true,
  showInFooter: false,
};

describe("createPageSchema", () => {
  it("accepts a valid page and normalises the slug", () => {
    expect(createPageSchema.parse({ ...valid, slug: " About " }).slug).toBe("about");
  });

  it.each(["a b", "-a", "a--b", "a/b", ""])("rejects slug %j", (slug) => {
    expect(createPageSchema.safeParse({ ...valid, slug }).success).toBe(false);
  });

  it("requires a Nepali title", () => {
    expect(createPageSchema.safeParse({ ...valid, title: { np: " ", en: "x" } }).success).toBe(false);
  });

  it("rejects unknown keys and oversized bodies", () => {
    expect(createPageSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(
      createPageSchema.safeParse({ ...valid, body: { np: "a".repeat(50_001), en: "" } }).success,
    ).toBe(false);
  });
});
