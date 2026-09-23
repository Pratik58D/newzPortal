import { revalidateFrontend, REVALIDATE_TAGS } from "../utils/revalidate.js";
import MarketRate, { MARKET_RATE_KINDS, MarketRateKind } from "../models/marketRate.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Public: all three kinds at once, `values: null` for any kind nobody has
// entered yet — the frontend renders a "not updated" empty state rather than
// crashing (there is no seed data: these are real financial figures no seed
// script should invent).
export const getMarketRates = asyncHandler(async (_req, res) => {
  const docs = await MarketRate.find({ kind: { $in: MARKET_RATE_KINDS } }).lean();
  const byKind = new Map(docs.map((doc) => [doc.kind, doc]));

  const data = Object.fromEntries(
    MARKET_RATE_KINDS.map((kind) => [
      kind,
      {
        values: byKind.get(kind)?.values ?? null,
        updatedAt: byKind.get(kind)?.updatedAt ?? null,
      },
    ]),
  );

  res.json({ success: true, data });
});

function updateKind(kind: MarketRateKind) {
  return asyncHandler(async (req, res) => {
    const updated = await MarketRate.findOneAndUpdate(
      { kind },
      { kind, values: req.body.values, updatedBy: req.user!.id },
      { upsert: true, new: true },
    );

    revalidateFrontend([REVALIDATE_TAGS.marketRates]);

    res.json({ success: true, message: "Market rate updated", data: updated });
  });
}

export const updateGoldSilver = updateKind("gold-silver");
export const updatePetrol = updateKind("petrol");
