import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/marketRate.model.js", () => ({
  default: { find: vi.fn(), findOneAndUpdate: vi.fn() },
  MARKET_RATE_KINDS: ["gold-silver", "petrol"],
}));

vi.mock("../utils/revalidate.js", () => ({
  revalidateFrontend: vi.fn(),
  REVALIDATE_TAGS: { marketRates: "market-rates" },
}));

import MarketRate from "../models/marketRate.model.js";
import {
  getMarketRates,
  updateGoldSilver,
} from "./marketRate.controller.js";

const model = MarketRate as unknown as {
  find: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
};

// asyncHandler doesn't return its promise, so resolve on res.json instead.
function run(
  handler: (req: never, res: never, next: never) => void,
  body?: unknown,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const res = { json: (payload: Record<string, unknown>) => resolve(payload) };
    handler({ body, user: { id: "u1" } } as never, res as never, reject as never);
  });
}

beforeEach(() => {
  model.find.mockReset();
  model.findOneAndUpdate.mockReset();
});

describe("getMarketRates (public)", () => {
  it("returns null values for kinds nobody has entered yet", async () => {
    model.find.mockReturnValue({ lean: async () => [] });

    const result = await run(getMarketRates);
    const data = result.data as Record<string, { values: unknown; updatedAt: unknown }>;

    expect(data["gold-silver"].values).toBeNull();
    expect(data.petrol.values).toBeNull();
  });

  it("returns stored values for kinds that have been set", async () => {
    model.find.mockReturnValue({
      lean: async () => [
        { kind: "gold-silver", values: { goldPerTola: 190000 }, updatedAt: "2026-09-22" },
      ],
    });

    const result = await run(getMarketRates);
    const data = result.data as Record<string, { values: unknown; updatedAt: unknown }>;

    expect(data["gold-silver"].values).toEqual({ goldPerTola: 190000 });
    expect(data.petrol.values).toBeNull();
  });
});

describe("updateGoldSilver (admin)", () => {
  it("upserts by kind and stamps the actor", async () => {
    model.findOneAndUpdate.mockResolvedValue({ kind: "gold-silver" });

    const body = {
      values: { goldPerTola: 190000, goldPerGram: 16278, silverPerTola: 2400, silverPerGram: 205 },
    };
    await run(updateGoldSilver, body);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { kind: "gold-silver" },
      { kind: "gold-silver", values: body.values, updatedBy: "u1" },
      { upsert: true, new: true },
    );
  });
});
