import { describe, expect, it } from "vitest";
import { createCategorySchema, updateCategorySchema } from "./category.validation.js";

describe("createCategorySchema", () => {
  it("rejects a missing/empty Nepali name — the exact regression from findings.md §1.3", () => {
    const result = createCategorySchema.safeParse({ name: { np: "" } });
    expect(result.success).toBe(false);
  });

  it("accepts a Nepali-only name (English name is optional)", () => {
    const result = createCategorySchema.safeParse({ name: { np: "समाचार" } });
    expect(result.success).toBe(true);
  });

  it("accepts an optional parent id", () => {
    const result = createCategorySchema.safeParse({
      name: { np: "समाचार", en: "News" },
      parent: "652f1c2e5b1d8a0012345678",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCategorySchema", () => {
  it("rejects an empty Nepali name", () => {
    const result = updateCategorySchema.safeParse({ name: { np: "   " } });
    expect(result.success).toBe(false);
  });
});
