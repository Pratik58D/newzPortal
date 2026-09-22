// One-off, idempotent migration: ads saved before Phase 1 of the ad system only
// have the single `placement`. This copies it into `placements: [placement]`
// so every ad has the list form. It is optional - the public /slots endpoint
// and the admin list already fall back to `placement` - but it makes the data
// uniform. Nothing else about an ad is touched, and ads that already have
// `placements` are skipped, so running it twice changes nothing.

export interface AdMigrationModel {
  find(filter: object): { select(fields: string): { lean(): Promise<{ _id: unknown; placement?: string }[]> } };
  bulkWrite(ops: object[]): Promise<unknown>;
}

export interface AdMigrationResult {
  id: string;
  placement: string;
  action: "would-update" | "updated";
}

const NEEDS_MIGRATION = {
  $or: [{ placements: { $exists: false } }, { placements: { $size: 0 } }],
  placement: { $exists: true },
};

export async function applyAdMigration(
  model: AdMigrationModel,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<AdMigrationResult[]> {
  const pending = (await model.find(NEEDS_MIGRATION).select("placement").lean()).filter(
    (ad): ad is { _id: unknown; placement: string } => typeof ad.placement === "string",
  );

  const results = pending.map((ad) => ({
    id: String(ad._id),
    placement: ad.placement,
    action: (dryRun ? "would-update" : "updated") as AdMigrationResult["action"],
  }));

  if (!dryRun && pending.length > 0) {
    await model.bulkWrite(
      pending.map((ad) => ({
        updateOne: {
          // Re-checking the condition keeps the write safe if it races with an edit.
          filter: { _id: ad._id, $or: NEEDS_MIGRATION.$or },
          update: { $set: { placements: [ad.placement] } },
        },
      })),
    );
  }

  return results;
}
