import { z } from "zod";

const nonNegativeNumber = z.number().min(0).max(100_000_000);

export const goldSilverValuesSchema = z.strictObject({
  goldPerTola: nonNegativeNumber,
  goldPerGram: nonNegativeNumber,
  silverPerTola: nonNegativeNumber,
  silverPerGram: nonNegativeNumber,
});

export const petrolValuesSchema = z.strictObject({
  petrolPerLiter: nonNegativeNumber,
  dieselPerLiter: nonNegativeNumber,
  keroseneperLiter: nonNegativeNumber,
});

export const marketRateSchemasByKind = {
  "gold-silver": z.strictObject({ values: goldSilverValuesSchema }),
  petrol: z.strictObject({ values: petrolValuesSchema }),
} as const;

export type MarketRateKindParam = keyof typeof marketRateSchemasByKind;

export const isMarketRateKind = (value: string): value is MarketRateKindParam =>
  value in marketRateSchemasByKind;
