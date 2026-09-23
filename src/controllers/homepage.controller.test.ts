import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/homepageSection.model.js", () => ({
  default: { find: vi.fn(), bulkWrite: vi.fn(), deleteMany: vi.fn() },
  HOMEPAGE_SECTION_TYPES: [],
}));

import HomepageSection from "../models/homepageSection.model.js";
import {
  getHomepage,
  manageHomepage,
  updateHomepage,
} from "./homepage.controller.js";
import { homepageSectionsSeed } from "../seeds/siteContent.data.js";

const model = HomepageSection as unknown as {
  find: ReturnType<typeof vi.fn>;
  bulkWrite: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
};

const stored = (docs: object[]) =>
  model.find.mockReturnValue({ sort: () => ({ lean: async () => docs }) });

// asyncHandler doesn't return its promise, so resolve on res.json instead.
function run(
  handler: (req: never, res: never, next: never) => void,
  body?: unknown,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const res = { json: (payload: Record<string, unknown>) => resolve(payload) };
    handler({ body } as never, res as never, reject as never);
  });
}

const section = (over: object) => ({
  key: "k",
  type: "latest",
  enabled: true,
  order: 10,
  title: { np: "", en: "" },
  config: { limit: 5 },
  ...over,
});

beforeEach(() => {
  model.find.mockReset();
  model.bulkWrite.mockReset().mockResolvedValue({});
  model.deleteMany.mockReset().mockResolvedValue({});
});

describe("getHomepage (public)", () => {
  it("falls back to the seeded layout when nothing has ever been saved", async () => {
    stored([]);

    const result = await run(getHomepage);

    expect((result.data as unknown[]).length).toBe(
      homepageSectionsSeed.filter((s) => s.enabled).length,
    );
  });

  it("returns only enabled sections, in stored order", async () => {
    stored([
      section({ key: "a", order: 10, type: "hero", config: undefined }),
      section({ key: "b", order: 20, enabled: false }),
      section({ key: "c", order: 30 }),
    ]);

    const result = await run(getHomepage);
    const data = result.data as { key: string; config: object }[];

    expect(data.map((s) => s.key)).toEqual(["a", "c"]);
    // A hero's empty config is dropped by Mongoose on save; the API restores it.
    expect(data[0].config).toEqual({});
  });

  it("does not fall back to defaults when sections exist but are all disabled", async () => {
    stored([section({ enabled: false })]);

    const result = await run(getHomepage);

    expect(result.data).toEqual([]);
  });
});

describe("manageHomepage (admin)", () => {
  it("includes disabled sections and reports whether it is the unsaved default", async () => {
    stored([section({ key: "a" }), section({ key: "b", enabled: false })]);
    const saved = await run(manageHomepage);
    expect((saved.data as unknown[]).length).toBe(2);
    expect(saved.isDefault).toBe(false);

    stored([]);
    const fresh = await run(manageHomepage);
    expect(fresh.isDefault).toBe(true);
  });
});

describe("updateHomepage", () => {
  const body = {
    sections: [
      { key: "hero", type: "hero", enabled: true, title: { np: "", en: "" }, config: {} },
      {
        type: "category",
        enabled: false,
        title: { np: "खेल", en: "" },
        config: { categorySlug: "sports", limit: 4 },
      },
    ],
  };

  it("upserts every section with position-based order, then deletes the stale ones", async () => {
    stored([section({ key: "hero" })]);

    await run(updateHomepage, body);

    const [ops] = model.bulkWrite.mock.calls[0] as [
      {
        updateOne: {
          filter: { key: string };
          update: { $set: Record<string, unknown> };
          upsert: boolean;
        };
      }[],
    ];

    expect(ops.map((op) => op.updateOne.filter.key)).toEqual(["hero", "category-sports"]);
    expect(ops.map((op) => op.updateOne.update.$set.order)).toEqual([10, 20]);
    expect(ops.every((op) => op.updateOne.upsert)).toBe(true);
    expect(ops[1].updateOne.update.$set).toMatchObject({
      type: "category",
      enabled: false,
      config: { categorySlug: "sports", limit: 4 },
    });

    expect(model.deleteMany).toHaveBeenCalledWith({
      key: { $nin: ["hero", "category-sports"] },
    });

    // Deleting last means a failure part-way can't lose the new layout.
    expect(model.bulkWrite.mock.invocationCallOrder[0]).toBeLessThan(
      model.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it("responds with the saved layout and isDefault: false", async () => {
    stored([section({ key: "hero", type: "hero" })]);

    const result = await run(updateHomepage, body);

    expect(result.success).toBe(true);
    expect(result.isDefault).toBe(false);
  });
});
