import SiteSettings from "../models/siteSettings.model.js";
import HomepageSection from "../models/homepageSection.model.js";
import Page from "../models/page.model.js";
import {
  homepageSectionsSeed,
  pagesSeed,
  siteSettingsSeed,
} from "./siteContent.data.js";

export type SeedAction = "created" | "skipped" | "would-create";

export interface SeedResult {
  collection: string;
  key: string;
  action: SeedAction;
}

// Insert-if-missing only. Existing documents are never modified, so re-running
// the seed can't overwrite anything an admin has since edited.
async function ensure(
  collection: string,
  key: string,
  exists: () => Promise<unknown>,
  create: () => Promise<unknown>,
  dryRun: boolean,
): Promise<SeedResult> {
  if (await exists()) {
    return { collection, key, action: "skipped" };
  }

  if (dryRun) {
    return { collection, key, action: "would-create" };
  }

  await create();
  return { collection, key, action: "created" };
}

export async function applySiteSeed(
  options: { dryRun?: boolean } = {},
): Promise<SeedResult[]> {
  const dryRun = options.dryRun ?? false;
  const results: SeedResult[] = [];

  results.push(
    await ensure(
      "siteSettings",
      "site",
      () => SiteSettings.exists({ key: "site" }),
      () => SiteSettings.create({ key: "site", ...siteSettingsSeed }),
      dryRun,
    ),
  );

  for (const section of homepageSectionsSeed) {
    results.push(
      await ensure(
        "homepageSections",
        section.key,
        () => HomepageSection.exists({ key: section.key }),
        () => HomepageSection.create(section),
        dryRun,
      ),
    );
  }

  for (const page of pagesSeed) {
    results.push(
      await ensure(
        "pages",
        page.slug,
        () => Page.exists({ slug: page.slug }),
        () => Page.create(page),
        dryRun,
      ),
    );
  }

  return results;
}
