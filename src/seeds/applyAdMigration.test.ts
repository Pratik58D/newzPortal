import { describe, expect, it, vi } from "vitest";

import { applyAdMigration, type AdMigrationModel } from "./applyAdMigration.js";

const model = (docs: { _id: unknown; placement?: string }[]) => {
  const bulkWrite = vi.fn().mockResolvedValue({});
  const m: AdMigrationModel = {
    find: vi.fn(() => ({ select: () => ({ lean: async () => docs }) })),
    bulkWrite,
  };
  return { m, bulkWrite };
};

describe("applyAdMigration", () => {
  it("copies placement into placements for ads that lack it", async () => {
    const { m, bulkWrite } = model([
      { _id: "a", placement: "sidebar" },
      { _id: "b", placement: "top_banner" },
    ]);

    const results = await applyAdMigration(m);

    expect(results.map((r) => [r.id, r.action])).toEqual([["a", "updated"], ["b", "updated"]]);
    const ops = bulkWrite.mock.calls[0][0] as { updateOne: { update: unknown } }[];
    expect(ops.map((op) => op.updateOne.update)).toEqual([
      { $set: { placements: ["sidebar"] } },
      { $set: { placements: ["top_banner"] } },
    ]);
  });

  it("dry run reports but writes nothing", async () => {
    const { m, bulkWrite } = model([{ _id: "a", placement: "sidebar" }]);

    const results = await applyAdMigration(m, { dryRun: true });

    expect(results).toEqual([{ id: "a", placement: "sidebar", action: "would-update" }]);
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("does nothing when every ad is already migrated (idempotent)", async () => {
    const { m, bulkWrite } = model([]);

    expect(await applyAdMigration(m)).toEqual([]);
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("skips documents with no usable placement", async () => {
    const { m, bulkWrite } = model([{ _id: "x" }]);

    expect(await applyAdMigration(m)).toEqual([]);
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it("guards each write so a concurrent edit is not overwritten", async () => {
    const { m, bulkWrite } = model([{ _id: "a", placement: "sidebar" }]);

    await applyAdMigration(m);

    const [op] = bulkWrite.mock.calls[0][0] as { updateOne: { filter: { _id: string; $or: unknown[] } } }[];
    expect(op.updateOne.filter._id).toBe("a");
    expect(op.updateOne.filter.$or).toHaveLength(2);
  });
});
