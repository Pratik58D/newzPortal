import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/siteSettings.model.js", () => ({
  default: { exists: vi.fn(), create: vi.fn() },
}));
vi.mock("../models/homepageSection.model.js", () => ({
  default: { exists: vi.fn(), create: vi.fn() },
  HOMEPAGE_SECTION_TYPES: [],
}));
vi.mock("../models/page.model.js", () => ({
  default: { exists: vi.fn(), create: vi.fn() },
}));

import SiteSettings from "../models/siteSettings.model.js";
import HomepageSection from "../models/homepageSection.model.js";
import Page from "../models/page.model.js";
import { applySiteSeed } from "./applySiteSeed.js";
import { homepageSectionsSeed, pagesSeed } from "./siteContent.data.js";

const models = [SiteSettings, HomepageSection, Page] as unknown as {
  exists: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
}[];

const TOTAL = 1 + homepageSectionsSeed.length + pagesSeed.length;

beforeEach(() => {
  for (const model of models) {
    model.exists.mockReset();
    model.create.mockReset();
    model.create.mockResolvedValue({});
  }
});

describe("applySiteSeed", () => {
  it("creates everything on an empty database", async () => {
    for (const model of models) model.exists.mockResolvedValue(null);

    const results = await applySiteSeed();

    expect(results).toHaveLength(TOTAL);
    expect(results.every((result) => result.action === "created")).toBe(true);
    expect(SiteSettings.create).toHaveBeenCalledTimes(1);
    expect(HomepageSection.create).toHaveBeenCalledTimes(
      homepageSectionsSeed.length,
    );
    expect(Page.create).toHaveBeenCalledTimes(pagesSeed.length);
  });

  it("never touches documents that already exist (safe to re-run)", async () => {
    for (const model of models) model.exists.mockResolvedValue({ _id: "x" });

    const results = await applySiteSeed();

    expect(results.every((result) => result.action === "skipped")).toBe(true);
    for (const model of models) expect(model.create).not.toHaveBeenCalled();
  });

  it("only creates the missing pieces", async () => {
    const [settings, sections, pages] = models;
    settings.exists.mockResolvedValue({ _id: "x" });
    sections.exists.mockResolvedValue({ _id: "x" });
    // Everything present except one page.
    pages.exists.mockImplementation(async (filter: { slug: string }) =>
      filter.slug === "terms" ? null : { _id: "x" },
    );

    const results = await applySiteSeed();

    const created = results.filter((result) => result.action === "created");
    expect(created).toEqual([
      { collection: "pages", key: "terms", action: "created" },
    ]);
    expect(Page.create).toHaveBeenCalledTimes(1);
  });

  it("writes nothing in dry-run mode", async () => {
    for (const model of models) model.exists.mockResolvedValue(null);

    const results = await applySiteSeed({ dryRun: true });

    expect(results.every((result) => result.action === "would-create")).toBe(true);
    for (const model of models) expect(model.create).not.toHaveBeenCalled();
  });
});
